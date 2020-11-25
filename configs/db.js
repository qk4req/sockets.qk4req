const bluebird = require('bluebird');

class DB {
	constructor () {
		return({
					host: 'localhost',
					user: 'root',
					password: 'root',
					port: 3306,
					database: 'qk4req',
					Promise: bluebird,
					waitForConnections: true,
					connectionLimit: 10,
					queueLimit: 50,
					//multipleStatements: true
			});
	}
}
module.exports = new DB();