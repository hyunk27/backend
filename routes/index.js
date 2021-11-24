const express = require('express');
const router = express.Router();
const fs = require('fs');

fs.readdirSync('./routes').forEach(filename => {
  if (!['index.js', 'socket.js'].includes(filename) && filename.endsWith('.js')) {
    const name = filename.replace('.js', '');
    router.use(`/${name}`, require(`./${name}`));
  }
});

module.exports = router;
