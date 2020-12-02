const winston = require('winston');
const logger = winston.createLogger({
	level: winston.config.syslog.levels,
	format: winston.format.json(),
	transports: [
		new winston.transports.Console(),
		new winston.transports.File({
			filename: 'logs/error.log',
			level: 'error'
		}),
		new winston.transports.File({
			filename: 'logs/warn.log',
			level: 'warn'
		}),
		new winston.transports.File({
			filename: 'logs/info.log',
			level: 'info'
		}),
		new winston.transports.File({
			filename: 'logs/combo.log'
		})
	],
	exceptionHandlers: [
		new winston.transports.Console(),
		new winston.transports.File({filename: 'logs/exceptions.log'})
	],
	rejectionHandlers: [
		new winston.transports.Console(),
		new winston.transports.File({filename: 'logs/rejections.log'})
	],
	exitOnError: false
});
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const axios = require('axios');
const express = require('express')();
const server = require('http').createServer(express);
const io = require('socket.io')(server);
const sioJwtAuth = require('socketio-jwt-auth');
const moment = require('moment');


function run () {
	glob('./controllers/*Controller.js', function(e, matches) {
		matches.forEach(function(file) {
			require(file)(io, express, logger);
		});
	});		
}

run();

server.listen(3000, function() {
	console.log('Listen 3000 port!');
});