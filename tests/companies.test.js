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
})

afterEach(async () => {
  await db.query(`DELETE FROM companies`);
  await db.query(`DELETE FROM invoices`);
})

afterAll(async () => {
  await db.end();
})

describe("GET /companies", () => {
  test("Get a list of companies", async () => {
    const res = await request(app).get('/companies');
    const companiesNoDescription = testCompanies.map((company) => {
      return {code: company.code, name: company.name};
    })
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({companies: companiesNoDescription});
  })
})

describe("GET /companies/:code", () => {
  test("Get details of specific company", async () => {
    const res = await request(app).get('/companies/apple');
    const expectedRes = testCompanies[0];

    // add invoice array to result object
    expectedRes.invoices = testInvoices
      .filter(invoice => invoice.comp_code === 'apple')
      .map(invoice => invoice.id);

    // add industry array to result object (currently empty because no industries are initialized)
    expectedRes.industries = [];

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({company: expectedRes});
  })
})

describe("POST /companies", () => {
  test("Route that adds a company to companies table", async () => {
    // Get number of companies in database before adding
    const query1 = await db.query(
      `SELECT code FROM companies`
    );
    const numberOfCompanies = query1.rows.length;

    const res = await request(app).post('/companies')
      .send({name: 'Dell', description: 'Computer company'});
    const expectedRes = {company: {code: 'dell', name: 'Dell', description: 'Computer company'}};

    // Check status code and return
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual(expectedRes);

    // Check that a company is added to database
    const query2 = await db.query(
      `SELECT code FROM companies`
    );
    expect(query2.rows.length).toBe(numberOfCompanies + 1);
  })
})

describe("PATCH /companies", () => {
  test("Route that edits a company in the companies table", async () => {
    // Query current db state
    const query1 = await db.query(
      `SELECT * FROM companies`
    );
    const numberOfCompanies = query1.rows.length;

    // Patch second company
    const res = await request(app).patch(`/companies/${query1.rows[1].code}`)
      .send({name: 'IBM Corporation', description: 'Technology Corporation'});
    const expectedRes = {company: {code: query1.rows[1].code, name: 'IBM Corporation', description: 'Technology Corporation'}};

    // Check status code and return
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(expectedRes);

    // Check that the company has been edited in the database
    const query2 = await db.query(
      `SELECT * FROM companies`
    );
    // Number of rows should not be altered
    expect(query2.rows.length).toBe(numberOfCompanies);
    // First database entry should not be altered
    expect(query2.rows[0]).toEqual(query1.rows[0]);
    // Second database entry should be altered
    expect(query2.rows[1]).not.toEqual(query1.rows[1]);
  })
})

describe("DELETE /companies", () => {
  test("Route that deletes a company from the companies table", async () => {
    // Get number of companies in database before adding
    const query1 = await db.query(
      `SELECT code FROM companies`
    );
    const numberOfCompanies = query1.rows.length;
    const companyToDelete = query1.rows[0].code;

    const res = await request(app).delete(`/companies/${companyToDelete}`);
    const expectedRes = {status: 'deleted'};

    // Check status code and return
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(expectedRes);

    // Check that a company has been deleted from database
    const query2 = await db.query(
      `SELECT code FROM companies`
    );
    expect(query2.rows.length).toBe(numberOfCompanies - 1);
    expect(query2.rows[0]).toEqual(query1.rows[1]);
  })
})