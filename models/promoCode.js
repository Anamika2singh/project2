const mongoose = require('mongoose')
const Schema = mongoose.Schema;
const promo= new Schema({
    name:{
        type:String,
        unique:true
         },
    description:{
        type:String,
        required:true
        },
    discount :{
        type:Number,
        required:true
          },
    type:{
      type:Number,
      required:true
    },//0 = flat , 1= percentage discount
  upTo:{
      type:Number ,
      default:0
    },
    minimumCartValue :{
        type:Number,
        default:0
    },
    validFrom:{
        type:Date,
         required:true
          },
    validTill:{
         type:Date,
         required:true
         },         
    status:{
        type:Number,
        default:1 // 1 = active promoCode and 0 = deactivate 
         },
    createdAt:{type:Date,default:Date.now},
    updatedAt:{type:Date,default:Date.now}
})
module.exports = mongoose.model('promoCode',promo)