#!/bin/bash

cd /var/www/html/smartlamp/
./recognizer -cfg recognizer.cfg $1 -out res 2>/dev/null | sed -e 's/\(\_[^\_]*\_\)/\n\1\n/g' | sed -e '/^$/d' | sed -e 's/\(.*\)$/Result \[0-1 ms\]\: \1/g'
