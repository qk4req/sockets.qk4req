module.exports = async function (io, express, logger) {
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
			var t = (type === 'easter_egg') ? 'donation' : type;
			if (id) {
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
				var a = t.charAt(0);
				console.log(`UPDATE ${t}s AS ${a} SET ${s} WHERE ${a}.id = ${id};`);
				db.execute(`UPDATE ${t}s AS ${a} SET ${s} WHERE ${a}.id = ${id};`)
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
		created_at: null,
		platform: null,
		fromStreamLabs: async function (data) {
			if (!data.from || typeof data.from !== 'string' || data.from.length === 0) throw Error;
			if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) throw Error;
			if (!data.currency || typeof data.currency !== 'string' || data.currency.toUpperCase() !== 'RUB') throw Error;
			this.from = data.from;
			this.amount = data.amount;
			this.original_amount = data.donation_amount ? data.donation_amount : null;
			this.original_currency = data.donation_currency ? data.donation_currency : null;
			this.comment = (!data.message || typeof data.message !== 'string' || data.message.length === 0) ? '' : data.message;
			this.created_at = moment().utc();
			this.platform = 'streamlabs';
			this.easterEgg = easterEggs.each(this.amount);
			this.notification = this.easterEgg === null ? notifications.donation : null;
			await this.speechSynthesis(this.comment);
		},
		fromDonationAlerts: async function(data) {
			if (!data.id || typeof data.id !== 'number') throw Error;
			if (!data.username || typeof data.username !== 'string' || data.username.length === 0) throw Error;
			if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) throw Error;
			if (!data.currency || typeof data.currency !== 'string') throw Error;
			this.from = data.username;
			this.original_amount = data.amount;
			this.original_currency = data.currency.toUpperCase();
			this.comment = (!data.message || typeof data.message !== 'string' || data.message.length === 0) ? '' : data.message;
			this.created_at = moment().utc();
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
						created_at: this.created_at.toISOString(),
						platform: this.platform,
						notification: {
							type: (this.notification !== null ? 'donation' : 'easter_egg'),
							...(this.notification !== null ? this.notification : this.easterEgg)
						},
						dubbing: this.dubbing,
						status: null
					}
				]
			};
			return message;
		},
		toArray: function() {
			return [(this.easterEgg !== null ? this.easterEgg.id : null), (this.notification !== null ? this.notification.id : null), this.from, this.amount, this.original_amount, this.original_currency, this.comment, this.created_at.format('YYYY-MM-DD HH:mm:ss'), this.platform, (this.dubbing !== null ? this.dubbing.src : null)]
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
	follower = {
		id: null,
		notification: null,
		name: null,
		created_at: null,
		platform: null,
		fromStreamLabs: function(data) {
			if (!data.name || typeof data.name !== 'string' || data.name.length === 0) throw Error;
			this.name = data.name;
			this.created_at = moment().utc();
			this.platform = 'streamlabs';
			this.notification = notifications.follower;
		},
		fromTwitch: function(data) {
			/*if (!data.name || typeof data.name !== 'string' || data.name.length === 0) throw Error;
			this.name = data.name;
			this.created_at = moment().utc();
			this.platform = 'streamlabs';
			this.notification = notifications.follower;*/
			console.log(data);
		},
		toObject: function() {
			message = {
				success: true,
				payload: [
					{
						id: this.id,
						name: this.name,
						created_at: this.created_at.toISOString(),
						platform: this.platform,
						notification: {
							type: 'follower',
							...this.notification
						},
						status: null
					}
				]
			};
			return message;
		},
		toArray: function() {
			return [this.notification.id, this.name, this.created_at.format('YYYY-MM-DD HH:mm:ss'), this.platform]
		},
	}, subscription;


	
	db.query('SELECT * FROM notifications')
	.then(([rows,fields]) => {
		rows.forEach(function(notification) {
			notifications[notification.type] = {
				id: notification.id,
				src: notification.src,
				volume: notification.volume
			};
		});
		db.query('SELECT * FROM easter_eggs AS ee ORDER BY ee.expression, ee.value ASC')
		.then(([rows,fields]) => {
			rows.forEach(function(egg) {
				easterEggs.push(egg);
			});

			/*passport.use(new TwitchStrategy({
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
						}
					);
					const apiClient = new Twitch({authProvider});

					const followerListener = new TwitchWebhooks(apiClient, new SimpleAdapter({
						hostName: 'localhost',
						listenerPort: 88
					}));
					await followerListener.subscribeToFollowsToUser(twitch.user.id, async (alert) => {
						follower.fromTwitch(alert);
						db.execute(
							'INSERT INTO followers(notification_id, name, created_at, platform) VALUES(?, ?, ?, ?)',
							follower.toArray(),
						)
						.then(async ([rows, fields]) => {
							follower.id = rows.insertId;
							await events.emit('created', follower.toObject());
						})
						.catch(console.log);
					});
					followerListener.listen();

					const pubSubClient = new PubSubClient();
					await pubSubClient.registerUserListener(apiClient);
					const subscriptionListener = await pubSubClient.onSubscription(twitch.user.id, (subscription) => {
						subscription.notification = {
							type: 'subscription',
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
			));*/
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
								.then(async ([rows, fields]) => {
									donation.id = rows.insertId;
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
						if (alert.type === 'donation') {
							await donation.fromStreamLabs(alert.message[0]);
							db.execute(
								'INSERT INTO donations(easter_egg_id, notification_id, `from`, amount, original_amount, original_currency, comment, created_at, platform, dubbing_src) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
								donation.toArray()
							)
							.then(async ([rows, fields]) => {
								donation.id = rows.insertId;
								await events.emit('created', donation.toObject());
							})
							.catch(console.log);
						}
						if (alert.for === 'twitch_account') {
							switch (alert.type) {
								case 'follow':
									follower.fromStreamLabs(alert.message[0]);
									db.execute(
										'INSERT INTO followers(notification_id, name, created_at, platform) VALUES(?, ?, ?, ?)',
										follower.toArray()
									)
									.then(async ([rows, fields]) => {
										follower.id = rows.insertId;
										await events.emit('created', follower.toObject());
									})
									.catch(console.log);
								break;
								/*case 'subscription':
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
								break;*/
							}
						}
					}
				});
			});
		})
		.catch(console.log)
	})
	.catch(console.log);
}