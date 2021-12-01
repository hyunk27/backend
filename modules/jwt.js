const jwt = require('jsonwebtoken');
const cryptoKey = 'hello!';

// sign은 데이터로 jwt를 만듬
exports.sign = data => jwt.sign(data, cryptoKey);

// verify는 jwt를 데이터를 만듬
exports.verify = token => jwt.verify(token, cryptoKey);

// verify하는 express js middleWare
// API에서 jwt의 유무를 파악할 떄 사용
exports.verifyMiddleWare = (req, res, next) => {
    const { token } = req.cookies;

    req.decoded = token ? jwt.verify(token, cryptoKey) : {};

    // todo - 에러 처리 401 (토큰 관련 에러)
    
    next();
};