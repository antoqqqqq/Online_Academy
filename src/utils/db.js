import knex from 'knex';
import dotenv from "dotenv";
dotenv.config();
const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,   // hoặc 'localhost'
    port: process.env.DB_port,          // cổng mặc định của MySQL
    user: process.env.DB_user,        // user mặc định của XAMPP
    password: process.env.DB_PASS,        // password mặc định rỗng (trừ khi bạn đặt lại trong phpMyAdmin)
    database: process.env.DB_NAME    // thay bằng tên DB bạn tạo trong Navicat/phpMyAdmin
  },
  pool: { min: 0, max: 15 }
});
export default db;
