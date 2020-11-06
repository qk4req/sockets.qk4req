module.exports = async function (io, express) {
	const readline = require('readline');



	const volumes = io.of('/volumes');
	var values = {
		notification: 100,
		dubbing: 100
	};
	/*const commands = {
		volume: function(key, value) {
			if (key === undefined || volumes.hasOwnProperty(key) === false) throw new Error(`Unknown key '${key}'!`);
			if (value === undefined) throw new Error(`Volume value undefined!`);
			value = parseInt(value, 10);
			if (value < 0 || value > 100) throw new Error(`Volume value out of range!`);
			volumes[key] = value;
			volumes.emit('updated', []);
		}
	};*/
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