const {DataTypes} = require('sequelize');
const sequelize = require('../libraries/sequelize');



module.exports = () => {
	const Stakan = sequelize.define('stakans', {
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		start: {
			type: DataTypes.DATE,
			allowNull: false
		},
		end: {
			type: DataTypes.DATE,
			allowNull: false
		}
	}, {
		underscored: true,
		timestamps: false
	});
	return Stakan;
};