const test = require('ava');
const sinon = require(`sinon`);
const uuid = require(`uuid`);

const uploadFromUrl = require(`..`).uploadFromUrl;

test(`uploadFromUrl should encode a url`, t => {

  // Initialize mocks
  const url = `http://example.com`
  const req = {
    body: {
      url: url
    }
  };
  const res = { send: sinon.stub() };

  // Call tested function
  uploadFromUrl(req, res);

  // Verify behavior of tested function
  t.true(res.send.calledOnce);
  t.deepEqual(res.send.firstCall.args, [`http%3A%2F%2Fexample.com`]);
});
