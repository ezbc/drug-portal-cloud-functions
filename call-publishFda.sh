#!/bin/bash
# Test a local emulating publishFda instance

while read filename; do
	echo "publishing file: $filename"
	date=`date '+%Y-%m-%dT%H:%M:%S.%3NZ'`
	gcloud pubsub topics publish dataset-fda-status \
        --message '{}' \
        --attribute \
        "objectGeneration=1","eventTime=$date","bucketId=drug_portal","eventType=OBJECT_FINALIZE","notificationConfig=projects/_/buckets/drug_portal/notificationConfigs/4","payloadFormat=JSON_API_V1","objectId=data/fda/$filename"
  sleep 20s
  echo ""
done < $1
