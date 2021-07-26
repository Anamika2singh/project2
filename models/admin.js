const mongoose = require('mongoose')
const Schema = mongoose.Schema;
const adminreg= new Schema({
    name:{type:String,required:true},
    email:{type:String,required:true},
    password : {type:String,required:true},
    sellingItemDeliveryFee : {type:Number,default:0},
    status:{type:Number,default:0},
    createdAt:{type:Date,default:Date.now},
    updatedAt:{type:Date,default:Date.now}
})
module.exports = mongoose.model('admin',adminreg)