import express from 'express';
import adminController from '../controller/admin.controller.js';

const router = express.Router();

// Middleware kiểm tra quyền admin
const isAdmin = (req, res, next) => {
    const user = req.session && req.session.authUser;
    if (user && Number(user.permission) === 0) {
        return next();
    }
    return res.redirect('/');
};

router.use(isAdmin);

// --- Dashboard ---
router.get('/', adminController.dashboard);

// --- User Management ---
router.get('/users', adminController.viewUsers);
router.post('/users/set-permission', adminController.setUserPermission);
router.post('/users/add', adminController.addUser);
router.post('/users/delete', adminController.deleteUser);


// --- Category Management (Đã thêm từ trước) ---
router.get('/categories', adminController.viewCategories);
router.post('/categories/add', adminController.addCategory);
router.post('/categories/update', adminController.updateCategory);
router.post('/categories/delete', adminController.deleteCategory);

// --- Course Management (YÊU CẦU 4.2) ---
// THÊM CÁC ROUTE MỚI DƯỚI ĐÂY:
router.get('/courses', adminController.viewCourses); // Xem danh sách khóa học
router.post('/courses/delete', adminController.deleteCourse); // Gỡ bỏ khóa học


export default router;

