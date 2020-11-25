class Twitch {
	constructor () {
		return({
					user: {
						id: 419357906,
						name: 'qk4req'
					},
					clientId: '3bo1guz83rc34u9no0677kt4k11ue1',
					clientSecret: '6sf2i9b65f7fy77e1ftgjrcdkydsrh',
					redirectUri: 'http://localhost:3000/twitch',
					scope: 'user_read user:read:email channel_subscriptions chat:read chat:edit'//
			});
	}
}
module.exports = new Twitch();