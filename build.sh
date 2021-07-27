#!/usr/bin/env bash

VERSION=$(jq -r ".version" ./src/manifest.json)

if test -z "$VERSION"; then
  echo "can't parse version from manifest file"
  exit
fi

FILE=metube-browser-extension-"$VERSION".zip

if test -f "./builds/$FILE"; then
  if [ "$1" == "--force" ]; then
    rm -f "./builds/$FILE"
  else
    echo "file ./builds/$FILE already exists. if you want to rewrite it use argument --force"
    exit
  fi
fi

cd ./src && zip -9 -r ../builds/"$FILE" ./*
