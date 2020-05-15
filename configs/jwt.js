class Jwt {
	constructor () {
		return({
                	secret: '52f4682f90d0c911209f99cc6de0d91c',
                	algorithm: 'HS384',
			succeedWithoutToken: true
        	});
	}
}
module.exports = new Jwt();
