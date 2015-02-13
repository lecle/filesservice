var files = require('../lib/files');

var req = {
    data : {

        checklist : ['APIAUTH', 'SESSION', 'MASTERKEY'],
        headers : {
            'x-noserv-session-token' : 'supertoken',
            'x-noserv-application-id' : 'supertoken',
            'x-noserv-master-key' : 'supertoken'
        }
    }
};

var res = function(done) {

    return {
        send : function() {done();},
        error : function(err) {done(err);}
    };
};

var dummyContainer = {
    addListener : function(){},
    getService : function(name) {

        return {
            then : function(callback){ callback({send : function(command, data, callback) {

                callback(null, {data : {masterKey : 'test'}});
            }});

                return {fail : function(){}};
            }
        };
    }
};

describe('files', function() {
    describe('#init()', function () {
        it('should initialize without error', function (done) {

            files.init(dummyContainer, function (err) {

                files.close(done);
            });
        });
    });
});
