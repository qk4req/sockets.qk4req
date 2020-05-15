module.exports = function (io) {
	const broadcast = io.of('/broadcast');
	broadcast.on('connection', (socket) => {
		console.log('Authentication passed!');
		//socket.emit('ready', );
		//socket.on('', function() {
			
		//});
	});
}