//채팅 목록 
var express = require('express');
var router = express.Router();
const { query } = require('../modules/db');
const { verifyMiddleWare } = require('../modules/jwt');
var CryptoJS = require("crypto-js");
var secretKey = 'secret key';

/* GET /chatList/가 들어왔을 때 */
// router.get('/', function(req, res, next) {
//   res.render('index', { title: 'chatLists' });
// });

// 채팅 목록 검색
router.get('/', verifyMiddleWare, async (req, res, next) => {
  const {id} = req.decoded;
  // const id = 'jiwon1234'


  try {
    // 유저 id 검색하여 이 유저와 채팅 중인 유저의 정보와 채팅 메세지 관련 정보 추출
    const listQueryResult = await query(`
    (SELECT u.id, u.name, u.type, u.online, m.context, m.time, m.room_id
    FROM user AS u, message AS m, room AS r
    WHERE r.user1_id = '${id}' AND m.room_id = r.room_id AND 
    time IN (SELECT max(time) FROM message AS m1 WHERE m1.room_id=r.room_id) AND r.user2_id = u.id) UNION
    (SELECT u.id, u.name, u.type, u.online, m.context, m.time, m.room_id
    FROM user AS u, message AS m, room AS r
    WHERE r.user2_id = '${id}' AND m.room_id = r.room_id AND 
    time IN (SELECT max(time) FROM message AS m1 WHERE m1.room_id=r.room_id) AND r.user1_id = u.id)
    ORDER BY time DESC;`);
    for (let i = 0; i < listQueryResult.length; i++) {
      let encryptedContext = listQueryResult[i].context;
      var bytes = CryptoJS.AES.decrypt(encryptedContext, secretKey);
      listQueryResult[i].context = bytes.toString(CryptoJS.enc.Utf8);
    }

    res.json({
      status: 200,
      message: '채팅방 불러오기 성공',                   
      data: listQueryResult           
    });

  } catch (error) {
    console.log(error)
    res.json({
      status:400,
      message: '채팅방 불러오기 실패',
      error
    });
  }
});

module.exports = router;

