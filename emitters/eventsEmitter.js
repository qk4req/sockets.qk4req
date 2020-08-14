module.exports = async function (io, express) {
	const Twitch = require('twitch');
	const {RefreshableAuthProvider, StaticAuthProvider} = Twitch;
	const TwitchWebhooks = require('twitch-webhooks');
	const {SimpleAdapter} = TwitchWebhooks;
	//const axios = require('axios');
	const passport = require('passport');
	const TwitchStrategy = require('@d-fischer/passport-twitch').Strategy;
	const DonationAlertsStrategy = require('../libraries/passport-da');
	const ws = require('ws');
	const Centrifuge = require('centrifuge');
	const db = require('../libraries/db');
	const twitch = require('../configs/twitch');
	const donationAlerts = require('../configs/donationAlerts');



	const events = io.of('/events');

	var notifications, easterEggs, byDefault = {};
	db.query('SELECT * FROM notifications')
		.then(([rows,fields]) => {
			notifications = rows;
			notifications.forEach(function(notification) {
				byDefault[notification['type']] = {
					id: notification['id'],
					src: notification['src'],
					volume: notification['volume']
				};
			});
			db.query('SELECT * FROM easter_eggs')
			.then(([rows,fields]) => {
				easterEggs = rows;

				passport.use(new TwitchStrategy({
						clientID: twitch.clientId,
						clientSecret: twitch.clientSecret,
						callbackURL: twitch.redirectUri,
						scope: twitch.scope
					},
					async function(accessToken, refreshToken) {
						const authProvider = new RefreshableAuthProvider(
							new StaticAuthProvider(twitch.clientId, accessToken),
							{
								clientSecret: twitch.clientSecret,
								refreshToken: refreshToken,
								/*onRefresh: (token) => {
									//tw = new Twitch({ authProvider });
									//const user = await client.helix.users.getUserById(twitch.user.id);
									console.log(token);
								}*/
							}
						);
						const apiClient = new Twitch({authProvider});
						const listener = new TwitchWebhooks(apiClient, new SimpleAdapter({
							hostName: 'http://webhooks.qk4req.ru',
							listenerPort: 88
						}));
						listener.listen();

						const subscription1 = await listener.subscribeToFollowsToUser(twitch.user.id, async (follow) => {
							console.log('To user:');
							console.log(follow);
						});

						const subscription2 = await listener.subscribeToFollowsFromUser(twitch.user.id, async (follow) => {
							console.log('From user:');
							console.log(follow);
						});
					}
				));
				passport.use(new DonationAlertsStrategy({
						clientID: donationAlerts.clientId,
						clientSecret: donationAlerts.clientSecret,
						callbackURL: donationAlerts.redirectUri,
						scope: donationAlerts.scope
					},
					function(accessToken, refreshToken, user, done) {
						var da = new Centrifuge('wss://centrifugo.donationalerts.com/connection/websocket', {
							debug: true,
							websocket: ws,
							subscribeEndpoint: 'https://www.donationalerts.com/api/v1/centrifuge/subscribe',
							subscribeHeaders: {
								'Authorization': `Bearer ${accessToken}`,
								'Content-Type': 'application/json'
							}
						});
						da.setToken(user['socket_connection_token']);
						da.connect();


						da.on('connect', function(context) {
							console.log('Connected to DonationAlerts!');
							da.subscribe(`$alerts:donation_${user.id}`, function(alert) {
								console.log(alert);
								if (alert['data']) {
									var donation = alert['data'];

									/*axios.post('https://streamlabs.com/polly/speak',
										null,
										{
											params: {
												'text': donation['message'],
												'voice': 'Maxim'
											}
										}
									)
									.then(dubbing => {
										var dubbing = dubbing['data'];
										if (dubbing['success']) {*/
											var easterEggId = null;
											easterEggs.forEach(function(egg) {
												switch(egg['expression']) {
													case '=>':
													case '>=':
														if (donation['amount'] >= egg['value']) easterEggId = egg['id'];
													break;
													case '<=':
													case '=<':
														if (donation['amount'] <= egg['value']) easterEggId = egg['id'];
													break;
													case '===':
													case '==':
														if (donation['amount'] == egg['value'] || donation['amount'] === egg['value']) easterEggId = egg['id'];
													break;
												}
											});
											donation['notification'] = {
												'type': 'donation',
												id: byDefault['donation']['id'],
												src: byDefault['donation']['src'],
												volume: byDefault['donation']['volume']
											};
											donation['created_at'] = Math.floor(Date.now()/1000);
											console.log(donation);
											/*db.execute(
												`INSERT INTO donations(easter_egg_id, notification_id, name, amount, currency, comment, created_at) VALUES(?, ?, ?, ?, ?, ?, ?)`,
												[easterEggId, easterEggId === null ? byDefault['donation']['id'] : null, donation['username'], donation['amount'], donation['currency'], donation['message'], donation['created_at']],
												async function(e) {
													if (e) console.log(e);
													else {
														await events.emit('created', {success: true, payload: [donation]});
													}
												}
											);*/
										/*}
									})
									.catch(console.log);*/
								}
							});
						});
					}
				));

				express.get('/twitch', passport.authenticate('twitch'));
				express.get('/da', passport.authenticate('da'));
			})
			.catch(console.log)
		})
		.catch(console.log);

	/*db.query('SELECT * FROM notifications', function(e, notifications) {
		if (!e) {
			db.query('SELECT * FROM easter_eggs', function(e, easterEggs) {
				if (!e) {
					var byDefault = {};
					notifications.forEach(function(n) {
						byDefault[n['type']] = {
							id: n['id'],
							src: n['src'],
							volume: n['volume']
						};
					});


					da.on('connect', function(context) {
						console.log('Connected to DonationAlerts!');
						da.subscribe(`$alerts:donation_${opts['user']['id']}`, function(alert) {
							console.log(alert);
							if (alert['data']) {
								var donation = alert['data'];

								axios.post('https://streamlabs.com/polly/speak',
									null,
									{
										params: {
											'text': donation['message'],
											'voice': 'Maxim'
										}
									}
								)
								.then(dubbing => {
									var dubbing = dubbing['data'];
									if (dubbing['success']) {
										var easterEggId = null;
										easterEggs.forEach(function(egg) {
											switch(egg['expression']) {
												case '=>':
												case '>=':
													if (donation['amount'] >= egg['value']) easterEggId = egg['id'];
												break;
												case '<=':
												case '=<':
													if (donation['amount'] <= egg['value']) easterEggId = egg['id'];
												break;
												case '===':
												case '==':
													if (donation['amount'] == egg['value'] || donation['amount'] === egg['value']) easterEggId = egg['id'];
												break;
											}
										});
										donation['notification'] = {
											'type': 'donation',
											id: byDefault['donation']['id'],
											src: byDefault['donation']['src'],
											volume: byDefault['donation']['volume']
										};
										donation['created_at'] = Math.floor(Date.now()/1000);
										db.execute(
											`INSERT INTO donations(easter_egg_id, notification_id, name, amount, currency, comment, created_at) VALUES(?, ?, ?, ?, ?, ?, ?)`,
											[easterEggId, easterEggId === null ? byDefault['donation']['id'] : null, donation['username'], donation['amount'], donation['currency'], donation['message'], donation['created_at']],
											async function(e) {
												if (e) console.log(e);
												else {
													await events.emit('created', {success: true, payload: [donation]});
												}
											}
										);
									}
								})
								.catch(e => {
									console.log(e);
								});
							}
						});
					});

					/*sl.on('connect', function() {
						console.log('Connected *!@#&*!#&!#*&@!to Streamlabs!');
						sl.on('event', (data) => {
							console.log(data);
							if (data) {
								if (data['for'] === 'twitch_account') {
									switch (data['type']) {
										case 'follow':
											var follower = data['message'][0];
											follower['notification'] = {
												type: 'follower',
												id: byDefault['follower']['id'],
												src: byDefault['follower']['src'],
												volume: byDefault['follower']['volume']
											};
											follower['created_at'] = Math.floor(Date.now()/1000);
											db.execute(
												'INSERT INTO followers(notification_id, name, created_at) VALUES(?, ?, ?)',
												[follower['notification']['id'], follower['name'], follower['created_at']],
												function(e) {
													if (e) console.log(e);
													else {
														events.emit('created', {success: true, payload: [follower]});
													}
												}
											);
										break;
										case 'subscription':
										case 'resub':
											var subscription = data['message'][0];
											subscription['notification'] = {
												type: 'subscription',
												id: byDefault['subscription']['id'],
												src: byDefault['subscription']['src'],
												volume: byDefault['subscription']['volume']
											};
											subscription['created_at'] = Math.floor(Date.now()/1000);
											db.execute(
												'INSERT INTO subscriptions(notification_id, name, months, created_at) VALUES(?, ?, ?, ?)',
												[subscription['notification']['id'], subscription['name'], subscription['months'], subscription['created_at']],
												function(e) {
													if (e) console.log(e);
													else {
														events.emit('created', {success: true, payload: [subscription]});
													}
												}
											);
										break;
									}
								}
							}
						});
					});
				}
			});
		}
	});*/

	/*var
	users = {
		donationAlerts: null,
		twitch: null
	},
	tokens = {
		donationAlerts: null,
		twitch: null
	},
	postData, webhook;



	/***
	DONATIONALERTS
	**
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
				url: 'https://donationalerts.com/oauth/token',
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
					}, tokens.donationAlerts.expires_in);
					res.end();
				}
			})
			.catch(e => {
				console.log(e);
			});
		}
	});

	/*express.get('/twitch', function(req, res) {
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

					webhook = new twitchWebhook({
						client_id: twitch.clientId,
						callback: 'Your Callback URL',
						secret: twitch.clientSecret, // default: false
						lease_seconds: 259200,		// default: 864000 (maximum value)
						listen: {
							port: 8080,						 // default: 8443
							host: '127.0.0.1',			// default: 0.0.0.0
							autoStart: false				// default: true
						}
					});
					twitchWebhook.on('*', ({ topic, options, endpoint, event }) => {
						// topic name, for example 'streams'
						console.log(topic)
						// topic options, for example '{user_id: 12826}'
						console.log(options)
						// full topic URL, for example
						// 'https://api.twitch.tv/helix/streams?user_id=12826'
						console.log(endpoint)
						// topic data, timestamps are automatically converted to Date
						console.log(event)
					});

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
	**

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
	}*/

	
}