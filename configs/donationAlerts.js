class DonationAlerts {
	constructor () {
		return({
					clientId: '33',
					clientSecret: 'sBqzxurEsE8WwYQg4ZR7fBCiUuUbneFOaQPWrnqi',
					redirectUri: 'http://sockets.qk4req.ru/da',
					scope: 'oauth-user-show oauth-donation-subscribe'
			});
	}
}
module.exports = new DonationAlerts();