/* globals exports, require */
//jshint strict: false
//jshint esversion: 6
const unzipper = require("unzipper");
const JSONStream = require("JSONStream");
const Storage = require('@google-cloud/storage');
const PubSub = require('@google-cloud/pubsub');

// Instantiates a client
const storage = Storage();
const pubsub = PubSub();

function getFileStream (bucket, name) {
  if (!bucket) {
    throw new Error('Bucket not provided. Make sure you have a "bucket" property in your request');
  }
  if (!name) {
    throw new Error('Filename not provided. Make sure you have a "name" property in your request');
  }

  return storage.bucket(bucket).file(name).createReadStream();
}

/**
 * Publishes a message to a Cloud Pub/Sub Topic.
 *
 * @example
 * gcloud alpha functions call publish --data '{"topic":"[YOUR_TOPIC_NAME]","message":"Hello, world!"}'
 *
 *   - Replace `[YOUR_TOPIC_NAME]` with your Cloud Pub/Sub topic name.
 *
 * @param {object} req Cloud Function request context.
 * @param {object} req.body The request body.
 * @param {string} req.body.topic Topic name on which to publish.
 * @param {string} req.body.message Message to publish.
 * @param {object} res Cloud Function response context.
 */
exports.publish = (req, res) => {
  if (!req.body.topic) {
    res.status(500).send(new Error('Topic not provided. Make sure you have a "topic" property in your request'));
    return;
  } else if (!req.body.message) {
    res.status(500).send(new Error('Message not provided. Make sure you have a "message" property in your request'));
    return;
  }

  console.log(`Publishing message to topic ${req.body.topic}`);

  // References an existing topic
  const topic = pubsub.topic(req.body.topic);

  const message = {
    data: {
      message: req.body.message
    }
  };

  // Publishes a message
  return topic.publish(message)
    .then(() => res.status(200).send('Message published.'))
    .catch((err) => {
      console.error(err);
      res.status(500).send(err);
      return Promise.reject(err);
    });
};

exports.processZip = (event, callback) => {
    const pubsubMessage = event.data.attributes;
    console.log(pubsubMessage);
    const name = pubsubMessage.objectId,
      bucket = pubsubMessage.bucketId;
    
    let file = getFileStream(bucket, name);
    console.log(`beginning unzipping`)
    
    file.pipe(unzipper.ParseOne())
    .pipe(JSONStream.parse('results.*'))
    .on('data', function publishRecord(data){
      console.log(`publish record: ${data.boxed_warning}`)
    })
    .on('end', function handleEnd(data) {
      callback(null, `published`)
    })
};
