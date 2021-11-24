
const mysql = require('mysql');
const connection = mysql.createPool({
    host: "165.132.105.26", 
    user: "team05",
    password: "final05", // 이전에 입력했던 비밀번호
    database: "database05", // 이전에 입력했던 데이터베이스 명
    multipleStatements: true,
    connectionLimit: 1000,
});

exports.query = query => new Promise((resolve, reject) => {
    connection.getConnection((err, connection) => {
        if (err) {
            return reject(err);
        }

        return connection.query(query, (err2, rows) => {
            connection.release();
            if (err2) {
                return reject(err2);
            }
            return resolve(rows);
        })
    });
});

