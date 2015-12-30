#!/bin/bash
for file in $(ls -1 -f -p  $1 | grep -v / | grep -v "\.json" | head -n$3)
do
mv $1$file $2 
done
