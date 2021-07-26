
const mongoose = require('mongoose')
const Schema = mongoose.Schema
const address = new Schema({
        customerId:{type:mongoose.Types.ObjectId},
        location: {
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
               
        addressType:{ // 1 = fav , 0 = Other
            type:Number,  
            },
            name:{
                type:String,
                required:true
            },
        fullAddress:{
            type:String,
            default:''
            },
        city:{type:String,default:''},
        state:{type:String,default:''},
        country:{type:String,default:''},
        lat:{type:String,default:''},
        long:{type:String,default:''},
          
        
       status:{type:Number,default:0},
       createdAt:{type:Date,default:Date.now},
       updatedAt:{type:Date,default:Date.now}
})
address.index({ 'location' : "2dsphere" })
module.exports = mongoose.model('cusAddress',address)