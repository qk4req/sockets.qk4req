class DonationAlerts {
	constructor () {
		return({
					clientId: '6621',
					clientSecret: 'MSYQVnyyQcoHb2bvQiynYXl56eIXy04JghPthiJ4',
					redirectUri: 'http://localhost:3000/da',
					scope: 'oauth-user-show oauth-donation-subscribe'
			});
	}
}
module.exports = new DonationAlerts();