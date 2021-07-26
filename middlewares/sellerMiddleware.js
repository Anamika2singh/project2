const config = require('../config/app')
var jwt = require('jsonwebtoken')
const helper = require('../helpers/apiResponse')
const PROVIDERTABLE= require('../models/provider')

module.exports =(async(req,res,next)=>{
    try{
            let user =  await PROVIDERTABLE.findOne({'_id': req.userData._id,"permissionForSell":1})           
            if(user){
              next();
            }else{
              helper.ErrorResponseWithoutData(res,"You are not allowed to perform this operation")
            }
    }
    catch(err){
        helper.ErrorResponseWithoutData(res,"You are not allowed to perform this operation")
    }
})