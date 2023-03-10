process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../app");
const db = require('../db');

let testCompanies;
let testInvoices

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
  testInvoices = result.rows;
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