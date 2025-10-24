import knex from 'knex';
import dotenv from "dotenv";
dotenv.config();
const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,   // hoặc 'localhost'
    port: process.env.DB_PORT,          // cổng mặc định của PostgreSQL
    user: process.env.DB_USER,        // user mặc định
    password: process.env.DB_PASS,        // password
    database: process.env.DB_NAME    // tên database
  },
  pool: { min: 0, max: 15 }
});
export default db;
