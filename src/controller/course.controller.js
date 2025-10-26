import categoryModel from "../models/category.model.js";
import courseModel from "../models/course.model.js";
import watchlistModel from "../models/watchlist.model.js";
import feedbackModel from "../models/feedback.model.js";
import enrollmentModel from "../models/enrollment.model.js";
import lectureModel from "../models/lecture.model.js";
import videoProgressModel from "../models/videoProgress.model.js";

const courseController = {
    /**
     * Xem chi tiết khóa học
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

            // Ensure course image URL is consistent
            if (!course.image_url || course.image_url === '' || course.image_url === '/upload/images/default-course.jpg') {
                course.image_url = '/upload/images/default-course.jpg';
            }

            // Ensure other courses have consistent image URLs
            if (course.other_courses && course.other_courses.length > 0) {
                course.other_courses = course.other_courses.map(otherCourse => ({
                    ...otherCourse,
                    image_url: otherCourse.image_url && otherCourse.image_url !== '' ? 
                        otherCourse.image_url : '/upload/images/default-course.jpg'
                }));
            }

            // Lấy lecture đầu tiên của khóa học
            const firstLecture = await lectureModel.getFirstLecture(courseId);
            course.first_lecture_id = firstLecture ? firstLecture.id : null;

            // Kiểm tra trạng thái học viên
            let isInWatchlist = false;
            let isEnrolled = false;
            let studentFeedback = null;
            let courseFeedbacks = [];
            let ratingStats = null;
            
            if (userId) {
                isInWatchlist = await watchlistModel.isInWatchlist(userId, courseId);
                isEnrolled = await enrollmentModel.isEnrolled(userId, courseId);
                studentFeedback = await feedbackModel.getStudentFeedback(userId, courseId);
            }

            // Lấy danh sách đánh giá và thống kê
            courseFeedbacks = await feedbackModel.getCourseFeedbacks(courseId, 5, 0);
            ratingStats = await feedbackModel.getCourseRatingStats(courseId);

            res.render('vwCourse/detail', {
                layout: 'main',
                course,
                isInWatchlist,
                isEnrolled,
                studentFeedback,
                courseFeedbacks,
                ratingStats,
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
            if (!req.session.authUser) {
                return res.json({
                    success: false,
                    message: 'Vui lòng đăng nhập để sử dụng tính năng này',
                    requireLogin: true
                });
            }

            const courseId = req.params.id;
            const userId = req.session.authUser.id;

            const result = await watchlistModel.toggle(userId, courseId);
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
            if (!req.session.authUser) {
                return res.redirect('/account/signin');
            }

            const userId = req.session.authUser.id;
            const page = parseInt(req.query.page) || 1;
            const limit = 12;
            const offset = (page - 1) * limit;

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

    /**
     * Xem nội dung bài giảng với media player
     */
    viewLecture: async (req, res, next) => {
        try {
            // Kiểm tra đăng nhập
            if (!req.session.authUser) {
                return res.redirect('/account/signin');
            }

            const courseId = req.params.courseId;
            const lectureId = req.params.lectureId;
            const userId = req.session.authUser.id;

            // Kiểm tra xem học viên đã đăng ký khóa học chưa
            const isEnrolled = await enrollmentModel.isEnrolled(userId, courseId);
            if (!isEnrolled) {
                return res.status(403).render('error', {
                    message: 'Bạn cần đăng ký khóa học để xem nội dung bài giảng'
                });
            }

            // Lấy thông tin khóa học
            const course = await courseModel.getCourseById(courseId);
            if (!course) {
                return res.status(404).render('error', {
                    message: 'Không tìm thấy khóa học'
                });
            }

            // Lấy thông tin chương và video
            const lecture = await lectureModel.getLectureWithVideos(lectureId);
            if (!lecture) {
                return res.status(404).render('error', {
                    message: 'Không tìm thấy bài giảng'
                });
            }

            // Lấy video đầu tiên của chương làm video hiện tại
            const currentVideo = lecture.videos && lecture.videos.length > 0 ? lecture.videos[0] : null;

            // Lấy danh sách tất cả chương của khóa học
            const allLectures = await lectureModel.getLecturesByCourseId(courseId);

            // Lấy tiến độ học của học viên
            const courseProgress = await videoProgressModel.getCourseProgress(userId, courseId);

            // Tìm chương hiện tại trong danh sách
            const currentLectureIndex = allLectures.findIndex(l => l.id == lectureId);
            const previousLecture = currentLectureIndex > 0 ? allLectures[currentLectureIndex - 1] : null;
            const nextLecture = currentLectureIndex < allLectures.length - 1 ? allLectures[currentLectureIndex + 1] : null;

            res.render('vwCourse/lectureLearning', {
                layout: 'main',
                course,
                lecture,
                currentVideo,
                allLectures,
                currentLectureIndex,
                previousLecture,
                nextLecture,
                courseProgress,
                isLoggedIn: true
            });
        } catch (error) {
            console.error('Lỗi khi xem bài giảng:', error);
            next(error);
        }
    },

    /**
     * API để lưu tiến độ học video
     */
    saveVideoProgress: async (req, res) => {
        try {
            if (!req.session.authUser) {
                return res.json({
                    success: false,
                    message: 'Vui lòng đăng nhập'
                });
            }

            const userId = req.session.authUser.id;
            const { videoId, currentTime, duration, isCompleted } = req.body;

            const result = await videoProgressModel.saveVideoProgress(userId, videoId, {
                currentTime: parseFloat(currentTime),
                duration: parseFloat(duration),
                isCompleted: isCompleted === 'true'
            });

            res.json(result);
        } catch (error) {
            console.error('Lỗi khi lưu tiến độ video:', error);
            res.json({
                success: false,
                message: 'Có lỗi xảy ra khi lưu tiến độ'
            });
        }
    },

    /**
     * API để lấy tiến độ học video
     */
    getVideoProgress: async (req, res) => {
        try {
            if (!req.session.authUser) {
                return res.json({
                    success: false,
                    message: 'Vui lòng đăng nhập'
                });
            }

            const userId = req.session.authUser.id;
            const videoId = req.params.videoId;

            const progress = await videoProgressModel.getVideoProgress(userId, videoId);

            res.json({
                success: true,
                progress
            });
        } catch (error) {
            console.error('Lỗi khi lấy tiến độ video:', error);
            res.json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy tiến độ'
            });
        }
    }
};

export default courseController;