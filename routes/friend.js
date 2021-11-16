//친구 목록, 친구 검색
var express = require('express');
var router = express.Router();

/* GET /friend/가 들어왔을 때 */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'friends' });
});

module.exports = router;
