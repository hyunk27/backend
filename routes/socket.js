const cookie = require('cookie');
const { verify } = require('../modules/jwt');
const { query } = require('../modules/db');
const app = require('../app');

const getIdAndName = socket => socket.handshake.headers['cookie'] && cookie.parse(socket.handshake.headers['cookie']).token && verify(cookie.parse(socket.handshake.headers['cookie']).token) || {};
const updateOnlineList = (io, roomName) => { //roomName이 online임. online인사람 늘어나는거. online 방에 있는 사람 전체의 정보를 출력함. 
	const roomPeople = io.sockets.adapter.rooms.get(roomName) ? Array.from(io.sockets.adapter.rooms.get(roomName)).map(socket_id => ({
		id: io.sockets.sockets.get(socket_id).user_id,
		name: io.sockets.sockets.get(socket_id).name,
	})) : [];

	// notification(알림) to people //online접속된 사람들에게 누가 새로 접속했다고 알림. 이걸.. 알려줘야하나... 알리지 말자. 
	//io.to(roomName).emit('UPDATE_ONLINE_USERS', roomPeople);
}

//io.sockets.sockets가 현재 존재하는 모든 소켓을 의미하는 듯 하다. 
//온라인이든 아니든 일단 찾아준다. 부재시(로그아웃중)에도 채팅이 보내질 수 있음. 
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
	io.on('connection', socket => { //웹소켓 연결 시 . 로그인하면 소켓 만들어서 연결됨. 소켓 connect는 여기서 하는게 아니라 front에서 던지는거 
		//disconnect는 새로 socket을 만들기 전에는 이뤄지지 않는다. disconnect하면 부재시에는 채팅이 갈 수가 없음. 
		//아니 그 실시간 채팅방에 있지 않으면 실시간으로 채팅을 전송할 필요가 없지 않은가? 
		//front는 그 방에 있지 않으면 'RESPONSE_MESSAGE'에 unsubscribe하게 구현되어있음 

		const { id, name } = getIdAndName(socket); // 얘는 어떤 name을 제공하는거지. 
		if (id) {
			findSocketById(io, id).map(socket => socket.disconnect()); // 원래 같은 id로 연결되어있던게 있으면 다 끊음. 
			socket.user_id = id;
			socket.name = name;
			socket.join('online');
			updateOnlineList(io, 'online');
			console.log(`JOIN ONLINE ${id}`);
		} else {
			socket.disconnect(); 
		}

		//msg에 있어야 하는 정보: targetId, message, created_at + 보낸이(req) 
		socket.on('CHAT_MESSAGE', async msg => { // 클라이언트로부터 메세지 수신 시 . 일반 메세지 
			const targetSockets = findSocketById(io, msg.targetId);

			await query(`INSERT INTO message(sender_id, receiver_id, message, created_at) 
			SELECT f.user_id, t.user_id, '${msg.message}', '${msg.created_at}' 
			FROM users f, users t WHERE f.id = '${socket.user_id}' and t.id = '${msg.targetId}';`)

			if (targetSockets.length > 0) {
				targetSockets.forEach(soc => soc.emit('RESPONSE_MESSAGE', { // emit: 이벤트 발생  
					message: msg.message,
					from_id: socket.user_id,
					from_name: socket.name,
					created_at: msg.created_at // 날짜 
				}));
			}
		});

		//공간랑데부는 보내는 순간 근처에 있으면 받는 것으로 구현. 근처에 있지 않으면 위치가 달라 송신/수신에 실패한 랑데부 메세지입니다...라고 출력해야하나. 
		//msg에 있어야 하는 정보: targetId, message, created_at + 보낸이... +  rendezvous_time
		socket.on('CHAT_MESSAGE_RENDEZVOUS', async msg => { // 클라이언트로부터 메세지 수신 시 . 랑데부 메세지
			const rendezvous_place = await query(`SELECT place FROM user f WHERE id = '${id}'`) // 여기에 저장이 되도록 할 수가 잇나 
			const expired_at = msg.rendezvous_time +  msg.created_at // 포맷이 맞음?? 
			const queryResult = await query(`SELECT * from user where id = '${msg.targetId}' and place IN
			(SELECT place FROM user f WHERE id = '${id}'))`)
			if (queryResult.length > 0) {
				await query(`INSERT INTO message(sender_id, receiver_id, message, created_at. is_rendezvous, rendezvous_place,  rendezvous_time) 
				SELECT f.user_id, t.user_id, '${msg.message}', '${msg.created_at}' , 1, f.place, 
				FROM users f, users t WHERE f.id = '${socket.user_id}' and t.id = '${msg.targetId}';`)
				const targetSockets = findSocketById(io, msg.targetId); 
				if (targetSockets.length > 0) {
					targetSockets.forEach(soc => soc.emit('RESPONSE_MESSAGE', { // emit: 메세지 전송을 알림
						message: msg.message,
						from_id: socket.user_id,
						from_name: socket.name,
						created_at: msg.created_at, 
						rendezvous_place: rendezvous_place,
						expired_at: expired_at,
					}));
				}
			} 
			else{socket.emit('RENDEZVOUS_FAIL_MESSAGE', { //공간이 달라서 랑데부메세지가 전송되지 않았음을 알림. 전송이 안되면 db에 일단 안올리는 것으로 구현.
				//그런데 그러면 다시 채팅방 들어오면 아예 보냈던 기록조차 안보일텐데 괜찮은건가.. 
				message: msg.message,
				from_id: socket.user_id,
				from_name: socket.name,
				created_at: msg.created_at // 날짜 
			})}
		});

		//read 표시하려고 만듦. clinet는 RESPONSE_MESSAGE 받았으면 READ 보내주면 됨
		//read_msg에 있어야 하는 정보: targetId, enterId
		socket.on('READ', async enter_msg => { // 클라이언트로부터 메세지 수신. 메세지 읽었대. 
			await query(`UPDATE message	
				SET state = 1
				where sender_id = '${enter_msg.targetId}' AND receiver_id = '${enter_msg.enterId}' AND state != 1`) // != 이 문법이 되는거임?

			const targetSockets = findSocketById(io, msg.targetId); 
			if (targetSockets.length > 0) {
				targetSockets.forEach(soc => soc.emit('READ_MESSAGE', { // emit: targetId야, enterId가 너가 보낸 메세지 읽었대. 
					read_id: socket.user_id,
					target_id: enter_msg.targetId,
				}));
			}
		});

		socket.on("disconnect", () => {//연결 종료시 . online이라는 room에서 빠지게됨. 
			if (socket.user_id) {
				socket.leave('online');
				updateOnlineList(io, 'online');
				console.log(`LEAVE ONLINE ${socket.user_id}`); 
			}
		});
	});
};