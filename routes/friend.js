//친구 목록, 친구 검색
var express = require('express');
var router = express.Router();
const { query } = require('../modules/db');
const { verifyMiddleWare } = require('../modules/jwt');
var CryptoJS = require("crypto-js");
var secretKey = 'secret key';

/* GET /friend/가 들어왔을 때 */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'friends' });
});


// 친구 목록 검색 (test done)
router.get('/list', verifyMiddleWare, async (req, res, next) => {
  const {id} = req.decoded;
        
  console.log(req.body)

  try {
    const me = await query(`SELECT * FROM user WHERE id = '${id}'`);
    const users = await query(`SELECT * FROM user WHERE id IN (SELECT friend_id FROM friend WHERE id = '${id}')`);
  
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

// 친구 추가 (test done)
router.get('/add/:id', verifyMiddleWare, async (req, res, next) => {
  const {id} = req.decoded;
  const {id:targetId}= //req.params;

  console.log(id, targetId)
  
  try {
    const queryResult = await query(`INSERT INTO friend VALUES('${id}', '${targetId}')`);          
    const user = await query(`SELECT * FROM user WHERE id = '${targetId}'`);


    console.log(queryResult);
    console.log(user);

    res.json({
      status: 200,
      message: '친구 추가 성공',
      data: user              
    });
  } catch (error) {
    res.json({
      status:400,
      message: '친구 추가 실패',
      error
    });
  }
});

// 친구 검색 (test done)
router.get('/:id_name', verifyMiddleWare, async (req, res, next) => {
  const {id} = req.decoded;
  const {id_name}= req.params;

  console.log(req.decoded);


  try{
    const user = await query(`SELECT * FROM user WHERE (id LIKE '%${id_name}%' OR name LIKE '%${id_name}%') AND id != '${id}'`);
  
    // console.log(user);
  
    res.json({
      status: 200,
      message: '친구 검색 성공',
      data: user              
    });

  } catch (error) {
    res.json({
      status:400,
      message: '친구 검색 실패',
      error
    });
  }
  
});


// 친구 삭제 (test done)
router.delete('/:id', verifyMiddleWare, async (req, res, next) => {
  const {id} = req.decoded;
  const {id:targetId}= req.params;

  // const id = 'jiwon1234';
  // const targetId= '4';


  try {
    const queryResult = await query(`DELETE FROM friend where (id = '${id}' AND friend_id = '${targetId}') OR (friend_id = '${id}' AND id = '${targetId}')`);
    console.log(queryResult);
    
    res.json({
      status: 200,
      message: '친구 삭제 성공',
      data: {id:targetId}              
    });
  } catch (error) {
    res.json({
      status:400,
      message: '친구 삭제 실패'
    });
  }
});

module.exports = router;
