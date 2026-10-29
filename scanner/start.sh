#!/bin/sh
# Start clamd and freshclam (the official image's init) in the background, then the HTTP front end.
/init &
exec python3 /scanner/server.py
