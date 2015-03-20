"use strict";

var path = require('path');
var fs = require('fs');

var LocalAdapter = function(config) {

    this.config = config;
    this.outDir = path.join(process.cwd(), 'public', 'files');
    this.baseUrl = 'http://api.noserv.io/files';

    if(config && config.path && config.serverUrl) {

        this.outDir = path.join(process.cwd(), config.path);
        this.baseUrl = config.baseUrl;
    }
};

module.exports = LocalAdapter;

LocalAdapter.prototype.saveFileFromPath = function(localPath, appId, newFileName, callback) {

    var outDir = path.join(this.outDir, appId);
    var newPath = path.join(outDir, newFileName);

    if(!fs.existsSync(outDir)) {

        fs.mkdirSync(outDir);
    }

    fs.createReadStream(localPath).pipe(fs.createWriteStream(newPath));

    callback(null, {newPath : newPath, url : this.baseUrl + '/' + appId + '/' + newFileName});
};

LocalAdapter.prototype.saveFileFromBuffer = function(buffer, appId, newFileName, callback) {

    var outDir = path.join(this.outDir, appId);
    var newPath = path.join(outDir, newFileName);

    if(!fs.existsSync(outDir)) {

        fs.mkdirSync(outDir);
    }

    var self = this;

    fs.writeFile(newPath, buffer, function() {

        callback(null, {newPath : newPath, url : self.baseUrl + '/' + appId + '/' + newFileName});
    });
};

LocalAdapter.prototype.removeFile = function(path, callback) {

    fs.unlink(path, function() {

        callback(null);
    });
};