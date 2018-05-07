% Main file to load pengines.

% This file is included from
%
%   - debug.pl for local debugging
%   - daemon.pl to run pengines as a Unix service
%   - run.pl 


% http&pengines libraries
:- use_module(library(pengines)).
:- use_module(library(http/http_error)).
:- use_module(server).
%:- use_module(storage).

:- use_module(lib/admin/admin).
:- use_module(lib/admin/server_statistics).
:- use_module(lib/admin/change_passwd).

/*
	library(sandbox)
	Needed for marking the required predicates as 'safe'
*/
:- use_module(library(sandbox)).
:- multifile sandbox:safe_primitive/1.
:- multifile sandbox:safe_meta/1.

/*
	Term Expansion
*/
:- use_module(pengine_sandbox:lib/dcg_tracer/dcg_term_expansion).
sandbox:safe_primitive(dcg_term_expansion:dcg_expansion(_,_)).
term_expansion(R,R0) :-
	dcg_term_expansion:dcg_expansion(R,R0).

/*
	DCG Tracer
*/
:- use_module(pengine_sandbox:lib/dcg_tracer/dcg_tracer).
sandbox:safe_meta(dcg_tracer:phrase_mi_nth(_, _, _, _, _)).