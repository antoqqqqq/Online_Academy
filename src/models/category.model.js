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
}

