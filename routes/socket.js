const cookie = require('cookie');
const { verify } = require('../modules/jwt');
const { query } = require('../modules/db');
const app = require('../app');

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
	app.set('io',io);
	const room = io.of('/room');
	const chat = io.of('/chat');
	io.on('connection', socket => { //웹소켓 연결 시 

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

		socket.on('CHAT_MESSAGE', async msg => { // 클라이언트로부터 메세지 수신 시 
			const targetSockets = findSocketById(io, msg.targetId);

			await query(`INSERT INTO chatDatas(from_id, to_id, message, created_at) SELECT f.user_id, t.user_id, '${msg.message}', '${msg.created_at}' FROM users f, users t WHERE f.id = '${socket.user_id}' and t.id = '${msg.targetId}';`)

			if (targetSockets.length > 0) {
				targetSockets.forEach(soc => soc.emit('CHAT_MESSAGE', { // emit: 이벤트 발생 
					message: msg.message,
					from_id: socket.user_id,
					from_name: socket.name,
					created_at: msg.created_at // 날짜 
				}));
			}
		});

		socket.on('JOIN_ROOM', (num, name) => {
			socket.join(room[num], () => {
			  console.log(name + ' join a ' + room[num]);
			  io.to(room[num]).emit('joinRoom', num, name);
			});
		  });

		socket.on('LEAVE_ROOM', (num, name) => { // 6
			socket.leave(room[num], () => {
			  console.log(name + ' leave a ' + room[num]);
			  io.to(room[num]).emit('leaveRoom', num, name);
			});
		  });

		socket.on("disconnect", () => {//연결 종료시 
			if (socket.user_id) {
				socket.leave('online');
				updateOnlineList(io, 'online');
				console.log(`LEAVE ONLINE ${socket.user_id}`);
			}
		});
	});
};
