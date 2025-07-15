const mongoose = require('mongoose');
require('dotenv').config();

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    slug: {
        type: String,
        required: false,
        trim: true,
    }

}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);