const fs = require('fs');
const path = require('path');
const glob = require('glob');
const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const sioJwtAuth = require("socketio-jwt-auth");

io.use(sioJwtAuth.authenticate({
	secret: '52f4682f90d0c911209f99cc6de0d91c',
	algorithm: 'HS256'
}, function(payload, done) {
	glob.sync('./listeners/*Listener.js').forEach(function(file) {
		require(path.resolve(file))(io, payload, done);
	});
	/*User.findOne({id: payload.sub}, function(err, user) {
		if (err) {
			return done(err);
		}
		if (!user) {
			return done(null, false, 'user does not exist');
		}
		return done(null, user);
	});*/
}));

setInterval(function() {
	var ready = false;
	fs.access('./tmp/test.m3u8', fs.F_OK, (err) => {
		var broadcast = io.of('/broadcast');
		if (ready === false && !err) {
			broadcast.emit('ready');
		} else {
			broadcast.emit('notReady');
		}
	});
}, 5000);

server.listen(3000, function() {
	console.log('Listen 3000 port!');
});
