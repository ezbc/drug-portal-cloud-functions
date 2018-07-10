//const urlEncode = require('urlencode');
//const common = require('../common');
const https = require('https');
const http = require('http');
const urlEncode = require('urlencode');
const Storage = require('@google-cloud/storage');
const url = require('url');

/** Persistor for retrieving a file from Cloud Storage
 * 
 * @param {string} bucket The bucket or path to the file 
 * @param {string} name The name of the file
 */
function getFileFromCloudStorage(bucket, name) {
  return storage.bucket(bucket).file(name).createReadStream();
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

function base64ParserEncode (url) {
  return new Buffer(url).toString('base64');
};

function base64ParserDecode (url) {
  return new Buffer(url, 'base64').toString('ascii');
};

const urlParser = {
  'encode': urlParserEncode,
  'decode': urlParserDecode
}

const base64Parser = {
  'encode': base64ParserEncode,
  'decode': base64ParserDecode
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
  'write': {
    'cloudStorage': cloudStorageWritePersistor
  },
  'read': {
   'http': httpReadPersistor 
  }
};

const parsers = {
  'url': urlParser,
  'base64': base64Parser
};

function httpReadPersistor(url) {
  return {}
};

/**
 * Writes a file to drug portal bucket
 * 
 * @param {string} filename target filename for cloud storage object
 */
function cloudStorageWritePersistor(filename) {
  // TODO: add environment variables in cloud config
  const BUCKET = 'drug_portal';
  const DATA_DIR = 'data/fda/';

  // Instantiates a client
  const storage = Storage();

  // initialize bucket
  const destinationBucket = storage.bucket(BUCKET);

  const file = destinationBucket.file(DATA_DIR + filename)
  
  // gcs filepath
  const filepath = `gs://${BUCKET}/${DATA_DIR}${filename}`;

  file.filepath = filepath;
  return file;
};

function uploadFromUrlWithPersistors(req, res, persistors) {

	const targetUrl = req.body.url;

	// get the parser
	const parser = parsers.base64;

	// create filename
	const destinationFilename = parser.encode(targetUrl);
  
  const customMetadata = {
        originalUrl: targetUrl,
        requestTime: `${Date.now()}`
      }

  // create write stream
  const writePersistor = persistors.writePersistor;
  let destinationFile = writePersistor(destinationFilename);
  let destinationStream = destinationFile.createWriteStream(
    {metadata: {
      metadata: customMetadata 
    }
  });

  // begin the response
  let response = {'destinationUrl': destinationFile.filepath, 'requestUrl': targetUrl}

  // TODO: write a behavior pattern to identify which pattern to use, replace if statements
  let urlObj = url.parse(targetUrl);

  protocols = {
    'http:': http,
    'https:': https,
  }

  const protocol = protocols[urlObj.protocol];

  // start a read stream from http or https
  protocol.get(targetUrl, function(downloadRes) {
    downloadRes.on('data', function(data) {

      // write chunk to GCS
      destinationStream.write(data);

      }).on('end', function() {

        destinationStream.end();
        response.status = `uploaded`;

        res.send(response)
      }).on('error', function(err) {
          console.error(err)
          res.send(`error occurred`)
        });
    }).on('error', function(err) {
      console.error(err)
      res.send(`error occurred`)
    });

};

/**
 * HTTP Cloud Function.
 *
 * @param {Object} req Cloud Function request context.
 * @param {Object} res Cloud Function response context.
 */
exports.uploadFromUrl = (req, res) => {

  const callbackPersistors = {
    'writePersistor': persistors.write.cloudStorage,
    'readPersistor': persistors.read.http
    };

  uploadFromUrlWithPersistors(req, res, callbackPersistors);

};
