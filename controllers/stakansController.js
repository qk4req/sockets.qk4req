module.exports = function (io) {
	const db = require('../libraries/db');
	const {Op} = require('sequelize');
	const sequelize = require('../libraries/sequelize');
	const notificationModel = require('../models/notificationModel')();
	const stakanModel = require('../models/stakanModel')();
	const stakanLevelModel = require('../models/stakanLevelModel')();
	const stakanPointModel = require('../models/stakanPointModel')();





	const stakans = io.of('/stakans');
	
	const stakanLevels = io.of('/stakanLevels');
	stakanLevels.on('connect', async (socket) => {
		/*db.query('SELECT sl.*, n.src as notification_src FROM stakan_levels AS sl JOIN notifications AS n ON sl.notification_id = n.id WHERE sl.stakan_id = (SELECT MAX(s.id) FROM stakans AS s)'/* ORDER BY sl.id ASC;)
		.then(([rows, fields]) => {
			socket.emit('inited', {success: true, payload: rows});
		});*/
		stakanLevelModel.belongsTo(notificationModel, {foreignKey: 'notification_id', targetKey: 'id'});
		var levels = await stakanLevelModel.findAll({
			include: [notificationModel],
			where: {
				stakan_id: {
					[Op.eq]: sequelize.literal(`(${
						sequelize.dialect.queryGenerator.selectQuery(['stakans'], {
							attributes: [sequelize.fn('MAX', sequelize.col('stakans.id'))],
						}).slice(0, -1)
					})`)
				}
			}
		});
		if (levels) {
			socket.emit('inited', {success: true, payload: levels});
		}
	});

	const stakanPoints = io.of('/stakanPoints');
	stakanPoints.on('connect', async (socket) => {
		/*db.query('SELECT SUM(sp.amount) FROM stakan_points AS sp WHERE sp.stakan_id = (SELECT MAX(s.id) FROM stakans AS s)')
		.then(([rows, fields]) => {
			socket.emit('inited', {success: true, payload: {sum: Number.parseFloat(rows[Object.keys(rows)[0]]) ?? 0}});
		});*/
		const total = await stakanPointModel.findOne({
			raw: true,
			attributes: [
				[sequelize.fn('SUM', sequelize.col('amount')), 'total'],
			],
			where: {
				stakan_id: {
					[Op.eq]: sequelize.literal(`(${
						sequelize.dialect.queryGenerator.selectQuery(['stakans'], {
							attributes: [sequelize.fn('MAX', sequelize.col('stakans.id'))],
						}).slice(0, -1)
					})`)
				}
			} 
		});
		
		if (total) {
			socket.emit('inited', {success: true, payload: total});
		}



		socket.on('create', async (data) => {
			if (Array.isArray(data) && data.length > 0) {
				data.forEach(async (v, k) => {
					if (!v.hasOwnProperty('stakan_id')) {
						var maxId = await stakanModel.findOne({
							raw: true,
							attributes: [
								sequelize.fn('MAX', sequelize.col('id'))
							]
						});

						if (maxId) {
							v.stakan_id = Object.values(maxId)[0];
						}
					}

					stakanPointModel.build(v)
									.save()
									.then(async (point) => {
										await socket.emit('created', {success: true, payload: [point]});
									});
				});
			} else throw new Error;
		});
	});
}