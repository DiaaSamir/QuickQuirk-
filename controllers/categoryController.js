const factory = require('./handlerFactory');
const Category = require('./../models/categoryModel');

exports.getAllCategories = factory.getAll(Category, 'category');

exports.createCategory = factory.createOne(Category, 'category');

exports.deleteCategory = factory.deleteOne(Category, 'category');

exports.updateCategory = factory.updateOne(Category, 'category');
