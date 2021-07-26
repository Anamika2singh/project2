
const mongoose = require('mongoose')
const Schema = mongoose.Schema
const item = new Schema({
       itemName:{type:String,required:true},
       unitPrice:{type:Number,required:true},
       discountPrice:{type:Number,default:0},
       description:{type:String ,required:true} ,
       itemImages:{type:Array,default:[]},
       status:{type:Number,default:1},    // 0 = disable of item 1 = enable of item 
       createdAt:{type:Date,default:Date.now},
       updatedAt:{type:Date,default:Date.now}
})
module.exports = mongoose.model('SellingItems',item)