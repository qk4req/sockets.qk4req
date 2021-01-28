const {DataTypes} = require('sequelize');
const sequelize = require('../libraries/sequelize');



module.exports = () => {
	const Donation = sequelize.define('donations', {
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		notification_id: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		easter_egg_id: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		from: {
			type: DataTypes.STRING,
			allowNull: false
		},
		amount: {
			type: DataTypes.FLOAT(11,2),
			allowNull: true
		},
		original_amount: {
			type: DataTypes.FLOAT(11,4),
			allowNull: true
		},
		original_currency: {
			type: DataTypes.STRING,
			allowNull: true
		},
		comment: {
			type: DataTypes.STRING,
			allowNull: false
		},
		created_at: {
			type: DataTypes.DATE,
			allowNull: false
		},
		platform: {
			type: DataTypes.ENUM,
			values: ['da', 'donationalerts', 'sl', 'streamlabs'],
			allowNull: false
		},
		status: {
			type: DataTypes.ENUM,
			values: ['shown', 'hidden'],
			allowNull: true
		}
	}, {
		underscored: true,
		timestamps: false
	});
	return Donation;
};