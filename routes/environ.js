//내 주변 //영어를... 뭐로 해야할 지 모르겠어서 environ에 인근이라는 뜻이 있길래 이걸로 했어요 
var express = require('express');
var router = express.Router();

/* GET /environ/가 들어왔을 때 */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'environs' });
});

module.exports = router;
