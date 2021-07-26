const mongoose = require('mongoose')
const Schema = mongoose.Schema
const carType = new Schema({
       name:{type:String,required:true},
       image:{type:String},
       status:{type:Number,default:1},// 0 = inactive 1= active
       createdAt:{type:Date,default:Date.now},
       updatedAt:{type:Date,default:Date.now}
})
module.exports = mongoose.model('cars',carType)