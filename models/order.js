const mongoose = require('mongoose')
const Schema   = mongoose.Schema

const order    = new Schema({
        orderId:{type:String,required:true,unique:true},
        paymentIntentId:{type:String,default:''},
        customerId:{type:mongoose.Types.ObjectId},
        providerId:{type:mongoose.Types.ObjectId , required:true},
        deliveryDate:{type:Date,required:true}, 
        slotStartTime:{type:String,required:true},
        slotEndTime:{type:String,required:true},
         deliveryOption:{type:Number},//0 for selfDriving 1 for pick and drop by service Provider
         serviceType:{type:Number,required:true},//0 =  onsite 1 = onServiceStation
         deliveryAddress:{type:String,default:''},
         deliveryLocation: {  //for calculating distance
                type: {
                  type: String, // Don't do `{ location: { type: String } }`
                  enum: ['Point'], // 'location.type' must be 'Point'
                  default:'Point'
                },
                coordinates: {
                  type: [],
                  default:[]
                }
              },
      
        carId:{type:mongoose.Types.ObjectId,required:true},
        services:[
               {
            nameOfTheService:{type:String,required:true},
            priceOfService:{type:Number,required:true},
            serviceId:{type:mongoose.Types.ObjectId,required:true}
               }],
       promoCode:{type:String,default:''},  
       subTotal:{type:Number,required:true},
       deliveryFee:{type:Number,required:true},
       discount:{type:Number,required:true},
       estimatedTotalCost:{type:Number,required:true},
       choosePaymentMethods:{
              type:String,
              enum: {
                     values: ["0","1"],
                     message: 'Payment Method is either: COD or Credit Card',
                   },
              required:true
              },
       evaluation:{
        rating:{type:Number,default:0},
        review:{type:String,default:''}
       },
       status:{type:Number,default:0},//0 = waiting for confirmation
                                      //1 = order confirmed
                                      //2 = vehicle picked up
                                      //3 = in washing
                                      //4 = ready for delivery
                                      //5 = completed
                                      //6 = canceled
                                      //7 = rejected
       createdAt:{type:Date,default:Date.now},
       updatedAt:{type:Date,default:Date.now}
})

module.exports = mongoose.model('orders',order)