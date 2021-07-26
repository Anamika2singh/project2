const express = require('express')
const app = express()
const { body,validationResult } = require("express-validator");
const helper = require('../helpers/apiResponse')
const CARTABLE = require('../models/car')
const CONTENTTABLE = require('../models/policyContent')
var empty = require('is-empty'); 
const mongoose = require('mongoose');
mongoose.set('useFindAndModify', false);
let ObjectId = mongoose.Types.ObjectId


exports.listCar=async(req,res)=>{
    try{
    let found = await CARTABLE.find({status:1},{createdAt:0,updatedAt:0})
    if(!empty(found)){
      for(let car of found){
        car.image = 'https://velatedocuments.s3.eu-west-2.amazonaws.com/car/'+car.image
      }
           helper.successResponseWithData(res,"Car Type Found Successfully",found)
    }
    else{
        helper.ErrorResponseWithoutData(res," Car Not Found")
    }
    }
    catch(err){
      helper.ErrorResponseWithoutData(res,err.message)
    }
  }  
  exports.termsAndConditionPolicy= async(req,res)=>{
    try{
        let found = await CONTENTTABLE.findOne({type:2},{createdAt:0,updatedAt:0,type:0,_id:0,status:0})
        if(found){
          helper.successResponseWithData(res,"Terms and Condition!",found)
        }
        else{
          helper.ErrorResponseWithoutData(res,"NO content Found for Terms and Condition!")
        }
    }
    catch(err){
      helper.ErrorResponseWithoutData(res,err.message)
    }
  }  
  exports.paymentAndRefundPolicy = async(req,res)=>{
    try{
      let found = await CONTENTTABLE.findOne({type:3},{createdAt:0,updatedAt:0,type:0,_id:0,status:0})
      if(found){
        helper.successResponseWithData(res,"Payment and Refund!",found)
      }
      else{
        helper.ErrorResponseWithoutData(res,"NO content Found for payment&Refund!")
      }
  }
  catch(err){
    helper.ErrorResponseWithoutData(res,err.message)
  }
  }