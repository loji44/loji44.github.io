#!/bin/sh

rm -rf _site && rm -rf .jekyll-cache

git add --all && git commit -m 'update' && git push origin master

bundle install && jekyll build

rm -rf ../loji44.github.io/*

cp -R _site/* ../loji44.github.io/

cd ../loji44.github.io

git add --all && git commit -m 'update' && git push origin master