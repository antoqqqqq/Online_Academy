import express from "express";
import db from '../utils/db.js'; // Import db nếu cần thiết, ví dụ cho renderCourseListView
import courseController from "../controller/course.controller.js";
import courseModel from "../models/course.model.js";
import lectureModel from "../models/lecture.model.js";
import categoryModel from "../models/category.model.js"; // Đảm bảo import categoryModel

const router = express.Router();

// --- Các route xử lý tìm kiếm ---

// Hàm xử lý chung cho GET /courses/search và POST /courses/search
const handleSearch = async (req, res) => {
    try {
        const q = req.query.q || req.body.searchInput || ''; // Lấy query từ GET hoặc POST
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = 6; // Số kết quả mỗi trang (có thể điều chỉnh)
        const offset = (page - 1) * limit;

        // Lấy tham số sắp xếp từ query string
        let sortBy = req.query.sortBy || 'relevance';
        let sortOrder = 'asc'; // Mặc định 'asc'

        // Ánh xạ giá trị từ dropdown sort sang tên cột và thứ tự
        switch (sortBy) {
            case 'newest':
                sortOrder = 'desc';
                // sortBy giữ nguyên là 'newest' để model xử lý orderBy('latest_update', 'desc')
                break;
            case 'popular':
                sortOrder = 'desc';
                // sortBy giữ nguyên là 'popular' để model xử lý orderBy('total_enrollment', 'desc')
                break;
            case 'rating':
                sortOrder = 'desc';
                // sortBy giữ nguyên là 'rating' để model xử lý orderBy('rating', 'desc')
                break;
            case 'price-asc':
                sortBy = 'price'; // Map sang cột price
                sortOrder = 'asc';
                break;
            case 'price-desc':
                sortBy = 'price'; // Map sang cột price
                sortOrder = 'desc';
                break;
            default: // relevance hoặc giá trị không hợp lệ
                sortBy = 'relevance';
                sortOrder = 'asc'; // Không quan trọng khi là relevance
        }

        // Tạo keyword cho FTS (nếu dùng to_tsquery) hoặc dùng trực tiếp q (nếu dùng websearch_to_tsquery)
        // const keyword = q.replace(/ /g, '&'); // Ví dụ cho to_tsquery
        const keyword = q; // Sử dụng trực tiếp q cho websearch_to_tsquery

        // Lấy danh sách khóa học đã phân trang và sắp xếp
        const courses = await courseModel.searchPaginated(keyword, limit, offset, sortBy, sortOrder);

        // Đếm tổng số kết quả
        const total = await courseModel.countSearchResults(keyword);
        const totalPages = Math.max(1, Math.ceil(total / limit));

        const pages = Array.from({ length: totalPages }, (_, i) => ({
            value: i + 1,
            isCurrent: i + 1 === page
        }));

        // Lấy danh sách category cho filter
        const categories = await categoryModel.getAllForFilter();

        // Xây dựng baseUrl giữ lại các tham số query hiện tại (q, sortBy, sortOrder)
        const queryParams = new URLSearchParams({
            q: q,
            sortBy: req.query.sortBy || 'relevance', // Giữ giá trị gốc từ dropdown
            sortOrder: sortOrder
        }).toString();
        const baseUrl = `/courses/search?${queryParams}`;

        res.render('vwsearch/search', {
            layout: 'main',
            title: `Kết quả tìm kiếm cho "${q}"`, // Thêm title
            q: q,
            amount: total,
            course_card: courses, // Đổi tên biến khớp với view
            categories: categories.map(cat => ({ id: cat.id, name: cat.category_name })),
            pagination: totalPages > 1 ? { // Chỉ hiển thị pagination nếu có nhiều hơn 1 trang
                currentPage: page,
                totalPages,
                hasPrev: page > 1,
                hasNext: page < totalPages,
                pages,
                baseUrl: baseUrl
            } : null, // Bỏ qua pagination nếu chỉ có 1 trang
            currentSort: { // Truyền giá trị gốc từ dropdown
                sortBy: req.query.sortBy || 'relevance'
                // sortOrder không cần truyền vì dropdown chỉ có value là sortBy
            }
        });
    } catch (error) {
        console.error('Search error:', error);
        res.render('vwsearch/search', {
            layout: 'main',
            title: 'Lỗi tìm kiếm',
            q: req.query.q || req.body.searchInput || '',
            amount: 0,
            course_card: [],
            pagination: null,
            categories: [],
            currentSort: {},
            errorMessage: 'Đã xảy ra lỗi trong quá trình tìm kiếm.' // Thêm thông báo lỗi
        });
    }
};

