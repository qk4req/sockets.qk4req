const fs = require('fs');
const path = require('path');
const glob = require('glob');
const commander = require('commander');
const axios = require('axios');
const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const sioJwtAuth = require("socketio-jwt-auth");
commander.
	option('-s, --secret <secret>', 'Extension secret').
	option('-t, --token <token>', 'Socket token').
	parse(process.argv);
const S = Buffer.from(commander['secret'], 'base64');
const T = commander['token'];

var token;
express.get('/', function(req, res) {
	if (req.query.code) {
		let code = req.query.code;

		if (token === undefined && (!req.query.refresh || req.query.refresh == 'false' || req.query.refresh == '0')) {
			axios({
				method: 'post',
				url: 'https://www.donationalerts.com/oauth/token',
				data: {
					'grant_type': 'authorization_code',
					'client_id': '33',
					'client_secret': 'sBqzxurEsE8WwYQg4ZR7fBCiUuUbneFOaQPWrnqi',
					'redirect_uri': 'http://sockets.qk4req.ru/',
					'code': code
				},
			}).then(a => {
				if (a.data) {
					token = a.data;
					run();
					res.end();
				}
			})
			.catch(e => {
				console.log(e);
			});
		} else {
			axios({
				method: 'post',
				url: 'https://www.donationalerts.com/oauth/token',
				data: {
					'grant_type': 'refresh_token',
					'client_id': '33',
					'client_secret': 'sBqzxurEsE8WwYQg4ZR7fBCiUuUbneFOaQPWrnqi',
					'redirect_uri': 'http://sockets.qk4req.ru/',
					'refresh_token': token['refresh_token'],
					'scope': 'oauth-user-show oauth-donation-subscribe'
				},
			}).then(r => {
				if (r.data) {
					token = r.data;
					run();
					res.end();
				}
			})
			.catch(e => {
				console.log(e);
			});
		}
	}
});

function run() {
	axios({
		method: 'get',
		url: 'https://www.donationalerts.com/api/v1/user/oauth',
		headers: {
			'Authorization': `${token['token_type']} ${token['access_token']}`
		},
		validateStatus: function (status) {
			return status >= 200 && status < 300; // default
		},
	})
	.then(u => {
		let user = u['data'];
		if (user['data']) {
			user = user['data'];
			/*io.use(sioJwtAuth.authenticate(require('./configs/jwt'), function(payload, done) {
				if (payload) {
					return done();
				}
			}));*/
			glob.sync('./listeners/*Listener.js').forEach(function(file) {
				require(path.resolve(file))(io, {user: user, secret: S, token: T});
			});
		}
	})
	.catch(e => {
		console.log(e);
	});
}



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
