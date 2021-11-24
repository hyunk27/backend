const express = require('express');
const router = express.Router();
const { query } = require('../modules/db');
const { verifyMiddleWare } = require('../modules/jwt');

socketRouter;

router.get('/', function(req, res, next) {
  res.render('index', { title: 'chat' });
});

router.get('/list', verifyMiddleWare, async (req, res, next) => {
  const { id } = req.decoded;

  if (id) {
    const chatList = (await query(`SELECT @uid:=user_id from users where id = '${id}';
      WITH b AS (SELECT if(from_id = @uid, to_id, from_id) AS id, message, created_at FROM chatdatas WHERE from_id = @uid OR to_id = @uid)
      SELECT u.id, u.name, b.message, b.created_at FROM b, users u WHERE created_at IN (SELECT max(created_at) FROM b GROUP BY id) and u.user_id = b.id;`))[1];
    res.json({
      success: true,
      chatList
    });
  } else {
    res.json({
      success: false,
      errorMessage: 'Authentication is required'
    });
  }
});

router.get('/chatData/:targetId', verifyMiddleWare, async (req, res, next) => {
  const { id } = req.decoded;
  const { targetId }= req.params;

  if (id) {
    const chatDatas = await query(`SELECT message, a.f_i as from_id, a.t_i as to_id, created_at 
      FROM chatDatas, (SELECT f.user_id as f_ui, f.id as f_i, t.user_id as t_ui, t.id as t_i FROM users f, users t WHERE (f.id = '${id}' and t.id = '${targetId}') OR (t.id = '${id}' and f.id = '${targetId}')) a 
      WHERE (from_id = a.f_ui and to_id = a.t_ui) ORDER BY created_at ASC;`);
    res.json({
      success: true,
      chatDatas
    });
  } else {
    res.json({
      success: false,
      errorMessage: 'Authentication is required'
    });
  }
});

router.post('/', verifyMiddleWare, async (req, res, next) => {
  const { id } = req.decoded;
  const { name, description } = req.body;

  if (id) {
    const result = await query(`SELECT * FROM chatrooms where name = '${name}'`);
    if (result.length > 0) {
      res.json({
        success: false,
        errorMessage: 'Duplicate name'
      });
    } else {
      await query(`INSERT INTO chatrooms(name, description) VALUES('${name}', '${description}')`);

      res.json({
        success: true
      });
    }
  } else {
    res.json({
      success: false,
      errorMessage: 'Authentication is required'
    });
  }
});


module.exports = router;
