module.exports = function (io, payload) {
	const broadcast = io.of('/broadcast');
	broadcast.on('connection', (socket) => {
		console.log(payload);
		//socket.emit('ready', );
		//socket.on('', function() {
			
		//});
	});
}