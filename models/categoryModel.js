const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  cName: {
    type: String,
    unique: true,
    required: [true, 'Please prvide a category'],
  },
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
