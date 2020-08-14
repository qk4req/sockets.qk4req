const mysql = require('mysql2/promise');

//const connection = mysql.createConnection(require('../configs/db.js'));
const pool = mysql.createPool(require('../configs/db.js'));

module.exports = pool;