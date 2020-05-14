module.exports = function (io, streamlabs, opts) {
	const md5 = require('md5');
	const db = require('../db');

	const votings = io.of('/votings');
	votings.on('connection', (socket) => {
		const signature = md5('123');

		socket.on('read', () => {
			db.execute('SELECT vtg.id, vtg.title, vtg.`start`, vtg.`end`, vtgp.id AS voting_point_id, vtgp.title AS voting_point_title,\
				(SELECT COUNT(*) FROM vote AS vt WHERE vt.voting_id = vtg.id) AS total,\
				(SELECT COUNT(*) FROM vote AS vt WHERE vt.voting_point_id = vtgp.id) AS num,\
				EXISTS(SELECT * FROM vote AS vt WHERE vt.signature = ? AND vt.voting_point_id = vtgp.id) AS selected\
				FROM votings AS vtg JOIN voting_points AS vtgp ON (vtg.id = vtgp.voting_id);',
				[signature],
				function(e, data) {
					if (e) socket.emit('readed', {success: false, error: {}});
					
					//var votings = [];
					var votings = new Map();
					data.forEach(function(value) {
						/*if (value['id'] in votings) {
							votings[value['id']]['votingPoints'].push({
								id: value['voting_point_id'],
								title: value['voting_point_title'],
								//total: value['total'],
								num: value['num'],
								selected: new Boolean(value['selected'])
							});
						} else {
							votings[value['id']] = {
								title: value['title'],
								start: value['start'],
								end: value['end'],
								votingPoints: [
									{
										id: value['voting_point_id'],
										title: value['voting_point_title'],
										//total: value['total'],
										num: value['num'],
										selected: new Boolean(value['selected'])
									}
								],
								vote: {
									total: value['total']
								}

							};
						}*/
						votingPoint = {
							id: value['voting_point_id'],
							title: value['voting_point_title'],
							num: value['num'],
							selected: new Boolean(value['selected'])
						};
						if (votings.has(value['id'])) {
							voting = votings.get(value['id']);
							voting['votingPoints']['list'].push(votingPoint);
							votings.set(value['id'], voting);
						} else {
							votings.set(value['id'], {
								title: value['title'],
								start: value['start'],
								end: value['end'],
								votingPoints: {
									//selected: data.find(function(v) {if (v['id'] === value['id'] && v['selected'] === 1) return(true)}),
									list: [votingPoint]
								},
								/*votingPoints: {
									selected: data.find(function(v) {if (v['id'] === value['id'] && v['selected'] === 1) return(true)}),
									data: [votingPoint]
								},*/
								vote: {
									total: value['total']
								},
							});
						}
					});
					//console.log(Array.from(votings)[0][1].votingPoints);
					socket.emit('readed', {success: true, payload: Array.from(votings)});
				}
			);
		});
		socket.on('create', () => {
		});
	});
}