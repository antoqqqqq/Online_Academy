import db from '../utils/db.js';
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
            const categories = await db('categories').select('*');
            return categories;
        } catch (error) {
            console.error('Error fetching categories:', error);
            throw error;
        }
    }
}