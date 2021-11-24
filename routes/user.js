const express = require('express');
const router = express.Router();
const { query } = require('../modules/db');
const { sign, verifyMiddleWare } = require('../modules/jwt');

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

router.get('/friends', verifyMiddleWare, async (req, res, next) => {
  const { id } = req.decoded;

  if (id) {
    const friends = (await query(`SELECT id, name FROM users where user_id in (SELECT to_id FROM friends WHERE from_id in (SELECT user_id FROM users WHERE id = '${id}'))`));

    res.json({
      success: true,
      friends
    });
  } else {
    res.json({
      success: false,
      errorMessage: 'Authentication is required'
    });
  }
});

router.post('/addFriends', verifyMiddleWare, async (req, res, next) => {
  const { id } = req.decoded;
  const { friend_id } = req.body;

  if (id) {
    if (friend_id) {
      const friends_array = await query(`SELECT * FROM friends WHERE (from_id, 
        to_id) in (SELECT u1.user_id, u2.user_id from users u1, users u2 WHERE u1.id = '${id}' and u2.id = '${friend_id}');`);

      if (friends_array.length > 0) {
        res.json({
          success: false,
          errorMessage: 'already exists!'
        });
      } else {
        await query(`INSERT INTO friends(from_id, to_id) (SELECT u1.user_id, u2.user_id from users u1, users u2 WHERE u1.id = '${id}' and u2.id = '${friend_id}');`);

        res.json({
          success: true,
        });
      }
    } else {
      res.json({
        success: false,
        errorMessage: 'no friend_id'
      });
    }
  } else {
    res.json({
      success: false,
      errorMessage: 'Authentication is required'
    });
  }
});

router.post('/removeFriends', verifyMiddleWare, async (req, res, next) => {
  const { id } = req.decoded;
  const { friend_id } = req.body;

  if (id) {
    if (friend_id) {
      const friends_array = await query(`SELECT * FROM friends WHERE (from_id, 
        to_id) in (SELECT u1.user_id, u2.user_id from users u1, users u2 WHERE u1.id = '${id}' and u2.id = '${friend_id}');`);

      if (friends_array.length === 0) {
        res.json({
          success: false,
          errorMessage: 'Not exists id!'
        });
      } else {
        await query(`DELETE FROM friends where (from_id, to_id) in (SELECT u1.user_id, u2.user_id from users u1, users u2 WHERE u1.id = '${id}' and u2.id = '${friend_id}');`);

        res.json({
          success: true,
        });
      }
    } else {
      res.json({
        success: false,
        errorMessage: 'no friend_id'
      });
    }
  } else {
    res.json({
      success: false,
      errorMessage: 'Authentication is required'
    });
  }
});

router.get('/signOut', verifyMiddleWare, (req, res, next) => {
  const { id } = req.decoded;

  if (id) {
    res.clearCookie('token').json({
      success: true
    })
  } else {
    res.json({
      success: false,
      errorMessage: 'Jwt not exists'
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
      errorMessage: 'Unvalid id'
    });
  } else if (!name_regex.test(name)) {
    res.json({
      success: false,
      errorMessage: 'Unvalid name'
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
      await query(`INSERT INTO users(id, password, name) VALUES('${id}', '${password}', '${name}')`);

      res.json({
        success: true
      });
    }
  }
});

module.exports = router;
