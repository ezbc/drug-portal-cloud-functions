
Cloud Function event processors for batch uploads to Pubsub.

# Overview

Two cloud functions are included in this project:

1. `uploadFromUrl` - for downloading a public file via HTTP(s) to a Google Cloud Storage Bucket.

1. `publishFDA` - for processing a batched partition export from openFDA.

These two cloud functions enable a streaming perscription to uploading batch data. `uploadFromUrl` downloads a
user-specified public file to a Google Cloud Storage Bucket. The bucket pushes a notification of the new object
on GCS to `publishFda`. `publishFda` unzips the file and streams records to a Pubsub message queue. Subscribers
downstream can then process the individual messages in Pubsub as a stream.
