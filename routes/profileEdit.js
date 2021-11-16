//내 정보 편집 
var express = require('express');
var router = express.Router();

/* GET /profileEdit/ 가 들어왔을 때 */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'profile Edit' });
});

module.exports = router;
