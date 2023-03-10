process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../app");
const db = require('../db');

let testCompanies;
let testInvoices

beforeEach(async () => {
  console.log('Before Each');
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
  console.log('After Each');
  await db.query(`DELETE FROM companies`);
  await db.query(`DELETE FROM invoices`);
})

afterAll(async () => {
  console.log('After All');
  await db.end();
})

describe("GET /companies", () => {
  test("Get a list of companies", async () => {
    const res = await request(app).get('/companies');
    const companiesNoDescription = testCompanies.map((company) => {
      return {code: company.code, name: company.name};
    })
    console.log(companiesNoDescription);
    console.log(res.body);
    console.log(testCompanies);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({companies: companiesNoDescription});
  })
})