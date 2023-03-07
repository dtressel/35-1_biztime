const express = require('express');
const router = new express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  const query = await db.query(
    `SELECT * FROM companies`
  );

  res.json(query);
})


module.exports = router;
