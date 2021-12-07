const express = require('express');
const router = express.Router();
const { query } = require('../modules/db');
const { verifyMiddleWare } = require('../modules/jwt');
var CryptoJS = require("crypto-js");
var secretKey = 'secret key';

const findSocketById = (io, id) => {
  const sockets = [];
  for (let socket of io.sockets.sockets.values()) {
    if (socket.user_id === id) {
      sockets.push(socket);
    }
  }
  return sockets;
};

const findRoom = async (senderId, receiverId) => {
  const roomId = await query(`SELECT r.room_id FROM room r WHERE(r.user1_id = '${senderId}' AND r.user2_id = '${receiverId}') OR
  (r.user2_id = '${receiverId}' AND r.user1_id ='${senderId}')`);
  return roomId[0].room_id;
}

function sqlToJsDate(sqlDate) {
  var sqlDateArr1 = sqlDate.split("-");
  var sYear = sqlDateArr1[0];
  var sMonth = (Number(sqlDateArr1[1]) - 1).toString();
  var sqlDateArr2 = sqlDateArr1[2].split(" ");
  var sDay = sqlDateArr2[0];
  var sqlDateArr3 = sqlDateArr2[1].split(":");
  var sHour = sqlDateArr3[0];
  var sMinute = sqlDateArr3[1];
  var sSecond = sqlDateArr3[2];
  return new Date(sYear, sMonth, sDay, sHour, sMinute, sSecond);
}

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function sleepExpire(id, targetId, time, rendezvousTime, req) {
  await timeout(rendezvousTime * 60 * 1000);
  expireRendezvous(id, targetId, time, req);
}

const expireRendezvous = async (id, targetId, time, req) => {
  await query(`UPDATE message	SET is_expired = 1 where sender_id = '${id}' AND receiver_id = '${targetId}' AND time = '${time}';`)
  context = "시간이 만료된 랑데부 메시지입니다.";
  var encrypted = CryptoJS.AES.encrypt(JSON.stringify(context), secretKey).toString();
  await query(`UPDATE message	SET context = '${encrypted}' where sender_id = '${id}' AND receiver_id = '${targetId}' AND time = '${time}';`)

  const io = req.app.get('io');
  const targetSockets = findSocketById(io, targetId);
  if (targetSockets.length > 0) {
    targetSockets.forEach(soc => soc.emit('EXPIRE_MESSAGE', { // emit: 받는이에게 랑데부 메세지 만료 알림. 
      sender_id: id,
      receiver_id: targetId,
      time: time
    }));
  }
  const targetSockets2 = findSocketById(io, id);
  if (targetSockets2.length > 0) {
    targetSockets2.forEach(soc => soc.emit('EXPIRE_MESSAGE', { // emit: 보낸이에게 랑데부 메세지 만료 알림. 
      sender_id: id,
      receiver_id: targetId,
      time: time
    }));
  }
}

router.get('/chatData/:id', verifyMiddleWare, async (req, res, next) => {
  const { id } = req.decoded;
  const targetId = req.params.id;
  if (id) {
    const io = req.app.get('io');
    // 방에 들어오면 front end에서 부를 것으로 예상되어서 read(읽음) 처리해두었습니다. 
    await query(`UPDATE message	SET state = 1 where sender_id = '${targetId}' AND receiver_id = '${id}' AND state = 0`);
    const targetSockets = findSocketById(io, targetId);
    if (targetSockets.length > 0) {
      targetSockets.forEach(soc => soc.emit('READ_MESSAGE', { // emit: targetId야, id가 너가 보낸 메세지 읽었대. 
        read_id: id,
      }));
    }

    const roomId = await findRoom(id, targetId);

    const messages = await query(` SELECT DISTINCT s.id AS "sender_id", s.name AS "sender_name", t.id AS "receiver_id", t.name AS "receiver_name", context,time, state, is_rendezvous, rendezvous_place, expired_time
    FROM user AS s, user AS t, message AS m WHERE (m.room_id = ${roomId}) AND
    (m.sender_id = s.id) AND (m.receiver_id = t.id) ORDER BY time ASC;`);
    for (let i = 0; i < messages.length; i++) {
      let encryptedContext = messages[i].context;
      var bytes = CryptoJS.AES.decrypt(encryptedContext, secretKey);
      messages[i].context = bytes.toString(CryptoJS.enc.Utf8);
    }
    if (messages === 0) {
      await query(`INSERT INTO room(user1_id,user2_id) VALUES( '${id}', '${targetId}');`);
    }
    res.json({
      status: 200,
      message: "채팅 기록 불러오기 성공",
      data: messages
    });
  } else {
    res.json({
      status: 400,
      message: "채팅 기록 불러오기 실패"
    });
  }
});



