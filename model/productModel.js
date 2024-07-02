const mongoose = require('mongoose')


const produtSchema = new mongoose.Schema({
 
    name: {
        type: String,
        required: true
    },
   
    price: {
        type: Number,
        required: true
    },
    
    DiscountPrice: {
        type: Number,
        required: true
    },

    description: {
        type: String,
        required: true
    },

    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'category',
        required: true
    },

    imageUrl: {
        type: Array,
        required: true
    },

    stock: {
        type: Number,
        required: true
    },
    bestSelling :{
        type : Number,
        default: 0
    },
    popularity :{
        type : Number ,
        default : 0
    },

    is_blocked: {
        type: Boolean,
        default: false,
    },

    isWishlisted: {
        type: Boolean,
        dafault: false
    },

    isOnCart: {
        type: Boolean,
        default: false,
    }

},{timestamps:true})



module.exports = mongoose.model('Product', produtSchema)
