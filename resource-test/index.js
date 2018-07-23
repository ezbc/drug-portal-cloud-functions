const unzipper = require("unzipper");
const JSONStream = require("JSONStream");
const fs = require('fs');
const Storage = require('@google-cloud/storage');
const PubSub = require('@google-cloud/pubsub');

function memoryCallback() {
    // evaluate memory used
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`);
}

const bucket = `drug_portal`;
//const name = `data/fda/aHR0cHM6Ly9kb3dubG9hZC5vcGVuLmZkYS5nb3YvZGV2aWNlL3JlY2FsbC9kZXZpY2UtcmVjYWxsLTAwMDEtb2YtMDAwMS5qc29uLnppcA==`;
const name = `data/fda/aHR0cHM6Ly9kb3dubG9hZC5vcGVuLmZkYS5nb3YvZGV2aWNlL2V2ZW50LzE5OTJxMi9kZXZpY2UtZXZlbnQtMDAwMS1vZi0wMDAxLmpzb24uemlw`

// Instantiates a client
const storage = Storage();
const pubsub = PubSub();

const TOPIC_TO_PUBLISH = 'load-to-marklogic';
//const message = JSON.stringify(data)
const pubsubTopic = pubsub.topic(TOPIC_TO_PUBLISH, {'autocreate': true}); // set the topic to publish to
const publisher = pubsubTopic.publisher(
    {
             batching: {
               maxMessages: 100,
               maxMilliseconds: 10000,
             },
           }   
       )

//fs.createReadStream('./drug-event-0028-of-0028.json.zip')
const file = storage.bucket(bucket).file(name);
file.createReadStream()
.pipe(unzipper.ParseOne())
.pipe(JSONStream.parse('results.*')) // separate records from the 'results' array
//.pipe(fs.createWriteStream('./drug-event-0028-of-0028.json'))
.on('data', function(data) {
    const buffer = Buffer.from(JSON.stringify(data)); // publish api requires data to be buffered
    //pubsubTopic.publisher().publish(buffer, function(error){console.log(error)}) // add custom attributes tracking provenance
    publisher.publish(buffer) // add custom attributes tracking provenance
})
.on('end', function(){
    memoryCallback()
    console.log('stream finished')
})
.on('finish', function(){
    memoryCallback()
    console.log('stream finished')
}); 
