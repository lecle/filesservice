"use strict";

var path = require('path');
var fs = require('fs');

var _ = require('lodash');
var adapterFactory = require('../adapters/adapterFactory');

exports.create = function(req, res, container) {

    var data = req.data;

    var contentType = req.contentType;
    var fileAdapter = adapterFactory.getAdapter(container.getConfig('file'));

    if(req.files) {

        for(var key in req.files) {

            var fileName = req.files[key].name;
            var filePath = req.files[key].path;
            var fileSize = req.files[key].size;

            if(req.params._fileName)
                fileName = req.params._fileName;

            var newFileName = generateRandomString(32) + fileName;

            fileAdapter.saveFileFromPath(filePath, req.session.appid, newFileName, function(err, data) {

                if(err)
                    return res.error(err);

                afterFileSave(fileName, newFileName, data.newPath, data.url, fileSize);
            });

            break;
        }
    } else if(req.body) {

        var fileName = req.params._fileName;
        var newFileName = generateRandomString(32) + fileName;

        var buffer = '';

        if(_.isObject(req.body) && req.body['base64']) {

            buffer = new Buffer(req.body['base64'], 'base64');
            contentType = req.body['_ContentType'];
        } else if(req.params['base64']) {

            buffer = new Buffer(req.params['base64'], 'base64');
            contentType = req.params['_ContentType'];
        } else {

            buffer = req.body;
        }

        var fileSize = buffer.length;

        data = {};

        fileAdapter.saveFileFromBuffer(buffer, req.session.appid, newFileName, function(err, data) {

            if(err)
                return res.error(err);

            afterFileSave(fileName, newFileName, data.newPath, data.url, buffer.length);
        });
    }

    function afterFileSave(fileName, newFileName, newFilePath, url, size) {

        data._className = '_Files';
        data.url = url;
        data.name = newFileName;
        data.originalName = fileName;
        data.realFilePath = newFilePath;
        data.contentType = req.contentType;
        data.size = size;

        container.getService('MONGODB').then(function(service) {

            service.send('insert', {collectionName : req.session.appid, data : data}, function(err, doc) {

                if(err)
                    return res.error(err);

                res.send(201, {
                    objectId : doc.data.objectId,
                    url : data.url,
                    name : data.name,
                    _headers : {'Location' : data.url}
                });
            });

        }).fail(function(err) {

            res.error(err);
        });
    }
};

exports.destroy = function(req, res, container) {

    container.getService('MONGODB').then(function(service) {

        service.send('findOne', {collectionName : req.session.appid, query : {where : {_className : '_Files', '$or' : [{originalName : req.params._fileName}, {objectId : req.params._fileName}]}}}, function(err, doc) {

            if(err)
                return res.error(err);

            if(doc.data) {

                service.send('remove', {collectionName : req.session.appid, query : {where : {_className : '_Files', '$or' : [{originalName : req.params._fileName}, {objectId : req.params._fileName}]}}}, function(err, cnt) {

                    if(err)
                        return res.error(err);

                    var fileAdapter = adapterFactory.getAdapter(container.getConfig('file'));

                    fileAdapter.removeFile(doc.data.realFilePath, function() {});

                    res.send(200, {});
                });
            } else {

                res.send(200, {});
            }
        });
    }).fail(function(err) {

        res.error(err);
    });
};

exports.getStat = function(req, res, container) {

    if(req.appid) {

        container.getService('MONGODB').then(function(service) {

            service.send('aggregate', {
                collectionName : req.session.appid,
                query : [
                    { $match : { _className : '_Files' }},
                    { $group : {
                        _id : { _className : "$_className" },
                        size : { $sum : "$size" },
                        count: { $sum: 1 }
                    }}
            ]}, function(err, doc) {

                if(err)
                    return res.error(err);

                if(doc.data && doc.data.length === 1) {

                    res.send(200, {
                        size : doc.data[0].size,
                        count : doc.data[0].count
                    });
                } else {

                    res.error(404, new Error('not found'));
                }
            });
        }).fail(function(err) {

            res.error(err);
        });

    } else {

        res.error(new Error('appid is required'));
    }
};


exports.find = function(req, res, container) {

    container.getService('MONGODB').then(function (service) {

        req.query.where._className = '_Files';

        service.send('find', {collectionName : req.session.appid, query: req.query}, function (err, docs) {

            if (err)
                return res.error(err);

            for(var i= 0, cnt= docs.data.length; i<cnt; i++) {

                delete docs.data[i].realFilePath;
            }


            if (typeof(docs.data) === 'number') {

                res.send(200, {results: [], count: docs.data});
            } else {

                res.send(200, {results: docs.data});
            }
        });
    }).fail(function (err) {

        res.error(err);
    });
};


function generateRandomString(length) {

    length = length ? length : 32;

    var rdmString = "";

    for( ; rdmString.length < length; rdmString  += Math.random().toString(36).substr(2));

    return  rdmString.substr(0, length);
}