const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const itemOrder = new Schema({
orderId:{type:String,required:true,index:true,unique:true},
customerId: { type: mongoose.Types.ObjectId, required: true },
paymentIntentId:{type:String,default:''},
deliveryAddress: { type: String, required: true },
lat: { type: String, required: true },
long: { type: String, required: true },
deliveryLocation: {
//for calculating distance
type: {
type: String, // Don't do `{ location: { type: String } }`
enum: ["Point"], // 'location.type' must be 'Point'
default: "Point",
},
coordinates: {
type: [],
default: [],
},
},
cartItems: [
{
//Cart items array
itemId: {
type: mongoose.Types.ObjectId,
required: true,
},
quantity: {
type: Number,
default: 0,
},
itemName:{type:String,required:true},
itemPrice:{type:Number,required:true},
description:{type:String ,required:true} ,
itemImages:{type:Array,default:[]},
evaluation: {
rating: { type: Number, default: 0 },
review: { type: String, default: "" }
}
}
],
choosePaymentMethods:{
              type:String,
              enum: {
                     values: ["0","1"],
                     message: 'Payment Method is either: COD or Credit Card',
                   },
              required:true
              },
subTotal: { type: Number, required: true },
deliveryFee: { type: Number, required: true },
subscriptionDiscount: { type: Number, required: true },
estimatedTotalCost: { type: Number, required: true },


status: { type: Number, default: 0 }, 
//0 = waiting for confirmation
//1 = order confirmed
//2 = out for delivery
//3 = delivered
//4 = canceled
//5 = rejected
createdAt: { type: Date, default: Date.now },
updatedAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model("sellingItemOrder", itemOrder);