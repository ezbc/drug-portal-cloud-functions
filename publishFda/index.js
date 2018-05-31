/* globals exports, require */
//jshint strict: false
//jshint esversion: 6
const unzipper = require("unzipper");
const JSONStream = require("JSONStream");
const Storage = require('@google-cloud/storage');
const PubSub = require('@google-cloud/pubsub');
const fs = require('fs');

// Instantiates a client
const storage = Storage();
const pubsub = PubSub();

const TOPIC_TO_PUBLISH = 'load-to-marklogic';

function getFileFromCloudStorage(bucket, name) {
  return storage.bucket(bucket).file(name).createReadStream();
}

function getFileFromFilesystem(bucket, name) {
  return fs.createReadStream(bucket + name);
}

function pubsubCallback(err, messageId){
  if (err) {
    throw Error
  }
}

function publishToPubsub(attributes) {
  return function publish(data) {
    if (data) {
      const dataBuffer = Buffer.from(data); // publish api requires data to be buffered
      const pubsubTopic = pubsub.topic(TOPIC_TO_PUBLISH);
      pubsubTopic.publisher().publish(dataBuffer, attributes, pubsubCallback) // add custom attributes tracking provenance
    }
  }
}

const persistors = {
  'file': {
    'filesystem': getFileFromFilesystem,
    'cloudStorage': getFileFromCloudStorage
  },
  'publish': {
    'pubsub': publishToPubsub
  }
};

function getFileStream (bucket, name, persistor) {
  if (!bucket) {
    throw new Error('Bucket not provided. Make sure you have a "bucket" property in your request');
  }
  if (!name) {
    throw new Error('Filename not provided. Make sure you have a "name" property in your request');
  }  
  return persistor(bucket, name);
}

 /**
 * Reads zipped file, unzips and publishes JSON records.
 *
 * @example
 * gcloud alpha functions call processZip --data '{"attributes": {"bucketId": "YOUR_BUCKET_NAME", "objectId": "sample.txt.zip"}}'
 *
 * @param {object} event The Cloud Functions event.
 * @param {object} event.data A Google Cloud Pubsub Message.
 * @param {object} event.data.attributes Attributes of the Pubsub message.
 * @param {string} event.data.attributes.objectId Name of a file in the Cloud Storage bucket.
 * @param {string} event.data.attributes.objectId Name of a Cloud Storage bucket.
 * @param {function} callback The callback function.
 */
exports.processZip = (event, callback) => {

    /* example event
    * event: { eventId: '107157759352918', timestamp: '2018-05-31T20:27:06.524Z', eventType: 'providers/cloud.pubsub/eventTypes/topic.publish', resource: 'projects/drug-portal/topics/dataset-fda-status', data: { '@type': 'type.googleapis.com/google.pubsub.v1.PubsubMessage', attributes: { bucketId: 'drug_portal', eventTime: '2018-05-31T20:27:06.339990Z', eventType: 'OBJECT_FINALIZE', notificationConfig: 'projects/_/buckets/drug_portal/notificationConfigs/4', objectGeneration: '1527798426343359', objectId: 'data/fda/test34.json.zip', payloadFormat: 'JSON_API_V1' }, data: 'ewogICJraW5kIjogInN0b3JhZ2Ujb2JqZWN0IiwKICAiaWQiOiAiZHJ1Z19wb3J0YWwvZGF0YS9mZGEvdGVzdDM0Lmpzb24uemlwLzE1Mjc3OTg0MjYzNDMzNTkiLAogICJzZWxmTGluayI6ICJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9zdG9yYWdlL3YxL2IvZHJ1Z19wb3J0YWwvby9kYXRhJTJGZmRhJTJGdGVzdDM0Lmpzb24uemlwIiwKICAibmFtZSI6ICJkYXRhL2ZkYS90ZXN0MzQuanNvbi56aXAiLAogICJidWNrZXQiOiAiZHJ1Z19wb3J0YWwiLAogICJnZW5lcmF0aW9uIjogIjE1Mjc3OTg0MjYzNDMzNTkiLAogICJtZXRhZ2VuZXJhdGlvbiI6ICIxIiwKICAiY29udGVudFR5cGUiOiAiYXBwbGljYXRpb24vemlwIiwKICAidGltZUNyZWF0ZWQiOiAiMjAxOC0wNS0zMVQyMDoyNzowNi4zMzlaIiwKICAidXBkYXRlZCI6ICIyMDE4LTA1LTMxVDIwOjI3OjA2LjMzOVoiLAogICJzdG9yYWdlQ2xhc3MiOiAiUkVHSU9OQUwiLAogICJ0aW1lU3RvcmFnZUNsYXNzVXBkYXRlZCI6ICIyMDE4LTA1LTMxVDIwOjI3OjA2LjMzOVoiLAogICJzaXplIjogIjEwMTQwMyIsCiAgIm1kNUhhc2giOiAiRlN4WmRTQnZqd1pxanRXNEVscks1QT09IiwKICAibWVkaWFMaW5rIjogImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2Rvd25sb2FkL3N0b3JhZ2UvdjEvYi9kcnVnX3BvcnRhbC9vL2RhdGElMkZmZGElMkZ0ZXN0MzQuanNvbi56aXA/Z2VuZXJhdGlvbj0xNTI3Nzk4NDI2MzQzMzU5JmFsdD1tZWRpYSIsCiAgImNyYzMyYyI6ICJ1WHgyclE9PSIsCiAgImV0YWciOiAiQ0wrdjl0UGtzTnNDRUFFPSIKfQo=' } }
    */

    const attributes = event.data.attributes;
    const name = attributes.objectId,
      bucket = attributes.bucketId;
    
    // build custom attributes to record the bucket notification in the message
    const attributesToPublish = {
      provenance: [
        attributes
      ]
    }

    // load the file from Cloud Storage
    let file = getFileStream(bucket, name, persistors['file']['cloudStorage']);
    
    file.pipe(unzipper.ParseOne()) // unzip the file, since there's only one file expected grab the first one
    .pipe(JSONStream.parse('results.*')) // separate records from the 'results' array
    .pipe(JSONStream.stringify(false)) // create a string out of the records, 
    // the false arg separates records only by carraige returns
    .on('data', persistors['publish']['pubsub'](attributes))
    .on('end', function handleEnd(data) {
      callback(null, `published`)
    })
};
