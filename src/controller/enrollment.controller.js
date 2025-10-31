import enrollmentModel from '../models/enrollment.model.js';
import videoProgressModel from '../models/videoProgress.model.js';
import courseModel from '../models/course.model.js';
import lectureModel from '../models/lecture.model.js';

const enrollmentController = {
    /**
     * Đăng ký khóa học
     */
    enroll: async (req, res) => {
        try {
            // Kiểm tra đăng nhập
            if (!req.session.authUser) {
                return res.json({
                    success: false,
                    message: 'Vui lòng đăng nhập để đăng ký khóa học',
                    requireLogin: true
                });
            }

            const courseId = req.params.id;
            const studentId = req.session.authUser.id;

            // Kiểm tra khóa học có tồn tại không
            const course = await courseModel.getCourseById(courseId);
            if (!course) {
                return res.json({
                    success: false,
                    message: 'Khóa học không tồn tại'
                });
            }

            // Đăng ký khóa học
            const result = await enrollmentModel.enroll(studentId, courseId);
            return res.json(result);
        } catch (error) {
            console.error('Lỗi khi đăng ký khóa học:', error);
            return res.json({
                success: false,
                message: 'Có lỗi xảy ra, vui lòng thử lại',
                error: error.message
            });
        }
    },

    /**
     * Kiểm tra trạng thái đăng ký khóa học
     */
    checkEnrollment: async (req, res) => {
        try {
            if (!req.session.authUser) {
                return res.json({
                    isEnrolled: false,
                    message: 'Chưa đăng nhập'
                });
            }

            const courseId = req.params.id;
            const studentId = req.session.authUser.id;

            const isEnrolled = await enrollmentModel.isEnrolled(studentId, courseId);

            return res.json({
                isEnrolled,
                message: isEnrolled ? 'Đã đăng ký khóa học' : 'Chưa đăng ký khóa học'
            });
        } catch (error) {
            console.error('Lỗi khi kiểm tra đăng ký:', error);
            return res.json({
                isEnrolled: false,
                message: 'Có lỗi xảy ra'
            });
        }
    },

    /**
     * Xem trang "Khóa học của tôi"
     */
    myCourses: async (req, res, next) => {
        try {
            // Kiểm tra đăng nhập
            if (!req.session.authUser || !req.session.authUser.id) {
                return res.redirect('/account/signin');
            }

            const studentId = req.session.authUser.id;
            const page = parseInt(req.query.page) || 1;
            const limit = 12;
            const offset = (page - 1) * limit;

            // Lấy danh sách khóa học đã đăng ký
            const enrolledCourses = await enrollmentModel.getEnrolledCourses(studentId, limit, offset);
            const totalCourses = await enrollmentModel.countEnrolledCourses(studentId);

            const totalPages = Math.ceil(totalCourses / limit);

            // Lấy tiến độ học tập cho từng khóa học (theo chương/lectures)
            const coursesWithProgress = await Promise.all(
                enrolledCourses.map(async (course) => {
                    try {
                        // Lấy tiến độ theo chương (lectures)
                        const courseProgress = await videoProgressModel.getCourseProgress(studentId, course.course_id);
                        
                        // Fix image URL nếu cần
                        let imageUrl = course.image_url;
                        if (!imageUrl || imageUrl === '' || imageUrl === '/upload/images/default-course.jpg') {
                            imageUrl = '/static/default/default-course.jpg';
                        }

                        return {
                            ...course,
                            image_url: imageUrl,
                            progress: {
                                progressPercentage: courseProgress.progressPercentage || 0,
                                completedLectures: courseProgress.completedLectures || 0,
                                totalLectures: courseProgress.totalLectures || 0
                            }
                        };
                    } catch (progressError) {
                        console.error('Error getting progress for course:', course.course_id, progressError);
                        return {
                            ...course,
                            progress: {
                                progressPercentage: 0,
                                completedLectures: 0,
                                totalLectures: 0
                            }
                        };
                    }
                })
            );

            res.render('vwCourse/myCourses', {
                layout: 'main',
                courses: coursesWithProgress,
                totalCourses,
                pagination: {
                    currentPage: page,
                    totalPages,
                    hasPrev: page > 1,
                    hasNext: page < totalPages
                }
            });
        } catch (error) {
            console.error('Lỗi khi xem khóa học của tôi:', error);
            next(error);
        }
    },

    /**
     * Xem chi tiết khóa học đã đăng ký (với danh sách chương)
     */
    viewCourse: async (req, res, next) => {
        try {
            const courseId = req.params.id;
            const studentId = req.session.authUser.id;

            // Lấy thông tin khóa học
            const course = await courseModel.getCourseById(courseId);
            if (!course) {
                return res.status(404).render('error', {
                    message: 'Khóa học không tồn tại'
                });
            }

            // Lấy danh sách chương
            const lectures = await lectureModel.getLecturesByCourseId(courseId);
            
            // Lấy tiến độ học tập cho từng chương
            const lecturesWithProgress = await Promise.all(
                lectures.map(async (lecture) => {
                    try {
                        // Lấy video của chương
                        const videos = await lectureModel.getVideosByLectureId(lecture.id);
                        
                        // Tính tiến độ của chương
                        let completedVideos = 0;
                        let totalVideos = videos.length;
                        
                        for (const video of videos) {
                            const progress = await videoProgressModel.getVideoProgress(studentId, video.id);
                            if (progress.is_completed) {
                                completedVideos++;
                            }
                        }
                        
                        const progressPercentage = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;
                        
                        return {
                            ...lecture,
                            videos: videos,
                            progress: {
                                completedVideos,
                                totalVideos,
                                progressPercentage
                            }
                        };
                    } catch (progressError) {
                        return {
                            ...lecture,
                            videos: [],
                            progress: {
                                completedVideos: 0,
                                totalVideos: 0,
                                progressPercentage: 0
                            }
                        };
                    }
                })
            );

            // Tính tổng tiến độ khóa học
            const totalLectures = lecturesWithProgress.length;
            const completedLectures = lecturesWithProgress.filter(l => l.progress.progressPercentage === 100).length;
            const courseProgressPercentage = totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0;

            res.render('vwCourse/courseLearning', {
                layout: 'main',
                course,
                lectures: lecturesWithProgress,
                courseProgress: {
                    completedLectures,
                    totalLectures,
                    progressPercentage: courseProgressPercentage
                }
            });
        } catch (error) {
            console.error('Lỗi khi xem khóa học:', error);
            next(error);
        }
    },

    /**
     * Xem video của một chương cụ thể
     */
    viewLecture: async (req, res, next) => {
        try {
            const courseId = req.params.courseId;
            const lectureId = req.params.lectureId;
            const studentId = req.session.authUser.id;

            // Lấy thông tin khóa học
            const course = await courseModel.getCourseById(courseId);
            if (!course) {
                return res.status(404).render('error', {
                    message: 'Khóa học không tồn tại'
                });
            }

            // Lấy thông tin chương với video
            const lecture = await lectureModel.getLectureWithVideos(lectureId);
            if (!lecture) {
                return res.status(404).render('error', {
                    message: 'Chương học không tồn tại'
                });
            }

            // Lấy danh sách tất cả chương để navigation
            const allLectures = await lectureModel.getLecturesByCourseId(courseId);
            
            // Tìm chương hiện tại và các chương trước/sau
            const currentIndex = allLectures.findIndex(l => l.id == lectureId);
            const previousLecture = currentIndex > 0 ? allLectures[currentIndex - 1] : null;
            const nextLecture = currentIndex < allLectures.length - 1 ? allLectures[currentIndex + 1] : null;

            // Lấy video hiện tại (video đầu tiên của chương)
            const currentVideo = lecture.videos.length > 0 ? lecture.videos[0] : null;
            
            // Lấy tiến độ của video hiện tại
            let videoProgress = null;
            if (currentVideo) {
                videoProgress = await videoProgressModel.getVideoProgress(studentId, currentVideo.id);
            }

            res.render('vwCourse/lectureLearning', {
                layout: 'main',
                course,
                lecture,
                currentVideo,
                videoProgress,
                allLectures,
                currentIndex,
                previousLecture,
                nextLecture
            });
        } catch (error) {
            console.error('Lỗi khi xem chương học:', error);
            next(error);
        }
    },

    /**
     * API để lưu tiến độ video
     */
    saveVideoProgress: async (req, res) => {
        try {
            if (!req.session.authUser) {
                return res.json({
                    success: false,
                    message: 'Vui lòng đăng nhập'
                });
            }

            const { videoId, currentTime, duration, isCompleted, action } = req.body;
            const studentId = req.session.authUser.id;

            if (!videoId) {
                return res.json({
                    success: false,
                    message: 'Thiếu thông tin video'
                });
            }

            // Nếu action là 'get', trả về progress hiện tại
            if (action === 'get') {
                const progress = await videoProgressModel.getVideoProgress(studentId, videoId);
                return res.json({
                    success: true,
                    progress: progress
                });
            }

            // Lưu progress
            const result = await videoProgressModel.saveVideoProgress(studentId, videoId, {
                currentTime: parseFloat(currentTime) || 0,
                duration: parseFloat(duration) || 0,
                isCompleted: Boolean(isCompleted),
                lastWatchedAt: new Date()
            });

            return res.json(result);
        } catch (error) {
            console.error('Lỗi khi lưu tiến độ video:', error);
            return res.json({
                success: false,
                message: 'Có lỗi xảy ra khi lưu tiến độ'
            });
        }
    },

    /**
     * API để đánh dấu video hoàn thành
     */
    markVideoCompleted: async (req, res) => {
        try {
            if (!req.session.authUser) {
                return res.json({
                    success: false,
                    message: 'Vui lòng đăng nhập'
                });
            }

            const { videoId } = req.body;
            const studentId = req.session.authUser.id;

            if (!videoId) {
                return res.json({
                    success: false,
                    message: 'Thiếu thông tin video'
                });
            }

            const result = await videoProgressModel.markVideoCompleted(studentId, videoId);

            return res.json(result);
        } catch (error) {
            console.error('Lỗi khi đánh dấu video hoàn thành:', error);
            return res.json({
                success: false,
                message: 'Có lỗi xảy ra'
            });
        }
    }
};

export default enrollmentController;
