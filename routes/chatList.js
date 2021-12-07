//채팅 목록 
var express = require('express');
var router = express.Router();
const { verifyMiddleWare } = require('../modules/jwt');


/* GET /chatList/가 들어왔을 때 */
// router.get('/', function(req, res, next) {
//   res.render('index', { title: 'chatLists' });
// });

// 채팅 목록 검색
router.get('/chatList', verifyMiddleWare, async (req, res, next) => {
  const {id} = req.decoded;
        
  const room_and_friend_ids = await query(
  `SELECT room_id, 
  (CASE 
    WHEN(user1_id = '${id}') THEN user2_id 
    WHEN(user2_id = '${id}') THEN user1_id END) friend_id
      FROM database05.room WHERE user1_id = '${id}' OR user2_id = '${id}'`);

  

  try {
    res.json({
      status: 200,
      message: '친구 검색 성공',                   
      data: { user_self: me, users: users }             
    });
  } catch (error) {
    res.json({
      status:400,
      message: '친구 검색 실패',
      error
    });
  }
});

module.exports = router;

