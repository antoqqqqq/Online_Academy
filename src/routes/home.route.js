import express from "express";
const router = express.Router();
import categoryModel from "../models/category.model.js";
import homeController from "../controller/home.controller.js";
// ==========================
// CATEGORIES LOAD
// ==========================
router.use(async function (req, res, next) {
  const list = await categoryModel.getCategoriesL2_L1();
  res.locals.globalCategories = list;

  next();
});
// ==========================
router.get("/", async (req, res) => {
    try {
        const categories = await categoryModel.index(req, res);
        res.locals.categories = categories;
        res.render("home", { categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).render('error');
    }});
export default router;
