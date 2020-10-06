#!/usr/bin/env swipl

% Main file to run the DCG Visualiser
% Loads the application and starts a server
% on the default port: 3030
:- [load].

% start the server
:- server(3030).
