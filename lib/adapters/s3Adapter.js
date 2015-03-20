"use strict";

var aws = require('aws-sdk');

var S3Adapter = function(config) {

    this.config = config;
    this.bucket = config.bucket;

    aws.config.update({ accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey });
};

module.exports = S3Adapter;

S3Adapter.prototype.saveFileFromPath = function(localPath, appId, newFileName, callback) {

    var fs = require('fs');
    var fileStream = fs.createReadStream(localPath);

    var bucket = this.bucket;

    fileStream.on('error', function (err) {
        if (err) { return callback(err); }
    });

    fileStream.on('open', function () {

        var s3 = new aws.S3();
        s3.upload({
            Bucket: bucket,
            Key: appId + '/' + newFileName,
            Body: fileStream
        }, function(err, data) {

            if(err)
                return callback(err);

            callback(null, {newPath : appId + '/' + newFileName, url : data.Location.replace('https://', 'http://')});
        });
    });
};

S3Adapter.prototype.saveFileFromBuffer = function(buffer, appId, newFileName, callback) {

    var s3 = new aws.S3();
    s3.upload({
        Bucket: this.bucket,
        Key: appId + '/' + newFileName,
        Body: buffer
    }, function(err, data) {

        if(err)
            return callback(err);

        callback(null, {newPath : appId + '/' + newFileName, url : data.Location.replace('https://', 'http://')});
    });
};

S3Adapter.prototype.removeFile = function(path, callback) {

    var s3 = new aws.S3();
    s3.deleteObject({
        Bucket: this.bucket,
        Key: path
    }, function(err, data) {

        if(err)
            return callback(err);

        callback(null);
    });
};
