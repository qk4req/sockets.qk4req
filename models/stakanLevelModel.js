const {DataTypes} = require('sequelize');
const sequelize = require('../libraries/sequelize');



module.exports = () => {
	const StakanLevel = sequelize.define('stakan_levels', {
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		stakan_id: {
			type: DataTypes.INTEGER,
			allowNull: false
		},
		notification_id: {
			type: DataTypes.INTEGER,
			allowNull: false
		},
		title: {
			type: DataTypes.STRING,
			unique: true,
			allowNull: false
		},
		indent: {
			type: DataTypes.STRING,
			unique: true,
			allowNull: false
		},
		points: {
			type: DataTypes.INTEGER,
			unique: true,
			allowNull: false
		},
		color: {
			type: DataTypes.STRING,
			unique: true,
			allowNull: false
		},
		status: {
			type: DataTypes.ENUM,
			values: ['executed', 'performed'],
			allowNull: true,
			defaultValue: null
		}
	}, {
		underscored: true,
		timestamps: false
	});
	return StakanLevel;
};