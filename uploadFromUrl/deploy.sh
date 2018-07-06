#!/bin/bash

POSITIONAL=()
while [[ $# -gt 0 ]]
do
key="$1"

case $key in
    -e|--env)
    ENVIRONMENT="$2"
    shift # past argument
    shift # past value
    ;;
    *)    # unknown option
    POSITIONAL+=("$1") # save it in an array for later
    shift # past argument
    ;;
esac
done
set -- "${POSITIONAL[@]}" # restore positional parameters

if [ $ENVIRONMENT == "local" ]; then
  functions deploy uploadFromUrl --trigger-http
elif [ $ENVIRONMENT == "dev" ]; then
  gcloud beta functions deploy uploadFromUrl --trigger-http --memory=1024MB --timeout=300s
fi
