const mongoose = require('mongoose')
const Schema = mongoose.Schema
const signup = new Schema({
       name:{type:String},
       emailId:{type:String,required:true,unique:true},
       countryCode:{type:String},
       mobileNumber:{type:Number},
       password : {type:String,default:''},
       image:{type:String,default:''},
       deviceType:{type:String,default:''},
       deviceToken:{type:String,default:''},
       stripeCustomerId:{type:String,default:''},
      favProviders:{type:[mongoose.Types.ObjectId],default:[]},   
        
       cartItems:[{ //Cart items array 
        
        itemId:{
        type:mongoose.Types.ObjectId,
        required:true
        },
        quantity:{ 
            type:Number,
              default:0
           }
      }],

       pushNotification:{type:Number,default:1},//1 for enable notification and 0 for disable
       otp:{type:Number,default:123456},
       signUpBy:{type:Number,required:true},//Enter 1 for locally 2 for google 3 for facebook 4 for apple
       facebookId:{type:String},
       googleId:{type:String},
       appleId:{type:String},
       isBlocked:{type:Number,default:0},//1 for bocking user and 0 for unblock
       isPremium:{type:Number,default:0},// 1 = Plan 1 ,0 = NonPremium, 2 = Plan 2 ....
       isEmailVerified:{type:Number,default:0},
       createdAt:{type:Date,default:Date.now},
       updatedAt:{type:Date,default:Date.now}
})
module.exports = mongoose.model('users',signup)