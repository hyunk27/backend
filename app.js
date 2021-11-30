
const createError = require('http-errors'); 
//const variable = require('어쩌구')는 http-errors 파일에서 변수를 받아와서 variable에 저장하는 것입니다.
//이 경우에는 http-errors파일에 가면 export = createHttpError 하고 있습니다. 여기서 createError가 http-errors 파일의 createHttpError입니다. 
//여기있는건 거의 패키지에서 가져온 것이고, 가져온 패키지는 package.json파일에 dependencies에 있습니다. 
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors') // cross domain 문제 해결

const indexRouter = require('./routes/index');
const userRouter = require('./routes/user');
const friendRouter = require('./routes/friend');
const profileEditRouter = require('./routes/profileEdit');
const environRouter = require('./routes/environ');
const chatListRouter = require('./routes/chatList');
const chatRouter = require('./routes/chat');

const app = express();

// view engine setup
//app.set하면 서버에 변수가 심기는 겁니다. view engine = pug가 되는거예요! pug는 프론트에서 쓰는 것 같습니다. 
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(cors());

app.use(cookieParser());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

//라우터 분리 파트입니다. 라우터 폴더 추가하고 싶으시면 여기서 추가해주세요. 
app.use('/', indexRouter); // 기본 홈페이지 
app.use('/user', userRouter); // /users 이런 식으로 들어오면 이 파일 가서 라우터를 찾습니다. 회원가입, 로그인, 로그아웃이 구현되어 있는 것 같습니다. 
app.use('/friend',friendRouter); //친구 목록, 친구 검색
app.use('/chatList',chatListRouter); // 채팅 목록
app.use('/environ', environRouter); //내 주변 
app.use('/chat',chatRouter); //  채팅 하기 
//var testRouter = require('./routes/dbConnection.test');
//app.use('/test', testRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
