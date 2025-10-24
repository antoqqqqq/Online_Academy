import categoryModel from "../models/category.model.js";

export const loadCategories = async (req, res, next) => {
    // Sample categories data structure
    try {
        const categories = await categoryModel.index();
        res.locals.categories = categories; // gắn vào locals
    } catch(error) {
        console.error('Lỗi load category:', error);
        res.locals.categories = [];
    }
    next();
};
