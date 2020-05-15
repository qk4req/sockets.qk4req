const path = require('path');
const glob = require('glob');
const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

glob.sync('./listeners/*Listener.js').forEach(function(file) {
	require(path.resolve(file))(io);
});

app.get("/broadcast/ready", function() {
	io().of('/broadcast').emit('ready', {});
});

server.listen(3000, function() {
	console.log('Listen 3000 port!');
});