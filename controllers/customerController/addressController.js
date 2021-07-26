const config = require('../../config/app')
const express = require('express')
const app = express()
const { body,validationResult } = require("express-validator");
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const helper = require('../../helpers/apiResponse')
const utility = require('../../helpers/utility')
const USERTABLE = require('../../models/user')
const ADDRESSTABLE = require('../../models/cusAddress')
const PROVIDERTABLE = require('../../models/provider')
const DELETEACCTABLE = require('../../models/deletedAccount')
let saltRounds = 10;
var empty = require('is-empty'); 
const mongoose = require('mongoose');
let ObjectId = mongoose.Types.ObjectId
const mailer = require("../../helpers/mailer");

exports.addNewLocation = [
  body("lat").trim().exists().notEmpty().withMessage("Lat is required."),
  body("long").trim().exists().notEmpty().withMessage("Long is required."),
  body("name").trim().exists().notEmpty().withMessage("Name is required."),
  body("fullAddress").trim().exists().notEmpty().withMessage("fullAddress is required."),
    async(req,res)=>{
    try{
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
         helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
      } 
      else{
        if(!empty(req.body.providerId))
        {
          var providerDetail = await PROVIDERTABLE.findOne({'_id':req.body.providerId})
          var provider = await PROVIDERTABLE.aggregate([          
                {
                    $geoNear:{
                     near: {type: "Point", coordinates: [parseFloat(req.body.long), parseFloat(req.body.lat)]},
                     key:"location",
                    
                     distanceField: "distance",// It seems that maxDistance accepts values as meters.
                     maxDistance: (providerDetail.serviceRadius)*1000,// So if I want it to accept KM I need to multiply it by 1000.  
                     distanceMultiplier: 1 / 1000,// To output distance as KM the distanceMultiplier has to be 1/1000.
                     query: {'_id':ObjectId(req.body.providerId)},
                  
                     spherical: true                                                                                                                                                        
                    }
                }
                    ])
          if(!empty(provider))
          {
             var str = req.body.name ; 
          var addressName = str.toUpperCase();
        var check  = await ADDRESSTABLE.findOne({'customerId':req.userData._id , name : addressName})
            if(check){
                helper.ErrorResponseWithoutData(res,"You Cannot add  Address With Same Name!")
            }
            else{

            
          if(addressName == "HOME" || addressName == "WORK" || addressName == "OFFICE" ){
                var addressType = 1
            }
            else{
              var addressType = 0
            }
      // console.log("chk"+found.addressWithLatLng)
       var update = await ADDRESSTABLE.create({
                  location: {
                    type: "Point",
                    coordinates: [parseFloat(req.body.long), parseFloat(req.body.lat)]
                  },
                            customerId:req.userData._id,
                            addressType:addressType,  
                            name: addressName,
                            fullAddress:req.body.fullAddress,
                            city:req.body.city,
                            state:req.body.state,
                            country:req.body.country,
                            lat:req.body.lat,
                            long:req.body.long
                      
               })
               if(update){
                  //   update.image = 'https://velatedocuments.s3.eu-west-2.amazonaw s.com/image/'+update.image 
                     helper.successResponseWithData(res,"Location Added Successfully!",update)
                   }
                   else{
                    helper.ErrorResponseWithoutData(res,"Some Problem Occured During adding Location!")
                        }
              }
            }else
            {
              helper.ErrorResponseWithoutData(res,"service provider does not serve on this location!")
            }
        }else{
          var str = req.body.name ; 
          var addressName = str.toUpperCase();
        var check  = await ADDRESSTABLE.findOne({'customerId':req.userData._id , name : addressName})
            if(check){
                helper.ErrorResponseWithoutData(res,"You Cannot add  Address With Same Name!")
            }
            else{

            
          if(addressName == "HOME" || addressName == "WORK" || addressName == "OFFICE" ){
                var addressType = 1
            }
            else{
              var addressType = 0
            }
      // console.log("chk"+found.addressWithLatLng)
       var update = await ADDRESSTABLE.create({
                  location: {
                    type: "Point",
                    coordinates: [parseFloat(req.body.long), parseFloat(req.body.lat)]
                  },
                             customerId:req.userData._id,
                            addressType:addressType,  
                            name: addressName,
                            fullAddress:req.body.fullAddress,
                            city:req.body.city,
                            state:req.body.state,
                            country:req.body.country,
                            lat:req.body.lat,
                            long:req.body.long
                      
               })
               if(update){
                  //   update.image = 'https://velatedocuments.s3.eu-west-2.amazonaws.com/image/'+update.image 
                     helper.successResponseWithData(res,"Location Added Successfully!",update)
                   }
                   else{
                    helper.ErrorResponseWithoutData(res,"Some Problem Occured During adding Location!")
                        }
              }
        }
      }
    }
  catch(err){
     helper.ErrorResponseWithoutData(res,err.message)
  }
    }]

