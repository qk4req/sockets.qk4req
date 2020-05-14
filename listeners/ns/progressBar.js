module.exports = function (io, streamlabs, opts) {
	const md5 = require('md5');
	const db = require('../db');
	const access = require('../access')(db);

	streamlabs.on('connect', function() {
		streamlabs.on('event', (data) => {
			if (data) {
				if (!data['for'] || data['for'] === 'streamlabs' && data['type'] === 'donation') {
						var donation = data['message'][0];

						db.execute('INSERT INTO progress_bar_points(session_id, amount) VALUES((SELECT MAX(id) FROM sessions), ?)', [donation['amount']], function(e) {
							if (e) console.log(e);
							else {
								progressBarPoints.emit('created', {success: true, payload: [{amount: donation['amount']}]});
							}
						});
					} else if (data['for'] === 'twitch_account') {
						switch (data['type']) {
							case 'follow':
							break;
							case 'subscription':
							case 'resub':
							break;
						}
					}
			}
		});
	});

	const progressBarPoints = io.of('/progressBarPoints');
	progressBarPoints.on('connection', (socket) => {
		socket.on('read', () => {
			db.query('SELECT SUM(amount) FROM progress_bar_points WHERE session_id = (SELECT MAX(id) FROM sessions)', function(e, pbp) {
				if (e && pbp.length !== 1) socket.emit('readed', {success: false, error: {}});
				var pbp = pbp[0];
				
				socket.emit('readed', {success: true, payload: [{amount: Number.parseInt(pbp[Object.keys(pbp)[0]])}]});
			});
		});
	});

	const progressBarLevels = io.of('/progressBarLevels');
	progressBarLevels.on('connection', (socket) => {
		const signature = md5(socket.handshake.headers["x-real-ip"]);

		access.get(signature, function(user) {
			socket.on('create', function(record) {
			});

			socket.on('update', (record, sample = null) => {
				if (user['level'] < 100) socket.emit('updated', {success: false, error: {}});
				else {
					var entries = Object.entries(record), length = entries.length, i = 0;
					if (record && typeof record === 'object' && length > 0) {
						var set = '';
			
						for (let [name, value] of entries) {
							set += ((i+1) < length) ? `${name} = ${value}, ` : `${name} = ${value}`;
							i++;
						}

						if (sample === null || sample === undefined) {
						} else {
							if (sample['id'] && Number.isInteger(sample["id"]) && sample["id"] > 0) {
								db.execute(`UPDATE progress_bar_levels SET ${set} WHERE id = ?`,
									[sample['id']],
									function(e) {
										if (e) console.log(e);
										else socket.emit('updated', {success: true, payload: [Object.assign(sample, record)]});
									}
								);
							}
						}
					}
				}
			});

			socket.on('delete', () => {
			});
		});
		socket.on('read', () => {
			db.query('SELECT pbl.*, n.src, n.volume FROM progress_bar_levels AS pbl JOIN notifications AS n ON pbl.notification_id = n.id WHERE pbl.session_id = (SELECT MAX(id) FROM sessions)'/* ORDER BY pbl.id ASC;*/, function(e, pbl) {
				if (e) socket.emit('readed', {success: false, error: {}});
				else {
					pbl.map(function(level, i) {
						level['notification'] = {
							id: level['notification_id'],
							src: level['src'],
							volume: level['volume']
						};
						level['notification_id'] = undefined;
						level['src'] = undefined;
						level['volume'] = undefined;
						return level;
					});
					socket.emit('readed', {success: true, payload: pbl});
				}
			});
		});
	});
}