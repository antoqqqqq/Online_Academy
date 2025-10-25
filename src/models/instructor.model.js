import db from '../utils/db.js';

export default {
    // Find instructor by account ID
    async findByAccountId(accountId) {
        return db('instructor')
            .where('account_id', accountId)
            .first();
    },

    // Find instructor by instructor_id
    async findById(instructorId) {
        return db('instructor')
            .where('instructor_id', instructorId)
            .first();
    },

    // Create instructor profile - WORKING VERSION
    async createInstructor(accountId, name) {
        try {
            // Find the next available instructor_id
            const maxResult = await db('instructor')
                .max('instructor_id as max_id')
                .first();
            
            const nextId = (maxResult.max_id || 0) + 1;
            
            console.log(`Creating instructor with ID: ${nextId} for account: ${accountId}`);
            
            const [instructor] = await db('instructor')
                .insert({
                    instructor_id: nextId, // Explicitly set the ID
                    account_id: accountId,
                    name: name,
                    bio: '',
                    total_students: 0,
                    create_time: new Date()
                })
                .returning('*');
            
            console.log('Successfully created instructor:', instructor.instructor_id);
            return instructor;
        } catch (error) {
            console.error('Error creating instructor:', error);
            
            // If insertion fails, try to find existing instructor
            if (error.code === '23505') {
                console.log('Instructor might already exist, searching...');
                const existing = await this.findByAccountId(accountId);
                if (existing) {
                    console.log('Found existing instructor:', existing.instructor_id);
                    return existing;
                }
            }
            
            throw error;
        }
    },

    // Safe method to get or create instructor
    async getOrCreateInstructor(accountId, name) {
        try {
            // First, try to find existing instructor
            let instructor = await this.findByAccountId(accountId);
            
            if (instructor) {
                console.log('Found existing instructor:', instructor.instructor_id);
                return instructor;
            }
            
            // If not found, create new one
            console.log('No existing instructor found, creating new one...');
            instructor = await this.createInstructor(accountId, name);
            return instructor;
            
        } catch (error) {
            console.error('Error in getOrCreateInstructor:', error);
            
            // Final fallback - try one more time to find existing
            const existing = await this.findByAccountId(accountId);
            if (existing) {
                console.log('Fallback: Found existing instructor after error');
                return existing;
            }
            
            throw new Error(`Could not get or create instructor for account ${accountId}`);
        }
    },

    // Get courses by instructor
    async getCoursesByInstructor(instructorId) {
        return db('courses')
            .where('instructor_id', instructorId)
            .orderBy('latest_update', 'desc');
    },

    // Update instructor profile
    async updateProfile(instructorId, data) {
        return db('instructor')
            .where('instructor_id', instructorId)
            .update(data);
    }
};