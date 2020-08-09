class Twitch {
	constructor () {
		return({
					user: {
						id: 419357906,
						name: 'qk4req'
					},
					clientId: 'mhaz8pzuw6blpsfhv1sf9e2464ybno',
					clientSecret: 'gtk8xwbg9h147mfp6ohacg8kmp5qit',
					redirectUri: 'http://sockets.qk4req.ru/twitch',
					scope: 'user:read:email'
			});
	}
}
module.exports = new Twitch();