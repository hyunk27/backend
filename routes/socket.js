const cookie = require('cookie');
const { verify } = require('../modules/jwt');
const { query } = require('../modules/db');

const getIdAndName = socket => socket.handshake.headers['cookie'] && cookie.parse(socket.handshake.headers['cookie']).token && verify(cookie.parse(socket.handshake.headers['cookie']).token) || {};
const updateOnlineList = (io, roomName) => {
	const roomPeople = io.sockets.adapter.rooms.get(roomName) ? Array.from(io.sockets.adapter.rooms.get(roomName)).map(socket_id => ({
		id: io.sockets.sockets.get(socket_id).user_id,
		name: io.sockets.sockets.get(socket_id).name,
	})) : [];

	// notification(알림) to people
	io.to(roomName).emit('UPDATE_ONLINE_USERS', roomPeople);
}

const findSocketById = (io, id) => {
	const sockets = [];
	for (let socket of io.sockets.sockets.values()) {
		if (socket.user_id === id) {
			sockets.push(socket);
		}
	}
	return sockets;
};


module.exports = io => {
	io.on('connection', socket => {
		const { id, name } = getIdAndName(socket);

		if (id) {
			findSocketById(io, id).map(socket => socket.disconnect());
			socket.user_id = id;
			socket.name = name;
			socket.join('online');
			updateOnlineList(io, 'online');
			console.log(`JOIN ONLINE ${id}`);
		} else {
			socket.disconnect();
		}

		socket.on('CHAT_MESSAGE', async msg => {
			const targetSockets = findSocketById(io, msg.targetId);

			await query(`INSERT INTO chatDatas(from_id, to_id, message, created_at) SELECT f.user_id, t.user_id, '${msg.message}', '${msg.created_at}' FROM users f, users t WHERE f.id = '${socket.user_id}' and t.id = '${msg.targetId}';`)

			if (targetSockets.length > 0) {
				targetSockets.forEach(soc => soc.emit('CHAT_MESSAGE', {
					message: msg.message,
					from_id: socket.user_id,
					from_name: socket.name,
					created_at: msg.created_at
				}));
			}
		});

		socket.on("disconnect", () => {0
			if (socket.user_id) {
				socket.leave('online');
				updateOnlineList(io, 'online');
				console.log(`LEAVE ONLINE ${socket.user_id}`);
			}
		});
	});
};