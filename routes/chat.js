//채팅 하기 
var express = require('express');
var router = express.Router();

/* GET /chat/가 들어왔을 때 */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'chat' });
});

module.exports = router;
