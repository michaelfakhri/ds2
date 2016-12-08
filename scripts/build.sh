#!/bin/bash
gulp build;
grep -lZP 'sioUrl.*\)\[5\]' ./dist/*|xargs -0 -l sed -i -e "s/sioUrl.*)\[5\]/sioUrl='https:\/\/blooming-atoll-60728.herokuapp.com'/"
