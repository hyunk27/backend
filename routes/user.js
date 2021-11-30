const express = require('express');
const router = express.Router();
const { query } = require('../modules/db');
const { sign, verifyMiddleWare } = require('../modules/jwt');

router.post('/login', async (req, res, next) => {
  const { id, password } = req.body;

  const queryResult = await query(`SELECT * from user where id = '${id}' and password = '${password}';`);

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
      errorMessage: 'Incorrect id or password'
    });
  }
});

router.get('/whoAmI', verifyMiddleWare, (req, res, next) => {
  const { id, name } = req.decoded;

  if (id) {
    res.json({
      success: true,
      id,
      name,
    });
  } else {
    res.json({
      success: false,
      errorMesage: 'Authentication is required'
    });
  }
});

router.get('/logout', verifyMiddleWare, (req, res, next) => {
  const {id, name} = req.decoded;

  if (id){
    res.clearCookie('token').json({
      success: true
    })
  } else {
    res.json({
      success: false,
      erroMessage: 'Authentication is required'
    })
  }
});

router.post('/signin', async (req, res, next) => {
  const { id, password, name, type } = req.body;
  const id_regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{4,20}$/; // 4~20자리의 문자 및 숫자 1개 이상씩 사용한 정규식
  const name_regex = /^[가-힣a-zA-z]{3,20}$/;

  // 아이디 유효성 검사 통과 x
  if (!id_regex.test(id)) {
    res.json({
      success: false,
      errorMessage: 'Invalid id'
    });
  } else if (!name_regex.test(name)) {
    res.json({
      success: false,
      errorMessage: 'Invalid name'
    });
  } else { // 통과 O
    // 중복 확인
    const queryResult = await query(`SELECT * from users where id = '${id}'`);

    if (queryResult.length > 0) {
      res.json({
        success: false,
        errorMessage: 'Duplicate id'
      });
    } else {
      await query(`INSERT INTO user(id, password, name, type) VALUES('${id}', '${password}', '${name}', '${type}')`);

      res.json({
        success: true
      });
    }
  }
});

router.delete('/signout', async  (req, res, next) => {
  const {id, name} = req.decoded;
  if (id){
    res.json(
      {
        success: true
      })
    await query(`DELETE FROM user where id = '${id}'`);
  } else {
    res.json({
      success: false,
      errorMessage: 'Authentication is required'
    });
  }


});

module.exports = router;
