const mysql = require('mysql2');
 
// Create the connection pool. The pool-specific settings are the defaults
const pool = mysql.createPool({
	host: '80.87.195.164',
	user: 'admin',
	password: 'UHBIf1202',
	port: 3306,
	database: 'app',
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
	multipleStatements: true
});

module.exports = pool;