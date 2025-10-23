import express from "express";
import categoryModel from "../models/category.model.js";
import courseModel from "../models/course.model.js";
const router = express.Router();


// routes/course.route.js
router.get('/byCat', async function (req, res) {
    try {
        // ✅ Match frontend: byCat?id=123&page=2
        const categoryId = req.query.id ? parseInt(req.query.id, 10) : 0;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = 8;
        const offset = (page - 1) * limit;

        // ✅ Get category name (for title)
        let category_name = "Tất cả lĩnh vực";
        if (categoryId && categoryId !== 0) {
            const category = await categoryModel.findById(categoryId);
            if (category) category_name = category.category_name;
        }

        // route
        const courses = await courseModel.getCourseWithInstructorName(limit, offset, categoryId);

        // ✅ Count total for pagination
        const total = await courseModel.countByCategory(categoryId);
        const totalPages = Math.max(1, Math.ceil(total / limit));

        // ✅ Build pages array
        const pages = Array.from({ length: totalPages }, (_, i) => ({
            value: i + 1,
            isCurrent: i + 1 === page
        }));

        // ✅ Get all categories for dropdown
        // const categories = await categoryModel.getAllForFilter();

        // ✅ Render view
        res.render('vwCourse/byCat', {
            layout: 'main',
            title: `Khoá học - ${category_name}`,
            // categories: categories.map(cat => ({
            //     _id: cat.id,
            //     name: cat.category_name
            // })),
            courses,
            category_id: categoryId, // 👈 must match frontend `{{category_id}}`
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



// Example in category.route.js or course.route.js











export default router;