import db from '../utils/db.js';

export default {
    /**
     * Lấy danh sách chương của khóa học
     */
    async getLecturesByCourseId(courseId) {
        try {
            const lectures = await db('lecture')
                .where('course_id', courseId)
                .orderBy('id', 'asc')
                .select('*');
            
            return lectures;
        } catch (error) {
            console.error('Error getting lectures by course id:', error);
            throw error;
        }
    },

    /**
     * Lấy thông tin chi tiết một chương
     */
    async getLectureById(lectureId) {
        try {
            const lecture = await db('lecture')
                .where('id', lectureId)
                .first();
            
            return lecture;
        } catch (error) {
            console.error('Error getting lecture by id:', error);
            throw error;
        }
    },

    /**
     * Lấy video của một chương
     */
    async getVideosByLectureId(lectureId) {
        try {
            const videos = await db('video')
                .where('lecture_id', lectureId)
                .orderBy('id', 'asc')
                .select('*');
            
            return videos;
        } catch (error) {
            console.error('Error getting videos by lecture id:', error);
            throw error;
        }
    },

    /**
     * Lấy chương tiếp theo trong khóa học
     */
    async getNextLecture(courseId, currentLectureId) {
        try {
            const nextLecture = await db('lecture')
                .where('course_id', courseId)
                .where('id', '>', currentLectureId)
                .orderBy('id', 'asc')
                .first();
            
            return nextLecture;
        } catch (error) {
            console.error('Error getting next lecture:', error);
            return null;
        }
    },

    /**
     * Lấy chương trước đó trong khóa học
     */
    async getPreviousLecture(courseId, currentLectureId) {
        try {
            const previousLecture = await db('lecture')
                .where('course_id', courseId)
                .where('id', '<', currentLectureId)
                .orderBy('id', 'desc')
                .first();
            
            return previousLecture;
        } catch (error) {
            console.error('Error getting previous lecture:', error);
            return null;
        }
    },

    /**
     * Lấy chương đầu tiên của khóa học
     */
    async getFirstLecture(courseId) {
        try {
            const firstLecture = await db('lecture')
                .where('course_id', courseId)
                .orderBy('id', 'asc')
                .first();
            
            return firstLecture;
        } catch (error) {
            console.error('Error getting first lecture:', error);
            return null;
        }
    },

    /**
     * Đếm số chương của khóa học
     */
    async countLecturesByCourseId(courseId) {
        try {
            const result = await db('lecture')
                .where('course_id', courseId)
                .count('* as count')
                .first();
            
            return parseInt(result.count);
        } catch (error) {
            console.error('Error counting lectures:', error);
            return 0;
        }
    },

    /**
     * Lấy thông tin chương với video
     */
    async getLectureWithVideos(lectureId) {
        try {
            const lecture = await this.getLectureById(lectureId);
            if (!lecture) return null;

            const videos = await this.getVideosByLectureId(lectureId);
            lecture.videos = videos;

            return lecture;
        } catch (error) {
            console.error('Error getting lecture with videos:', error);
            throw error;
        }
    }
};

