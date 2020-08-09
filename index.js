const fs = require('fs');
const path = require('path');
const glob = require('glob');
const axios = require('axios');
const express = require('express')();
const server = require('http').createServer(express);
const io = require('socket.io')(server);
const sioJwtAuth = require('socketio-jwt-auth');

function run () {
	glob('./listeners/*Listener.js', function(e, matches) {
		matches.forEach(function(file) {
			require(file)(io, express);
			//require(path.resolve(file))(io, {donationAlertsUser: user, tokens: tokens});
		});
	});
	//if (users.donationAlerts !== null && users.twitch !== null) {
		/*io.use(sioJwtAuth.authenticate(require('./configs/jwt'), function(payload, done) {
			if (payload) {
				return done();
			}
		}));*/
	//}			
}

run();


/*setInterval(function() {
	var ready = false;
	fs.access('./tmp/test.m3u8', fs.F_OK, (err) => {
		var broadcast = io.of('/broadcast');
		if (ready === false && !err) {
			broadcast.emit('ready');
		} else {
			broadcast.emit('notReady');
		}
	});
}, 5000);*/

server.listen(3000, function() {
	console.log('Listen 3000 port!');
});