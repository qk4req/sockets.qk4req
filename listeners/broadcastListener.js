module.exports = function (io) {
	const stream = io.of('/broadcast');
	stream.on('connection', (socket) => {
		socket.emit('ready', );
		socket.on('', function() {
			
		});
	});
}