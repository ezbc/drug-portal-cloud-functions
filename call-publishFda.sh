
while read filename; do
	date=`date '+%Y-%m-%dT%H:%M:%S.%3NZ'`
	functions call processZip --data '{"attributes": {  
	    "objectGeneration": "1531955353874591", 
	    "eventTime": "'$date'", 
	    "bucketId": "drug_portal", 
	    "eventType": "OBJECT_FINALIZE", 
	    "notificationConfig": "projects/_/buckets/drug_portal/notificationConfigs/4", 
	    "payloadFormat": "JSON_API_V1", 
	    "objectId": "data/fda/'$filename'"
	    }}'
done < $1
