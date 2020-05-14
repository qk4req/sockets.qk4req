var tmi = new require('tmi.js').client({
	identity: {
		username: 'olyozha',
		password: 'oauth:25mjp0gry21qyxiabtdduhjs1v0md6'
	},
	connection: {
		//secure: true,
		reconnect: true
	},
	channels: ['qk4req']
});

tmi.write = function(message) {
	return tmi.say('qk4req', message);
};

tmi.nahui = function(username, duration, reason) {
	return tmi.timeout('qk4req', username, duration, reason);
};

tmi.butylka = function(username, duration, reason) {
	return tmi.ban('qk4req', username, reason);
};

module.exports = tmi;