import db from './src/utils/db.js';
import dotenv from "dotenv";
dotenv.config();
async function testConnection() {
  try {
    const result = await db.raw('SELECT 1+1 AS solution');
    console.log('Kết nối OK, 1+1 =', result[0][0].solution);
  } catch (err) {
    console.error('Lỗi kết nối:', err);
  } finally {
    await db.destroy(); // đóng kết nối
  }
}

testConnection();
