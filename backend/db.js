const { Pool } = require("pg");

const pool = new Pool({
  user: "asishkunta",
  host: "localhost",
  database: "lost_found",
  password: "",
  port: 5432,
});

module.exports = pool;