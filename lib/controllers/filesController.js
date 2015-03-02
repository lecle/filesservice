"use strict";

var path = require('path');
var fs = require('fs');

var _ = require('lodash');

exports.create = function(req, res, container) {

    var data = req.data;
    var outDir = path.join(process.cwd(), 'public', 'files', req.session.appid);

    if(container.getConfig('fileDir'))
        outDir = path.join(process.cwd(), container.getConfig('fileDir'), req.session.appid);

    if(!fs.existsSync(outDir)) {

        fs.mkdirSync(outDir);
    }

    var contentType = req.contentType;
    var config = container.getConfig();

    if(req.files) {

        for(var key in req.files) {

            var fileName = req.files[key].name;
            var filePath = req.files[key].path;

            if(req.params._fileName)
                fileName = req.params._fileName;

            var newFileName = generateRandomString(32) + fileName;
            var newFilePath = path.join(outDir, newFileName);

            fs.createReadStream(filePath).pipe(fs.createWriteStream(newFilePath));

            afterFileSave(fileName, newFileName, newFilePath);

            break;
        }
    } else if(req.body) {

        var fileName = req.params._fileName;
        var newFileName = generateRandomString(32) + fileName;
        var newFilePath = path.join(outDir, newFileName);

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

        data = {};

        fs.writeFile(newFilePath, buffer, function() {

            afterFileSave(fileName, newFileName, newFilePath);
        });
    }

    function afterFileSave(fileName, newFileName, newFilePath) {

        data._className = '_Files';
        data.url = config.server.url + '/files/' + req.session.appid + '/' + newFileName;
        data.name = newFileName;
        data.originalName = fileName;
        data.realFilePath = newFilePath;
        data.contentType = req.contentType;

        var stat = fs.statSync(newFilePath);

        data.size = stat.size;

        container.getService('MONGODB').then(function(service) {

            service.send('insert', {collectionName : req.session.appid, data : data}, function(err, doc) {

                if(err)
                    return res.error(err);

                res.send(201, {
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

        service.send('findOne', {collectionName : req.session.appid, query : {where : {_className : '_Files', originalName : req.params._fileName}}}, function(err, doc) {

            if(err)
                return res.error(err);

            if(doc.data) {

                service.send('remove', {collectionName : req.session.appid, query : {where : {_className : '_Files', originalName : req.params._fileName}}}, function(err, cnt) {

                    if(err)
                        return res.error(err);

                    fs.unlink(doc.data.realFilePath, function() {});

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

function generateRandomString(length) {

    length = length ? length : 32;

    var rdmString = "";

    for( ; rdmString.length < length; rdmString  += Math.random().toString(36).substr(2));

    return  rdmString.substr(0, length);
}