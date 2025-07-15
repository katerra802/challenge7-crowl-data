const mongoose = require('mongoose');

const sub_categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: false,
        trim: true,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('Category', sub_categorySchema);