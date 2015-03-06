"use strict";

var _ = require('lodash');
var controller = require('./controllers/filesController');

exports.container = null;

exports.init = function(container, callback) {

    exports.container = container;

    container.addListener('request', onRequest);
    container.addListener('getStat', getStat);

    callback(null);
};

exports.close = function(callback) {

    callback(null);
};

exports.request = onRequest;


function getStat(req, res) {

    controller.getStat(req.data, res, exports.container);
}

function onRequest(req, res) {

    if(req.data.params._query1)
        req.data.params._fileName = req.data.params._query1;

    var checklist = ['APIAUTH'];

    var dest = getRouteDestination(req.data);

    if(!dest) {

        return res.error(new Error('ResourceNotFound'))
    }

    if(dest === 'destroy')
        checklist.push('MASTERKEY');

    exports.container.getService('AUTH').then(function(service) {

        var reqData = {checklist : checklist};

        var deep = function(a, b) {
            return _.isObject(a) && _.isObject(b) ? _.assign(a, b, deep) : b;
        };

        service.send('check', _.assign(reqData, req.data, deep), function(err, response) {

            if(err) {

                return res.error(err);
            }

            setReqFromSession(req.data, req.data.session);

            controller[dest](req.data, res, exports.container);
        });

    }).fail(function(err) {

        res.error(new Error('auth service not found'));
    });
}

function setReqFromSession(reqData, session) {

    reqData.session = session;

    if(session.userid) {

        reqData.query.where._userid = session.userid;

        if(reqData.data)
            reqData.data._userid = session.userid;
    }

    if(session.appid) {

        reqData.query.where._appid = session.appid;

        if(reqData.data)
            reqData.data._appid = session.appid;
    }
}

function getRouteDestination(reqData) {

    var dest = '';

    switch(reqData.method) {

        case 'POST' :
            dest = 'create';
            break;

        case 'DELETE' :
            dest = 'destroy';
            break;
    }
    return dest;
}