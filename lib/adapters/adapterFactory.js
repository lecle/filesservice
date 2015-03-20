"use strict";

module.exports.getAdapter = function(config) {

    var Adapter = null;

    if(config && config.type === 's3')
        Adapter = require('./s3Adapter');
    else
        Adapter = require('./localAdapter');

    return new Adapter(config);
};