module.exports = function(db) {
	const access = {
		get: function(signature, closure) {
			db.execute('SELECT * FROM users WHERE signature = ? LIMIT 1', [signature], function (e, user) {
				if (e) console.log(e);
				else {
					return closure(user[0] ? user[0] : []);
				}
			});
		},
		verifyAndDecode: function(token) {
			try {
				return jwt.verify(token, secret, {algorithms: ['HS256']});
			}
			catch (e) {
				//throw new Error(e);
				console.log(e);
			}
		}
	};
	return access;
};