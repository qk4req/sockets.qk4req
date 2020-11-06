module.exports = async function (io, express) {
	const Twitch = require('twitch');
	const {RefreshableAuthProvider, StaticAuthProvider} = Twitch;
	const TwitchWebhooks = require('twitch-webhooks');
	const {SimpleAdapter} = TwitchWebhooks;
	const PubSubClient = require('twitch-pubsub-client');
	const TwitchStrategy = require('@d-fischer/passport-twitch').Strategy;
	const DonationAlertsStrategy = require('../libraries/passport-da');
	const axios = require('axios');
	const passport = require('passport');
	const moment = require('moment');
	const ws = require('ws');
	const Centrifuge = require('centrifuge');
	const db = require('../libraries/db');
	//configs
	const twitch = require('../configs/twitch');
	const streamLabs = require('../configs/streamlabs');
	const donationAlerts = require('../configs/donationAlerts');


	const events = io.of('/events');
	events.on('connect', (socket) => {
		db.query(`SELECT d.id, d.notification_id, d.easter_egg_id, d.from, d.amount, d.original_amount, d.original_currency, d.comment, d.created_at, d.platform, d.dubbing_src, d.status,
				n.type AS notification_type, n.src AS notification_src,
				ee.expression AS easter_egg_expression, ee.value AS easter_egg_value, ee.src AS easter_egg_src
				FROM donations AS d
				LEFT JOIN notifications AS n ON d.notification_id = n.id
				LEFT JOIN easter_eggs AS ee ON d.easter_egg_id = ee.id
				WHERE (d.status IS NULL OR d.status = 'hidden')`)
		.then(([donations, fields]) => {
			db.query(`SELECT f.id, f.notification_id, f.name, f.created_at, f.status,
				n.type AS notification_type, n.src AS notification_src
				FROM followers AS f
				LEFT JOIN notifications AS n ON f.notification_id = n.id
				WHERE (f.status IS NULL OR f.status = 'hidden')`)
			.then(([followers, fields]) => {
				db.query(`SELECT s.id, s.notification_id, s.name, s.months, s.created_at, s.status,
					n.type AS notification_type, n.src AS notification_src 
					FROM subscriptions AS s
					LEFT JOIN notifications AS n ON s.notification_id = n.id
					WHERE (s.status IS NULL OR s.status = 'hidden')`)
				.then(([subscriptions, fields]) => {
					/*donations = donations.map(async (donation) => {
						const res = await axios.post('https://streamlabs.com/polly/speak',
														null,
														{
															params: {
																'text': donation.comment,
																'voice': 'Maxim'
															}
														}
													);
						donation.dubbing = res.data.success ? {
							src: res.data.speak_url
						} : null;
						return donation;
					});*/
					donations = donations.map((d) => {
						if (!d.notification_id && d.easter_egg_id) {
							d.notification = {
								id: d.easter_egg_id,
								type: "easter_egg",
								src: d.easter_egg_src,
								expression: d.easter_egg_expression,
								value: d.easter_egg_value
							};
						} else {
							d.notification = {
								id: d.notification_id,
								type: d.notification_type,
								src: d.notification_src
							};
						}
						delete d.notification_id;
						delete d.notification_type
						delete d.notification_src;
						delete d.easter_egg_id;
						delete d.easter_egg_src;
						delete d.easter_egg_expression;
						delete d.easter_egg_value;
						return d;
					});
					followers = followers.map((f) => {
						f.notification = {
							id: f.notification_id,
							type: f.notification_type,
							src: f.notification_src
						};
						delete f.notification_id;
						delete f.notification_type
						delete f.notification_src;
						return f;
					});
					subscriptions = subscriptions.map((s) => {
						s.notification = {
							id: s.notification_id,
							type: s.notification_type,
							src: s.notification_src
						};
						delete s.notification_id;
						delete s.notification_type
						delete s.notification_src;
						return s;
					});
					var e = donations.concat(followers, subscriptions);
					socket.emit('inited', {success: true, payload: e});
				})
				.catch(console.log);
			})
			.catch(console.log);
		})
		.catch(console.log);

		socket.on('update', (type, data, id = undefined) => {
			if (id && typeof id === 'number') {
				var s = '';
				if (data && typeof data === 'object') {
					Object.entries(data).forEach((entry, i) => {
						s = s.concat(`${entry[0]} = ${typeof entry[1] === 'string' ? `'${entry[1]}'` : entry[1]}${(i < data.length - 1) ? ', ' : ''}`);
					});
				} else {
					data.forEach((entry, i) => {
						s = s.concat(`${entry[0]} = ${typeof entry[1] === 'string' ? `'${entry[1]}'` : entry[1]}${(i < data.length - 1) ? ', ' : ''}`);
					});
				}
				var a = type.charAt(0);
				//console.log(`UPDATE ${type}s AS ${a} SET ${s} WHERE ${a}.id = ${id};`);
				db.execute(`UPDATE ${type}s AS ${a} SET ${s} WHERE ${a}.id = ${id};`)
				.then(() => {
					events.emit('updated', {
						success: true,
						payload: [
							{
								id: id,
								notification: {
									type: type
								},
								...data
							}
						]
					});
				})
				.catch(console.log);
				/*if (type === 'donation') {
					db.execute(`UPDATE donations AS d SET ${s} WHERE d.id = ${id};`)
					.then(() => {
						socket.emit('updated', {success: true, payload: {
							id: id,
							type: type,
							...data
						}});
					})
					.catch(console.log);
				} else if (type === 'follower') {
				}*/
			}
		});
	});

	var notifications = new Object, easterEggs = new Array;
	easterEggs.each = function(amount) {
		var alignment;
		this.forEach(function(egg) {
			switch(egg.expression) {
				case '=>':
				case '>=':
					if (amount >= egg.value) alignment = egg;
				break;
				case '<=':
				case '=<':
					if (amount <= egg.value) alignment = egg;
				break;
				case '===':
				case '==':
					if (amount == egg.value || amount === egg.value) alignment = egg;
				break;
			}
		});
		return (typeof alignment !== 'undefined') ? alignment : null;
	};
	var donation = {
		id: null,
		easterEgg: null,
		notification: null,
		dubbing: null,
		from: null,
		amount: null,
		original_amount: null,
		original_currency: null,
		comment: null,
		createdAt: null,
		platform: null,
		fromStreamLabs: async function (data) {
			if (!data.id || typeof data.id !== 'number') throw Error;
			if (!data.from || typeof data.from !== 'string' || data.from.length === 0) throw Error;
			if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) throw Error;
			if (!data.currency || typeof data.currency !== 'string' || data.currency.toUpperCase() !== 'RUB') throw Error;
			this.id = data.id;
			this.from = data.from;
			/*if (
				(data.formattedAmount && typeof data.formattedAmount && data.formattedAmount.length > 0)
				||
				(data.formatted_amount && typeof data.formatted_amount && data.formatted_amount.length > 0)
				) {
				var formattedAmount = data.formattedAmount ? data.formattedAmount : data.formatted_amount, currency = formattedAmount.substr(0, 3).toUpperCase(), amount = formattedAmount.substr(3);
				if (currency === 'RUB') {
					this.amount = parseFloat(amount);
				} else {
					if (data.currency.toUpperCase() !== 'RUB') throw Error;
					this.amount = data.amount;
				}
			} else {*/
				this.amount = data.amount;
			//}
			this.original_amount = data.donation_amount ? data.donation_amount : null;
			this.original_currency = data.donation_currency ? data.donation_currency : null;
			this.comment = (!data.message || typeof data.message !== 'string' || data.message.length === 0) ? '' : data.message;
			this.createdAt = moment().utc();
			this.platform = 'streamlabs';
			this.easterEgg = easterEggs.each(this.amount);
			this.notification = this.easterEgg === null ? notifications.donation : null;
			await this.speechSynthesis(this.comment);
		},
		fromDonationAlerts: async function(data) {
			if (!data.id || typeof data.username !== 'number') throw Error;
			if (!data.username || typeof data.username !== 'string' || data.username.length === 0) throw Error;
			if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) throw Error;
			if (!data.currency || typeof data.currency !== 'string') throw Error;
			this.id = data.id;
			this.from = data.username;
			this.original_amount = data.amount;
			this.original_currency = data.currency.toUpperCase();
			this.comment = (!data.message || typeof data.message !== 'string' || data.message.length === 0) ? '' : data.message;
			this.createdAt = moment().utc();
			this.platform = 'donationalerts';
			if (this.original_currency === 'RUB') {
				this.amount = data.amount;
				this.easterEgg = easterEggs.each(this.amount);
			} else {
				this.amount = null;
				this.easterEgg = null;
			}
			this.notification = this.easterEgg === null ? notifications.donation : null;
			await this.speechSynthesis(this.comment);
		},
		//fromDB: () => {},
		toObject: function() {
			message = {
				success: true,
				payload: [
					{
						id: this.id,
						from: this.from,
						amount: this.amount,
						original_amount: this.original_amount,
						original_currency: this.original_currency,
						comment: this.comment,
						createdAt: this.createdAt.toISOString(),
						platform: this.platform,
						notification: {
							type: (this.notification !== null ? 'donation' : 'easter_egg'),
							...(this.notification !== null ? this.notification : this.easterEgg)
						},
						dubbing: this.dubbing
					}
				]
			};
			return message;
		},
		toArray: function() {
			return [(this.easterEgg !== null ? this.easterEgg.id : null), (this.notification !== null ? this.notification.id : null), this.from, this.amount, this.original_amount, this.original_currency, this.comment, this.createdAt.format('YYYY-MM-DD HH:mm:ss'), this.platform, (this.dubbing !== null ? this.dubbing.src : null)]
		},
		__daApiClient: null,
		speechSynthesis: async function (comment, voice = 'Maxim') {
			const res = await axios.post('https://streamlabs.com/polly/speak',
										null,
										{
											params: {
												'text': comment,
												'voice': voice
											}
										}
									);
			this.dubbing = res.data.success ? {
				src: res.data.speak_url
			} : null;
		}
	},
	follower, subscription;


	
	db.query('SELECT * FROM notifications')
	.then(([rows,fields]) => {
		rows.forEach(function(notification) {
			notifications[notification.type] = {
				id: notification.id,
				src: notification.src,
				volume: notification.volume
			};
		});
		db.query('SELECT * FROM easter_eggs')
		.then(([rows,fields]) => {
			rows.forEach(function(egg) {
				easterEggs.push(egg);
			});

			passport.use(new TwitchStrategy({
					clientID: twitch.clientId,
					clientSecret: twitch.clientSecret,
					callbackURL: twitch.redirectUri,
					scope: twitch.scope
				},
				async function(accessToken, refreshToken) {
					console.log('Connected to Twitch!');
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

					//TWITCH FOLLOWERS
					const followerListener = new TwitchWebhooks(apiClient, new SimpleAdapter({
						hostName: 'localhost',
						listenerPort: 88
					}));
					await followerListener.subscribeToFollowsToUser(twitch.user.id, async (follower) => {
						follower.notification = {
							type: 'follower',
							//created_at: Math.floor(Date.now()/1000),
							...notifications.follower
						};
						db.execute(
							'INSERT INTO followers(notification_id, name, created_at) VALUES(?, ?, ?)',
							[follower.notification.id, follower.from_name, follower.created_at],
						)
						.then(async () => {
							await events.emit('created', {success: true, payload: [follower]});
						})
						.catch(console.log);
					});
						followerListener.listen();

					const pubSubClient = new PubSubClient();
					await pubSubClient.registerUserListener(apiClient);
					const subscriptionListener = await pubSubClient.onSubscription(twitch.user.id, (subscription) => {
						subscription.notification = {
							type: 'subscription',
							//created_at: Math.floor(Date.now()/1000),
							...notifications.subscription
						};
						db.execute(
							'INSERT INTO subscriptions(notification_id, name, months, created_at) VALUES(?, ?, ?, ?)',
							[subscription.notification.id, subscription.userName, subscription.months, subscription.created_at]
						)
						.then(async () => {
							await events.emit('created', {success: true, payload: [subscription]});
						})
						.catch(console.log);
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
					da.setToken(user.socket_connection_token);
					da.connect();
					da.on('connect', function(context) {
						console.log('Connected to DonationAlerts!');
						da.subscribe(`$alerts:donation_${user.id}`, function(alert) {
							console.log(alert);
							if (alert.data) {
								donation.fromDonationAlerts(alert.data);
								db.execute(
									'INSERT INTO donations(easter_egg_id, notification_id, `from`, amount, original_amount, original_currency, comment, created_at, platform, dubbing_src) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
									donation.toArray()
								)
								.then(async () => {
									await events.emit('created', donation.toObject());
								})
								.catch(console.log);
							}
						});
					});	
				}
			));

			express.get('/twitch', passport.authenticate('twitch'));
			express.get('/da', passport.authenticate('da'));



			const sl = require('socket.io-client')('https://sockets.streamlabs.com', {
				query: {
					token: streamLabs.socketToken
				},
				reconnection: true,
				reconnectionDelayMax: 5000,
				reconnectionDelay: 1000,
			});


			sl.on('connect', function() {
				console.log('Connected to Streamlabs!');
				sl.on('event', async (alert) => {
					if (alert) {
						console.log(alert);
						if (!alert.for && alert.type === 'donation') {
							await donation.fromStreamLabs(alert.message[0]);
							db.execute(
								'INSERT INTO donations(easter_egg_id, notification_id, `from`, amount, original_amount, original_currency, comment, created_at, platform) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)',
								donation.toArray()
							)
							.then(async () => {
								await events.emit('created', donation.toObject());
							})
							.catch(console.log);
						}
						if (alert.for === 'twitch_account') {
							switch (alert.type) {
								case 'follow':
									var follower = alert.message[0];
									follower.notification = {
										type: 'follower',
										...notifications.follower
									};
									db.execute(
										'INSERT INTO followers(notification_id, name, created_at) VALUES(?, ?, ?)',
										[follower.notification.id, follower.name, follower.created_at],
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
									var subscription = alert.message[0];
									subscription.notification = {
										type: 'subscription',
										...notifications.subscription
									};
									db.execute(
										'INSERT INTO subscriptions(notification_id, from, months, created_at) VALUES(?, ?, ?, ?)',
										[subscription.notification.id, subscription.name, subscription.months, subscription.created_at],
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
						byDefault[n.type] = {
							id: n.id,
							src: n.src,
							volume: n.volume
						};
					});


					da.on('connect', function(context) {
						console.log('Connected to DonationAlerts!');
						da.subscribe(`$alerts:donation_${opts.user.id}`, function(alert) {
							console.log(alert);
							if (alert.data) {
								var donation = alert.data;

								axios.post('https://streamlabs.com/polly/speak',
									null,
									{
										params: {
											'text': donation.message,
											'voice': 'Maxim'
										}
									}
								)
								.then(dubbing => {
									var dubbing = dubbing.data;
									if (dubbing.success) {
										var easterEggId = null;
										easterEggs.forEach(function(egg) {
											switch(egg.expression) {
												case '=>':
												case '>=':
													if (donation.amount >= egg.value) easterEggId = egg.id;
												break;
												case '<=':
												case '=<':
													if (donation.amount <= egg.value) easterEggId = egg.id;
												break;
												case '===':
												case '==':
													if (donation.amount == egg.value || donation.amount === egg.value) easterEggId = egg.id;
												break;
											}
										});
										donation.notification = {
											'type': 'donation',
											id: byDefault.donation.id,
											src: byDefault.donation.src,
											volume: byDefault.donation.volume
										};
										donation.created_at = Math.floor(Date.now()/1000);
										db.execute(
											`INSERT INTO donations(easter_egg_id, notification_id, name, amount, currency, comment, created_at) VALUES(?, ?, ?, ?, ?, ?, ?)`,
											[easterEggId, easterEggId === null ? byDefault.donation.id : null, donation.username, donation.amount, donation.currency, donation.message, donation.created_at],
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
								if (data.for === 'twitch_account') {
									switch (data.type) {
										case 'follow':
											var follower = data.message[0];
											follower.notification = {
												type: 'follower',
												id: byDefault.follower.id,
												src: byDefault.follower.src,
												volume: byDefault.follower.volume
											};
											follower.created_at = Math.floor(Date.now()/1000);
											db.execute(
												'INSERT INTO followers(notification_id, name, created_at) VALUES(?, ?, ?)',
												[follower.notification.id, follower.name, follower.created_at],
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
											var subscription = data.message[0];
											subscription.notification = {
												type: 'subscription',
												id: byDefault.subscription.id,
												src: byDefault.subscription.src,
												volume: byDefault.subscription.volume
											};
											subscription.created_at = Math.floor(Date.now()/1000);
											db.execute(
												'INSERT INTO subscriptions(notification_id, name, months, created_at) VALUES(?, ?, ?, ?)',
												[subscription.notification.id, subscription.name, subscription.months, subscription.created_at],
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