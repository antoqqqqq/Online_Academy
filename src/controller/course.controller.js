import categoryModel from "../models/category.model.js";
import watchlistModel from "../models/watchlist.model.js";

import courseModel from "../models/course.model.js";
import instructorModel from "../models/instructor.model.js";
import lectureModel from "../models/lecture.model.js";
import videoModel from "../models/video.model.js";
import db from "../utils/db.js";

const courseController = {
    // List courses with pagination and filtering by category
    list: async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 12;
            const offset = (page - 1) * limit;
            const category_id = req.query.category_id || null;
            const courses = await courseModel.findAll({ limit, offset, category_id });
            const categories = await courseModel.getCategories();
            res.render("course/list", { 
                courses,
                categories,
                currentCategory: category_id,
                currentPage: page,
                layout: "main"
             });
        }
        catch (error) {
            next(error);
        }
    },

    // Search courses
    search: async (req, res, next) => {
        try {
            const { q, page = 1 } = req.query;
            const limit = 12;
            const offset = (page - 1) * limit;
            if (!q) {
                return res.redirect("/courses");
            }
            const courses = await courseModel.searchCourses(q, { limit, offset });
            const categories = await courseModel.getCategories();
            res.render("course/search", {
                courses,
                categories,
                searchTerm: q,
                currentPage: parseInt(page),
                layout: "main"
            });
        }
        catch (error) {
            next(error);
        }
    },

    // Course details
    detail: async (req, res, next) => {
        try {
            const { id } = req.params;
            const course = await courseModel.findById(id);
            if (!course) {
                return res.status(404).render("error", { message: "Course not found.", layout: "main" });
            }
            // Get related courses in the same category
            const relatedCourses = await courseModel.findAll({ limit: 5, category_id: course.category_id });
            // Get course lectures
            const lectures = await lectureModel.findByCourse(id);
            res.render("course/detail", {
                course,
                relatedCourses,
                lectures,
                layout: "main"
            });
        }
        catch (error) {
            next(error);
        }
    },

    // GET form to create a new course (instructors only)
    createForm: async (req, res, next) => {
        try {
            if (!req.user) {
                return res.redirect("/account/signin");
            }
            const instructor = await instructorModel.findByAccountId(req.user.id);
            if (!instructor) {
                return res.status(403).render("error", { message: "You are not an instructor.", layout: "main" });
            }
            // Get categories for dropdown
            const categories = await courseModel.getCategories();
            res.render("instructor/course/create", {
                layout : "main",
                useTinyMCE: true,
                categories
            });
        }
        catch (error) {
            next(error);
        }
    },

    // POST handler to create a course (instructors only)
    create: async (req, res, next) => {
        try {
            const account = req.user;
            if (!account) return res.redirect("/account/signin");
            const instructor = await instructorModel.findByAccountId(account.id);
            if (!instructor) {
                return res.status(403).render("error", { message: "You are not an instructor.", layout: "main" });
            }
            const {
                title,
                description,
                full_description,
                image_url,
                level,
                current_price,
                original_price,
                category_id
            } = req.body;
            const newCourse = {
                title,
                description,
                full_description: JSON.stringify({
                    content: full_description
                }),
                image_url: image_url || null,
                instructor_id: instructor.instructor_id,
                rating: 0,
                total_reviews: 0,
                total_hours: 0,
                total_lectures: 0,
                level: level || "Beginner",
                current_price: current_price || 0,
                original_price: original_price || 0,
                is_complete: false,
                category_id: category_id || null,
                total_enrollment: 0,
                is_onsale: false
                };
                const result = await courseModel.create(newCourse);
                const created = Array.isArray(result) ? result[0] : result;
                req.session.flash = { type: "success", message: "Course created successfully! Add lectures to complete your course." };
                res.redirect(`/instructor/courses/${created.course_id}/lectures`);
            }
        catch (error) {
            next(error);
        }
    },

    // GET form to edit a course (instructors only)
    editForm: async (req, res, next) => {
        try {
            const { id } = req.params;
            const course = await courseModel.findById(id);
            if (!course) {
                return res.status(404).render("error", { message: "Course not found.", layout: "main" });
            }
            // Check if current user is the course instructor
            const instructor = await instructorModel.findByAccountId(req.user.id);
            if (!instructor || instructor.instructor_id !== course.instructor_id) {
                return res.status(403).render("error", { message: "You can only edit your own courses.", layout: "main" });
            }
            const categories = await courseModel.getCategories();
            res.render("instructor/course/edit", {
                layout: "main",
                useTinyMCE: true,
                course,
                categories
            });
        }
        catch (error) {
            next(error);
        }
    },

    // POST handler to update a course (instructors only)
    edit: async (req, res, next) => {
        try {
            const { id } = req.params;
            const course = await courseModel.findById(id);
            if (!course) {
                return res.status(404).render("error", { message: "Course not found.", layout: "main" });
            }
            // Check if current user is the course instructor
            const instructor = await instructorModel.findByAccountId(req.user.id);
            if (!instructor || instructor.instructor_id !== course.instructor_id) {
                return res.status(403).render("error", { message: "You can only edit your own courses.", layout: "main" });
            }
            const {
                title,
                description,
                full_description,
                image_url,
                level,
                current_price,
                original_price,
                category_id,
                is_complete
            } = req.body;
            const updates = {
                title,
                description,
                full_description: JSON.stringify({
                    content: full_description
                }),
                image_url: image_url || null,
                level,
                current_price: current_price || 0,
                original_price: original_price || 0,
                category_id: category_id || null,
                is_complete: is_complete === "on",
                latest_update: new Date()
            };
            await courseModel.update(id, updates);
            req.session.flash = { type: "success", message: "Course updated successfully!" };
            res.redirect(`/instructor/courses/${id}/edit`);
        }
        catch (error) {
            next(error);
        }
    },

    // Mark course as complete (instructors only)
    markComplete: async (req, res, next) => {
        try {
            const { id } = req.params;
            const course = await courseModel.findById(id);
            if (!course) {
                return res.status(404).render("error", { message: "Course not found.", layout: "main" });
            }
            // Check if current user is the course instructor
            const instructor = await instructorModel.findByAccountId(req.user.id);
            if (!instructor || instructor.instructor_id !== course.instructor_id) {
                return res.status(403).render("error", { message: "You can only mark your own courses as complete.", layout: "main" });
            }
            await courseModel.update(id, { 
                is_complete: true,
                latest_update: new Date()
             });
            req.session.flash = { type: "success", message: "Course marked as complete!" };
            res.redirect(`/instructor/courses/${id}`);
        }
        catch (error) {
            next(error);
        }
    },

    /**
     * Xem chi tiết khóa học (Simple version - để tránh conflict)
     */
    detail: async (req, res, next) => {
        try {
            const courseId = req.params.id;
            const userId = req.session.authUser?.id;

            // Lấy thông tin khóa học
            const course = await courseModel.getCourseById(courseId);
            
            if (!course) {
                return res.status(404).render('error', {
                    message: 'Không tìm thấy khóa học'
                });
            }

            // Kiểm tra xem đã có trong watchlist chưa (nếu user đã đăng nhập)
            let isInWatchlist = false;
            if (userId) {
                isInWatchlist = await watchlistModel.isInWatchlist(userId, courseId);
            }

            res.render('vwCourse/detail', {
                layout: 'main',
                course,
                isInWatchlist,
                isLoggedIn: !!userId
            });
        } catch (error) {
            console.error('Lỗi khi xem chi tiết khóa học:', error);
            next(error);
        }
    },

    /**
     * Toggle watchlist - Thêm/Xóa khỏi danh sách yêu thích
     */
    toggleWatchlist: async (req, res) => {
        try {
            // Kiểm tra đăng nhập
            if (!req.session.authUser) {
                return res.json({
                    success: false,
                    message: 'Vui lòng đăng nhập để sử dụng tính năng này',
                    requireLogin: true
                });
            }

            const courseId = req.params.id;
            const userId = req.session.authUser.id;

            // Toggle watchlist
            const result = await watchlistModel.toggle(userId, courseId);

            // Kiểm tra trạng thái hiện tại
            const isInWatchlist = await watchlistModel.isInWatchlist(userId, courseId);

            return res.json({
                ...result,
                isInWatchlist
            });
        } catch (error) {
            console.error('Lỗi khi toggle watchlist:', error);
            return res.json({
                success: false,
                message: 'Có lỗi xảy ra, vui lòng thử lại'
            });
        }
    },

    /**
     * Xem danh sách watchlist của user
     */
    viewWatchlist: async (req, res, next) => {
        try {
            // Kiểm tra đăng nhập
            if (!req.session.authUser) {
                return res.redirect('/account/signin');
            }

            const userId = req.session.authUser.id;
            const page = parseInt(req.query.page) || 1;
            const limit = 12;
            const offset = (page - 1) * limit;

            // Lấy danh sách khóa học yêu thích
            const courses = await watchlistModel.getByUserId(userId, limit, offset);
            const total = await watchlistModel.countByUserId(userId);
            const totalPages = Math.ceil(total / limit);

            res.render('vwCourse/watchlist', {
                layout: 'main',
                courses,
                total,
                pagination: {
                    currentPage: page,
                    totalPages,
                    hasPrev: page > 1,
                    hasNext: page < totalPages,
                    pages: Array.from({ length: totalPages }, (_, i) => ({
                        value: i + 1,
                        isCurrent: i + 1 === page
                    }))
                }
            });
        } catch (error) {
            console.error('Lỗi khi xem watchlist:', error);
            next(error);
        }
    },

    // Instructor course management dashboard
    manageCourses: async (req, res, next) => {
        try {
            const instructor = await instructorModel.findByAccountId(req.user.id);
            if (!instructor) {
                return res.status(403).render("error", { message: "You are not an instructor.", layout: "main" });
            }
            const courses = await courseModel.findByInstructor(instructor.instructor_id);
            const courseCount = await courseModel.countByInstructor(instructor.instructor_id);
            res.render("instructor/dashboard", {
                instructor,
                courses,
                courseCount,
                layout: "main"
            });
        }
        catch (error) {
            next(error);
        }
    },
};

export default courseController;