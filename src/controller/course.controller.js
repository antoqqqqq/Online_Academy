import categoryModel from "../models/category.model.js";
import courseModel from "../models/course.model.js";
import watchlistModel from "../models/watchlist.model.js";

const courseController = {
    list: async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 12;
            const categoryId = req.query.category;

            // Mock categories data
            const categories = await categoryModel.index();
            // Mock courses data
            const subCategories = [
                {
                    id: 1,
                    title: 'Khóa học JavaScript Cơ bản',
                    thumbnail: 'https://picsum.photos/300/200',
                    instructor: 'John Doe',
                    category: 'IT & Phần mềm',
                    rating: 4.5,
                    reviewCount: 120,
                    price: 1200000,
                    discountPrice: 899000
                },
                {
                    id: 2,
                    title: 'Digital Marketing từ A-Z',
                    thumbnail: 'https://picsum.photos/300/200',
                    instructor: 'Jane Smith',
                    category: 'Marketing',
                    rating: 4.8,
                    reviewCount: 250,
                    price: 1500000,
                    discountPrice: null
                },
                {
                    id: 3,
                    title: 'UI/UX Design Master',
                    thumbnail: 'https://picsum.photos/300/200',
                    instructor: 'David Wilson',
                    category: 'Thiết kế',
                    rating: 4.7,
                    reviewCount: 180,
                    price: 2000000,
                    discountPrice: 1599000
                },
                {
                    id: 4,
                    title: 'Python cho người mới bắt đầu',
                    thumbnail: 'https://picsum.photos/300/200',
                    instructor: 'Sarah Johnson',
                    category: 'IT & Phần mềm',
                    rating: 4.6,
                    reviewCount: 300,
                    price: 1800000,
                    discountPrice: 1299000
                }
            ];


        } catch (error) {
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
    }
};

export default courseController;