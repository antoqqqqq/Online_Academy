import db from './src/utils/db.js';
import dotenv from "dotenv";
import path from "path";
import express from "express";
import exphbs from "express-handlebars";
import session from "express-session";
import bodyParser from "body-parser";
import homeRoute from "./src/routes/home.route.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import helpers from "./src/helper/curency.helper.js";
const app = express();
dotenv.config();
// Handlebars
app.engine("hbs", exphbs.engine({ 
  extname: ".hbs",
  helpers: helpers }));
app.set("view engine", "hbs");
app.set("views", "./src/views");
app.use(express.static(path.join(process.cwd(), "public")));
// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).render('error', {
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});
// Session
app.use(session({
  secret: "your_secret_key",
  resave: false,
  saveUninitialized: true,
}));
app.use("/", homeRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
export default app;
async function testConnection() {
  try {
    const result = await db.raw('SELECT 1+1 AS solution');
    console.log('Kết nối OK, 1+1 =', result[0][0].solution);
  } catch (err) {
    console.error('Lỗi kết nối:', err);
  }
}

testConnection();
