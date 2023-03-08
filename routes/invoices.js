const express = require('express');
const router = new express.Router();
const db = require('../db');
const ExpressError = require('../expressError');

router.get('/', async (req, res, next) => {
  const query = await db.query(
    `SELECT id, comp_code FROM invoices`
  );
  res.json({invoices: query.rows});
})

router.get('/:id', async (req, res, next) => {
  try {
    const invoiceId = req.params.id;
    const query = await db.query(
      `SELECT i.id, i.amt, i.paid, i.add_date, i.paid_date, c.code, c.name, c.description
        FROM invoices AS i
        INNER JOIN companies AS c
        ON i.comp_code = c.code
        WHERE i.id=$1`,
        [invoiceId]
    );
    if (!query.rows[0]) {
      throw new ExpressError(`Invoice ID '${invoiceId}' could not be found`, 404);
    }
    res.json({invoice: {id: query.rows[0].id,
                        amt: query.rows[0].amt,
                        paid: query.rows[0].paid,
                        add_date: query.rows[0].add_date,
                        paid_date: query.rows[0].paid_date,
                        company: {code: query.rows[0].code,
                                  name: query.rows[0].name,
                                  description: query.rows[0].description}}})
  }
  catch(err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { code, amt } = req.body;
    if (!(typeof code === 'string') || (isNaN(amt))) {
      throw new ExpressError(`Request data is not in the proper format.`, 400);
    }
    const query = await db.query(
      `INSERT INTO invoices (comp_code, amt)
        VALUES ($1, $2)
        RETURNING id, comp_code, amt, paid, add_date, paid_date`,
      [code, amt]
    );
    if (!query.rows[0]) {
      throw new ExpressError('Error creating new invoice.', 500);
    }
    res.json({invoice: query.rows[0]});
  }
  catch(err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const { amt: newAmt } = req.body;
    const query = await db.query(
      `UPDATE invoices SET amt=$1
        WHERE id = $2
        RETURNING id, comp_code, amt, paid, add_date, paid_date`,
      [newAmt, id]
    );
    if (!query.rows[0]) {
      throw new ExpressError(`Invoice id '${id}' could not be found`, 404);
    }
    res.json({invoice: query.rows[0]});
  }
  catch(err) {
    next(err);
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const query = await db.query(
      `DELETE FROM invoices WHERE id = $1
        RETURNING id`,
      [id]
    );
    if (!query.rows[0]) {
      throw new ExpressError(`Invoice id '${id}' could not be found`, 404);
    }
    res.json({message: "Deleted"});
  }
  catch(err) {
    next(err);
  }
})


module.exports = router;