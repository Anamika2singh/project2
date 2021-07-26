const mongoose = require('mongoose')
const Schema = mongoose.Schema
const subscription = new Schema({
       userId:{type:mongoose.Types.ObjectId , required:true},
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
      productId:{type:String,required:true}, 
      purchaseDate:{type:Date,required:true},
      expiryDate:{type:Date,required:true},
      androidOrderId:{type:String,default:''},
      androidPurchaseToken:{type:String,default:''},
      appleReceiptData:{type:String,default:''},
      appleTransactionId:{type:String,default:''},
      appleOriginalTransactionId:{type:String,default:''},
      appleSubscriptionGroupIdentifier:{type:String,default:''},
      createdAt:{type:Date,default:Date.now}
})
module.exports = mongoose.model('subscriptions',subscription)