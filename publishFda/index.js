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


const publishers = {
  "gcpPubsub": {
    "publish": function publish(topic, message) { 
      const pubsubTopic = pubsub.topic(topic);
      pubsubTopic.publish(message)
    }
  }
}

const publishRecord = (topic, message, publisher) => {
  publisher.publish(topic, messsage)
};

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
    const pubsubMessage = event.data.attributes;
    const name = pubsubMessage.objectId,
      bucket = pubsubMessage.bucketId;
    
    // load the file from Cloud Storage
    let file = getFileStream(bucket, name);
    
  
    file.pipe(unzipper.ParseOne()) // unzip the file, since there's only one file expected grab the first one
    .pipe(JSONStream.parse('results.*')) // separate records from the 'results' array
    .pipe(JSONStream.stringify()) // create a string out of the records
    .on('data', function publishRecord(data){
      //publishRecord('dataset-fda-status', data, publishers.gcpPubsub)
      //const dataString = JSONStream.stringify();
      const dataBuffer = Buffer.from(data);
      const pubsubTopic = pubsub.topic('dataset-fda-status');
      pubsubTopic.publisher().publish(dataBuffer)
      .then(results => {
        const messageId = results[0];
        console.log(`Message published: ${messageId}`);
      })
      .catch(err => {
        callback(err);
      })
    })
    .on('end', function handleEnd(data) {
      callback(null, `published`)
    })
};
