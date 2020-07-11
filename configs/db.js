class DB {
	constructor () {
		return({
					host: 'qk4req.ru',
					user: 'admin',
					password: 'UHBIf1202*',
					port: 3306,
					database: 'qk4req',
					waitForConnections: true,
					connectionLimit: 10,
					queueLimit: 0,
					multipleStatements: true
			});
	}
}
module.exports = new DB();
