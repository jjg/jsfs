#!/bin/bash
for file in $(ls -p  $1 | grep -v / | tail -2)
do
mv $1$file $2 
done