//보내는 순간 place가 같으면 받는 것으로 구현. 
router.post('/rendezvous/:id', verifyMiddleWare, async (req, res, next) => {
  const { id } = req.decoded;
  const targetId = req.params.id;
  if (id) {
    const io = req.app.get('io');
    const { context, time, rendezvous_time } = req.body;
    const queryResultPlace = await query(`SELECT place FROM user WHERE id = '${id}'`)
    const rendezvousPlace = queryResultPlace[0].place;
    let expiredTime = sqlToJsDate(time);
    expiredTime.setHours(expiredTime.getHours() + 9) // 왜인진 모르겠는데 시간이 다시 올라가야합니다. 시간이 +-9시간 오차가 발생하면 말씀해주세요.  
    expiredTime.setMinutes(expiredTime.getMinutes() + rendezvous_time)
    const expiredSqlTime = expiredTime.toISOString().slice(0, 19).replace('T', ' ');
    const queryResult = await query(`SELECT * from user where id = '${targetId}' and place = '${rendezvousPlace}'`);
    if (queryResult.length > 0) {
      const senderQuery = await query(`SELECT name FROM user WHERE id = '${id}'`);
      const senderName = senderQuery[0].name;
      const roomId = await findRoom(id, targetId);
      var encrypted = CryptoJS.AES.encrypt(JSON.stringify(context), secretKey).toString();
      await query(`INSERT INTO message(sender_id, receiver_id, context, time, room_id, is_rendezvous, rendezvous_place, expired_time) 
      SELECT f.id, t.id, '${encrypted}','${time}', '${roomId}', 1, '${rendezvousPlace}', '${expiredSqlTime}'
      FROM user f, user t WHERE f.id = '${id}' and t.id = '${targetId}';`)
      sleepExpire(id, targetId, time, rendezvous_time, req);
      const targetSockets = findSocketById(io, targetId);
      if (targetSockets.length > 0) {
        targetSockets.forEach(soc => soc.emit('RESPONSE_MESSAGE', {
          context: context,
          from_id: id,
          from_name: senderName,
          time: time,
          rendezvous_place: rendezvousPlace,
          expired_time: expiredSqlTime,
        }));
        res.json({
          status: 200,
          message: "랑데부 메세지 전송 성공",
        });
      }
      else {
        res.json({
          status: 200,
          message: "채팅 전송을 시도하였으나 타겟 소켓을 찾을 수 없습니다. 채팅이 DB에만 저장되었습니다. ",
        });
      }
    }
    else { //공간이 달라서 랑데부메세지가 전송되지 않았음을 알림. 전송이 안되면 db에 일단 안올리는 것으로 구현.
      //다시 채팅방 들어오면 아예 보냈던 기록조차 보이지 않음. 
      res.json({
        status: 200,
        message: "랑데부 공간 차이로 메세지가 전송되지 않았습니다.",
      });
    }
  } else {
    res.json({
      status: 401,
      message: "적합하지 않은 토큰입니다"
    });
  }
});

//read 표시하려고 만듦. clinet는 RESPONSE_MESSAGE 받았을 때, READ 보내줌.
router.patch('/read/:id', verifyMiddleWare, async (req, res, next) => {
  const { id } = req.decoded;
  const targetId = req.params.id;
  if (id) {
    const io = req.app.get('io');
    await query(`UPDATE message	SET state = 1 where sender_id = '${targetId}' AND receiver_id = '${id}' AND state = 0`);
    const targetSockets = findSocketById(io, targetId);
    if (targetSockets.length > 0) {
      targetSockets.forEach(soc => soc.emit('READ_MESSAGE', { // emit: targetId야, read_id가 너가 보낸 메세지 읽었대. 
        read_id: id,
      }));
    }
    res.json({
      status: 200,
      message: "읽음 반영 성공"
    });
  } else {
    res.json({
      status: 401,
      message: "적합하지 않은 토큰입니다"
    });
  }
});

//일반 채팅 전송 //time을 front에서 주실 때 sql의 Datatime로 주신다고 가정함. 보낼때도 sql의 Datatime형식으로 보냄.  
router.post('/:id', verifyMiddleWare, async (req, res, next) => {
  const { id } = req.decoded;
  const targetId = req.params.id;
  if (id) {
    const io = req.app.get('io');
    const { context } = req.body;
    const time = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const targetSockets = findSocketById(io, targetId);
    const roomId = await findRoom(id, targetId);

    const encrypted = CryptoJS.AES.encrypt(context, secretKey).toString();

    await query(`INSERT INTO message(sender_id, receiver_id, context, time, room_id) 
    SELECT f.id, t.id, '${encrypted}','${time}', '${roomId}'
    FROM user f, user t WHERE f.id = '${id}' and t.id = '${targetId}';`)

    const senderQuery = await query(`SELECT name FROM user WHERE id = '${id}'`);
    const senderName = senderQuery[0].name;

    if (targetSockets.length > 0) {
      targetSockets.forEach(soc => soc.emit('RESPONSE_MESSAGE', { // emit: 이벤트 발생  
        context: context,
        from_id: id,
        from_name: senderName,
        time: time,
        is_rendezvous: false
      }));
      res.json({
        status: 200,
        message: "채팅 전송 성공",
      });
    }
    else {
      res.json({
        status: 200,
        message: "채팅 전송을 시도하였으나 타겟 소켓을 찾을 수 없습니다. 채팅이 DB에만 저장되었습니다",
      });
    }
  } else {
    res.json({
      status: 401,
      message: "적합하지 않은 토큰입니다"
    });
  }
});


module.exports = router;
