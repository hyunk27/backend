var express = require('express');
var router = express.Router();
const { query } = require('../modules/db');
const { sign, verifyMiddleWare } = require('../modules/jwt');

/* GET user listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/signIn', async (req, res, next) => {
  const { id, password } = req.body;

  const queryResult = await query(`SELECT * from users where id = '${id}' and password = '${password}';`);

  if (queryResult.length > 0) {
    const jwt = sign({
      id,
      name: queryResult[0].name
    });
    res.cookie('token', jwt, {
      httpOnly: true,
      expires: new Date( Date.now() + 60 * 60 * 1000 * 24 * 7) // 7일 후 만료
    }).json({
      success: true,
      id,
      name: queryResult[0].name
    });
  } else {
    res.json({
      success: false,
      errorMessage: '아이디 또는 비밀번호가 잘못 입력 되었습니다.'
    });
  }
});

router.get('/whoAmI', verifyMiddleWare, (req, res, next) => {
  const { id, name } = req.decoded;

  res.json({
    success: id ? true : false,
    id,
    name
  });
});

router.get('/signOut', verifyMiddleWare, (req, res, next) => {
  const { id, name } = req.decoded;

  if (id) {
    res.clearCookie('token').json({
      success: true
    })
  } else {
    res.json({
      success: false,
      errorMessage: '토큰이 존재하지 않습니다.'
    })
  }
});


router.post('/signUp', async (req, res, next) => {
  const { id, password, name } = req.body;
  const id_regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{4,20}$/; // 4~20자리의 문자 및 숫자 1개 이상씩 사용한 정규식
  const name_regex = /^[가-힣a-zA-z]{3,20}$/;

  // 아이디 유효성 검사 통과 x
  if (!id_regex.test(id)) {
    res.json({
      success: false,
      errorMessage: '유효하지 않은 아이디입니다.'
    });
  } else if (!name_regex.test(name)) {
    res.json({
      success: false,
      errorMessage: '유효하지 않은 이름입니다.'
    });
  } else { // 통과 O
    // 중복 확인
    const queryResult = await query(`SELECT * from users where id = '${id}'`);

    if (queryResult.length > 0) {
      res.json({
        success: false,
        errorMessage: '이미 존재하는 아이디입니다.'
      });
    } else {
      await query(`INSERT INTO users(id, password, name) VALUES('${id}', '${password}', '${name}')`);

      res.json({
        success: true
      });
    }
  }
});

module.exports = router;
