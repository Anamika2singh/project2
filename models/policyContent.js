const mongoose = require('mongoose')
const Schema = mongoose.Schema;
const policy= new Schema({
    tittle:{type:String,required:true},
    content:{type:String,required:true},
    type:{type:Number,required:true},//1= privacy policy , 2 = terms condition , 3= payment Refund
    status:{type:Number,default:0},
    createdAt:{type:Date,default:Date.now},
    updatedAt:{type:Date,default:Date.now}
})
module.exports = mongoose.model('content',policy)