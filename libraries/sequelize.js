const {Sequelize} = require('sequelize');
const sequelize = new Sequelize('mysql://root:root@localhost:3306/qk4req', {
	pool: {
		max: 10,
		min: 0,
		acquire: 30000,
		idle: 10000
	},
	//query:{raw:true}
});


module.exports = sequelize;