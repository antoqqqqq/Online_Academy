import db from "../utils/db.js";
export default {
    async updateProfile(id, name, email) {
        const result = await db("account")
        .where("id", id)
        .update({ name: name, email: email });
        return result;
    },
    async isEmailAvailable(email) {
        const exist = await db("account")
        .where("email", email)
        .first();
        return !exist;
    },
    async findUserById(id) {
        const user = await db("account")
        .where("id", id)
        .first();
        return user || null;
    },
    async add(user) {
        const result = await db("account").insert(user);
        return result;
    },
    async findByEmail(email) {
        const user = await db("account")
        .where("email", email)
        .first();
        return user || null;
    },
    async findOrCreateGoogleUser(user) {
        const exist = await db("account")
        .where("email", user.emails[0].value)
        .first();
        if (!exist) {
            const newUser = {
                email: user.emails[0].value,
                name: user.displayName
            };
            const result = await db("account").insert(newUser).returning("*");
            return result[0];
        }
        return exist;
        // Implementation for finding or creating a Google user
    },
    async updatePassword(id, hashedPassword) {
        const result = await db("account")
        .where("id", id)
        .update({ password: hashedPassword });
        return result;
    },
    
    async findAll(permissionFilter = null) { // Thêm tham số filter
        let query = db('account').select('*').orderBy('id', 'asc');
        
        // Lọc theo giá trị permission (0, 1, 2)
        if (permissionFilter === '0') { // Admin
            query.where('permission', 0);
        } else if (permissionFilter === '2') { // Giảng viên
            query.where('permission', 2);
        } else if (permissionFilter === '1') { // Học viên (Permission 1 hoặc NULL - mặc định)
            query.where(builder => {
                builder.where('permission', 1).orWhereNull('permission');
            });
        }
        
        return query;
    },

    async countAll() {
        const result = await db('account').count('id as total');
        return result[0].total;
    },
    async update(id, user) {
        return db('account').where('id', id).update(user);
    },

    async deleteById(id) {
        // Cần cẩn thận khi xóa user vì có thể có ràng buộc khóa ngoại
        // Ví dụ: instructor, student...
        // Tạm thời chỉ làm lệnh xóa cơ bản
        return db('account').where('id', id).del();
    },

}