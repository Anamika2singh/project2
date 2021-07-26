const mongoose = require('mongoose')
const Schema = mongoose.Schema
const webhook = new Schema({
       userId:{type:mongoose.Types.ObjectId},
       userType:{
              type:String,
              enum: {
                     values: ["customer","serviceProvider"],
                     message: 'User Type is either: customer or serviceProvider',
                   },
              required:true
              },
      purchaseFrom:{
      type:String,
      enum: {
             values: ["android","ios"],
             message: 'User Type is either: android or ios',
           },
      required:true
      },
      response:{type:String,default:''},
      createdAt:{type:Date,default:Date.now}
})
module.exports = mongoose.model('webhooks',webhook)