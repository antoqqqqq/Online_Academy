import express from "express";
import db from '../utils/db.js'; // Import db nếu cần thiết, ví dụ cho renderCourseListView
import courseController from "../controller/course.controller.js";
import courseModel from "../models/course.model.js";
import lectureModel from "../models/lecture.model.js";
import categoryModel from "../models/category.model.js"; // Đảm bảo import categoryModel

const router = express.Router();

// --- Các route xử lý tìm kiếm ---

// Hàm xử lý chung cho GET /courses/search và POST /courses/search
// src/routes/course.route.js
// ... imports ...

const handleSearch = async (req, res) => {
    try {
        const q = req.query.q || req.body.searchInput || '';
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = 6;
        const offset = (page - 1) * limit;

        // Xử lý Sort (giữ nguyên)
        let sortBy = req.query.sortBy || 'relevance';
        let sortOrder = 'asc';
        switch (sortBy) { /* ... (giữ nguyên switch case) ... */
            case 'newest': sortOrder = 'desc'; break;
            case 'popular': sortOrder = 'desc'; break;
            case 'rating': sortOrder = 'desc'; break;
            case 'price-asc': sortBy = 'price'; sortOrder = 'asc'; break;
            case 'price-desc': sortBy = 'price'; sortOrder = 'desc'; break;
            default: sortBy = 'relevance'; sortOrder = 'asc';
        }

        // --- SỬA: Chỉ lấy filter category ---
        const filters = {
            category: req.query.category || null,
            // Xóa price, rating, levels ở đây
        };
        // ------------------------------------

        const keyword = q;

        // --- Truyền filters (chỉ còn category) vào model ---
        const courses = await courseModel.searchPaginated(keyword, limit, offset, sortBy, sortOrder, filters);
        const total = await courseModel.countSearchResults(keyword, filters);
        // --------------------------------------------------

        const totalPages = Math.max(1, Math.ceil(total / limit));
        const pages = Array.from({ length: totalPages }, (_, i) => ({
            value: i + 1,
            isCurrent: i + 1 === page
        }));

        const categories = await categoryModel.getAllForFilter();

        // Xây dựng baseUrl giữ lại q, sortBy, và category
        const currentParams = { ...req.query };
        delete currentParams.page;
        const queryParams = new URLSearchParams(currentParams).toString();
        const baseUrl = `/courses/search?${queryParams}`;

        res.render('vwsearch/search', {
            layout: 'main',
            title: `Kết quả tìm kiếm cho "${q}"`,
            q: q,
            amount: total,
            course_card: courses,
            categories: categories.map(cat => ({ id: cat.id, name: cat.category_name })),
            pagination: totalPages > 1 ? { /* ... (giữ nguyên pagination) ... */
                currentPage: page,
                totalPages,
                hasPrev: page > 1,
                hasNext: page < totalPages,
                pages,
                baseUrl: baseUrl
            } : null,
            currentSort: { // Giữ nguyên
                sortBy: req.query.sortBy || 'relevance'
            },
            currentFilters: filters // Chỉ còn category
        });
    } catch (error) {
        console.error('Search error:', error);
        // ... (phần catch giữ nguyên, nhớ thêm currentFilters rỗng) ...
         res.render('vwsearch/search', {
            layout: 'main',
            title: 'Lỗi tìm kiếm',
            q: req.query.q || req.body.searchInput || '',
            amount: 0,
            course_card: [],
            pagination: null,
            categories: [],
            currentSort: {},
            currentFilters: {}, // Thêm filter rỗng
            errorMessage: 'Đã xảy ra lỗi trong quá trình tìm kiếm.'
        });
    }
};

router.get('/search', handleSearch);
router.post('/search', handleSearch);

// ... (Các route khác giữ nguyên) ...
router.get('/', async function (req, res) { /* ... Giữ nguyên ... */ });
router.get('/watchlist', courseController.viewWatchlist);
router.get('/:courseId/lecture/:lectureId', courseController.viewLecture);
router.post('/video-progress', courseController.saveVideoProgress);
router.get('/video-progress/:videoId', courseController.getVideoProgress);
router.get('/:id', courseController.detail);
router.post('/:id/watchlist/toggle', courseController.toggleWatchlist);


export default router;