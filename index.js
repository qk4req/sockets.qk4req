const express = require('express')();
const io = require('socket.io')(server);
const path = require('path');

const server = require('http').createServer(express);

server.listen(3000, function() {
	console.log('Listen 3000 port!');
});

glob.sync('./modules/*Module.js').forEach(function(file) {
	require(path.resolve(file))(io);
});