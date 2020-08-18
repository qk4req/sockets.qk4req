module.exports = async function (io, tokens, users, config) {
	const {ApiClient, RefreshableAuthProvider, StaticAuthProvider} = require('twitch');
	const {PubSubClient} = require('twitch-pubsub-client');
	const axios = require('axios');
	const db = require('../libraries/db');
	const events = io.of('/events');



	/***
	DONATIONALERTS
	***/
	const Centrifuge = require('centrifuge');
	const websocket = require('ws');
	var da = new Centrifuge('wss://centrifugo.donationalerts.com/connection/websocket', {
		websocket: websocket,
		subscribeEndpoint: 'https://www.donationalerts.com/api/v1/centrifuge/subscribe',
		subscribeHeaders: {
			'Authorization': `${tokens.donationAlerts.token_type} ${tokens.donationAlerts.access_token}`,
			'Content-Type': 'application/json'
		}
	});
	await da.setToken(users.donationAlerts.socket_connection_token);
	await da.connect();



	/***
	TWITCH
	***/
	const auth = new RefreshableAuthProvider(
		new StaticAuthProvider(config.twitch.clientId, tokens.twitch.access_token),
		{
			clientSecret: config.twitch.clientSecret,
			refreshToken: tokens.twitch.refresh_token,
			//expiryTimestamp: !tokens.twitch.expiryTimestamp ? null : new Date(tokens.twitch.expiryTimestamp),
			onRefresh: ({ accessToken, refreshToken, expiryDate }) => {
				tokens.twitch.access_token = accessToken;
				tokens.twitch.refresh_token = refreshToken;
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
	const pubSubClient = new PubSubClient();
	await pubSubClient.registerUserListener(new ApiClient(auth));



	db
		.then(conn => conn.query('SELECT * FROM notifications'))
		.then(([notifications, f1]) => {
			db
				.then(conn => conn.query('SELECT * FROM easter_eggs'))
				.then(async ([easter_eggs, f2]) => {
					da.on('connect', function(context) {
						console.log('Connected to DonationAlerts!');
						await da.subscribe(`$alerts:donation_${users.donationAlerts.id}`, function(alert) {
							console.log(alert);
							if (alert.data) {
								var donation = alert.data;

								axios({
									url: 'https://streamlabs.com/polly/speak',
									method: 'post',
									data: {
										'text': donation.message,
										'voice': 'Maxim'
									},
									validateStatus: function (status) {
										return status >= 200 && status < 300;
									},
								})
								/*axios.post(
									'https://streamlabs.com/polly/speak',
									null,
									{
										params: {
											'text': donation.message,
											'voice': 'Maxim'
										}
									}
								)*/
								.then(dubbing => {
									if (dubbing.data && dubbing.data.success) {
										dubbing = dubbing.data;
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
										db
											.then(conn => db.execute(
												`INSERT INTO donations(easter_egg_id, notification_id, name, amount, currency, comment, created_at) VALUES(?, ?, ?, ?, ?, ?, ?)`,
												[easterEggId, easterEggId === null ? byDefault.donation.id : null, donation.username, donation.amount, donation.currency, donation.message, donation.created_at]
											))
											.then(async ([_, __]) => { await events.emit('created', {success: true, payload: [donation]}); })
											.catch(e => {
												console.log(e);
											});
										/*db.execute(
											`INSERT INTO donations(easter_egg_id, notification_id, name, amount, currency, comment, created_at) VALUES(?, ?, ?, ?, ?, ?, ?)`,
											[easterEggId, easterEggId === null ? byDefault.donation.id : null, donation.username, donation.amount, donation.currency, donation.message, donation.created_at],
											function(e) {
												if (e) console.log(e);
												else {
													events.emit('created', {success: true, payload: [donation]});
												}
											}
										);*/
									}
								})
								.catch(e => {
									console.log(e);
								});
							}
						});
					});


					
					pubSubClient.onSubscription(function() {
						var subscription = data.message[0];
						subscription.notification = {
							type: 'subscription',
							id: byDefault.subscription.id,
							src: byDefault.subscription.src,
							volume: byDefault.subscription.volume
						};
						subscription.created_at = Math.floor(Date.now()/1000);

						db
							.then(conn => db.execute(
								'INSERT INTO subscriptions(notification_id, name, months, created_at) VALUES(?, ?, ?, ?)',
								[subscription.notification.id, subscription.name, subscription.months, subscription.created_at]
							))
							.then(async ([_, __]) => { await events.emit('created', {success: true, payload: [subscription]}); })
							.catch(e => {
								console.log(e);
							});
					});
				})
				.catch(e => {
					console.log(e);
				});
		})
		.catch(e => {
			console.log(e);
		});
	/*db.query('SELECT * FROM notifications', function(e, notifications) {
		if (!e) {
			db.query('SELECT * FROM easter_eggs', function(e, easterEggs) {
				if (!e) {
					var byDefault = {};
					notifications.forEach(function(n) {
						byDefault[n.type']] = {
							id: n.id'],
							src: n.src'],
							volume: n.volume']
						};
					});

					/*sl.on('connect', function() {
						console.log('Connected *!@#&*!#&!#*&@!to Streamlabs!');
						sl.on('event', (data) => {
							console.log(data);
							if (data) {
								if (data.for'] === 'twitch_account') {
									switch (data.type']) {
										case 'follow':
											var follower = data.message'][0];
											follower.notification'] = {
												type: 'follower',
												id: byDefault.follower'].id'],
												src: byDefault.follower'].src'],
												volume: byDefault.follower'].volume']
											};
											follower.created_at'] = Math.floor(Date.now()/1000);
											db.execute(
												'INSERT INTO followers(notification_id, name, created_at) VALUES(?, ?, ?)',
												[follower.notification'].id'], follower.name'], follower.created_at']],
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
											var subscription = data.message'][0];
											subscription.notification'] = {
												type: 'subscription',
												id: byDefault.subscription'].id'],
												src: byDefault.subscription'].src'],
												volume: byDefault.subscription'].volume']
											};
											subscription.created_at'] = Math.floor(Date.now()/1000);
											db.execute(
												'INSERT INTO subscriptions(notification_id, name, months, created_at) VALUES(?, ?, ?, ?)',
												[subscription.notification'].id'], subscription.name'], subscription.months'], subscription.created_at']],
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
}