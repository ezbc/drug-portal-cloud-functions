const test = require('ava');
const sinon = require(`sinon`);
const uuid = require(`uuid`);
const rewire = require(`rewire`);

const uploadFromUrl = require(`..`).uploadFromUrl;

const app = rewire('../index.js');

test(`request to upload a URL`, t => {

  // Initialize mocks
  const url = `https://github.com/ezbc/drug-portal-cloud-functions/raw/master/resources/device-enforcement-0001-of-0001.json.zip`
  const req = {
    body: {
      url: url
    }
  };

  const res = { send: sinon.stub() };

  const writePersistor = function(filename) {
    return {
      'createWriteStream': function(){
        return {
          'write': function(data) {}, 
          'end': function() {console.log('stream ended')}
        }
      },
      'filepath': 'test/filepath'
    }
  }

  //const mockWritePersistor = sinon.mock(writePersistor);
  //mockWritePersistor.expects()
  
  const persistors = {'writePersistor': writePersistor, 'readPersistor': 'http'};

  // Call tested function
  app.__get__('uploadFromUrlWithPersistors')(req, res, persistors);

  const expectedResult = [{
    "destinationUrl": "test/filepath",
    "requestUrl": "https://github.com/ezbc/drug-portal-cloud-functions/raw/master/resources/device-enforcement-0001-of-0001.json.zip",
    "status": "uploaded"
  }]

  // Verify behavior of tested function
  //t.true(res.send.calledOnce);
  t.deepEqual(res.send.firstCall.args, expectedResult);
});
