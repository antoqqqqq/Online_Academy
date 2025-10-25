import db from '../utils/db.js';

export default {
    /**
     * Lưu tiến độ học video của học viên
     */
    async saveVideoProgress(studentId, videoId, progressData) {
        try {
            const { 
                currentTime = 0, 
                duration = 0, 
                isCompleted = false,
                lastWatchedAt = new Date()
            } = progressData;

            // Kiểm tra xem đã có progress chưa
            const existing = await db('video_process')
                .where('student_id', studentId)
                .where('video_id', videoId)
                .first();

            if (existing) {
                // Cập nhật progress hiện tại
                const updated = await db('video_process')
                    .where('student_id', studentId)
                    .where('video_id', videoId)
                    .update({
                        current_time: currentTime,
                        duration: duration,
                        is_completed: isCompleted,
                        last_watched_at: lastWatchedAt,
                        updated_at: new Date()
                    })
                    .returning('*');

                return {
                    success: true,
                    message: 'Cập nhật tiến độ thành công',
                    progress: updated[0]
                };
            } else {
                // Tạo progress mới
                const newProgress = await db('video_process').insert({
                    student_id: studentId,
                    video_id: videoId,
                    current_time: currentTime,
                    duration: duration,
                    is_completed: isCompleted,
                    last_watched_at: lastWatchedAt,
                    created_at: new Date(),
                    updated_at: new Date()
                }).returning('*');

                return {
                    success: true,
                    message: 'Lưu tiến độ thành công',
                    progress: newProgress[0]
                };
            }
        } catch (error) {
            console.error('Error saving video progress:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi lưu tiến độ'
            };
        }
    },

    /**
     * Lấy tiến độ học video của học viên
     */
    async getVideoProgress(studentId, videoId) {
        try {
            const progress = await db('video_process')
                .where('student_id', studentId)
                .where('video_id', videoId)
                .first();

            return progress || {
                current_time: 0,
                duration: 0,
                is_completed: false,
                last_watched_at: null
            };
        } catch (error) {
            console.error('Error getting video progress:', error);
            return {
                current_time: 0,
                duration: 0,
                is_completed: false,
                last_watched_at: null
            };
        }
    },

    /**
     * Lấy tiến độ học của toàn bộ khóa học (theo chương)
     */
    async getCourseProgress(studentId, courseId) {
        try {
            // Lấy tất cả chương của khóa học
            const lectures = await db('lecture')
                .where('course_id', courseId)
                .orderBy('id', 'asc');

            // Lấy tiến độ của từng chương
            const lecturesWithProgress = await Promise.all(
                lectures.map(async (lecture) => {
                    // Lấy video của chương
                    const videos = await db('video')
                        .where('lecture_id', lecture.id)
                        .orderBy('id', 'asc');

                    // Tính tiến độ của chương
                    let completedVideos = 0;
                    let totalVideos = videos.length;
                    
                    for (const video of videos) {
                        const progress = await this.getVideoProgress(studentId, video.id);
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
                })
            );

            // Tính tổng tiến độ
            const totalLectures = lecturesWithProgress.length;
            const completedLectures = lecturesWithProgress.filter(l => l.progress.progressPercentage === 100).length;
            const progressPercentage = totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0;

            return {
                courseId,
                totalLectures,
                completedLectures,
                progressPercentage,
                lectures: lecturesWithProgress
            };
        } catch (error) {
            console.error('Error getting course progress:', error);
            return {
                courseId,
                totalLectures: 0,
                completedLectures: 0,
                progressPercentage: 0,
                lectures: []
            };
        }
    },

    /**
     * Lấy danh sách video đã hoàn thành của học viên trong khóa học
     */
    async getCompletedVideos(studentId, courseId) {
        try {
            const completedVideos = await db('video_process')
                .join('video', 'video_process.video_id', 'video.id')
                .join('lecture', 'video.lecture_id', 'lecture.id')
                .where('video_process.student_id', studentId)
                .where('lecture.course_id', courseId)
                .where('video_process.is_completed', true)
                .select('video_process.*', 'video.video_title', 'video.video_url')
                .orderBy('video_process.updated_at', 'desc');

            return completedVideos;
        } catch (error) {
            console.error('Error getting completed videos:', error);
            return [];
        }
    },

    /**
     * Đánh dấu video là đã hoàn thành
     */
    async markVideoCompleted(studentId, videoId) {
        try {
            const result = await db('video_process')
                .where('student_id', studentId)
                .where('video_id', videoId)
                .update({
                    is_completed: true,
                    updated_at: new Date()
                })
                .returning('*');

            return {
                success: true,
                message: 'Đánh dấu hoàn thành thành công',
                progress: result[0]
            };
        } catch (error) {
            console.error('Error marking video completed:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi đánh dấu hoàn thành'
            };
        }
    },

    /**
     * Lấy video tiếp theo cần học
     */
    async getNextVideoToWatch(studentId, courseId) {
        try {
            // Lấy tất cả video của khóa học
            const videos = await db('video')
                .join('lecture', 'video.lecture_id', 'lecture.id')
                .where('lecture.course_id', courseId)
                .select('video.*')
                .orderBy('video.id', 'asc');

            // Tìm video chưa hoàn thành đầu tiên
            for (const video of videos) {
                const progress = await this.getVideoProgress(studentId, video.id);
                if (!progress.is_completed) {
                    return video;
                }
            }

            // Nếu tất cả đã hoàn thành, trả về video đầu tiên
            return videos.length > 0 ? videos[0] : null;
        } catch (error) {
            console.error('Error getting next video to watch:', error);
            return null;
        }
    }
};
