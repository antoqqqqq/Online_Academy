import db from '../utils/db.js';
import lodash from 'lodash'; // or write your own grouping logic

async function getCategoriesL2(id) {
    return await db('categoryL2').where('categoryL1_id', id).select('category_name', 'slug');
}
export default {
    async index(req, res) {
        try {
            // Fetch categories from the database
            const categoriesL1 = await db('categoryL1').select('*');
            const data = await Promise.all(categoriesL1.map(async (cat1) => ({
                name: cat1.category_name,
                slug: cat1.slug,
                subCategories: await getCategoriesL2(cat1.id)
            })));
            console.log(JSON.stringify(data, null, 2));
            return data
        } catch (error) {
            console.error('Home page error:', error);
            return res.status(500).render('error');
        }
    },
    async getCategories() {
        try {
            const categories = await db('categoryL1').select('*');
            return categories;
        } catch (error) {
            console.error('Error fetching categories:', error);
            throw error;
        }
    },
    async getCategoriesL2_L1() {
        try {
            const rawCategories = await db('categoryL2')
                .join('categoryL1', 'categoryL2.categoryL1_id', 'categoryL1.id')
                .select(
                    'categoryL2.id',
                    'categoryL2.category_name',
                    'categoryL2.categoryL1_id',
                    'categoryL1.category_name as parent_name', // the L1 category name
                );

            // Group by parent_name (or categoryL1_id)
            const grouped = lodash.groupBy(rawCategories, 'parent_name');

            // Convert to array form for easier looping in Handlebars
            const categories = Object.entries(grouped).map(([parent_name, subs]) => ({
                parent_name,
                categoryL1_id: subs[0].categoryL1_id,
                subcategories: subs
            }));
            console.log(categories);
            return categories;
        }
        catch (error) {
            console.error('Error fetching categories:', error);
            throw error;
        }
    },

    
    async findAllAdmin() {
        const catL1 = await db('categoryL1').select('*');
        const catL2 = await db('categoryL2').join('categoryL1', 'categoryL2.categoryL1_id', 'categoryL1.id')
                                         .select('categoryL2.*', 'categoryL1.category_name as parent_name');
        return { catL1, catL2 };
    },

    // Lấy tất cả L1 (dùng cho form)
    async findAllL1() {
        return await db('categoryL1').select('*');
    },

    // Đếm số khóa học trong 1 lĩnh vực (để kiểm tra xóa)
    // *** ĐÃ SỬA: Đếm trong bảng 'courses' ***
    async countCoursesInCategory(id) {
        // category_id trong bảng 'courses' là ID của categoryL2
        const res = await db('courses').where('category_id', id).count();
        return res[0].count;
    },

    // Thêm lĩnh vực
    async add(category) {
        // Nếu có categoryL1_id, thì đây là L2
        if (category.categoryL1_id) {
            return db('categoryL2').insert(category);
        }
        // Nếu không, đây là L1 (xóa key rỗng đi)
        delete category.categoryL1_id; 
        return db('categoryL1').insert(category);
    },

    // Cập nhật lĩnh vực
    async update(id, data, level) {
        if (level === 'L1') {
            return db('categoryL1').where('id', id).update(data);
        }
        return db('categoryL2').where('id', id).update(data);
    },

    // Xóa lĩnh vực
    async delete(id, level) {
         if (level === 'L1') {
            // (Bạn cần thêm logic kiểm tra L1 có L2 con không trước khi xóa)
            return db('categoryL1').where('id', id).del();
        }
        return db('categoryL2').where('id', id).del();
    },
    async countAll() {
        const l1 = await db('categoryL1').count('id as total');
        const l2 = await db('categoryL2').count('id as total');
        return Number(l1[0].total) + Number(l2[0].total);
    },
}

