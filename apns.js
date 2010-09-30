var sys = require('sys'),
net = require('net'),
fs = require('fs'),
crypto = require('crypto'),
Buffer = require('buffer').Buffer,
events = require('events');

exports.createServer = function(pem_path, host, port) {
    var options = {};
    options.pem_path = pem_path;
    options.host = host || 'gateway.sandbox.push.apple.com';
    options.port = port || 2195;

    var server = new APNS(options);

    return server;
}

APNS = function(options) {
    events.EventEmitter.call(this);
    var self = this;
    var pem = fs.readFileSync(options.pem_path, 'ascii');

    var client = this.client = net.createConnection(options.port, options.host);

    var credentials = crypto.createCredentials({
        ca: pem,
        key: pem,
        cert: pem
    });

    client.setEncoding('utf8');
    client.setNoDelay(true);
    client.setKeepAlive(true);

    client.on('connect', function() {
        sys.puts('APNS: Connected.');
        client.setSecure(credentials);
    });

    client.on('secure', function() {
        console.log('APNS: Secure.');
        self.emit('connect');
    });

    client.on('error', function(exception) {
        sys.puts('APNS: ' + exception.toString());
        self.emit('end');
    });

    client.on('end', function() {
        sys.puts('APNS: Disconnected.');
        client.end();
        self.emit('end');
    });

    client.on('close', function() {
        sys.puts('APNS: Closed.');
    });

    client.on('data', function(data) {
        // buffer message
        var p = [];
        for (var i = 0; i < data.length; i++) {
            p.push(str.charCodeAt(i));
        }
        // emit error
        sys.puts('DATA! ' + p);
    });
}

sys.inherits(APNS, events.EventEmitter);


APNS.prototype.end = function() {
    this.client.end();
}



APNSMessage = function() {
    var self = this;
}

APNSMessage.prototype.hex_pack = function(str) {
    var p = [];
    for (var i = 0; i < str.length; i = i + 2) {
        p.push(parseInt(str[i] + str[i + 1], 16));
    }
    return p;
}

APNSMessage.prototype.ascii_pack = function(str) {
    var p = [];
    for (var i = 0; i < str.length; i++) {
        p.push(str.charCodeAt(i));
    }
    return p;
}

APNSMessage.prototype.uint32_to_bytes = function(i) {
    var p = [];

    p.push((i >> 24) & 0xff);
    p.push((i >> 16) & 0xff);
    p.push((i >> 8) & 0xff);
    p.push((i >> 0) & 0xff);

    return p;
}


PushMessage = function(identifier, expiry, device_id, obj) {
    APNSMessage.call(this);

    var self = this;

    self.identifier = identifier;
    self.expiry = expiry;
    self.device_id = device_id;
    self.obj = obj;
}


sys.inherits(PushMessage, APNSMessage);


PushMessage.prototype.to_bytes = function() {
    var self = this;

    var json = JSON.stringify(self.obj);

    var a = [];
    a = a.concat(1, self.uint32_to_bytes(self.identifier), self.uint32_to_bytes(self.expiry));
    a = a.concat([0, 32], self.hex_pack(self.device_id), [0, json.length], self.ascii_pack(json));

    var buffer = new Buffer(a.length);
    var count = 0;
    a.forEach(function(e) {
        buffer[count] = e;
        count++;
    });

    return buffer;
}

PushMessage.prototype.send = function(conn) {
    conn.client.write(this.to_bytes());
}

exports.createMessage = function(identifier, expiry, device_id, obj) {
    return new PushMessage(identifier, expiry, device_id, obj);
}

ErrorReply = function(buffer) {
    APNSMessage.call(this);

    var self = this;

}

sys.inherits(ErrorReply, APNSMessage);

FeedbackReply = function(buffer) {
    APNSMessage.call(this);

    var self = this;

}

sys.inherits(FeedbackReply, APNSMessage);






