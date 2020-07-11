class Jwt {
	constructor () {
		return({
					secret: '$2y$10$XHYwAA03H31qnX48aSb.D.BcPNvS9e.PksEH/vZP1qKxRaowOaFy6',
					algorithm: 'HS384',
					succeedWithoutToken: true
			});
	}
}
module.exports = new Jwt();