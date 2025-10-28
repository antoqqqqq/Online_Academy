import express from "express";
import db from '../utils/db.js';
import categoryModel from "../models/category.model.js";
import courseModel from "../models/course.model.js";
const router = express.Router();


// routes/course.route.js
router.get('/byCat', async function (req, res) {
    try {
        const categoryId = req.query.id ? parseInt(req.query.id, 10) : 0;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = 8;
        const offset = (page - 1) * limit;

        let l1_name = null; // Biến lưu tên L1
        let l2_name = "Tất cả lĩnh vực"; // Tên L2 mặc định

        if (categoryId && categoryId !== 0) {
            // Lấy thông tin L2 và L1 từ model
            const categoryInfo = await categoryModel.findL2WithL1ById(categoryId); // Sử dụng hàm mới
            if (categoryInfo) {
                l1_name = categoryInfo.l1_name;
                l2_name = categoryInfo.l2_name;
            } else {
                 l2_name = "Lĩnh vực không tồn tại"; // Xử lý nếu ID không hợp lệ
            }
        }

        const courses = await courseModel.getCourseWithInstructorName(limit, offset, categoryId);
        const total = await courseModel.countByCategory(categoryId);
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const pages = Array.from({ length: totalPages }, (_, i) => ({
            value: i + 1,
            isCurrent: i + 1 === page
        }));

        res.render('vwCourse/byCat', {
            layout: 'main',
            title: `Khoá học - ${l1_name ? l1_name + ' > ' : ''}${l2_name}`, // Cập nhật title
            l1_name: l1_name,       // Truyền tên L1
            l2_name: l2_name,       // Truyền tên L2
            courses,
            category_id: categoryId,
            pagination: {
                currentPage: page,
                totalPages,
                hasPrev: page > 1,
                hasNext: page < totalPages,
                pages
            }
        });
    } catch (err) {
        console.error('Error in /byCat:', err);
        res.status(500).send('Server error');
    }
});

async function renderCourseListView(req, res, coursesPromise, titlePrefix = "") {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = 8; // Số khóa học mỗi trang
        const offset = (page - 1) * limit;

        // Clone query để đếm tổng số lượng
        const countQuery = coursesPromise.clone().clearSelect().clearOrder().count('* as total').first();
        const totalResult = await countQuery;
        const total = parseInt(totalResult.total, 10) || 0;
        const totalPages = Math.max(1, Math.ceil(total / limit));

        // Lấy danh sách khóa học cho trang hiện tại và join thông tin cần thiết
        const courses = await coursesPromise.limit(limit).offset(offset)
            .leftJoin('instructor', db.raw("CAST(courses.instructor_id AS INTEGER)"), 'instructor.instructor_id') // Sửa join instructor nếu cần
            .leftJoin('categoryL2', 'courses.category_id', 'categoryL2.id')
            .select(
                'courses.*',
                'instructor.name as instructor_name',
                'categoryL2.category_name as category_name'
            ); // Chọn các cột cần thiết


        const pages = Array.from({ length: totalPages }, (_, i) => ({
            value: i + 1,
            isCurrent: i + 1 === page
        }));

        res.render('vwCourse/byCat', { // Sử dụng lại view byCat
            layout: 'main',
            title: `Khóa học - ${titlePrefix}`,
            courses,
            // category_id: null, // Không lọc theo category cụ thể ở đây
            pagination: {
                currentPage: page,
                totalPages,
                hasPrev: page > 1,
                hasNext: page < totalPages,
                pages,
                baseUrl: req.path // Thêm baseUrl cho pagination
            }
        });
    } catch (err) {
        console.error(`Error rendering course list for ${req.path}:`, err);
        res.status(500).send('Server error');
    }
}

// Route cho Khóa học Mới nhất (/categories/new)
router.get('/new', async function (req, res) {
    // Lấy tất cả khóa học, sắp xếp theo ngày cập nhật mới nhất
    const coursesQuery = db('courses').orderBy('latest_update', 'desc'); // Sửa: Dùng db('courses') trực tiếp hoặc hàm tương đương từ courseModel
    await renderCourseListView(req, res, coursesQuery, "Mới nhất");
});

// Route cho Khóa học Phổ biến (/categories/popular)
router.get('/popular', async function (req, res) {
    // Lấy tất cả khóa học, sắp xếp theo số lượt đăng ký
    const coursesQuery = db('courses').orderBy('total_enrollment', 'desc'); // Sửa: Dùng db('courses')
    await renderCourseListView(req, res, coursesQuery, "Phổ biến");
});

router.get('/free', async function (req, res) {
    // Lấy khóa học có giá bằng 0, sắp xếp theo ngày cập nhật
    const coursesQuery = db('courses').where('current_price', 0).orderBy('latest_update', 'desc'); // Sửa: Dùng db('courses')
    await renderCourseListView(req, res, coursesQuery, "Miễn phí");
});




// Example in category.route.js or course.route.js











export default router;