
const mysql = require('mysql');

// 조교님 버전 
// const connection = mysql.createPool({
//     host: process.env.DB_HOST || "165.132.105.26",
//     user: process.env.DB_USER || "team05",
//     password: process.env.DB_PASSWORD || "final05", // 이전에 입력했던 비밀번호
//     database: process.env.DB_NAME || "database05", // 이전에 입력했던 데이터베이스 명
//     multipleStatements: true,
//     connectionLimit: 1000,
//     dateStrings: "date",
// });

const connection = mysql.createPool({


    host: process.env.DB_HOST || "dbprj.dhlyn.me",
    user: process.env.DB_USER || "team05",
    password: process.env.DB_PASSWORD || "password05@@", // 이전에 입력했던 비밀번호
    database: process.env.DB_NAME || "database05", // 이전에 입력했던 데이터베이스 명
    port: 53306,
    multipleStatements: true,
    connectionLimit: 1000,
    dateStrings: "date",
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

