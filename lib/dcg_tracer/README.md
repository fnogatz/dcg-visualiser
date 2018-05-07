# DCG Tracer

Modules for tracing DCG execution, 
resulting in a dict which describes the execution steps.

## Usage
DCG have to be translated using the Module `dcg_term_expansion`:

    term_expansion(R, R0) :-
    dcg_term_expansion:dcg_expansion(R, R0).

Then, predicates provided by `dcg_tracer` can be used to query and trace these DCGs. 

## Environment
Developed and tested using SWI Prolog 7.6.0 on Windows.