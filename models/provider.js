const mongoose = require('mongoose')
const Schema = mongoose.Schema
const signup = new Schema({
       name:{type:String,required:true},
       emailId:{type:String,required:true,unique:true},
       countryCode:{type:String,required:true},
       mobileNumber:{type:Number,required:true},
       password : {type:String},
       gallery:{type:Array,default:[]},
       businessName:{type:String,required:true}, 
       businessAddress:{type:String,required:true},
      
       deliveryOption:{type:Array,default:[]},//0 = selfDriving 1 = pick and drop by service Provider 
       serviceType:{type:Array,required:true},//0 =  onsite 1 = onServiceStation
       bio:{type:String,default:true},
       
       idNumber:{type:String,required:true},
       profile:{type:String,default:''},
       document:{type:String,required:true},
        
       deviceType:{type:String,default:''},
       deviceToken:{type:String,default:''},
       lat:{type:String,default:''},
       long:{type:String,default:''},
       location: {  //for calculating distance
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
       workingHours:[
               {
                day:{type:Number,required:true},
                status:{type:Number,default:1},
                timeSlot:[{
                     startTime:{type:String,default:''},
                     endTime:{type:String,default:''},
                     slots:[{
                     startTime:{type:String,default:''},
                     endTime:{type:String,default:''}
                    }]
                    }]        
               }
          ],
   services:[{
          carId:{type:mongoose.Types.ObjectId,required:true},
          aboutService:[{
                      nameOfTheService:{type:String,default:''},
                      features:[],
                      priceOfService:{type:Number,default:0},
                      durationOfTheService:{type:Number}  //Duration in minutes
                    }]
         
           }],
       signUpBy:{type:Number,required:true},//Enter 1 for locally 2 for google 3 for facebook 4 for apple
       facebookId:{type:String},
       googleId:{type:String},
       appleId:{type:String},

       pushNotification:{type:Number,default:1},//1 for enable notification and 0 for disable
       
       isVerified:{type:Number,default:2},// 1 for verified 0 for not verified account,2 = action not taken
       isPremium:{type:Number,default:0},// 1 = Plan 1 ,0 = NonPremium, 2 = Plan 2 ....
       deliveryCharges :{type:Number,default:0},
       deliveryChargeType :{type:Number,default:0}, // 0  == Fixed , 1 == dynamic(/km)   
       serviceRadius:{type:Number,default:50},
       otp:{type:Number,default:123456},
       permissionForSell:{type:Number,default:0},// 0 = not allowed for sell 1= allowed for selling item 
       stripeAccountId:{type:String,default:''},
       stripeAccountSetup:{type:Number,default:0},
       providerAccountSetup:{type:Number,default:0},
       isOnline:{type:Number,default:1},
       // status:{type:Number,default:1},
       createdAt:{type:Date,default:Date.now},
       updatedAt:{type:Date,default:Date.now}
})
signup.index({ location : "2dsphere" })

module.exports = mongoose.model('providers',signup)