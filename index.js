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

var 
users = {
	donationAlerts: null,
	twitch: null
},
tokens = {
	donationAlerts: null,
	twitch: null
},
postData;
app.get('/da', function(req, res) {
	if (req.query.code) {
		var code = req.query.code,

		if (tokens.donationAlerts === null/* && (!req.query.refresh || req.query.refresh === 'false' || req.query.refresh === '0')*/) {
			postData = {
				'grant_type': 'authorization_code', 
				'client_id': donationAlerts.clientId,
				'client_secret': donationAlerts.clientSecret,
				'redirect_uri': donationAlerts.redirectUri,
				'scope': donationAlerts.scope,
				'code': code
			};
		} else {
			postData = {
				'grant_type': 'refresh_token',
				'client_id': donationAlerts.clientId,
				'client_secret': donationAlerts.clientSecret,
				'redirect_uri': donationAlerts.redirectUri,
				'refresh_token': tokens.donationAlerts.refresh_token,
				'scope': donationAlerts.scope
			};
		}

		axios({
			url: 'https://www.donationalerts.com/oauth/token',
			method: 'post',
			data: postData,
			validateStatus: function (status) {
				return status >= 200 && status < 300;
			},
		}).then(t => {
			if (t.data) {
				tokens.donationAlerts = t.data;
				if (tokens.donationAlerts === null) getUserInfo.donationAlerts();
				/*setTimeout(function() {
					axios({
						url: req.url
					})
					.then()
					.catch();
				}, tokens.expiry);*/
				res.end();
			}
		})
		.catch(e => {
			console.log(e);
		});
	}
});

app.get('/twitch', function(req, res) {
	if (req.query.code) {
		var code = req.query.code;


		if (tokens.twitch === null/* && (!req.query.refresh || req.query.refresh === 'false' || req.query.refresh === '0')*/) {
			postData = {
				'grant_type': 'authorization_code', 
				'client_id': twitch.clientId,
				'client_secret': twitch.clientSecret,
				'redirect_uri': twitch.redirectUri,
				'scope': twitch.scope,
				'code': code
			};
		} else {
			postData = {
				'grant_type': 'refresh_token',
				'client_id': twitch.clientId,
				'client_secret': twitch.clientSecret,
				'redirect_uri': twitch.redirectUri,
				'refresh_token': tokens.twitch.refresh_token,
				'scope': twitch.scope
			};
		}

		axios({
			url: 'https://id.twitch.tv/oauth2/token',
			method: 'post',
			data: postData,
			validateStatus: function (status) {
				return status >= 200 && status < 300;
			},
		}).then(t => {
			if (t.data) {
				tokens.twitch = t.data;
				if (tokens.twitch === null) getUserInfo.twitch();
				res.end();
			}
		})
		.catch(e => {
			console.log(e);
		});
	}
});

var getUserInfo = {
	donationAlerts: function() {
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
			if (u.data && u.data.data) {
				users.donationAlerts = u.data.data;
				run();
			}
		})
		.catch(e => {
			console.log(e);
		});
	},
	twitch: function() {
		axios({
			method: 'get',
			url: 'https://api.twitch.tv/helix/users?login=qk4req',
			headers: {
				'Authorization': `${tokens.twitch.token_type} ${tokens.twitch.access_token}`
			},
			validateStatus: function (status) {
				return status >= 200 && status < 300;
			},
		})
		.then(u => {
			if (u.data) {
				users.twitch = u.data;
				run();
			}
		})
		.catch(e => {
			console.log(e);
		});
	}
}

function run () {
	if (users.donationAlerts !== null && users.twitch !== null) {
		/*io.use(sioJwtAuth.authenticate(require('./configs/jwt'), function(payload, done) {
			if (payload) {
				return done();
			}
		}));*/
		glob('./listeners/*Listener.js', function(e, matches) {
			matches.forEach(function(file) {
				require(file)(io, tokens, users, {donationAlerts: donationAlerts, twitch: twitch});
				//require(path.resolve(file))(io, {donationAlertsUser: user, tokens: tokens});
			});
		});
	}			
}


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