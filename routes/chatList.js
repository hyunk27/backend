//채팅 목록 
var express = require('express');
var router = express.Router();

/* GET /chatList/가 들어왔을 때 */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'chatLists' });
});

module.exports = router;

