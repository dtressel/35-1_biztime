const express = require('express');

const router = new express.Router();
const db = require('../db');
const ExpressError = require('../expressError');

router.get('/', async (req, res, next) => {
  const query = await db.query(
    `SELECT i.industry, c.code
     FROM industries AS i
     LEFT JOIN companies_industries AS ct
     ON i.code = ct.ind_code
     LEFT JOIN companies AS c
     ON ct.comp_code = c.code
    `
  );
  const formulatedReturn = query.rows.reduce((accum, row) => {
    const accumIndex = accum.industries.findIndex(industry => industry.industry === row.industry);
    if (accumIndex > -1) {
      accum.industries[accumIndex].companies.push(row.code);
      return accum;
    }
    else {
      accum.industries.push({industry: row.industry, companies: row.code ? [row.code] : []});
      return accum;
    }
  }, {industries: []})
  res.json(formulatedReturn);
})

router.post('/', async (req, res, next) => {
  try {
    const { code, industry } = req.body;
    if (!(typeof code === 'string') || !(typeof industry === 'string')) {
      throw new ExpressError(`Request data is not in the proper format.`, 400);
    }
    const query = await db.query(
      `INSERT INTO industries (code, industry)
        VALUES ($1, $2)
        RETURNING code, industry`,
      [code, industry]
    );
    if (!query.rows[0]) {
      throw new ExpressError('Error creating new industry.', 500);
    }
    res.status(201).json({industry: query.rows[0]});
  }
  catch(err) {
    next(err);
  }
});

// Associates an industry with a company
router.post('/:code/companies', async  (req, res ,next) => {
  try {
    const ind_code = req.params.code;
    const { comp_code } = req.body;
    const query = await db.query(
      `INSERT INTO companies_industries (comp_code, ind_code)
        VALUES ($1, $2)
        RETURNING comp_code, ind_code`,
      [comp_code, ind_code]
    )
    if (!query.rows[0]) {
      throw new ExpressError('Error creating new association. Check company code and industry code.', 404);
    }
    res.status(201.).json({message: `Associated ${query.rows[0].comp_code} with ${query.rows[0].ind_code}`});
  }
  catch(err) {
    next(err);
  }
})

module.exports = router;