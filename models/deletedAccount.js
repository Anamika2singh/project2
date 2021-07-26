const mongoose = require('mongoose')
const Schema = mongoose.Schema
const account = new Schema({
     
       name:{type:String,default:''},
       emailId:{type:String,default:''},
       countryCode:{type:String,default:''},
       mobileNumber:{type:Number},    
       address:{type:String,default:''},    
       lat:{type:String,default:''},
       long:{type:String,default:''},
      type: {type:Number,default:0},//1 = user , 2= provider
       cause:{type:String, default:''},
       createdAt:{type:Date,default:Date.now}
       
})
module.exports = mongoose.model('deletedAccount',account)