const config = require('../config/app')
const PROVIDERTABLE= require('../models/provider')

module.exports =(async(req,res,next)=>{
    try{
            let user =  await PROVIDERTABLE.findOne({'_id': req.userData._id,"isVerified":1})           
            if(user){
              next();
            }else{
                res.status(419).json(
                    {status:419,
                    message:'You have not verified by admin.'
                    })
            }
    }
    catch(err){
        res.status(419).json(
            {status:419,
            message:'You have not verified by admin.'
            })
    }
})