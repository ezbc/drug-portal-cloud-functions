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
    -f|--function)
    CLOUD_FUNCTION="$2"
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

if [ $CLOUD_FUNCTION == "publishFda" ]; then
  if [ $ENVIRONMENT == "local" ]; then
    functions deploy processZip \
    --trigger-event topic.publish \
    --trigger-resource dataset-fda-status \
    --source publishFda \
    --trigger-provider cloud.pubsub \
    --timeout=500s
  elif [ $ENVIRONMENT == "dev" ]; then
    gcloud beta functions deploy processZip \
      --trigger-event google.pubsub.topic.publish \
      --trigger-resource dataset-fda-status \
      --source publishFda \
      --memory=2048MB \
      --timeout=500s
  fi
fi
