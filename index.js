const fs = require('fs');
const path = require('path');
const glob = require('glob');
const axios = require('axios');
const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const sioJwtAuth = require('socketio-jwt-auth');

const donationAlerts = require('./configs/donationAlerts');
const twitch = require('./configs/twitch');

var tokens = {
	donationAlerts: null,
	twitch: null
};
app.get('/', function(req, res) {
	if (req.query.code) {
		var code = req.query.code;

		if (tokens.donationAlerts === null && (!req.query.refresh || req.query.refresh === 'false' || req.query.refresh === '0')) {
			axios({
				url: donationAlerts.url,
				method: donationAlerts.method,
				data: {
					'grant_type': 'authorization_code', 
					'client_id': donationAlerts.clientId,
					'client_secret': donationAlerts.clientSecret,
					'redirect_uri': donationAlerts.redirectUri,
					'code': code
				},
			}).then(a => {
				if (a.data) {
					tokens.donationAlerts = a.data;
					run();
					res.end();
				}
			})
			.catch(e => {
				console.log(e);
			});
		} else {
			axios({
				url: donationAlerts.url,
				method: donationAlerts.method,
				data: {
					'grant_type': 'refresh_token',
					'client_id': donationAlerts.clientId,
					'client_secret': donationAlerts.clientSecret,
					'redirect_uri': donationAlerts.redirectUri,
					'refresh_token': tokens.donationAlerts.refresh_token,
					'scope': 'oauth-user-show oauth-donation-subscribe'
				},
			}).then(r => {
				if (r.data) {
					tokens.donationAlerts = r.data;
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
			'Authorization': `${tokens.donationAlerts.token_type} ${tokens.donationAlerts.access_token}`
		},
		validateStatus: function (status) {
			return status >= 200 && status < 300;
		},
	})
	.then(u => {
		var user = u.data;
		if (user.data) {
			user = user.data;
			/*io.use(sioJwtAuth.authenticate(require('./configs/jwt'), function(payload, done) {
				if (payload) {
					return done();
				}
			}));*/
			glob.sync('./listeners/*Listener.js').forEach(function(file) {
				require(path.resolve(file))(io, {donationAlertsUser: user, tokens: tokens});
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
