module.exports = function (io, opts, args) {
	const axios = require('axios');
	const db = require('../libraries/db');

	/***
	DONATIONALERTS
	***/
	let Centrifuge = require('centrifuge');
	let websocket = require('ws');
	let da = new Centrifuge('wss://centrifugo.donationalerts.com/connection/websocket', {
		websocket: websocket,
		subscribeEndpoint: 'https://www.donationalerts.com/api/v1/centrifuge/subscribe',
		subscribeHeaders: {
			'Authorization': `${opts['token']['token_type']} ${opts['token']['access_token']}`,
			'Content-Type': 'application/json'
		}
	});
	da.setToken(opts['user']['socket_connection_token']);
	da.connect();
	/***
	STREAMLABS
	***/
	const sl = require('socket.io-client')('https://streamlabs.com', {
		debug: true,
		query: {
			token: args['secret']
		},
		transports: ['websocket'],
		reconnection: true,
		reconnectionDelayMax: 5000,
		reconnectionDelay: 1000,
	});
	const events = io.of('/events');

	db.query('SELECT * FROM notifications', function(e, notifications) {
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
											function(e) {
												if (e) console.log(e);
												else {
													events.emit('created', {success: true, payload: [donation]});
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

					sl.on('connect', function() {
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
	});
}