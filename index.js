// ==========================
// 🌐 IMPORT MODULES
// ==========================
import express from "express";
import exphbs from "express-handlebars";
import session from "express-session";
import hsb_sections from 'express-handlebars-sections';
import bodyParser from "body-parser";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import {loadCategories} from "./src/middlewares/category.mdw.js"
import passport from "passport";
import db from "./src/utils/db.js";
import helpers from "./src/helper/curency.helper.js";
import { Handlebars } from "./src/helper/curency.helper.js"; // import the instance
import homeRoute from "./src/routes/home.route.js";
import courseRoute from "./src/routes/course.route.js";
import accountRoute from "./src/routes/account.route.js";
import adminRoute from "./src/routes/admin.route.js";
import categoryRoute from "./src/routes/category.route.js";


// ==========================
// ⚙️ CONFIGURATION
// ==========================
dotenv.config();
const app = express();

// Lấy đường dẫn tuyệt đối hiện tại (dùng nếu cần path chính xác)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==========================
// 🧱 TEMPLATE ENGINE (Handlebars)
// ==========================
const hbs = exphbs.create({
    extname: ".hbs",
    layoutsDir: path.join(__dirname, "src/views/layouts"),
    partialsDir: path.join(__dirname, "src/views/partials"),
    helpers: {
        section: hsb_sections(),
        ...helpers,
        ...Handlebars,
        eq: function (a, b) {
          return a === b;
      },
    },
});

app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");
app.set("views", "./src/views");

// ==========================
// 📂 STATIC FILES
// ==========================
app.use(express.static(path.join(process.cwd(), "src/public")));

// ==========================
// 🧩 MIDDLEWARES
// ==========================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Load categories cho mọi trang
app.use(loadCategories);

// 🧱 Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60  }, // 1 hour
  })
);
app.use(passport.initialize());
app.use(passport.session());


// ==========================
// 🚦 ROUTES
// ==========================
app.use((req, res, next) => {
  res.locals.user = req.session.authUser; // Gửi user sang view
  next();
});

app.use("/", homeRoute);
app.use("/courses", courseRoute);
app.use("/account", accountRoute);
app.use("/category", categoryRoute);
// Use admin route
app.use("/admin", adminRoute);


// ==========================
// ❌ GLOBAL ERROR HANDLER
// ==========================
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).render("error", {
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

// ==========================
// 🚀 SERVER START
// ==========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
// ==========================
// 🧠 DATABASE CONNECTION TEST
// ==========================
async function testConnection() {
  try {
    const result = await db.raw("SELECT 1+1 AS solution");
    console.log("📦 Kết nối OK, 1+1 =", result.rows[0].solution);
  } catch (err) {
    console.error("❌ Lỗi kết nối DB:", err);
  }
}

testConnection();

export default app;
