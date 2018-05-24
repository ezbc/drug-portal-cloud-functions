/* globals exports, require */
//jshint strict: false
//jshint esversion: 6
//const gcs = require('@google-cloud/storage')();
//const stream = require("stream");
const unzipper = require("unzipper");
const JSONStream = require("JSONStream");
const Storage = require('@google-cloud/storage');
const readline = require('readline');
const es = require('event-stream')

// Instantiates a client
const storage = Storage();

function getFileStream (bucket, name) {
  if (!bucket) {
    throw new Error('Bucket not provided. Make sure you have a "bucket" property in your request');
  }
  if (!name) {
    throw new Error('Filename not provided. Make sure you have a "name" property in your request');
  }

  return storage.bucket(bucket).file(name).createReadStream();
}

exports.processZip = (event, callback) => {
    const pubsubMessage = event.data;

    const name = pubsubMessage.objectId,
      bucket = pubsubMessage.bucketId;
    
    let file = getFileStream(bucket, name);
    console.log(`beginning unzipping`)
    
    file.pipe(unzipper.ParseOne())
    .pipe(JSONStream.parse('results.*'))
    .on('data', function publishRecord(data){
      console.log(`publish record: ${data}`)
    })
    .on('end', function handleEnd(data) {
      callback(null, `published`)
    })

    /*
    let count = 0;
    const options = {
      input: file
    };
  
    // Use the readline module to read the stream line by line.
    readline.createInterface(options)
      .on('line', (line) => {
        count += 1;
      })
      .on('close', () => {
        callback(null, `File ${file.name} has ${count} words`);
      });
    console.log(`count: ${count}`)
      console.log(`Hello, ${name}!`);
    */
    //callback();
};
