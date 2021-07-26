const config = require('../config/app')
var jwt = require('jsonwebtoken')
const helper = require('../helpers/apiResponse')
const USERTABLE = require('../models/user')

module.exports =(async(req,res,next)=>{
    try{
        let token=req.headers['authorization']
        if(!token){
            helper.unauthorizedResponseWithoutData(res,"UnAuthorised User!")
        }else{
          var Token =token.split(" ")[1];
            var decoded = jwt.verify(Token,config.LOG_SECRET_KEY );
            req.userData=decoded;
            let user =  await USERTABLE.findOne({'_id': req.userData._id})           
            if(user && user.deviceToken === req.userData.deviceToken && user.deviceType === req.userData.deviceType){
              next();
            }else{
              helper.unauthorizedResponseWithoutData(res,"UnAuthorised User!")
            }
        }
    }
    catch(err){
        helper.unauthorizedResponse(res,err.message,"UnAuthorised User!")
    }
}) 