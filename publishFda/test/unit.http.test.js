const test = require('ava');
const sinon = require(`sinon`);
const uuid = require(`uuid`);
const rewire = require(`rewire`);

const uploadFromUrl = require(`..`).uploadFromUrl;

const app = rewire('../index.js');

test(`publish a message`, t => {

  const message = {
    "objectGeneration": "1531955353874591", 
    "eventTime": "2018-07-18T23:09:13.874314Z", 
    "bucketId": "drug_portal", 
    "eventType": "OBJECT_FINALIZE", 
    "notificationConfig": "projects/_/buckets/drug_portal/notificationConfigs/4", 
    "payloadFormat": "JSON_API_V1", 
    "objectId": "data/fda/aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL2V6YmMvZHJ1Zy1wb3J0YWwtY2xvdWQtZnVuY3Rpb25zL2ViYTcwODczNzdiZGFkOWZjYzlhZWI3MTlmMGE0YTU4YmU3NzJiY2YvcmVzb3VyY2VzL3Rlc3QuanNvbi56aXA="
    };

  

  // Verify behavior of tested function
  //t.true(res.send.calledOnce);
  t.deepEqual(res.send.firstCall.args, expectedResult);
});
