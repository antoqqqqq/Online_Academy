import db from '../utils/db.js';

export default {
    // sửa database
    async getLectureById(id) {
        return db('lecture').where('course_id', id);
    },
    
}

