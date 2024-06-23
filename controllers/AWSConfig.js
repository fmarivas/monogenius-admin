require('dotenv').config()
const S3 = require('aws-sdk/clients/s3')
const fs = require('fs')

const bucketName = process.env.AWS_BUCKET_NAME
const region = process.env.AWS_BUCKET_REGION
const accessKeyId = process.env.AWS_ACCESS_KEY
const secretAccessKey = process.env.AWS_SECRET_KEY

const s3 = new S3({
    region,
    credentials: {
        accessKeyId,
        secretAccessKey
    }
});

const getFile = (fileKey)=> {
	const params = {
		Bucket: bucketName,
		Key: fileKey
	}
	
	return s3.getSignedUrlPromise('getObject', params);
}
module.exports = {
	getFile,
}