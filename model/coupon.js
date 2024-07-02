const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({

  code: {
    type: String,
    required: true,
    unique: true,
  },

  discount: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },

  expiryDate: {
    type: Date,
    required: true
  }, 

  status: {
    type: Boolean,
    default : true
  },

  maxDiscount :{
    type : Number ,
    require : true ,
    min : 0
  },

  minPurchase : {
    type : Number ,
    require : true ,
    min : 0
  },

  usedBy:[{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]

},{timestamps:true});

module.exports = mongoose.model('Coupon', couponSchema);