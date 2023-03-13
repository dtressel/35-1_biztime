process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../app");
const db = require('../db');

let testCompanies;
let testInvoices;

beforeEach(async () => {
  const result = await db.query(
    `INSERT INTO companies (code, name, description)
      VALUES ('apple', 'Apple Computer', 'Maker of OSX.'),
             ('ibm', 'IBM', 'Big blue.')
      RETURNING code, name, description`
    );
  testCompanies = result.rows;

  const result2 = await db.query(
    `INSERT INTO invoices (comp_Code, amt, paid, paid_date)
      VALUES ('apple', 100, false, null),
             ('apple', 200, false, null),
             ('apple', 300, true, '2018-01-01'),
             ('ibm', 400, false, null)
      RETURNING id, comp_code, amt, paid, add_date, paid_date`
  );
  testInvoices = result2.rows;

  // change Date object to ISO string since that is what is returned from routes
  for (invoice of testInvoices) {
    invoice.add_date = invoice.add_date.toISOString();
  }
})

afterEach(async () => {
  await db.query(`DELETE FROM companies`);
  await db.query(`DELETE FROM invoices`);
})

afterAll(async () => {
  await db.end();
})

describe("GET /invoices", () => {
  test("Get a list of invoices", async () => {
    const res = await request(app).get('/invoices');
    const invoicesLess = testInvoices.map((invoice) => {
      return {id: invoice.id, comp_code: invoice.comp_code};
    })
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({invoices: invoicesLess});
  })
})

describe("GET /invoices/:id", () => {
  test("Get details of specific invoice", async () => {
    const query = await db.query(`SELECT id FROM invoices`);
    const invoiceId = query.rows[0].id
    const res = await request(app).get(`/invoices/${invoiceId}`);
    const expectedRes = testInvoices[0];

    // add company object to invoice and remove comp_code from invoice object
    const comp_code = testInvoices[0].comp_code;
    expectedRes.company = testCompanies.find(company => company.code === comp_code);
    delete expectedRes.comp_code;

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({invoice: expectedRes});
  })
})

describe("POST /invoices", () => {
  test("Route that adds an invoice to the invoices table", async () => {
    // Get number of invoices in database before adding
    const numberOfInvoices = testInvoices.length;

    // Get comp_code
    const testCompCode = testCompanies[testCompanies.length - 1].code;

    const res = await request(app).post('/invoices')
      .send({comp_code: testCompCode, amt: 51.99});
    const expectedRes = {invoice: {id: expect.any(Number),
                                   comp_code: testCompCode,
                                   amt: 51.99,
                                   paid: false,
                                   add_date: expect.any(String),
                                   paid_date: null}};

    // Check status code and return
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual(expectedRes);

    // Check that a company is added to database
    const query = await db.query(
      `SELECT comp_code FROM invoices`
    );
    expect(query.rows.length).toBe(numberOfInvoices + 1);
  })
})

describe("PATCH /invoices", () => {
  test("Route that edits an invoice in the invoices table", async () => {
    // Query current db state
    const numberOfInvoices = testInvoices.length;

    // Patch second invoice
    const res = await request(app).patch(`/invoices/${testInvoices[1].id}`)
      .send({amt: 14.99});
    const expectedRes = {invoice: {id: testInvoices[1].id,
                                   comp_code: testInvoices[1].comp_code,
                                   amt: 14.99,
                                   paid: testInvoices[1].paid,
                                   add_date: testInvoices[1].add_date,
                                   paid_date: testInvoices[1].paid_date}};

    // Check status code and return
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(expectedRes);

    // Check that the invoice has been edited in the database
    const query = await db.query(
      `SELECT id FROM invoices`
    );
    // Number of rows should not be altered
    expect(query.rows.length).toBe(numberOfInvoices);
    // First database entry should not be altered
    expect(query.rows[0].id).toEqual(testInvoices[0].id);
    // Second database entry should be altered
    expect(query.rows[1].id).not.toEqual(testInvoices[1].id);
  })
})

describe("DELETE /invoices", () => {
  test("Route that deletes a company from the invoices table", async () => {
    // Get number of invoices in database before adding
    const numberOfInvoices = testInvoices.length;
    const invoiceToDelete = testInvoices[0].id;

    const res = await request(app).delete(`/invoices/${invoiceToDelete}`);
    const expectedRes = {status: 'deleted'};

    // Check status code and return
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(expectedRes);

    // Check that a invoice has been deleted from database
    const query = await db.query(
      `SELECT id FROM invoices`
    );
    expect(query.rows.length).toBe(numberOfInvoices - 1);
    expect(query.rows[0].id).toEqual(testInvoices[1].id);
  })
})