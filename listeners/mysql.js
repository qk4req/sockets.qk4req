const mysql = require('mysql2');
mysql.getConnection = function () {
	const conn = this.createConnection({
		host: 'localhost',
		user: 'root',
		password: '',
		port: 3306,
		database: 'qk4req'
	});
	conn.connect(function(err) {
		if (err) throw err;

		//console.log('* Connected to mysql server');
	});
	return conn;
};
module.exports = mysql;