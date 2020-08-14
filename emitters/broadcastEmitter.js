module.exports = function (io) {
	const broadcast = io.of('/broadcast');
	broadcast.on('connection', (socket) => {
		console.log(123);
		//socket.emit('ready', );
		//socket.on('', function() {
			
		//});
	});
}
