const config = require('../config/app')
const USERTABLE= require('../models/user')

module.exports =(async(req,res,next)=>{
    try{
            let user =  await USERTABLE.findOne({'_id': req.userData._id,"isBlocked":0})           
            if(user){
              next();
            }else{
                res.status(420).json(
                    {status:420,
                    message:'You have blocked by admin.'
                    })
            }
    }
    catch(err){
        res.status(420).json(
            {status:420,
            message:'You have blocked by admin.'
            })
    }
})