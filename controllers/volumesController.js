module.exports = async function (io, express) {
	const readline = require('readline');
	const volumes = io.of('/volumes');
	var values = {
		notification: 100,
		dubbing: 100
	};
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});



	rl.on('line', (input) => {
		var sketches = input.split(' '), command, parameters;
		if (Array.isArray(sketches)) {
			if (sketches.length > 2) {
				var command = sketches[0], key = sketches[1], value = parseInt(sketches[2], 10);
				if (['vl', 'vol', 'volume'].indexOf(command) !== -1 && values.hasOwnProperty(key) !== false && (value >= 0 && value <= 100)) {
					values[key] = value;
					volumes.emit('updated', {success: true, payload: values});
				}
			}
		}
	});
	volumes.on('connection', (socket) => {
		values = {
			notification: 100,
			dubbing: 100
		};
		socket.emit('inited', {success: true, payload: values});
	});
}