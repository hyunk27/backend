/*
var express = require('express');

var router = express.Router();

//require('dotenv').config();

var db = require('../modules/db');

var connection = db.init();

db.connect(connection);

router.get('/', function(req, res, next) {

  var sql_getBookList = 'SELECT * FROM user';

  connection.query(sql_getBookList, function (error, rows, fields) {

    if(!error){

      for (var i=0; i<rows.length; i++){

        console.log(rows[i]);

      }

    } else {

      console.log('query error: ' + error);

    }

  });

});

module.exports = router;
*/