import express from "express";
const router = express.Router();
import categoryModel from "../models/category.model.js";
import homeController from "../controller/home.controller.js";
import courseModel from "../models/course.model.js";
import accoutModel from "../models/accout.model.js";
// ==========================
// CATEGORIES LOAD CHO MENU
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
router.use(async function (req, res, next) {
    try {
        if (req.session.authUser != null) {
            const list = await accoutModel.findUserById(req.session.authUser.id);
            req.session.authUser = list;
        }


        next();
    } catch (error) {
        // Lỗi sẽ được hiển thị ở đây!
        console.error("LỖI NGHIÊM TRỌNG KHI TẢI USER:", error);
        // Chuyển lỗi đến trang "Something went wrong" một cách tường minh
        next(error);
    }
});
// ==========================
// LOAD COURSE CHO BANNER/CAROUSEL
// ==========================
router.use(async function (req, res, next) {
    try {
        const banners = await courseModel.find4RandomCourseForBanner();
        res.locals.banners = banners;
        next();
    } catch (error) {
        // Lỗi sẽ được hiển thị ở đây!
        console.error("LỖI NGHIÊM TRỌNG KHI TẢI BANNERS:", error);
        // Chuyển lỗi đến trang "Something went wrong" một cách tường minh
        next(error);
    }
});
// ==========================
// LOAD COURSE CHO 4 KHOÁ HỌC NỔI BẬT TRONG TUẦN
// ==========================
router.use(async function (req, res, next) {
    try {
        const featuredCourses = await courseModel.find4CourseWithHighestRatingWEEKWithInstructorName();
        res.locals.featuredCourses = featuredCourses;
        next();
    } catch (error) {
        // Lỗi sẽ được hiển thị ở đây!
        console.error("LỖI NGHIÊM TRỌNG KHI TẢI KHOÁ HỌC NỔI BẬT TRONG TUẦN:", error);
        // Chuyển lỗi đến trang "Something went wrong" một cách tường minh
        next(error);
    }
});
// ==========================
// LOAD COURSE CHO 10 KHOÁ HỌC ĐƯỢC XEM NHIỀU NHẤT
// ==========================
router.use(async function (req, res, next) {
    try {
        const mostViewedCourses = await courseModel.find10CourseWithHighestReviewsWithInstructorName();
        res.locals.mostViewedCourses = mostViewedCourses;
        next();
    } catch (error) {
        // Lỗi sẽ được hiển thị ở đây!
        console.error("LỖI NGHIÊM TRỌNG KHI TẢI KHOÁ HỌC ĐƯỢC XEM NHIỀU NHẤT", error);
        // Chuyển lỗi đến trang "Something went wrong" một cách tường minh
        next(error);
    }
});
// ==========================
// LOAD COURSE CHO 10 KHOÁ HỌC MỚI NHẤT
// ==========================
router.use(async function (req, res, next) {
    try {
        const newestCourses = await courseModel.find10LatestCourseWithInstructorName();
        res.locals.newestCourses = newestCourses;
        next();
    } catch (error) {
        // Lỗi sẽ được hiển thị ở đây!
        console.error("LỖI NGHIÊM TRỌNG KHI TẢI KHOÁ HỌC ĐƯỢC XEM NHIỀU NHẤT", error);
        // Chuyển lỗi đến trang "Something went wrong" một cách tường minh
        next(error);
    }
});
// ==========================
// LOAD danh sách lĩnh vực được đăng ký học nhiều nhất trong tuần qua
// ==========================
router.use(async function (req, res, next) {
    try {
        const topCategories = await categoryModel.getCategoriesWithMostEnrollments();
        res.locals.topCategories = topCategories;
        next();
    } catch (error) {
        // Lỗi sẽ được hiển thị ở đây!
        console.error("LỖI NGHIÊM TRỌNG KHI TẢI LĨNH VỰC ĐĂNG KÝ NHIỀU NHẤT TRONG TUẦN", error);
        // Chuyển lỗi đến trang "Something went wrong" một cách tường minh
        next(error);
    }
});
// ==========================
// LOAD danh sách lĩnh vực cho dropdown
// ==========================
router.use(async function (req, res, next) {
    try {
        const dropdown_categories = await categoryModel.index(req, res);
        res.locals.dropdown_categories = dropdown_categories;
        next();
    } catch (error) {
        // Lỗi sẽ được hiển thị ở đây!
        console.error("LỖI NGHIÊM TRỌNG KHI TẢI LĨNH VỰC CHO DROPDOWN", error);
        // Chuyển lỗi đến trang "Something went wrong" một cách tường minh
        next(error);
    }
});
router.get("/", async (req, res) => {
    try {
        const data = await homeController.index(req, res);
        res.render("home", data);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).render('error');
    }
});
export default router;