//내 주변 //영어를... 뭐로 해야할 지 모르겠어서 environ에 인근이라는 뜻이 있길래 이걸로 했어요 
var express = require('express');
var router = express.Router();

/* GET /environ/가 들어왔을 때 */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'environs' });
});

router.get('/:place', verifyMiddleWare, async (req, res, next) => {
  const {place} = req.params
  const users = await query(`SELECT * FROM user WHERE place = '${place}'`)

  if (users.length>0){
    res.json({
      status:200,
      data: users
    });
  } else {
    res.json({
      status:400,
      message : '사용자 목록 불러오기 실패'
    });
  }
});

module.exports = router;
