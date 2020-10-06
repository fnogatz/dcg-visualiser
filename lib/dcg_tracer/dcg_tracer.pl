/*
  DCG Tracer
  
  Using these predicates DCGs can be queried similar to phrase/2 or phrase/3. 
  Additionaly, a Dict is provided as a further argument which describes execution steps.
  
  Dependencies:
  Queried rules have to be processed using Module 'dcg_term_expansion'
  
  Side effects:
  Asserts step/8 and count/2 facts temporarly in the calling context module (the Pengine)
*/
:- module(dcg_tracer,
  [
    phrase_mi/3,
    phrase_mi/4,
    phrase_mi_nth/4,
    phrase_mi_nth/5
  ]).

% define predicates as meta-predicates (to get the context module of a DCGBody)
:- meta_predicate phrase_mi(//, ?, -).
:- meta_predicate phrase_mi(//, ?, ?, -).
:- meta_predicate phrase_mi_nth(//, ?, +, -).
:- meta_predicate phrase_mi_nth(//, ?, ?, +, -).

:- use_module(dcg_term_expansion).

/*
  %%%%%%%%%%%%%%%%%%%
  Exported Predicates
  
  phrase_mi/3,
  phrase_mi/4,
  phrase_mi_nth/4,
  phrase_mi_nth/5
  
  Query DCGBody with Input and Rest. 
  Provides 'Dict' which holds occurred execution steps.
  
  phrase_mi(+DCGBody, ?Input, ?Rest, -Dict) 
    -> returns first solution, further solutions using backtracking
  phrase_mi(+DCGBody, ?Input, ?Rest, +Nth, -Dict, -Results) 
    -> returns the nth solution 
       (or dict which describes the failure if #sols+1 = Nth)
  
  phrase_mi/3 & 
  phrase_mi_nth/4 
    As predicates above, with an empty 'Rest' list.
*/
phrase_mi(Module:DCGBody, Input, Dict) :-
  phrase_mi(Module:DCGBody, Input, [], Dict).
phrase_mi(Module:DCGBody, Input, Rest, Dict) :-
  % check Input & Rest -> throws exceptions: error(type_error(list, Data), _))
  check_input(Input, Input0),
  check_input(Rest, Rest0),
  % check & expand DCGBody
  nonvar(DCGBody),
  dcg_expansion((dcg --> DCGBody),(dcg(Input0,Rest0) :- Expanded)),
  !,
  setup_call_cleanup(
    cleanup(Module),
    (
      % Call mi/2, if it succeeds, keep choice points using soft cut *->
      % In case of failure, still succeed (one time)
      % after that: evaluate each time current steps, using choice/2
      (mi(Module:Expanded) *-> true ; true ), 
      goal(Module, -1:1, Dict)
    ),
    cleanup(Module)
  ).

phrase_mi_nth(Module:DCGBody, Input, Nth, Dict) :-
  phrase_mi_nth(Module:DCGBody, Input, [], Nth, Dict).
phrase_mi_nth(Module:DCGBody, Input, Rest, Nth, Dict) :- 
  % check Input & Rest
  check_input(Input, Input0),
  check_input(Rest, Rest0),
  % check & expand DCGBody
  nonvar(DCGBody),
  dcg_expansion((dcg --> DCGBody),(dcg(Input0,Rest0) :- Expanded)),
  !,
  setup_call_cleanup(
    cleanup(Module),
    (
      findnsols(Nth, _{dcgbody:DCGBody, in:Input0, rest:Rest0}, mi(Module:Expanded), Results),
      goal(Module, -1:1, Dict), 
      % Map last result to input Variables -> phrase_mi_nth fails if nth > #solutions of mi
      (nth1(Nth, Results, _{dcgbody:DCGBody, in:Input0, rest:Rest0}) ->
        true
      ;
        !
      )
    ),
    cleanup(Module)
  ).  

/*
  %%%%%%%%%%%%%%%%%%%
  Meta-Interpreter
  
  mi/1,
  mi/2
  
  Handles conjunction, terminals & non-terminals
  
  mi(Module:Expanded)
  Initialise the interpretation, 
  'Module' is calling context, 
  'Expanded' the translated form of the queried DCGBody.
  
  mi(Goal, Level:Parent:Pos:Module)
  Interpret 'Goal', 
  as context, the current recursion 'Level', 'Parent' step, 
  'Position' in parent clause and context 'Module' is required.
  
  init:
  mi(Module:Expanded)
  mi(Expanded, 1:0:1:Module)
*/
mi(Module:Expanded) :-
  % initalisation
  save_step(unify, N, 1, 0, -1, 1, Expanded, 'DCGBody', Module),
  (mi(Expanded, 1:N:1:Module),
    save_step(exit, _, _, 0, -1, 1, Expanded, 'DCGBody', Module)
  ;
    save_step(fail, _, _, 0, -1, 1, Expanded, 'DCGBody', Module),
    fail
  ),
  update_counter(redo, _, Module).

% Conjunction
mi((A, B), L:Par:Pos:Module) :-
  Pos1 is Pos + 1,
  mi(A, L:Par:Pos:Module), mi(B, L:Par:Pos1:Module).
% Terminals & Prolog Code
mi(A, L:Par:Pos:Module) :-
  functor(A, F, 3),
  (F = 'T' ; F = 'P'),
  save_step(unify, _, _, L, Par, Pos, A, F, Module),
  (call(A),
  % result
    save_step(exit, _, _, L, Par, Pos, A, F, Module)
  ;
    save_step(fail, _, _, L, Par, Pos, A, F, Module),
    update_counter(redo,_ , Module),
    fail
  ).
% Non-terminals
mi(A, L:Par:Pos:Module) :- 
  A \= (_,_), A \= 'T'(_,_,_), A \= 'P'(_,_,_),
  clause(Module:A, B, ClauseRef),
  save_step(unify, N0, _, L, Par, Pos, A, ClauseRef, Module),
  L1 is L + 1,
  (mi(B, L1:N0:1:Module),
  % result
    save_step(exit, _, _, L, Par, Pos, A, ClauseRef, Module)
  ;
    save_step(fail, _, _, L, Par, Pos, A, ClauseRef, Module),
    update_counter(redo, _, Module),
    fail
  ).

/*
  Storing Facts
  
  The predicate save_step/9 asserts step/8 facts.
  These are stored in the Module which is stated as the last argument of save_step/9. 
  This allows for storing these facts in the calling Pengine. 
  
  step/8
  step(Port, N, R, Level, Parent, Pos, Goal, ClauseRef)
  
  Port         unify/exit/fail/depth
  N            Counting execution steps
  R            Counting redos
  Level        Recursion level (used for depth-limiting the execution)
  Parent       Parent step
  Pos          In-Clause Position (1..n)
  Goal         Associated goal: 'T'(Terminal,In,Out) or <nonterminal>(..,In,Out)
  ClauseRef    ClauseReference to current clause | T | P
*/
:- dynamic step/8.

% depth limit -> port:depth and abort execution
save_step(_, N, R, Level, Parent, Pos, Goal, ClauseRef, Module) :-
  Limit = 30,
  (
    Module:step(_, _, _, Limit, _, _, _, _)
    ;
    Level = Limit
  ),
  update_counter(step, N, Module), current_counter(redo, R, Module),
  goal_string(Goal, GoalString),
  assertz(Module:step(depth, N, R, Level, Parent, Pos, GoalString, ClauseRef)),
  !,
  fail.
% assert steps 
save_step(Port, N, R, Level, Parent, Pos, Goal, ClauseRef, Module) :-
  update_counter(step, N, Module), current_counter(redo, R, Module),
  goal_string(Goal, GoalString),
  assertz(Module:step(Port, N, R, Level, Parent, Pos, GoalString, ClauseRef)).

/*
  %%%%%%%%%%%%%%%%%%%
  Represent the execution as a Dict, based on provided step/8 facts
  
  goal{
    events:     List of <event> for current goal (which holds steps corresponding to ports call,unify,exit,fail,depth)
    choices:    List of correponding choices
  }
  
  choice{
    parent:     Execution step of corresponding parent (unification) step
    subgoals:   List of goals{..} 
  }
  
  event{
    step:       Execution step
    type:       call/unify/exit/fail
    redo:       Current redo
    goal:       Goal (with current unifications)
    line:       Line number of current clause | 'T','P','DCGBody'
  }
  
  init:
  goal(Module, -1:1, Dict)
*/

% goal
goal(Module, Parent:Pos, Dict) :-
  %find events
  events(Module, Parent:Pos, Events),
  % find choices
  findall(
    Step, 
    Module:step(unify, Step, _, _, Parent, Pos, _, _), 
    Choices
  ),
  % evaluate choices:
  maplist(choice(Module), Choices, ChoicesDicts),
  % create dict
  Dict = goal{events:Events, choices:ChoicesDicts}.
%events
events(Module, Parent:Pos, Events) :-
  % find events
  findall(
    event{step:Step, type:Event, redo:Redo, goal:Goal, line:Line}, 
    (
      Module:step(Event, Step, Redo, _, Parent, Pos, Goal, ClauseRef), 
      % if ClauseRef is actual Ref -> replace by line number ; clauseRef is 'P', 'T', 'C' or 'DCGBody'
      (\+atom(ClauseRef) ->
        clause_property(ClauseRef, line_count(Line))
      ;
        Line = ClauseRef
      )
    ), 
    Events
  ).
% choice
choice(Module, Parent, Dict) :-
  % find subgoals (ordered distinct list of Parent:Pos([1,..,n])
  (setof(Parent:Pos, (V0, V1, V2, V3, V4)^(Module:step(unify, V0,V1,V2, Parent, Pos, V3, V4)), Positions) ->
    % > 0 subgoals -> evaluate
    maplist(goal(Module), Positions, Subgoals)
  ;
    % no subgoals
    Subgoals = []
  ),
  % create dict
  Dict = choice{parent:Parent, subgoals:Subgoals}.

/*
  %%%%%%%%%%%%%%%%%%%
  Various helper predicates
  
*/

/*
  counter/2
  Simple counter (used for numbering each computation step & redos)
  
  update_counter/2
  Update and get value 'N' four counter 'Name'
  
  current_counter/2
  Get value 'N' for counter 'Name'
*/
:- dynamic counter/2.

update_counter(Name, NN, Module) :-
  retract(Module:counter(Name, N)),
  NN is N+1,
  assertz(Module:counter(Name, NN)),
  !.
update_counter(Name, 1, Module) :-
  current_counter(Name, 1, Module).

current_counter(Name, N, Module) :-
  % workaround since counter is stored in module M, 
  % calling M:counter throws error if not yet defined
  retract(Module:counter(Name, N)),
  assertz(Module:counter(Name, N)),
  !.
current_counter(Name, 1, Module) :-
  assertz(Module:counter(Name, 1)).

/*
  cleanup/0
  Retract all previously asserted facts step/8, counter/2 in 'Module'
*/
cleanup(Module) :-
  retractall(Module:step(_,_,_,_,_,_,_,_)),
  retractall(Module:counter(_,_)).

/*
  Check (and convert) Input/Rest Arguments:
  List -> List
  String "" -> List of Chars
  Unbound -> unbound
*/
check_input(I, I0) :- 
  string(I),
  !,
  atom_chars(I, I0).
check_input(I, I) :-
  '$dcg':phrase_input(I).

/*
  goal_string/2
  Convert a goal to a list of its terms. 
  Each term is split into a list of its functor and arguments, 
  then converted to string (to preserve variable bindings at runtime)
  
  Used by save_step/9 to sttore goals.
  
  Example: 
    (goal(A,B), other(B,C)) 
    ->
    [["goal", "_6984", "_6986"], ["other", "_6986", "_6992"]].
*/
goal_string(G, [S]) :-
  G =.. L,
  \+(L = [','|_]),
  % maplist doesn't work since options are third argument of term_string/3 .. 
  findall(
    ArgString,
    (member(Arg, L),term_string(Arg, ArgString, [spacing(next_argument)])),
    S
  ).
goal_string((G1,G2), L) :-
  goal_string(G1, S1),
  goal_string(G2, S2),
  append(S1, S2, L).

/*
  Helper Predicates for easier debugging
  
  pd/1 Pretty print Dict as JSON using indentation
  
  l/0 Listing of asserted steps 
    (steps are deleted by default, remove cleanup/1 from phrase_mi/_nth first to use this)
*/
/*
:- use_module(library(http/json)).
pd(D) :-
  numbervars(D,0,_),
  atom_json_dict(T,D,[serialize_unknown(true)]),
  writeln(T).
l :-
  listing(step).
*/
