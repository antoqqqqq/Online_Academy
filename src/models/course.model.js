import db from '../utils/db.js';

export default {
    
    /**
     * Lấy tất cả khóa học cho trang admin
     * Nối 3 bảng: courses, instructor (để lấy tên GV), categoryL2 (để lấy tên danh mục)
     */
    async findAllAdmin() {
        return db('courses')
            .join('instructor', 'courses.instructor_id', 'instructor.instructor_id')
            .join('categoryL2', 'courses.category_id', 'categoryL2.id')
            .select(
                'courses.course_id as id', // Đổi tên cột 'course_id' thành 'id'
                'courses.title',
                'courses.is_complete',
                'courses.current_price as price',
                'instructor.name as lecturer_name', // Lấy tên từ bảng instructor
                'categoryL2.category_name'
            );
    },

    /**
     * Gỡ bỏ một khóa học (Yêu cầu 4.2)
     * Phải xóa dữ liệu ở các bảng con trước vì có RÀNG BUỘC KHÓA NGOẠI
     */
    async delete(id) {
        try {
            // 1. Xóa feedback
            await db('feedback').where('course', id).del();

            // 2. Xóa enrollment (đăng ký học)
            await db('enrollment').where('course_id', id).del();

            // 3. Xóa watchlist (yêu thích)
            await db('watchlist_course').where('course_id', id).del();

            // 4. Xóa lectures và các video/process liên quan (cascade)
            const lectures = await db('lecture').where('course_id', id).select('id');
            const lectureIds = lectures.map(l => l.id);

            if (lectureIds.length > 0) {
                // 4a. Get all video IDs
                const videos = await db('video').whereIn('lecture_id', lectureIds).select('id');
                const videoIds = videos.map(v => v.id);
                
                if (videoIds.length > 0) {
                    // 4b. Delete video_process
                    await db('video_process').whereIn('video_id', videoIds).del();
                    // 4c. Delete videos
                    await db('video').whereIn('id', videoIds).del();
                }
                // 4d. Delete lectures
                await db('lecture').whereIn('id', lectureIds).del();
            }

            // 5. Cuối cùng, xóa khóa học
            await db('courses').where('course_id', id).del();
            
            return true; // Trả về true nếu thành công
        } catch (error) {
            console.error("Lỗi khi xóa khóa học:", error);
            return false; // Trả về false nếu thất bại
        }
    }
}

