const config = require('../../config/app')
const express = require('express')
const app = express()
const { body,validationResult } = require("express-validator");
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const helper = require('../../helpers/apiResponse')
const utility = require('../../helpers/utility')
// const USERTABLE = require('../../models/user')
let saltRounds = 10;
var empty = require('is-empty'); 
const mongoose = require('mongoose');
const PROVIDERTABLE = require('../../models/provider');
mongoose.set('useFindAndModify', false);
let ObjectId= mongoose.Types.ObjectId

exports.addServices=[
    body("carId").trim().exists().notEmpty().withMessage("Car Id is required!"),
    body("nameOfTheService").trim().exists().notEmpty().withMessage("Name of the Service is required!"),
    body("priceOfService").trim().exists().notEmpty().withMessage("Price of Service is required!"),
    body("durationOfTheService").trim().exists().notEmpty().withMessage("Duration of Service is required!"),
    async(req,res)=>{
        try{

          const errors = validationResult(req);
          if (!errors.isEmpty()) {
             helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
          }
          else{
            let found = await PROVIDERTABLE.findOne({"_id":req.userData._id,
            "services":{"$elemMatch":{"carId":req.body.carId}}})
    if(found){ //if carID is present

          var update = await PROVIDERTABLE.findByIdAndUpdate({"_id":req.userData._id,
          "services":{"$elemMatch":{"carId":req.body.carId}}},
          {"$push":{
            "services.$[inner].aboutService":{
                                 nameOfTheService:req.body.nameOfTheService,
                                 features:req.body.features,
                                  priceOfService:parseFloat(req.body.priceOfService),
                                  durationOfTheService:parseInt(req.body.durationOfTheService)
                              }
          }},
          {  new: true,"arrayFilters": [
            { "inner.carId": req.body.carId }
            ] }
          );

          
       if(update){
        if(!empty(update.profile)){

       update.profile = 'https://velatedocuments.s3.eu-west-2.amazonaws.com/profile/'+update.profile
        } 
        update.document = 'https://velatedocuments.s3.eu-west-2.amazonaws.com/document/'+update.document
        helper.successResponseWithData(res,"Service Added Successfully!",update)
      }
      else{
       helper.ErrorResponseWithoutData(res,"Some Problem Occured During Adding services!")
           } 
          }
      else{ //when user enters about services of new Car

       var update = await PROVIDERTABLE.findByIdAndUpdate({'_id':req.userData._id},{
         $push:{ services:{
                            carId:req.body.carId,
                            aboutService:[{
                                nameOfTheService:req.body.nameOfTheService,
                                features:req.body.features,
                                priceOfService:parseFloat(req.body.priceOfService),
                                  durationOfTheService:parseInt(req.body.durationOfTheService)
                               }]
       
                             }
                        } 
           },{new:true})
         
       if(update){
         console.log("first time in"+update)
        if(!empty(update.profile)){

       update.profile = 'https://velatedocuments.s3.eu-west-2.amazonaws.com/profile/'+update.profile
        } 
        update.document = 'https://velatedocuments.s3.eu-west-2.amazonaws.com/document/'+update.document
        helper.successResponseWithData(res,"Service Added Successfully!",update)
      }
      else{
       helper.ErrorResponseWithoutData(res,"Some Problem Occured During Adding working hours!")
           } 
      }
            }
        }
     catch(err){
         helper.ErrorResponseWithoutData(res,err.message)
     }
    }
]

