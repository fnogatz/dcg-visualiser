# DCG Visualiser
This folder contains a Prolog server, which provides the application *DCG Visualiser.*

## Starting the server
To start the server, consult `run.pl`.

Alternatively, there is a debugging mode `debug.pl` and the possibility to set up a daemon `daemon.pl`.
The server configuration itself is based on the Prolog application demo server
(Copyright 2017 Torbjörn Lager, see LICENSE for further details).

On first startup, Prolog will ask for a new admin name and password.
The server configuration and statistics can be accessed at http://localhost:3030/admin/. 

## Access the application
When the server is running, go to http://localhost:3030/ in a modern web browser. 
Further hints on using the application can be found in the help `?` there.

## Environment
Developed and tested using SWI Prolog 7.6.0, Google Chrome 62 on Windows.
