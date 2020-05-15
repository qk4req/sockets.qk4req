const fs = require('fs');
const path = require('path');
const glob = require('glob');
const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

glob.sync('./listeners/*Listener.js').forEach(function(file) {
	require(path.resolve(file))(io);
});

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