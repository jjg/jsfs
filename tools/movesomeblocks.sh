#!/bin/bash
for file in $(ls -p  $1 | grep -v "\.json" | tail -$3)
do
mv $1$file $2 
done
