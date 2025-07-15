const mongoose = require('mongoose');
require('dotenv').config();

const articleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    sapo: {
        type: String,
        required: false,
        trim: true,
    },
    url: {
        type: String,
        required: true,
        trim: true,
    },
    content: {
        type: [String],
        required: false,
        trim: true,
    },
    image: {
        type: String,   // URL or path to the image
        required: false,
        trim: true,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: false,
    },
});

module.exports = mongoose.model('Article', articleSchema);