module.exports = async function (io, express) {
	const {ApiClient, RefreshableAuthProvider, StaticAuthProvider} = require('twitch');
	const {PubSubClient} = require('twitch-pubsub-client');
	const {SimpleAdapter, WebHookListener} = require('twitch-webhooks');
	const axios = require('axios');
	const db = require('../libraries/db');
	const events = io.of('/events');


	const twitch = require('../configs/twitch');
	const donationAlerts = require('../configs/donationAlerts');


	var
	users = {
		donationAlerts: null,
		twitch: null
	},
	tokens = {
		donationAlerts: null,
		twitch: null
	},
	postData, auth;



	/***
	DONATIONALERTS
	***/
	express.get('/da', function(req, res) {
		if (req.query.code) {
			var code = req.query.code;

			if (tokens.donationAlerts === null) {
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
					if (users.donationAlerts === null) getUserInfo.donationAlerts();
					/*setTimeout(function() {
						axios({
							url: req.url
						})
						.then()
						.catch();
					}, tokens.donationAlerts.expires_in);*/
					res.end();
				}
			})
			.catch(e => {
				console.log(e);
			});
		}
	});

	express.get('/twitch', function(req, res) {
		if (req.query.code) {
			var code = req.query.code;


			if (tokens.twitch === null) {
				postData = {
					'client_id': twitch.clientId,
					'client_secret': twitch.clientSecret,
					'redirect_uri': twitch.redirectUri,
					'grant_type': 'authorization_code',
					'scope': twitch.scope,
					'code': code
				};
			} else {
				postData = {
					'client_id': twitch.clientId,
					'client_secret': twitch.clientSecret,
					'redirect_uri': twitch.redirectUri,
					'refresh_token': tokens.twitch.refresh_token,
					'grant_type': 'refresh_token',
					'scope': twitch.scope
				};
			}
			axios({
				url: 'https://id.twitch.tv/oauth2/token',
				method: 'post',
				params: postData,
				validateStatus: function (status) {
					return status >= 200 && status < 300;
				},
			}).then(t => {
				if (t.data) {
					tokens.twitch = t.data;

					auth = new RefreshableAuthProvider(
						new StaticAuthProvider(twitch.clientId, tokens.twitch.access_token, tokens.twitch.token_type),
						{
							clientSecret: twitch.clientSecret,
							refreshToken: tokens.twitch.refresh_token,
							//expiryTimestamp: !tokens.twitch.expiryTimestamp ? null : new Date(tokens.twitch.expiryTimestamp),
							onRefresh: ({ accessToken, refreshToken, expiry }) => {
								tokens.twitch.access_token = accessToken;
								tokens.twitch.refresh_token = refreshToken;
								tokens.twitch.expires_in = expiry;
								/*tokens.twitch.expiryTimestamp = !expiryDate ? null : expiryDate.getTime();
								const newTokenData = {
									accessToken,
									refreshToken,
									expiryTimestamp: expiryDate === null ? null : expiryDate.getTime()
								};
								await fs.writeFile('./tokens.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')*/
							}
						}
					);
					if (users.twitch === null) getUserInfo.twitch();
					res.end();
				}
			})
			.catch(e => {
				console.log(e);
			});
		}
	});

	/***
	TWITCH
	***/

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
				}
			})
			.catch(e => {
				console.log(e);
			});
		},
		twitch: function() {
			//console.log(tokens.twitch);
			tokenType = tokens.twitch.token_type;
			axios({
				method: 'get',
				url: `https://api.twitch.tv/helix/users?login=${twitch.user.name}`,
				headers: {
					'Client-ID': twitch.clientId,
					'Authorization': `${tokenType.charAt(0).toUpperCase() + tokenType.slice(1)} ${tokens.twitch.access_token}`
				},
				validateStatus: function (status) {
					return status >= 200 && status < 300;
				},
			})
			.then(u => {
				if (u.data) {
					users.twitch = u.data;
					console.log(users.twitch);
				}
			})
			.catch(e => {
				console.log(e);
			});
		}
	}

	const listener = new WebHookListener(auth, new SimpleAdapter({
		hostName: 'http://webhooks.qk4req.ru',
		listenerPort: 8090
	}));
	listener.listen();

	const sub = await listener.subscribeToFollowsToUser(twitch.user.id, async (follow) => {
		/*if (stream) {
			if (!prevStream) {
				console.log(`${stream.userDisplayName} just went live with title: ${stream.title}`);
			}
		} else {
			const user = await apiClient.helix.users.getUserById(userId);
			console.log(`${user.displayName} just went offline`);
		}
		prevStream = stream;*/
	});
}