exports.savedLocations = async(req,res)=>{
        try{
          let found = await ADDRESSTABLE.find({'customerId':req.userData._id},{createdAt:0,updatedAt:0,})
          if(found){
               helper.successResponseWithData(res,"All Saved Locations!",found)
          } 
         else{
           helper.unauthorizedResponseWithoutData(res,"User Not Found!")
         }
        }
        catch(err){
          helper.ErrorResponseWithoutData(res,err.message)
      }
      }  
      
      exports.rangedLocations = [
        body("providerId").trim().exists().notEmpty().withMessage("Provider ID is required."),      
          async(req,res)=>{
          try{
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
               helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
            }
            else{
                let providerDetail = await PROVIDERTABLE.findOne({'_id':ObjectId(req.body.providerId)})
                if(providerDetail){
              const long = providerDetail.long;
              const lat = providerDetail.lat;
             var maxRadius = providerDetail.serviceRadius;
            //   console.log("userData",req.userData._id)
              let allAddrs = await ADDRESSTABLE.aggregate([          
                {
                    $geoNear:{
                     near: {type: "Point", coordinates: [parseFloat(long), parseFloat(lat)]},
                     key:"location",
                    
                     distanceField: "distance",// It seems that maxDistance accepts values as meters.
                     maxDistance: maxRadius*1000,// So if I want it to accept KM I need to multiply it by 1000.  
                     distanceMultiplier: 1 / 1000,// To output distance as KM the distanceMultiplier has to be 1/1000.
                    //  query: {'customerId':ObjectId(req.userData._id)},
                  
                     spherical: true                                                                                                                                                        
                    }
                },
                {
                    $match: {'customerId':ObjectId(req.userData._id)}
                },
               
                   {
                       $project:{
                        name:1,fullAddress:1,city:1,state:1,country:1,addressType:1 , location:1,lat:1, long:1 , distance :1
                       }
                    },
                
                    ])
            
            //    console.log("cus addr",allAddrs)
               helper.successResponseWithData(res,"Address Found SuccessFully!",allAddrs)
                }
                else{
                    helper.notFoundResponse(res,"Provider Not Found!")
                }
            }
          }
          catch(err){
            console.log(err)
            helper.ErrorResponseWithoutData(res,err.message)
         }
        }
      ]   
      exports.deleteLocation = [
        body("locationId").trim().exists().notEmpty().withMessage("Location ID is required."),      
        async(req,res)=>{
        try{
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
             helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
          }
          else{
            let update = await ADDRESSTABLE.deleteOne({'_id':ObjectId(req.body.locationId),    
              'customerId':ObjectId(req.userData._id) ,                  
            })    
              if(update.n){
                helper.successResponseWithData(res,"Location Deleted Successfully!")
              }
              else{
                helper.notFoundResponse(res,"Not Found it may be Already Deleted!")
              }
          }
        }
        catch(err){
          console.log(err)
          helper.ErrorResponseWithoutData(res,err.message)
       }
      }
      ]