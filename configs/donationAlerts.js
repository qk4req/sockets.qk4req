class DonationAlerts {
	constructor () {
		return({
					url: 'https://www.donationalerts.com/oauth/token',
					method: 'post',
					clientId: '33'
					clientSecret: 'sBqzxurEsE8WwYQg4ZR7fBCiUuUbneFOaQPWrnqi',
					grantType: 'authorization_code'
					//code: 'token',
					redirectUri: 'http://sockets.qk4req.ru/',
					scope: 'oauth-user-show oauth-donation-subscribe'
			});
	}
}
module.exports = new DonationAlerts();