// Áp dụng handler cho cả GET và POST /search
router.get('/search', handleSearch);
router.post('/search', handleSearch);

// --- Route hiển thị tất cả khóa học ---
router.get('/', async function (req, res) {
    try {
        const categoryId = 0; // Luôn là 0 để lấy tất cả
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = 8; // Số lượng bạn muốn hiển thị mỗi trang
        const offset = (page - 1) * limit;

        const l1_name = null; // Không có L1 cụ thể
        const l2_name = "Tất cả lĩnh vực"; // Đặt tên L2

        const courses = await courseModel.getCourseWithInstructorName(limit, offset, categoryId);
        const total = await courseModel.countByCategory(categoryId);
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const pages = Array.from({ length: totalPages }, (_, i) => ({
            value: i + 1,
            isCurrent: i + 1 === page
        }));

        res.render('vwCourse/byCat', {
            layout: 'main',
            title: 'Tất Cả Khóa Học', // Title cho trang
            l1_name: l1_name,
            l2_name: l2_name,
            courses,
            category_id: categoryId, // Truyền categoryId=0
            pagination: totalPages > 1 ? { // Chỉ hiển thị pagination nếu nhiều hơn 1 trang
                currentPage: page,
                totalPages,
                hasPrev: page > 1,
                hasNext: page < totalPages,
                pages,
                baseUrl: '/courses?' // Base URL cho pagination links
            } : null
        });
    } catch (err) {
        console.error('Error in GET /courses:', err);
        res.status(500).send('Server error');
    }
});


// --- Các route khác (chi tiết, watchlist, lecture, ...) ---

// Xem chi tiết (Cách cũ - có thể không cần nếu dùng controller)
router.get('/details', async function (req, res) {
    const id = req.query.id;
    const course = await courseModel.getCourseById(id);
    if (course === null) {
        return res.redirect('/');
    }
    // Parse nội dung full_description
    if (course.full_description && typeof course.full_description === 'string') {
        try {
            course.full_description = JSON.parse(course.full_description);
        } catch (e) {
            console.error('Invalid full_description JSON', e);
            // Nếu lỗi parse, quyết định hiển thị dạng text hay object rỗng
             course.full_description = { content: course.full_description }; // Hiển thị dạng text thô
            // course.full_description = {}; // Hoặc object rỗng
        }
    } else if (!course.full_description) {
         course.full_description = {}; // Đảm bảo luôn là object
    }

    // const lectures = await lectureModel.getLecturesByCourseId(id); // Lấy danh sách lecture thay vì 1 lecture
    const feedback = await feedbackModel.getCourseFeedbacks(id, 5, 0); // Lấy feedback qua feedbackModel
    const related = await courseModel.findRelated(id); // Hàm này có vẻ đúng

    // Dùng controller.detail sẽ tốt hơn vì nó xử lý cả trạng thái user (watchlist, enrolled)
    // res.render('vwCourse/detail', {
    //     layout: 'main',
    //     course: course,
    //     feedback: feedback, // Đổi tên biến nếu cần
    //     related: related,
    //     // lectures: lectures, // Truyền danh sách lectures nếu cần hiển thị
    // });
    // Thay bằng gọi controller:
     return courseController.detail(req, res); // Sử dụng controller.detail tốt hơn
});


// Xem danh sách watchlist
router.get('/watchlist', courseController.viewWatchlist);

// Xem bài giảng
router.get('/:courseId/lecture/:lectureId', courseController.viewLecture);

// API routes cho video progress
router.post('/video-progress', courseController.saveVideoProgress);
router.get('/video-progress/:videoId', courseController.getVideoProgress);

// Chi tiết khóa học (/:id phải đặt cuối cùng để tránh xung đột)
// Router này nên gọi courseController.detail để xử lý logic phức tạp hơn
router.get('/:id', courseController.detail); // Gọi controller


// Toggle watchlist
router.post('/:id/watchlist/toggle', courseController.toggleWatchlist);


export default router;