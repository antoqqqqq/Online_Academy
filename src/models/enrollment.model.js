import db from '../utils/db.js';

export default {
    /**
     * Kiểm tra xem học viên đã đăng ký khóa học chưa
     */
    async isEnrolled(studentId, courseId) {
        try {
            const enrollment = await db('enrollment')
                .where('student_id', studentId)
                .where('course_id', courseId)
                .first();
            return !!enrollment;
        } catch (error) {
            console.error('Error checking enrollment:', error);
            return false;
        }
    },

    /**
     * Đăng ký khóa học cho học viên
     */
    async enroll(studentId, courseId) {
        try {
            // Kiểm tra xem đã đăng ký chưa
            const existing = await this.isEnrolled(studentId, courseId);
            if (existing) {
                return {
                    success: false,
                    message: 'Bạn đã đăng ký khóa học này rồi'
                };
            }

            // Thêm enrollment
            const enrollment = await db('enrollment').insert({
                student_id: studentId,
                course_id: courseId
            }).returning('*');

            // Cập nhật số lượng học viên của khóa học
            await this.updateCourseEnrollmentCount(courseId);

            return {
                success: true,
                message: 'Đăng ký khóa học thành công',
                enrollment: enrollment[0]
            };
        } catch (error) {
            console.error('Error enrolling student:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi đăng ký khóa học'
            };
        }
    },

    /**
     * Lấy danh sách khóa học đã đăng ký của học viên
     */
    async getEnrolledCourses(studentId, limit = 10, offset = 0) {
        try {
            const courses = await db('enrollment')
                .join('courses', 'enrollment.course_id', 'courses.course_id')
                .join('instructor', db.raw("CAST(courses.instructor_id AS INTEGER)"), 'instructor.instructor_id')
                .join('categoryL2', 'courses.category_id', 'categoryL2.id')
                .where('enrollment.student_id', studentId)
                .select(
                    'courses.*',
                    'instructor.name as instructor_name',
                    'categoryL2.category_name as category_name',
                    'enrollment.created_at as enrolled_at',
                    db.raw("'active' as enrollment_status")
                )
                .orderBy('enrollment.created_at', 'desc')
                .limit(limit)
                .offset(offset);

            return courses;
        } catch (error) {
            console.error('Error getting enrolled courses:', error);
            throw error;
        }
    },

    /**
     * Đếm số khóa học đã đăng ký của học viên
     */
    async countEnrolledCourses(studentId) {
        try {
            const result = await db('enrollment')
                .where('student_id', studentId)
                .count('* as total')
                .first();
            
            return parseInt(result.total);
        } catch (error) {
            console.error('Error counting enrolled courses:', error);
            return 0;
        }
    },

    /**
     * Cập nhật số lượng học viên của khóa học
     */
    async updateCourseEnrollmentCount(courseId) {
        try {
            const count = await db('enrollment')
                .where('course_id', courseId)
                .count('* as count')
                .first();
            
            await db('courses')
                .where('course_id', courseId)
                .update({
                    total_enrollment: parseInt(count.count)
                });
            
            return parseInt(count.count);
        } catch (error) {
            console.error('Error updating course enrollment count:', error);
            throw error;
        }
    },

    /**
     * Lấy thông tin enrollment chi tiết
     */
    async getEnrollmentDetails(studentId, courseId) {
        try {
            const enrollment = await db('enrollment')
                .join('courses', 'enrollment.course_id', 'courses.course_id')
                .join('instructor', db.raw("CAST(courses.instructor_id AS INTEGER)"), 'instructor.instructor_id')
                .join('categoryL2', 'courses.category_id', 'categoryL2.id')
                .where('enrollment.student_id', studentId)
                .where('enrollment.course_id', courseId)
                .select(
                    'courses.*',
                    'instructor.name as instructor_name',
                    'categoryL2.category_name as category_name',
                    'enrollment.created_at as enrolled_at',
                    db.raw("'active' as enrollment_status")
                )
                .first();

            return enrollment;
        } catch (error) {
            console.error('Error getting enrollment details:', error);
            return null;
        }
    }
};
