class Twitch {
	constructor () {
		return({
					user: {
						id: 591065766,
						name: 'udm_tv'
					},
					clientId: '3bo1guz83rc34u9no0677kt4k11ue1',
					clientSecret: '6sf2i9b65f7fy77e1ftgjrcdkydsrh',
					redirectUri: 'http://localhost:6699/twitch',
					scope: 'user_read channel_read channel_editor channel_subscriptions user:read:email user:edit:broadcast channel:read:subscriptions channel:manage:broadcast chat:read chat:edit'//
			});
	}
}
module.exports = new Twitch();