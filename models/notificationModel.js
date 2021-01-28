const {DataTypes} = require('sequelize');
const sequelize = require('../libraries/sequelize');



module.exports = () => {
	const Notification = sequelize.define('notifications', {
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		type: {
			type: DataTypes.ENUM,
			values: ['donation', 'follower', 'subscription', 'progress_bar', 'dubbing']
		},
		src: {
			type: DataTypes.STRING
		}
	}, {
		underscored: true,
		timestamps: false
	});
	return Notification;
};