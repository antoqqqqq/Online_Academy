import knex from 'knex';
import dotenv from "dotenv";
dotenv.config();
const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,   // hoặc 'localhost'
    port: process.env.DB_port,          // cổng mặc định của MySQL
    user: process.env.DB_user,        // user mặc định của XAMPP
    password: process.env.DB_PASS,        // password mặc định rỗng (trừ khi bạn đặt lại trong phpMyAdmin)
    database: process.env.DB_NAME    // thay bằng tên DB bạn tạo trong Navicat/phpMyAdmin
  }
});

export default db;
