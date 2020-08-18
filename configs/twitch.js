class Twitch {
	constructor () {
		return({
					clientId: 'mhaz8pzuw6blpsfhv1sf9e2464ybno',
					clientSecret: '63gtoyg5woqhw68wj635khlcrvvs1g',
					redirectUri: 'http://sockets.qk4req.ru/twitch',
					scope: ''
					//code: 'token',
			});
	}
}
module.exports = new Twitch();