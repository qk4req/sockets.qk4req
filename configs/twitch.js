class Twitch {
	constructor () {
		return({
					clientID: ''
					clientSecret: '',
					//code: 'token',
					redirectUri: 'http://sockets.qk4req.ru/'
			});
	}
}
module.exports = new Twitch();