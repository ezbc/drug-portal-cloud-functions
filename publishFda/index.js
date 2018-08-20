/* globals exports, require */
//jshint strict: false
//jshint esversion: 6
const unzipper = require("unzipper");
const JSONStream = require("JSONStream");
const Storage = require('@google-cloud/storage');
const PubSub = require('@google-cloud/pubsub');
const fs = require('fs');

// Pubsub target topic
const TOPIC_TO_PUBLISH = 'load-to-marklogic';

// Initialize clients globally to minimize the expensive operations
// across multiple cloud function invocations
const storage = Storage();
const pubsub = PubSub();
const pubsubTopic = pubsub.topic(TOPIC_TO_PUBLISH, {'autocreate': true}); // set the topic to publish to
const publisher = pubsubTopic.publisher({
    batching: {
      maxMessages: 300,
      maxMilliseconds: 10000,
    },
 })

/** Persistor for retrieving a file from Cloud Storage
 * 
 * @param {string} bucket The bucket or path to the file 
 * @param {string} name The name of the file
 */
function getFileFromCloudStorage(bucket, name) {
  const file = storage.bucket(bucket).file(name);
  return file.createReadStream();
}

function getFileMetadataFromCloudStorage(bucket, name, callback) {
  storage.bucket(bucket).file(name).getMetadata()
                .then( results => {
                  const metadata = results[0].metadata;
                  callback(metadata);
                });
}

/** Persistor for retrieving a file from filesystem
 * 
 * @param {string} prefixPath path to prefix filename
 * @param {string} path path to filename
 */
function getFileFromFilesystem(prefixPath, path) {
  return fs.createReadStream(prefixPath + path);
}

/** Generate a function to publish data to pubsub.
 * 
 * @param {object} attributes attributes of a message to publish
 * @return {function} function which accepts data to publish
 */
function publishToPubsub(attributes) {

  // count for messages published
  var messageCount = 0;
  function messageCallback(error, messageId) {
    if (error) {
      console.info(`Error occurred for message ${messageId}`)
      console.error(error)
    } else {
      messageCount++;
      console.log(messageCount)
    }
  };

  /** Publish message to pubsub
   * 
   * @param {object} data data to publish as message
   */
  function publish(data) {
    if (data) {
      const message = {
        content: data,
        header: {
          provenance: [
            attributes
          ]}
        }; 

      // Publishes the message as a string, e.g. "Hello, world!" or JSON.stringify(someObject)
      const buffer = Buffer.from(JSON.stringify(message)); // publish api requires data to be buffered
      publisher.publish(buffer, messageCallback); // add custom attributes tracking provenance
    } else {
      console.info('empty record found, skipping...')
    }
  }

  return publish;
}

/**
 * Persistors for the following
 * - file access
 * - message bus publishing.
 */
const persistors = {
  'file': {
    'filesystem': getFileFromFilesystem,
    'cloudStorage': getFileFromCloudStorage
  },
  'fileMetadata': {
    'cloudStorage': getFileMetadataFromCloudStorage
  },
  'publish': {
    'pubsub': publishToPubsub
  }
};

/**
 * 
 * @param {string} bucket The bucket or path to the file 
 * @param {string} name The name of the file
 * @param {function} persistor The persistor to retrieve  
 */
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
 * @param {string} event.data.attributes.bucketId Name of a Cloud Storage bucket.
 * @param {function} callback The callback function.
 */