exports.editServiceDetails=[
     
    body("carId").trim().exists().notEmpty().withMessage("Car ID is required!"),
    body("serviceId").trim().exists().notEmpty().withMessage("Service ID is required!"),
        async(req,res)=>{
              try{
                const errors = validationResult(req);
            if(!errors.isEmpty()){
                  helper.validationErrorWithData(res,"Validation Errror.",errors.array());
                }
            else{
                  let update = await PROVIDERTABLE.findOneAndUpdate({
                    '_id':req.userData._id,
                    'services.carId':req.body.carId ,
                    "services.aboutService":{"$elemMatch":{"_id":ObjectId(req.body.serviceId)}}
                  },
                  {$set:
                    {
                      "services.$.aboutService.$[inner].nameOfTheService" : req.body.nameOfTheService,
                      "services.$.aboutService.$[inner].features" : req.body.features,
                      "services.$.aboutService.$[inner].priceOfService" : parseFloat(req.body.priceOfService),
                      "services.$.aboutService.$[inner].durationOfTheService" : parseInt(req.body.durationOfTheService)
                    }
                  },
                    {  new: true ,
                      arrayFilters: 
                      [{
                        "inner._id": ObjectId(req.body.serviceId)
                      }]
                    }
                    )
               if(update)
               {
                helper.successResponseWithData(res,"Successfully updated Car service!",update.services)
               }else
               {
                helper.notFoundResponseWithNoData(res,"Car ID or Service ID Not Found!")
               }
      }
    }
      catch(err){
        helper.ErrorResponseWithoutData(res,err.message)
      }
     }

]

exports.removeService=[
    body("carId").trim().exists().notEmpty().withMessage("Car ID is required!"),
    body("serviceId").trim().exists().notEmpty().withMessage("Service ID is required!"),
        async(req,res)=>{
              try{
                const errors = validationResult(req);
            if(!errors.isEmpty()){
                  helper.validationErrorWithData(res,"Validation Errror.",errors.array());
                }
            else{
                    let update = await PROVIDERTABLE.findOneAndUpdate({
                      '_id':req.userData._id,
                      'services.carId':ObjectId(req.body.carId) ,
                     "services.aboutService":{"$elemMatch":{"_id":ObjectId(req.body.serviceId)}}
                    },
                    {                
                     $pull:{   
                 "services.$[outer].aboutService":{"_id":ObjectId(req.body.serviceId)}
                        }                  
                      }

                      ,{  new: true,"arrayFilters": [
                        { "outer.carId": ObjectId(req.body.carId) },
                      
                        ] }
                      )                  
        if(update){
          for(let car of update.services)
                {
                  if(car.carId.toString() == req.body.carId.toString())
                  {
                    if(car.aboutService.length <= 0)
                    {
                      let updateStatus = await PROVIDERTABLE.findOneAndUpdate({
                      '_id':req.userData._id,
                      'services.carId':req.body.carId
                    },
                    {                
                     $pull:{   
                       "services":{"carId":ObjectId(req.body.carId)}
                        }                  
                      }
                      ,{  new: true}
                      )
                      if(updateStatus)
                      {
                        helper.successResponseWithData(res,"Service removed successfully!",updateStatus.services)
                        break;
                      }    
                    }else
                    {
                      helper.successResponseWithData(res,"Service removed successfully!",update.services)
                        break;
                    }
                  }
                }
                  }
          else{
            helper.ErrorResponseWithoutData(res,"Car ID or Service ID Not Found!")
          }
                  }
              }
              catch(err){
                helper.ErrorResponseWithoutData(res,err.message)
              }
        }
]
exports.getServices=async(req,res)=>{
    try{
        let found = await PROVIDERTABLE.aggregate([
                         {
                          $match:{'_id':ObjectId(req.userData._id)}
                         },
                          {
                           $lookup:
                             {
                               from: "cars",
                               localField: "services.carId",
                               foreignField: "_id",
                               as: "carDetail"
                             }
                        }
          ])
        if(!empty(found)){
          var response = [];
          for(let i=0;i<found[0].services.length;i++)
          {
            for(let j=0;j<found[0].carDetail.length;j++)
            {
              if((found[0].services[i].carId).toString() == found[0].carDetail[j]._id.toString() && found[0].carDetail[j].status == 1){
            response.push({
              carId : found[0].services[i].carId,
              carName : found[0].carDetail[j].name,
              carIcon : 'https://velatedocuments.s3.eu-west-2.amazonaws.com/car/'+ found[0].carDetail[j].image,
              aboutService : found[0].services[i].aboutService
            })
            }
            }
          }
            
               helper.successResponseWithData(res,"All Services!",response)
        } 
       else{
         helper.ErrorResponseWithoutData(res,"Provider Not Found!")
       }
      }
      catch(err){
        helper.ErrorResponseWithoutData(res,err.message)
    }
}