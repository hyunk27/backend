const express = require('express');
const router = express.Router();
const { query } = require('../modules/db');
const { sign, verifyMiddleWare } = require('../modules/jwt');
var CryptoJS = require("crypto-js");
var secretKey = 'secret key';

router.post('/login', async (req, res, next) => {
  const { id, password } = req.body;
  
  console.log(req.body);
  // login할 떄 아이디만 검색, 암호화된 id 찾기 위해 id만 검색
  const get_password = await query(`SELECT * from user where id = '${id}';`);

  if (get_password.length ==0) {
    res.json({
      statsu: 400,
      message: 'Incorrect ID'
    });
  } else {
    let decrpyted = CryptoJS.AES.decrypt(get_password[0].password, secretKey);
    var password_dec = JSON.parse(decrpyted.toString(CryptoJS.enc.Utf8));
    if (password != password_dec) {
    res.json({
      status: 400,
      message: 'Incorrect password'
    });
  } else {
    //login할 떄 자동으로 online으로 바꾸기 
    const result = await query(`UPDATE user SET online = 1 where id = '${id}';`);


    const jwt = sign({
      id,
      name: get_password[0].name
    });
    res.cookie('token', jwt, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      expires: new Date( Date.now() + 60 * 60 * 1000 * 24 * 7) // 7일 후 만료
    }).json({
      status: 200,
      id,
      name: get_password[0].name
    });
  }
}
});

router.get('/whoAmI', verifyMiddleWare, async (req, res, next) => {
  const { id, name } = req.decoded;
  if (id) {
    // id로 인증
    const queryResult = await query(`SELECT * from user where id = '${id}'`);
    res.json({
      success: true,
      id,
      name,
      place: queryResult[0].place,
      state_message: queryResult[0].state_message,
    });
  } else {
    res.json({
      success: false,
      message: 'Authentication is required'
    });
  }
});

router.get('/:id', verifyMiddleWare, async (req, res) => {
  const { id } = req.params;
  // id 중복하기 위한 결과 추출
  const queryResult = await query(`SELECT * from user where id = '${id}'`);
  if (queryResult.length === 0) {
    res.json({
      status: 404,
      errorMessage: '회원이 없습니다',
    });
  } else {
    const { id, name, type } = queryResult[0];
    res.json({
      status: 200,
      message: '회원 정보가 존재합니다.',
      id, name, type,
    });
  }
});

router.patch('/logout', verifyMiddleWare, async (req, res, next) => {
  const {id} = req.decoded;

  if (id){
    // logout하면 오프라인으로 변경
    await query(`UPDATE user SET online = 0 where id = '${id}'`)
    res.clearCookie('token').json({
      status: 200,
      message: '로그아웃 성공'
    })
  } else {
    res.json({
      status: 400,
      erroMessage: '로그아웃 실패'
    })
  }
});

router.post('/signin', async (req, res, next) => {
  const { id, password, name, type } = req.body;
  const id_regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{4,20}$/; // 4~20자리의 문자 및 숫자 1개 이상씩 사용한 정규식
  const name_regex = /^[ㄱ-ㅎ|가-힣|a-z|A-Z]{3,20}$/;

  // 아이디 유효성 검사 통과 x
  if (!id_regex.test(id)) {
    res.json({
      status: 400,
      message: 'Invalid id'
    });
  } else if (!name_regex.test(name)) {
    res.json({
      status: 400,
      message: 'Invalid name'
    });
  } else if (password.length == 0){
    res.json({
      status: 400,
      message: 'Enter password'
    });
  } else { // 통과 O
    // 중복 확인
    const queryResult = await query(`SELECT * from user where id = '${id}'`);

    if (queryResult.length > 0) {
      res.json({
        status: 400,
        message: 'Duplicate id'
      });
    } else {
      var encrypted = CryptoJS.AES.encrypt(JSON.stringify(password), secretKey).toString();
      // 회원가입할 때 입력한 값(비밀번호는 암호화 이후), 초기 세팅 값 설정
      await query(`INSERT INTO user(id, password, name, type, place ,online) VALUES('${id}', '${encrypted}', '${name}', '${type}',0, 0)`);

      res.json({
        status:200,
        message: '회원가입 성공'
      });
    }
  }
});

router.get('/signin/:id', verifyMiddleWare, async (req, res, next) => {
  const {id} = req.params;
  // id 중복확인
  const queryResult = await query(`SELECT * from user where id = '${id}'`);
  if (queryResult.length > 0) {
    res.json({
      status:400,
      message: '중복된 id입니다'
    });
  } else {
    res.json({
      status: 200,
      message: '사용가능한 id입니다'
    });
  }
});

router.delete('/signout', verifyMiddleWare, async  (req, res, next) => {
  const {id, name} = req.decoded;
  if (id){
    // 회원탈퇴할때 id 매칭해서 삭제
    await query(`DELETE FROM user where id = '${id}'`);
    res.json(
      {
        status:200,
        message: '회원탈퇴되었습니다'
      })
  } else {
    res.json({
      status:400,
      message: '회원탈퇴 실패'
    });
  }
});

router.patch('/change', verifyMiddleWare, async (req, res, next) => { 
  const {id} = req.decoded;
  const {state_message, place} = req.body;
  const state_message_regex = /^[ㄱ-ㅎ|가-힣|a-z|A-Z]{1,20}$/;

  if (!state_message_regex.test(state_message)){
    res.json({
      status:400,
      message: '상태메세지는 최대 20자까지입니다.'
    });
  } else {
    if (state_message.length == 0){
      state_message = ''
    };
    // 회원정보 수정
    await query(`UPDATE user SET state_message='${state_message}', place='${place}' where id = '${id}'`)
    res.json(
      {
        status:200,
        message: '변경성공'
      }
    );
  }
});

module.exports = router;