exports.processZip = (event, callback) => {

    /* example event
    * event: { eventId: '107157759352918', timestamp: '2018-05-31T20:27:06.524Z', eventType: 'providers/cloud.pubsub/eventTypes/topic.publish', resource: 'projects/drug-portal/topics/dataset-fda-status', data: { '@type': 'type.googleapis.com/google.pubsub.v1.PubsubMessage', attributes: { bucketId: 'drug_portal', eventTime: '2018-05-31T20:27:06.339990Z', eventType: 'OBJECT_FINALIZE', notificationConfig: 'projects/_/buckets/drug_portal/notificationConfigs/4', objectGeneration: '1527798426343359', objectId: 'data/fda/test34.json.zip', payloadFormat: 'JSON_API_V1' }, data: 'ewogICJraW5kIjogInN0b3JhZ2Ujb2JqZWN0IiwKICAiaWQiOiAiZHJ1Z19wb3J0YWwvZGF0YS9mZGEvdGVzdDM0Lmpzb24uemlwLzE1Mjc3OTg0MjYzNDMzNTkiLAogICJzZWxmTGluayI6ICJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9zdG9yYWdlL3YxL2IvZHJ1Z19wb3J0YWwvby9kYXRhJTJGZmRhJTJGdGVzdDM0Lmpzb24uemlwIiwKICAibmFtZSI6ICJkYXRhL2ZkYS90ZXN0MzQuanNvbi56aXAiLAogICJidWNrZXQiOiAiZHJ1Z19wb3J0YWwiLAogICJnZW5lcmF0aW9uIjogIjE1Mjc3OTg0MjYzNDMzNTkiLAogICJtZXRhZ2VuZXJhdGlvbiI6ICIxIiwKICAiY29udGVudFR5cGUiOiAiYXBwbGljYXRpb24vemlwIiwKICAidGltZUNyZWF0ZWQiOiAiMjAxOC0wNS0zMVQyMDoyNzowNi4zMzlaIiwKICAidXBkYXRlZCI6ICIyMDE4LTA1LTMxVDIwOjI3OjA2LjMzOVoiLAogICJzdG9yYWdlQ2xhc3MiOiAiUkVHSU9OQUwiLAogICJ0aW1lU3RvcmFnZUNsYXNzVXBkYXRlZCI6ICIyMDE4LTA1LTMxVDIwOjI3OjA2LjMzOVoiLAogICJzaXplIjogIjEwMTQwMyIsCiAgIm1kNUhhc2giOiAiRlN4WmRTQnZqd1pxanRXNEVscks1QT09IiwKICAibWVkaWFMaW5rIjogImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2Rvd25sb2FkL3N0b3JhZ2UvdjEvYi9kcnVnX3BvcnRhbC9vL2RhdGElMkZmZGElMkZ0ZXN0MzQuanNvbi56aXA/Z2VuZXJhdGlvbj0xNTI3Nzk4NDI2MzQzMzU5JmFsdD1tZWRpYSIsCiAgImNyYzMyYyI6ICJ1WHgyclE9PSIsCiAgImV0YWciOiAiQ0wrdjl0UGtzTnNDRUFFPSIKfQo=' } }
    */

    const attributes = event.data.attributes;
    const name = attributes.objectId,
      bucket = attributes.bucketId;

    function getFileMetadataFromCloudStorageCallback(metadata) {
      attributes.customMetadata = metadata

      console.info(`Publishing file ${name}`)

      // load the file from Cloud Storage
      let file = getFileStream(bucket, name, persistors['file']['cloudStorage']);

        // count for messages published
        function messageCallback(error, messageId) {
          if (error) {
            console.info(`Error occurred for message ${messageId}`)
            console.error(error)
          } 
        };

        // initialize message count
        var messageCount = 0;

        
        /** Publish message to pubsub.
        * 
        * @param {object} data data to publish as message
        */
        // TODO call the module function at the top of this script.
        // this function is written so that the messageCount can be managed
        // by each cloud function instance
        function publishCallback(data) {
          if (data) {
            const message = {
              content: data,
              header: {
                provenance: [
                  attributes
                ]}
              }; 

            // Publishes the message as a string, e.g. "Hello, world!" or JSON.stringify(someObject)
            const buffer = Buffer.from(JSON.stringify(message)); // publish api requires data to be buffered
            publisher.publish(buffer, messageCallback); // add custom attributes tracking provenance
            messageCount++;
          } else {
            console.info('empty record found, skipping...')
          }
        }

      // get the publish callback
      //const publishCallback = persistors['publish']['pubsub'](attributes);

      file.pipe(unzipper.ParseOne()) // unzip the file, since there's only one file expected grab the first one
      .pipe(JSONStream.parse('results.*')) // separate records from the 'results' array
      .on('data', publishCallback)
      .on('end', function handleEnd(data) {
        console.info(`Total messages published: ${messageCount}`);
        res = {'messagesPublished': messageCount}
        return callback(null, res);
      })
      .on('error', function handleError(error) {
        console.error(error);
        return callback(error);
      })
    };

    getFileMetadataFromCloudStorage(bucket, name, getFileMetadataFromCloudStorageCallback);
};
