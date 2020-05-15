module.exports = function (io) {
	const broadcast = io.of('/broadcast');
	broadcast.on('connection', (socket) => {
		//socket.emit('ready', );
		//socket.on('', function() {
			
		//});
	});
}