import express from "express";
const router = express.Router();
import categoryModel from "../models/category.model.js";
import homeController from "../controller/home.controller.js";
// ==========================
// CATEGORIES LOAD
// ==========================
router.use(async function (req, res, next) {
  try {
    const list = await categoryModel.getCategoriesL2_L1();
    res.locals.globalCategories = list;
    next();
  } catch (error) {
    // Lỗi sẽ được hiển thị ở đây!
    console.error("LỖI NGHIÊM TRỌNG KHI TẢI CATEGORIES:", error);
    // Chuyển lỗi đến trang "Something went wrong" một cách tường minh
    next(error); 
  }
});

router.get("/", async (req, res) => {
    try {
        const categories = await categoryModel.index(req, res);
        res.locals.categories = categories;
        const data = await homeController.index(req, res);
        res.render("home",  data );
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).render('error');
    }});
export default router;
