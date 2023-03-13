const express = require('express');
const slugify = require('slugify');

const router = new express.Router();
const db = require('../db');
const ExpressError = require('../expressError');

router.get('/', async (req, res, next) => {
  const query = await db.query(
    `SELECT code, name FROM companies`
  );
  res.json({companies: query.rows});
})

router.get('/:code', async (req, res, next) => {
  try {
    const code = req.params.code;
    const queryCompany = await db.query(
      `SELECT code, name, description FROM companies WHERE code=$1`, [code]
    );
    const queryInvoices = await db.query(
      `SELECT id FROM invoices WHERE comp_code=$1`, [code]
    )
    const queryIndustries = await db.query(
      `SELECT industry
       FROM industries AS i
       INNER JOIN companies_industries AS ct
       ON i.code = ct.ind_code
       INNER JOIN companies AS c
       ON ct.comp_code = c.code
       WHERE c.code=$1`,
       [code]
    )
    if (!queryCompany.rows[0]) {
      throw new ExpressError(`Company code '${code}' could not be found`, 404);
    }
    const invoiceList = queryInvoices.rows.map(invoice => invoice.id);
    const industriesList = queryIndustries.rows.map(industry => industry.industry);
    const companyObj = queryCompany.rows[0];
    companyObj.invoices = invoiceList;
    companyObj.industries = industriesList;
    res.json({company: companyObj});
  }
  catch(err) {
    next(err);
  }
})

router.post('/', async (req, res, next) => {
  try {
    console.log('posting');
    console.log(req.body);
    const { name, description } = req.body;
    if (!(typeof name === 'string') || !(typeof description === 'string')) {
      throw new ExpressError(`Request data is not in the proper format.`, 400);
    }
    const code = slugify(name, {lower: true});
    console.log(code);
    const query = await db.query(
      `INSERT INTO companies (code, name, description)
        VALUES ($1, $2, $3)
        RETURNING code, name, description`,
      [code, name, description]
    );
    if (!query.rows[0]) {
      throw new ExpressError('Error creating new company.', 500);
    }
    res.status(201).json({company: query.rows[0]})
  }
  catch(err) {
    next(err);
  }
})

router.patch('/:code', async (req, res, next) => {
  try {
    const code = req.params.code;
    const { name: newName, description: newDescription } = req.body;
    const query = await db.query(
      `UPDATE companies SET name=$1, description=$2
        WHERE code = $3
        RETURNING code, name, description`,
      [newName, newDescription, code]
    );
    if (!query.rows[0]) {
      throw new ExpressError(`Company code '${code}' could not be found`, 404);
    }
    res.json({company: query.rows[0]});
  }
  catch(err) {
    next(err);
  }
})

router.delete('/:code', async (req, res, next) => {
  try {
    const code = req.params.code;
    const query = await db.query(
      `DELETE FROM companies WHERE code = $1
        RETURNING code`,
      [code]
    );
    if (!query.rows[0]) {
      throw new ExpressError(`Company code '${code}' could not be found`, 404);
    }
    res.json({status: "deleted"});
  }
  catch(err) {
    next(err);
  }
})

module.exports = router;
