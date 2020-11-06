class DonationAlerts {
	constructor () {
		return({
					clientId: '33',
					clientSecret: 'sBqzxurEsE8WwYQg4ZR7fBCiUuUbneFOaQPWrnqi',
					redirectUri: 'http://localhost:3000/da',
					scope: 'oauth-user-show oauth-donation-subscribe'
			});
	}
}
module.exports = new DonationAlerts();