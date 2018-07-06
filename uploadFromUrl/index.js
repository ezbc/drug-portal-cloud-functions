//const urlEncode = require('urlencode');
//const common = require('../common');
const https = require('https');
const fs = require('fs');
const urlEncode = require('urlencode');
const Storage = require('@google-cloud/storage');
const PubSub = require('@google-cloud/pubsub');

const BUCKET = 'gs://drug_portal/data/fda/' 

// Instantiates a client
const storage = Storage();
const pubsub = PubSub();

/** Persistor for retrieving a file from Cloud Storage
 * 
 * @param {string} bucket The bucket or path to the file 
 * @param {string} name The name of the file
 */
function getFileFromCloudStorage(bucket, name) {
  return storage.bucket(bucket).file(name).createReadStream();
}

/** Persistor for retrieving a file from filesystem
 * 
 * @param {string} prefixPath path to prefix filename
 * @param {string} path path to filename
 */
function getFileFromFilesystem(prefixPath, path) {
  return fs.createReadStream(prefixPath + path);
}

function pubsubCallback(err, messageId){
  if (err) {
    throw Error
  }
}

/** Generate a function to publish data to pubsub.
 * 
 * @param {object} attributes attributes of a message to publish
 * @return {function} function which accepts data to publish
 */
function publishToPubsub(attributes) {

  /** Publish message to pubsub
   * 
   * @param {object} data data to publish as message
   */
  function publish(data) {
    if (data) {
      const message = {
        content: data,
        header: {
          provenance:
            [attributes]
          }
        };
      const buffer = Buffer.from(JSON.stringify(message)); // publish api requires data to be buffered
      const pubsubTopic = pubsub.topic(TOPIC_TO_PUBLISH); // set the topic to publish to
      pubsubTopic.publisher().publish(buffer, pubsubCallback) // add custom attributes tracking provenance
    }
  }

  return publish;
}

function initCloudStorageFile(bucketName, filename) {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(filename);
  return file
};

function initializeFile(bucket, filename, persistor) {
  return persistor(bucket, filename)
};


function urlParserEncode (url) {
  return urlEncode(url);
};

function urlParserDecode (url) {
  return urlDecode(url);
};

const urlParser = {
  'encode': urlParserEncode,
  'decode': urlParserDecode
}

/**
 * ******************
 * EXPORTED FUNCTIONS
 * ******************
 */

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
 * *****************
 * EXPORTED LITERALS
 * *****************
 */

/**
 * Persistors for the following
 * - file access
 * - message bus publishing.
 */
const persistors = {
  'readStream': {
    'filesystem': getFileFromFilesystem,
    'cloudStorage': getFileFromCloudStorage
  },
  'file': {
    'cloudStorage': initCloudStorageFile
  },
  'publish': {
    'pubsub': publishToPubsub
  }
};

const parsers = {
  'url': urlParser
};

/**
 * HTTP Cloud Function.
 *
 * @param {Object} req Cloud Function request context.
 * @param {Object} res Cloud Function response context.
 */
exports.uploadFromUrl = (req, res) => {

	const url = req.body.url;
	console.log(url)

	// get the parser
	const parser = parsers.url;

	// create filename
	const filename = parser.encode(url);

	// TODO: replace with a persistor
	const download = https.get(url)
  
  //const file = initializeFile(BUCKET, filename, persistors.file.cloudStorage)

  const myBucket = storage.bucket(BUCKET);

	var file = myBucket.file(filename);

	const request = download
	  .pipe(file.createWriteStream())
	  .on('error', function(err) {
	  	console.log(err)})
	  .on('finish', function() {
	  	console.log('finished')});
	 res.send('job initiated');
};
