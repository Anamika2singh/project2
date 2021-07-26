const config = require('../../config/app')
const express = require('express')
const app = express()
const { body,validationResult } = require("express-validator");
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const helper = require('../../helpers/apiResponse')
const utility = require('../../helpers/utility')
const USERTABLE = require('../../models/user')
const PROVIDERTABLE = require('../../models/provider')
const DELETEACCTABLE = require('../../models/deletedAccount')
const ADMINTABLE = require('../../models/admin')
let saltRounds = 10;
var empty = require('is-empty'); 
const mongoose = require('mongoose');
const { unsubscribe } = require('../../routes/customerRoute/authRoute');
const { IdentityStore } = require('aws-sdk');
mongoose.set('useFindAndModify', false);
let ObjectId = mongoose.Types.ObjectId
const mailer = require("../../helpers/mailer");
 

exports.verifyEmail = [
    body("emailId").trim().isLength({ min: 1 }).withMessage("Email must be specified.").isEmail().withMessage("Email must be a valid email address."), 
  async (req, res) => {
      try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }else {
          let emailId = req.body.emailId.toLowerCase()
          var foundUser = await USERTABLE.findOne({'emailId':emailId},{password:0,createdAt:0,updatedAt:0,status:0})
            if(foundUser){
            var found = foundUser;
            found.userType = 1
            }else
            {
             var foundProvider = await PROVIDERTABLE.findOne({'emailId':emailId},{password:0,createdAt:0,updatedAt:0,status:0}) 
             if(foundProvider){
             var found = foundProvider;
              found.userType = 2
             }
            }
          if(!found){
                            
               helper.successResponseWithData(res,"This is a unique email!")
        }else
        {
           helper.notFoundResponseWithNoData(res,"Email already exist!") 
        }
  
        }
      }catch(err)
      {
        return helper.ErrorResponseWithoutData(res, err.message);
      }
    }
  ]

exports.signUp = [
  body("name").trim().exists().notEmpty().withMessage("Name is Required!"),
  body("signUpBy").trim().exists().notEmpty().withMessage("Sign Up Type Required!").custom(async (signUpBy, {req})=>{
    if(signUpBy == "1"){//if user signup locallly 
            if(!req.body.password){
                 return Promise.reject("Password is Required!");
               }else{
                if(req.body.password.length<6){
                 return Promise.reject("Password Should be of minimum 6 digit!");
               }
               }
  
        }
        else if(req.body.signUpBy == '2'){//signup by google
          console.log("google")
          if(!req.body.googleId){
            return Promise.reject("Google Id Required!")
          }
       }
       else if(req.body.signUpBy == '3')//signup by  facebook
       {
         console.log("fb")
         if(!req.body.facebookId){
           return Promise.reject("Facebook Id Required!")
         }
       }
       else if(req.body.signUpBy == '4')//signup by apple
       {
         console.log("apple")
         if(!req.body.appleId){
           return Promise.reject("Apple Id Required!")
         }
       }
       else {
         return Promise.reject("Please Enter a Valid Value 1 for Local 2 Signup with Google 3 for facebook and 4 for Apple")
       }
  }),
   body("emailId").trim().exists().notEmpty().withMessage("Email is Required.")
     .isEmail().withMessage("Email must be a valid email address."),
   body("countryCode").trim().exists().notEmpty().withMessage("Country Code is Required!"),
   body("mobileNumber").trim().exists().notEmpty().withMessage("Mobile No is Required!"),
   body("deviceType").trim().exists().notEmpty().withMessage("Device Type is Required!"),
   body("deviceToken").trim().exists().notEmpty().withMessage("Device Token is Required!"),
  async(req,res)=>{
          try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
           helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }
      else{
        let emailId = req.body.emailId.toLowerCase()
        var foundUser = await USERTABLE.findOne({'emailId':emailId})
        if(foundUser){
        var found = foundUser;
        }else
        {
         var foundProvider = await PROVIDERTABLE.findOne({'emailId':emailId})
         if(foundProvider){
         var found = foundProvider;
         }
        }

        if(found){
            helper.ErrorResponseWithoutData(res,"Already Registered with this MailId")
        }
        else{
          
        USERTABLE.create({
          name:req.body.name,
          emailId:emailId,
          countryCode:req.body.countryCode,
          mobileNumber:req.body.mobileNumber,
          signUpBy:req.body.signUpBy,
          password :(req.body.password)?(bcrypt.hashSync(req.body.password,saltRounds)):'',
          googleId:req.body.googleId,
          facebookId:req.body.facebookId,
          appleId:req.body.appleId,
          deviceType:req.body.deviceType,
          deviceToken:req.body.deviceToken
        }).then(async user =>{
         console.log(user)
              let check = {}
              check._id          = user._id
              check.name         = user.name
              check.emailId      = user.emailId
              check.mobileNumber = user.mobileNumber
              check.countryCode  = user.countryCode
              check.signUpBy     = user.signUpBy
              check.userType     = 1
              check.token        = jwt.sign({
                                    name:user.name,
                                    _id:user._id,
                                    emailId:user.emailId,
                                    countryCode:user.countryCode,
                                    mobileNumber:user.mobileNumber,
                                    deviceType:user.deviceType,
                                    deviceToken:user.deviceToken,
                                    signUpBy:user.signUpBy,
                                    userType:1                  
                                   },config.LOG_SECRET_KEY );
              check.googleId = user.googleId
                check.facebookId = user.facebookId
                check.appleId = user.appleId
                check.stripeCustomerId = user.stripeCustomerId
                check.pushNotification = user.pushNotification
                check.image = (!empty(user.image))?"https://velatedocuments.s3.eu-west-2.amazonaws.com/image/"+found.image:''
           helper.successResponseWithData(res,"User Registered Successfully!",check)
           mailer.sendEmailVerificationLink(
                              user.emailId,
                              `https://api.valetit.uk:3000/auth/checkEmailVerification/${user._id}`,
                              user.name
                              ).then(success=>{
                                 console.log("We have shared a Email Verification link to your email!")
                               }).catch(error=>{
                                console.log(error)
                               });
           
           let updateCustomerDevice = await USERTABLE.updateMany(
            {deviceType:user.deviceType,deviceToken:user.deviceToken,_id:{$ne:user._id}},
            {$set:{deviceType:'',deviceToken:''}})
           let updateProviderDevice = await PROVIDERTABLE.updateMany(
            {deviceType:user.deviceType,deviceToken:user.deviceToken},
            {$set:{deviceType:'',deviceToken:''}})
        }).catch(err=>{
            helper.ErrorResponseWithoutData(res,err.message)
        })
       }
      }
    }
      catch(err){
        helper.ErrorResponseWithoutData(res,err.message)
      }
      }]
  
exports.socialAuthentication = [
      body("signUpBy").trim().exists().notEmpty().withMessage("Sign Up Type required!"),
      body("deviceType").trim().exists().notEmpty().withMessage("Device Type is required."),
      body("deviceToken").trim().exists().notEmpty().withMessage("Device Token is required."),
      async(req,res)=>{
     try{
       const errors = validationResult(req);
       if (!errors.isEmpty()) {
          helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
       }
     else{
      var emailId = req.body.emailId.toLowerCase()
         if(req.body.signUpBy=='2')
         {
           if(!req.body.googleId){
             helper.validationError(res,"Google Id is Required")
           }
           else
           {
            var foundUser = await USERTABLE.findOne({$or:[{'googleId':req.body.googleId},{'emailId':emailId}]},{password:0,createdAt:0,updatedAt:0,status:0})
            if(foundUser){
            var found = foundUser;
            found.userType = 1
            }else
            {
             var foundProvider = await PROVIDERTABLE.findOne({$or:[{'googleId':req.body.googleId},{'emailId':emailId}]},{password:0,createdAt:0,updatedAt:0,status:0}) 
             if(foundProvider){
             var found = foundProvider;
              found.userType = 2
             }
            }
            
            if(found)
            {
             var response = {
                _id    : found._id,
               name    : found.name,
               emailId : found.emailId,
               signUpBy: found.signUpBy,
               countryCode : found.countryCode,
               mobileNumber: found.mobileNumber,
               userType    : found.userType
 
             }
             
               var jwtData = {
                 // expiresIn: process.env.JWT_TIMEOUT_DURATION,
               };
               var secret = config.LOG_SECRET_KEY;
               //Generated JWT token with Payload and secret.
               response.userType = found.userType
               response.googleId = found.googleId
               response.facebookId = found.facebookId
               response.appleId = found.appleId
               response.image = (!empty(found.image))?"https://velatedocuments.s3.eu-west-2.amazonaws.com/image/"+found.image:found.image
               response.isVerified = found.isVerified
                response.businessName = found.businessName
                response.businessAddress = found.businessAddress
                response.idNumber = found.idNumber
                response.deliveryOption = found.deliveryOption
                response.serviceType = found.serviceType
                response.isPremium = found.isPremium
                response.isBlocked = found.isBlocked
                response.isEmailVerified = found.isEmailVerified
                response.permissionForSell = found.permissionForSell
                response.bio = found.bio
                response.isOnline = found.isOnline
                response.stripeAccountSetup = found.stripeAccountSetup
                response.providerAccountSetup = found.providerAccountSetup
                response.stripeCustomerId = found.stripeCustomerId
                response.pushNotification = found.pushNotification
                response.deliveryCharges = found.deliveryCharges
                response.deliveryChargeType = found.deliveryChargeType
                response.serviceRadius = found.serviceRadius
                response.profile = (!empty(found.profile))?"https://velatedocuments.s3.eu-west-2.amazonaws.com/profile/"+found.profile:found.profile
                response.document = (!empty(found.document))?"https://velatedocuments.s3.eu-west-2.amazonaws.com/document/"+found.document:found.document
               const dataToUpdate = {
                      deviceType  : req.body.deviceType,
                      deviceToken : req.body.deviceToken
                     } //if user logged in from different device then
               if(found.userType == 1){
                  let update = await USERTABLE.findByIdAndUpdate(
                    { _id: found._id },
                    { $set: dataToUpdate},
                      {new:true} );
                 if(update){
                  const jwtPayload = {
                   _id    : update._id,
                   name    : update.name,
                   emailId : update.emailId,
                   signUpBy: update.signUpBy,
                   countryCode : update.countryCode,
                   mobileNumber: update.mobileNumber,
                   deviceType:update.deviceType,
                   deviceToken:update.deviceToken,
                   userType    : found.userType
                    };
                    response.token = jwt.sign(jwtPayload, secret, jwtData);
                    response.deviceToken = update.deviceToken
                    response.deviceType = update.deviceType
                    helper.successResponseWithData(res,"Login Successfully!",response)
                    let updateCustomerDevice = await USERTABLE.updateMany(
                    {deviceType:update.deviceType,deviceToken:update.deviceToken,_id:{$ne:update._id}},
                    {$set:{deviceType:'',deviceToken:''}})
                   let updateProviderDevice = await PROVIDERTABLE.updateMany(
                    {deviceType:update.deviceType,deviceToken:update.deviceToken},
                    {$set:{deviceType:'',deviceToken:''}})
                 }
              else{
                    helper.ErrorResponseWithoutData(res,"Some Problem Occured during Updating Device Token and Type!")
                  }
                 }else{
                  let update = await PROVIDERTABLE.findByIdAndUpdate(
                    { _id: found._id },
                    { $set: dataToUpdate},
                      {new:true} );
                 if(update){
                    response.deviceToken = update.deviceToken
                    response.deviceType = update.deviceType
                    const jwtPayload = {
                   _id    : update._id,
                   name    : update.name,
                   emailId : update.emailId,
                   signUpBy: update.signUpBy,
                   countryCode : update.countryCode,
                   mobileNumber: update.mobileNumber,
                   deviceType:update.deviceType,
                   deviceToken:update.deviceToken,
                   userType    : found.userType
                    };
                    response.token = jwt.sign(jwtPayload, secret, jwtData);
                    helper.successResponseWithData(res,"Login Successfully!",response)
                    let updateCustomerDevice = await USERTABLE.updateMany(
                    {deviceType:update.deviceType,deviceToken:update.deviceToken},
                    {$set:{deviceType:'',deviceToken:''}})
                   let updateProviderDevice = await PROVIDERTABLE.updateMany(
                    {deviceType:update.deviceType,deviceToken:update.deviceToken,_id:{$ne:update._id}},
                    {$set:{deviceType:'',deviceToken:''}})
                 }
              else{
                    helper.ErrorResponseWithoutData(res,"Some Problem Occured during Updating Device Token and Type!")
                  }
                 }
            }
            else
            {
             helper.notFoundResponseWithNoData(res,"You are a first time user, Redirecting to SignUp Screen...")
            }
           }
         }
         else if(req.body.signUpBy=='3')
         {
           if(!req.body.facebookId){
             helper.validationError(res,"Facebook Id is Required")
           }
           else
           {
            var foundUser = await USERTABLE.findOne({$or:[{'facebookId':req.body.facebookId},{'emailId':emailId}]},{password:0,createdAt:0,updatedAt:0,status:0})
            if(foundUser){
            var found = foundUser;
            found.userType = 1
            }else
            {
             var foundProvider = await PROVIDERTABLE.findOne({$or:[{'facebookId':req.body.facebookId},{'emailId':emailId}]},{password:0,createdAt:0,updatedAt:0,status:0}) 
             if(foundProvider){
             var found = foundProvider;
            found.userType = 2
            }
          }
            
            if(found)
            {
             var response = {
                _id    : found._id,
               name    : found.name,
               emailId : found.emailId,
               signUpBy: found.signUpBy,
               countryCode : found.countryCode,
               mobileNumber: found.mobileNumber,
               userType    : found.userType
 
             }
               var jwtData = {
                 // expiresIn: process.env.JWT_TIMEOUT_DURATION,
               };
               var secret = config.LOG_SECRET_KEY;
               //Generated JWT token with Payload and secret.
               response.userType = found.userType
               response.googleId = found.googleId
               response.facebookId = found.facebookId
               response.appleId = found.appleId
               response.image = (!empty(found.image))?"https://velatedocuments.s3.eu-west-2.amazonaws.com/image/"+found.image:found.image
               response.isVerified = found.isVerified
                response.businessName = found.businessName
                response.businessAddress = found.businessAddress
                response.idNumber = found.idNumber
                response.deliveryOption = found.deliveryOption
                response.serviceType = found.serviceType
                response.isPremium = found.isPremium
                response.isBlocked = found.isBlocked
                response.isEmailVerified = found.isEmailVerified
                response.permissionForSell = found.permissionForSell
                response.bio = found.bio
                response.stripeCustomerId = found.stripeCustomerId
                response.isOnline = found.isOnline
                response.stripeAccountSetup = found.stripeAccountSetup
                response.providerAccountSetup = found.providerAccountSetup
                response.pushNotification = found.pushNotification
                response.deliveryCharges = found.deliveryCharges
                response.deliveryChargeType = found.deliveryChargeType
                response.serviceRadius = found.serviceRadius
                response.profile = (!empty(found.profile))?"https://velatedocuments.s3.eu-west-2.amazonaws.com/profile/"+found.profile:found.profile
                response.document = (!empty(found.document))?"https://velatedocuments.s3.eu-west-2.amazonaws.com/document/"+found.document:found.document
               
               const dataToUpdate = {
                      deviceType  : req.body.deviceType,
                      deviceToken : req.body.deviceToken
                     } //if user logged in from different device then
               if(found.userType == 1){
                  let update = await USERTABLE.findByIdAndUpdate(
                    { _id: found._id },
                    { $set: dataToUpdate},
                      {new:true} );
                 if(update){
                  const jwtPayload = {
                   _id    : update._id,
                   name    : update.name,
                   emailId : update.emailId,
                   signUpBy: update.signUpBy,
                   countryCode : update.countryCode,
                   mobileNumber: update.mobileNumber,
                   deviceType:update.deviceType,
                   deviceToken:update.deviceToken,
                   userType    : found.userType
                    };
                    response.token = jwt.sign(jwtPayload, secret, jwtData);
                    response.deviceToken = update.deviceToken
                    response.deviceType = update.deviceType
                    helper.successResponseWithData(res,"Login Successfully!",response)
                    let updateCustomerDevice = await USERTABLE.updateMany(
                    {deviceType:update.deviceType,deviceToken:update.deviceToken,_id:{$ne:update._id}},
                    {$set:{deviceType:'',deviceToken:''}})
                   let updateProviderDevice = await PROVIDERTABLE.updateMany(
                    {deviceType:update.deviceType,deviceToken:update.deviceToken},
                    {$set:{deviceType:'',deviceToken:''}})
                 }
              else{
                    helper.ErrorResponseWithoutData(res,"Some Problem Occured during Updating Device Token and Type!")
                  }
                 }else{
                  let update = await PROVIDERTABLE.findByIdAndUpdate(
                    { _id: found._id },
                    { $set: dataToUpdate},
                      {new:true} );
                 if(update){
                  const jwtPayload = {
                   _id    : update._id,
                   name    : update.name,
                   emailId : update.emailId,
                   signUpBy: update.signUpBy,
                   countryCode : update.countryCode,
                   mobileNumber: update.mobileNumber,
                   deviceType:update.deviceType,
                   deviceToken:update.deviceToken,
                   userType    : found.userType
                    };
                    response.token = jwt.sign(jwtPayload, secret, jwtData);
                    response.deviceToken = update.deviceToken
                    response.deviceType = update.deviceType
                    helper.successResponseWithData(res,"Login Successfully!",response)
                    let updateCustomerDevice = await USERTABLE.updateMany(
                    {deviceType:update.deviceType,deviceToken:update.deviceToken},
                    {$set:{deviceType:'',deviceToken:''}})
                   let updateProviderDevice = await PROVIDERTABLE.updateMany(
                    {deviceType:update.deviceType,deviceToken:update.deviceToken,_id:{$ne:update._id}},
                    {$set:{deviceType:'',deviceToken:''}})
                 }
              else{
                    helper.ErrorResponseWithoutData(res,"Some Problem Occured during Updating Device Token and Type!")
                  }
                 }
            }
            else
            {
             helper.notFoundResponseWithNoData(res,"You are a first time user, Redirecting to SignUp Screen...")
            }
           }
         }else if(req.body.signUpBy=='4')
         {
           if(!req.body.appleId){
             helper.validationError(res,"Apple Id is Required")
           }
           else
           {
            var foundUser = await USERTABLE.findOne({$or:[{'appleId':req.body.appleId},{'emailId':emailId}]},{password:0,createdAt:0,updatedAt:0,status:0})
            if(foundUser){
            var found = foundUser;
            found.userType = 1
            }else
            {
             var foundProvider = await PROVIDERTABLE.findOne({$or:[{'appleId':req.body.appleId},{'emailId':emailId}]},{password:0,createdAt:0,updatedAt:0,status:0}) 
             if(foundProvider ){
             var found = foundProvider;
            found.userType = 2
            }
          }
            
            if(found)
            {
             var response = {
                _id    : found._id,
               name    : found.name,
               emailId : found.emailId,
               signUpBy: found.signUpBy,
               countryCode : found.countryCode,
               mobileNumber: found.mobileNumber,
               userType : found.userType
 
             }
            
               var jwtData = {
                 // expiresIn: process.env.JWT_TIMEOUT_DURATION,
               };
               var secret = config.LOG_SECRET_KEY;
               //Generated JWT token with Payload and secret.
               response.userType = found.userType
               response.googleId = found.googleId
               response.facebookId = found.facebookId
               response.appleId = found.appleId
               response.image = (!empty(found.image))?"https://velatedocuments.s3.eu-west-2.amazonaws.com/image/"+found.image:found.image
               response.isVerified = found.isVerified
                response.businessName = found.businessName
                response.businessAddress = found.businessAddress
                response.idNumber = found.idNumber
                response.deliveryOption = found.deliveryOption
                response.serviceType = found.serviceType
                response.isPremium = found.isPremium
                response.isBlocked = found.isBlocked
                response.isEmailVerified = found.isEmailVerified
                response.permissionForSell = found.permissionForSell
                response.bio = found.bio
                response.stripeCustomerId = found.stripeCustomerId
                response.isOnline = found.isOnline
                response.stripeAccountSetup = found.stripeAccountSetup
                response.providerAccountSetup = found.providerAccountSetup
                response.pushNotification = found.pushNotification
                response.deliveryCharges = found.deliveryCharges
                response.deliveryChargeType = found.deliveryChargeType
                response.serviceRadius = found.serviceRadius
                response.profile = (!empty(found.profile))?"https://velatedocuments.s3.eu-west-2.amazonaws.com/profile/"+found.profile:found.profile
                response.document = (!empty(found.document))?"https://velatedocuments.s3.eu-west-2.amazonaws.com/document/"+found.document:found.document
               
               const dataToUpdate = {
                      deviceType  : req.body.deviceType,
                      deviceToken : req.body.deviceToken
                     } //if user logged in from different device then
               if(found.userType == 1){
                  let update = await USERTABLE.findByIdAndUpdate(
                    { _id: found._id },
                    { $set: dataToUpdate},
                      {new:true} );
                 if(update){
                  const jwtPayload = {
                   _id    : update._id,
                   name    : update.name,
                   emailId : update.emailId,
                   signUpBy: update.signUpBy,
                   countryCode : update.countryCode,
                   mobileNumber: update.mobileNumber,
                   deviceType:update.deviceType,
                   deviceToken:update.deviceToken,
                   userType    : found.userType
                    };
                    response.token = jwt.sign(jwtPayload, secret, jwtData);
                    response.deviceToken = update.deviceToken
                    response.deviceType = update.deviceType
                    helper.successResponseWithData(res,"Login Successfully!",response)
                    let updateCustomerDevice = await USERTABLE.updateMany(
                    {deviceType:update.deviceType,deviceToken:update.deviceToken,_id:{$ne:update._id}},
                    {$set:{deviceType:'',deviceToken:''}})
                   let updateProviderDevice = await PROVIDERTABLE.updateMany(
                    {deviceType:update.deviceType,deviceToken:update.deviceToken},
                    {$set:{deviceType:'',deviceToken:''}})
                 }
              else{
                    helper.ErrorResponseWithoutData(res,"Some Problem Occured during Updating Device Token and Type!")
                  }
                 }else{
                  let update = await PROVIDERTABLE.findByIdAndUpdate(
                    { _id: found._id },
                    { $set: dataToUpdate},
                      {new:true} );
                 if(update){
                  const jwtPayload = {
                   _id    : update._id,
                   name    : update.name,
                   emailId : update.emailId,
                   signUpBy: update.signUpBy,
                   countryCode : update.countryCode,
                   mobileNumber: update.mobileNumber,
                   deviceType:update.deviceType,
                   deviceToken:update.deviceToken,
                   userType    : found.userType
                    };
                    response.token = jwt.sign(jwtPayload, secret, jwtData);
                    response.deviceToken = update.deviceToken
                    response.deviceType = update.deviceType
                    helper.successResponseWithData(res,"Login Successfully!",response)
                    let updateCustomerDevice = await USERTABLE.updateMany(
                    {deviceType:update.deviceType,deviceToken:update.deviceToken},
                    {$set:{deviceType:'',deviceToken:''}})
                   let updateProviderDevice = await PROVIDERTABLE.updateMany(
                    {deviceType:update.deviceType,deviceToken:update.deviceToken,_id:{$ne:update._id}},
                    {$set:{deviceType:'',deviceToken:''}})
                 }
              else{
                    helper.ErrorResponseWithoutData(res,"Some Problem Occured during Updating Device Token and Type!")
                  }
                 }
            }
            else
            {
             helper.notFoundResponseWithNoData(res,"You are a first time user, Redirecting to SignUp Screen...")
            }
           }
         }else {
        return helper.validationError(res,"Please Enter a Valid signUpBy Value, 2 for Signup with Google ,3 for facebook and 4 for Apple")
      }
   }
     }
     catch(err){
       helper.ErrorResponseWithoutData(res,err.message)
     }
   }  
 ]
  
 exports.logIn =[
  body("emailId").trim().exists().notEmpty().withMessage("Email is required.")
  .isEmail().withMessage("Email must be a valid email address."),
body("password").trim().exists().notEmpty().withMessage("Password is required."),
body("deviceType").trim().exists().notEmpty().withMessage("Device Type is required."),
body("deviceToken").trim().exists().notEmpty().withMessage("Device Token is required."),
    async(req,res)=>{
        try{
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
         helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
      }
    else{
      let emailId = req.body.emailId.toLowerCase()
      var foundUser = await USERTABLE.findOne({'emailId':emailId},{createdAt:0,updatedAt:0,status:0})
       if(foundUser){
       var found = foundUser;
       found.userType = 1
       }else
       {
        var foundProvider = await PROVIDERTABLE.findOne({'emailId':emailId},{createdAt:0,updatedAt:0,status:0}) 
      if(foundProvider){
        var found = foundProvider;
        found.userType = 2
       }
      }
      if(found){
          console.log(found)
           bcrypt.compare(req.body.password , found.password,async(err,user)=>{
               if(user == true){ //if password match then generate token
                let check = {}
                      check._id = found._id
                      check.name = found.name
                      check.emailId = found.emailId
                      check.mobileNumber = found.mobileNumber
                      check.countryCode = found.countryCode
                      check.userType=found.userType
                           
                      check.googleId = found.googleId
                   check.facebookId = found.facebookId
                     check.appleId = found.appleId
                      check.pushNotification = found.pushNotification
                      check.deliveryCharges = found.deliveryCharges
                      check.serviceRadius = found.serviceRadius
                      check.isPremium = found.isPremium
                     const dataToUpdate = {
                      deviceType  : req.body.deviceType,
                      deviceToken : req.body.deviceToken
                     } //if user logged in from different device then
                
                 if(found.userType == 1){
                  let update = await USERTABLE.findByIdAndUpdate(
                    { _id: found._id },
                    { $set: dataToUpdate},
                      {new:true} );
                 if(update){
                  check.token = jwt.sign({
                        name:update.name,
                        _id:update._id,
                        emailId:update.emailId,
                        countryCode:update.countryCode,
                        mobileNumber:update.mobileNumber,
                        deviceType:update.deviceType,
                        deviceToken:update.deviceToken,
                        signUpBy:update.signUpBy,
                        userType:found.userType                 
                       },config.LOG_SECRET_KEY );
                  check.isBlocked = update.isBlocked
                  check.isEmailVerified = update.isEmailVerified
                    check.deviceToken = update.deviceToken
                    check.deviceType = update.deviceType
                    check.stripeCustomerId = update.stripeCustomerId
                  check.image = (!empty(found.image))?"https://velatedocuments.s3.eu-west-2.amazonaws.com/image/"+found.image:''
                    helper.successResponseWithData(res,"Login Successfully!",check)
                    let updateCustomerDevice = await USERTABLE.updateMany(
                    {deviceType:update.deviceType,deviceToken:update.deviceToken,_id:{$ne:update._id}},
                    {$set:{deviceType:'',deviceToken:''}})
                   let updateProviderDevice = await PROVIDERTABLE.updateMany(
                    {deviceType:update.deviceType,deviceToken:update.deviceToken},
                    {$set:{deviceType:'',deviceToken:''}})
                 }
              else{
                    helper.ErrorResponseWithoutData(res,"Some Problem Occured during Updating Device Token and Type!")
                  }
                 }else{
                  let update = await PROVIDERTABLE.findByIdAndUpdate(
                    { _id: found._id },
                    { $set: dataToUpdate},
                      {new:true} );
                 if(update){
                  check.token = jwt.sign({
                        name:update.name,
                        _id:update._id,
                        emailId:update.emailId,
                        countryCode:update.countryCode,
                        mobileNumber:update.mobileNumber,
                        deviceType:update.deviceType,
                        deviceToken:update.deviceToken,
                        signUpBy:update.signUpBy,
                        userType:found.userType                 
                       },config.LOG_SECRET_KEY );
                    check.deviceToken = update.deviceToken
                    check.deviceType = update.deviceType
                    check.isVerified = update.isVerified
                    check.businessName = update.businessName
                    check.businessAddress = update.businessAddress
                    check.idNumber = update.idNumber
                    check.pushNotification = update.pushNotification
                    check.deliveryCharges = update.deliveryCharges
                    check.deliveryChargeType = update.deliveryChargeType
                    check.serviceRadius = update.serviceRadius
                    check.deliveryOption = update.deliveryOption
                      check.serviceType = update.serviceType
                      check.bio = update.bio
                      check.permissionForSell = update.permissionForSell
                      check.isOnline = update.isOnline
                      check.stripeAccountSetup = update.stripeAccountSetup
                      check.providerAccountSetup = update.providerAccountSetup
                  check.profile = (!empty(update.profile))?"https://velatedocuments.s3.eu-west-2.amazonaws.com/profile/"+update.profile:''
                  check.document = (!empty(update.document))?"https://velatedocuments.s3.eu-west-2.amazonaws.com/document/"+update.document:''
                    helper.successResponseWithData(res,"Login Successfully!",check)
                    let updateCustomerDevice = await USERTABLE.updateMany(
                    {deviceType:update.deviceType,deviceToken:update.deviceToken},
                    {$set:{deviceType:'',deviceToken:''}})
                   let updateProviderDevice = await PROVIDERTABLE.updateMany(
                    {deviceType:update.deviceType,deviceToken:update.deviceToken,_id:{$ne:update._id}},
                    {$set:{deviceType:'',deviceToken:''}})
                 }
              else{
                    helper.ErrorResponseWithoutData(res,"Some Problem Occured during Updating Device Token and Type!")
                  }
                 }                 
                           }
               else{
                  helper.ErrorResponseWithoutData(res,"Invalid Email or Password")
               }
           })
       }
else{
   helper.ErrorResponseWithoutData(res,"Invalid Email or Password")
  }
    }
  }
  catch(err){
   helper.ErrorResponseWithoutData(res,err.message)
  }
  }]

exports.getUser=async(req,res)=>{
    try{

      console.log(req.userData)
    let found = await USERTABLE.findOne({'_id':req.userData._id},{password:0,createdAt:0,updatedAt:0,status:0})
    if(found){
        if(empty(found.image)){
       helper.successResponseWithData(res,"User Profile",found)
        }
        else{
            found.image = 'https://velatedocuments.s3.eu-west-2.amazonaws.com/profile/'+found.image 
            helper.successResponseWithData(res,"User Profile!",found)
        }
    }
    else{
        helper.unauthorizedResponseWithoutData(res," User Not Found")
    }
    }
    catch(err){
      helper.ErrorResponseWithoutData(res,err.message)
    }
  }  

exports.updateProfile = async(req,res)=>{
    try{
      if(req.body.emailId){
      var emailId = req.body.emailId.toLowerCase()
    }
     let userId = req.userData._id;
     var foundUser = await USERTABLE.findOne({'emailId':emailId})
           if(foundUser && foundUser._id.toString() != userId.toString()){
           var found = foundUser;
           }else
           {
            var foundProvider = await PROVIDERTABLE.findOne({'emailId':emailId})
            if(foundProvider){
            var found = foundProvider;
            }
           }
        if(found){
            helper.ErrorResponseWithoutData(res,"Already Registered with this MailId")
        }else{
      var dataToUpdate = {}
      if(req.body.emailId)
      {
        dataToUpdate.emailId = emailId
      }
      
      const its = ["name","countryCode","mobileNumber","deviceType", "deviceToken","pushNotification","stripeCustomerId","isEmailVerified"];
        for (let iterator of its)
        {  //iterating object 'its'             
          if (req.body[iterator])
            {
              dataToUpdate[iterator] = req.body[iterator];  
            }
        } 
          if(!empty(req.file))   // if user wants to update his/her profile picture
          {
            dataToUpdate.image = req.file.filename; 
             //upload new profile to s3 bucket
            utility.uploadFile(req.file.destination,req.file.filename,req.file.mimetype,config.S3_BUCKET_NAME+'image')
            .then(async uploaded=>{
           if(uploaded)
                   {        
                let updated = await  USERTABLE.findByIdAndUpdate({ _id: userId },{ $set:dataToUpdate}) 
                if(updated){
           
                     USERTABLE.findOne({'_id':userId },{password:0,createdAt:0,updatedAt:0,status:0},(err,updateData)=>{
                      if(err) {
                               helper.ErrorResponseWithoutData(res,err.message)
                                }
                      else {      
                        let token = jwt.sign({//creating token after updating profile
                        name:updateData.name,
                        _id:updateData._id,
                        emailId:updateData.emailId,
                        countryCode:updateData.countryCode,
                        mobileNumber:updateData.mobileNumber,
                        deviceType:updateData.deviceType,
                        deviceToken:updateData.deviceToken, 
                        signUpBy:updateData.signUpBy,
                        userType:1                
                        },config.LOG_SECRET_KEY ); 

                              let check = updateData.toJSON()
                              check.image = 'https://velatedocuments.s3.eu-west-2.amazonaws.com/image/'+updateData.image 
                              check.token = token
                              
                         if(empty(updated.image))
                             {
                              helper.successResponseWithData(res,"UserProfile Updated Successfully!",check)
                             }
                          else{
                                let toDelete = updated.image
                                utility.deleteS3File(toDelete,config.S3_BUCKET_NAME+'profile');                              
                                helper.successResponseWithData(res,"UserProfile Updated Successfully!",check)              
                              }                                                                                                                                                                 
                            }
                                        })                                                                    
                        }
             else{
                  helper.ErrorResponseWithoutData(res,"Data Can't be update. Internal Server Error!")
                 }      
 }
            })
      .catch(upload_err=>{
                          console.log('Some problem occured during uploading files on our server');                           
                          helper.ErrorResponseWithoutData(res,upload_err)
                      });

          }else // if user do not change its profile picture
               {
let updated = await  USERTABLE.findByIdAndUpdate({ _id: userId },{ $set:dataToUpdate}) 
               if(updated){
                USERTABLE.findOne({'_id':userId },{password:0,createdAt:0,updatedAt:0,status:0},(err,updateData)=>{
                        if(err) {
                               helper.ErrorResponseWithoutData(res,err.message)
                                }

                         else {                                                  
                         
                          //creating token after updating profile
                         let token = jwt.sign({
                          name:updateData.name,
                          _id:updateData._id,
                          emailId:updateData.emailId,
                          countryCode:updateData.countryCode,
                          mobileNumber:updateData.mobileNumber,
                          deviceType:updateData.deviceType,
                          deviceToken:updateData.deviceToken,  
                          signUpBy:updateData.signUpBy,
                          userType:1                
                          },config.LOG_SECRET_KEY ); 
                          let check = updateData.toJSON()                        
                           check.token = token


                          if(empty(updated.image ))
                          {
                           helper.successResponseWithData(res,"UserProfile Updated Successfully!",check)
                          }
                          else{                               
                            check.image = 'https://velatedocuments.s3.eu-west-2.amazonaws.com/image/'+updateData.image 
                            helper.successResponseWithData(res,"UserProfile Updated Successfully!",check)
                          }
                                
                           }
                                        })                                                                                                                                      
                         }
                 else{
                  helper.ErrorResponseWithoutData(res,"Data Can't be updated. Internal Server Error!")
                 }           
               }
             }
   }
   catch(err){
      helper.ErrorResponseWithoutData(res,err.message)
  }
  }

exports.changePassword =[
body("oldPassword").trim().exists().notEmpty().withMessage("Old Password is required."),
body("newPassword").trim().exists().notEmpty().withMessage("New Password is required.")
.isLength({ min: 6 }).withMessage("Password is Too short. Password should be of length 6"),
  async(req,res)=>{
  try{
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
       helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
    }
    else{
        let found = await USERTABLE.findOne({'_id':req.userData._id})
        // console.log(admin)
        if(found){
                 
            bcrypt.compare(req.body.oldPassword, found.password,async(err,user)=>{
                if(user == true){
                   
                      let update = await USERTABLE.findByIdAndUpdate({'_id':req.userData._id},{
                            $set:{password : bcrypt.hashSync(req.body.newPassword,saltRounds)}
                        })
                         if(update){
 
                               helper.successResponseWithNoData(res,"Successfully Set New Password")
                         }
                         else{                                                    
                              helper.ErrorResponseWithoutData(res,"Cannot set New Password . Internal Server Problem")
                         }                             
                }
                else{

                  helper.ErrorResponseWithoutData(res,"Old Password not Matched")
                }
                })
}
  else{
      helper.unauthorizedResponseWithoutData(res,"User Not Found!")
  }
}
}
catch(err){
    helper.ErrorResponseWithoutData(res,err.message)
}
}]




/**
 * Send sendPasswordResetEmail to user
 *
 * @param {string}  email 
 *
 * @returns {Object}
 */
  exports.sendPasswordResetEmail = [
    body("emailId").trim().isLength({ min: 1 }).withMessage("Email must be specified.")
    .isEmail().withMessage("Email must be a valid email address."), 
  async (req, res) => {
      try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }else {
          var emailId = req.body.emailId.toLowerCase()
          var foundUser = await USERTABLE.findOne({'emailId':emailId},{password:0,createdAt:0,updatedAt:0,status:0})
            if(foundUser){
            var found = foundUser;
            found.userType = 1
            }else
            {
             var foundProvider = await PROVIDERTABLE.findOne({'emailId':emailId},{password:0,createdAt:0,updatedAt:0,status:0}) 
             if(foundProvider){
             var found = foundProvider;
              found.userType = 2
             }
            }
          if(found){
                            let token = jwt.sign({
                                _id : found._id,
                                emailId  : found.emailId,
                                userType:found.userType
                                 },config.LOG_SECRET_KEY,{
                                    audience: 'SqTosdsdKeNpRoJeCt',
                                    expiresIn: 900
                                } );
                            mailer.sendForgotPasswordEmail(
                              found.emailId,
                              `https://api.valetit.uk:3000/auth/verifyToken/${token}`,
                              found.name
                              ).then(success=>{
                                 helper.successResponseWithNoData(res,"We have shared a password reset link to your email!")
                               }).catch(error=>{
                                console.log(error)
                                 helper.ErrorResponseWithoutData(res,error.message)
                               });
        }else
        {
           helper.notFoundResponseWithNoData(res,"Please Enter valid Email!") 
        }
  
        }
      }catch(err)
      {
        return helper.ErrorResponseWithoutData(res, err.message);
      }
    }
  ];

/**
 * Send sendPasswordResetEmail to admin
 *
 * @param {string}  email 
 *
 * @returns {Object}
 */
  exports.sendAdminPasswordResetEmail = [
    body("emailId").trim().isLength({ min: 1 }).withMessage("Email must be specified.")
    .isEmail().withMessage("Email must be a valid email address."), 
  async (req, res) => {
      try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }else {
          var emailId = req.body.emailId.toLowerCase()
          var found = await ADMINTABLE.findOne({'email':emailId},{password:0,createdAt:0,updatedAt:0})
            
          if(found){
                            let token = jwt.sign({
                                _id : found._id,
                                emailId  : found.emailId
                                 },config.LOG_SECRET_KEY,{
                                    audience: 'SqTosdsdKeNpRoJeCt',
                                    expiresIn: 900
                                } );
                            // Html email body
                            let html = `<p>Please find your password reset link below.</p><a href='https://admin.valetit.uk:4000/auth/verifyToken/${token}'>Click here</a><br>Please Do not Share this URL with anyone.<br>Note:- Reset Link will expire in 10 Minute.`;
                            // Send confirmation email

                            mailer.send(
                                config.SENDER_EMAIL, 
                                emailId,
                                "Find Your password reset link here",
                                html
                            ).then(success=>{
                                 helper.successResponseWithNoData(res,"We have shared a password reset link to your email!")
                            }).catch(error=>{
                                helper.ErrorResponseWithoutData(res,error)
                            });
               
        }else
        {
           helper.notFoundResponseWithNoData(res,"Please Enter valid Email!") 
        }
  
        }
      }catch(err)
      {
        return helper.ErrorResponseWithoutData(res, err.message);
      }
    }
  ];


exports.verifyToken = [
    async(req,res)=>{
        try{
        jwt.verify(req.params.token, config.LOG_SECRET_KEY,{audience: 'SqTosdsdKeNpRoJeCt',expiresIn: 900},
       async function(err,tokenData){
          if(err){res.render("error",{message:"This is not a authorized URL"})}
            if(tokenData){
              if(tokenData.userType == 1)
              {
              var found = await USERTABLE.findOne({$and:[{'emailId':tokenData.emailId},{'_id':ObjectId(tokenData._id)}]},{password:0,createdAt:0,updatedAt:0,status:0})
              }else
            if(tokenData.userType == 2){
             var found = await PROVIDERTABLE.findOne({$and:[{'emailId':tokenData.emailId},{'_id':ObjectId(tokenData._id)}]},{password:0,createdAt:0,updatedAt:0,status:0}) 
             
            }
                        if(found)
                            {
                                req.session.tmp_id = found._id;
                                req.session.tmp_userType = tokenData.userType;
                                res.render('reset-password',{msg:""});
                            }
                        else{
                            res.render("error",{message:"This is not a authorized URL"})
                        }
            }
        })
    }catch(err){
      res.render("error",{message:"This is not a authorized URL"})
           }
    }];


// /**
//  * Reset Password
//  *
//  * @param {string}  password
//  * @param {string}  confirmPassword
//  *
//  * @returns {Object}
//  */


exports.resetPassword = [
body("password").trim().isLength({ min: 6 }).withMessage("New Password must be specified."),
body("confirmPassword").trim().isLength({ min: 6 }).withMessage("Confirm New Password must be specified."),
async(req,res)=>{
        try{
            const errors = validationResult(req);
        if (!errors.isEmpty()) {
        res.render('reset-password',{msg:"New Password and Confirm password must be specified."});
         }else if(req.body.password !== req.body.confirmPassword){
                    res.render('reset-password',{msg:"New Password And Confirm Password should be same"})
            }
            else{
                   let bcryptPassword =bcrypt.hashSync(req.body.password,saltRounds)
                    if(req.session.tmp_userType == 1)
                    {
                    var updated = await USERTABLE.findByIdAndUpdate({ _id: ObjectId(req.session.tmp_id) },{ $set:{password:bcryptPassword}})
                    }else
                  if(req.session.tmp_userType == 2){
                   var updated = await PROVIDERTABLE.findByIdAndUpdate({ _id: ObjectId(req.session.tmp_id) },{ $set:{password:bcryptPassword}})
                  }
                      if(updated){
                         req.session.destroy()
                         res.render('reset-password',{msg:"Password Changed Successfully, Please Close the window and login"});
                       }else{
                            res.render('reset-password',{msg:"This password reset link is expired, Please generate new password reset email."});
                       }
    }
}
        catch(e){
          res.render('reset-password',{msg:"Something Went Wrong."});
           }
    }
    ]

exports.deleteAccount = async(req,res)=>{
      try{
        let found = await USERTABLE.findOne({'_id':req.userData._id})
        if(found){
            
            let update = await USERTABLE.deleteOne({          
              '_id':ObjectId(req.userData._id) ,                  
            })        
           
    if(update.n){
         
        helper.successResponseWithNoData(res,"Account Deleted Succesfully!")
        if(!empty(found.image)){
          
          utility.deleteS3File(found.image,config.S3_BUCKET_NAME+'image');  
        }
        
          let setData = await   DELETEACCTABLE.create({
            
            name:found.name,
            emailId:found.emailId,
            countryCode:found.countryCode,
            mobileNumber:found.mobileNumber,
            cause:req.body.cause? req.body.cause:'',
            type:1
          })
    
        }
        else{
          helper.notFoundResponseWithNoData(res,"Some Problem Occurred During Deletion of User Account!")
        }
         
        }
        else{
          helper.notFoundResponseWithNoData(res,"User not Found it Might be Already Deleted!")
        }
      }
      catch(err){
        return helper.ErrorResponseWithoutData(res, err.message);
    
       }
    }

    
exports.checkEmailVerification = async(req,res)=>{
    try{
      let customer = await USERTABLE.findOne({'_id':(req.params.customerId)})
      if(empty(customer)){
        res.render("error",{message:"Invalid Email Verification Link!. Kindly generate new Email."})
      }else if(customer.isEmailVerified == 1)
      {
        res.render("emailVerified",{message:"Your Email is already Verified!. Kindly login to use VALET-IT Services."})
      }
      else{
        let updated = await USERTABLE.findByIdAndUpdate({'_id':(req.params.customerId)},
         { $set:{isEmailVerified:1}},{new:true})
        if(!empty(updated))
          res.render("emailVerified",{message:"Your Email is Verified. Kindly login again to use VALET-IT Services."})
        else
          res.render("error",{message:"Something Went Wrong!. Kindly Try after some time"})
      }
      
    }
    catch(err){
      res.render("error",{message:"Something Went Wrong!. Kindly Try after some time"})
     }
}

/**
 * Send OTP to provider Email
 *
 * @param {string}  email 
 *
 * @returns {Object}
 */
  exports.sendOtpToCustomerEmail =[
    body("emailId").trim().isLength({ min: 1 }).withMessage("Email must be specified.")
    .isEmail().withMessage("Email must be a valid email address."), 
     async (req, res) => {
      try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }else {
          var emailId = req.body.emailId.toLowerCase()
          var foundUser = await USERTABLE.findOne({'emailId':emailId})
           if(foundUser && foundUser._id.toString() != req.userData._id.toString()){
           var found = foundUser;
           }else
           {
            var foundProvider = await PROVIDERTABLE.findOne({'emailId':emailId})
            if(foundProvider){
            var found = foundProvider;
            }
           }
          
          if(!found){
          var randomNo = utility.randomNumber()
          console.log(randomNo)
          var updated = await USERTABLE.findByIdAndUpdate({'_id':(req.userData._id)},
         { $set:{otp: randomNo}}
          ,{new:true})
          if(updated){
            mailer.sendOtpToEmail(
                              updated.emailId,
                              updated.otp,
                              updated.name
                              ).then(success=>{
                                 helper.successResponseWithNoData(res,"We have shared a OTP to your email!")
                            }).catch(error=>{
                                helper.ErrorResponseWithoutData(res,error.message)
                            });       
        }else
        {
           helper.ErrorResponseWithoutData(res,"Something Went Wrong!") 
        }
      }else{
        helper.ErrorResponseWithoutData(res,"Email Already Exist!") 
      }
      }
      }catch(err)
      {
        return helper.ErrorResponseWithoutData(res, err.message);
      }
    }
    ]
    exports.verifyOtp = [
    body("otp").trim().isLength({ min: 6 }).withMessage("OTP must be specified of min 6 length."), 
  async (req, res) => {
      try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }else {
             var found = await USERTABLE.findOne({'_id':req.userData._id},{password:0,createdAt:0,updatedAt:0,status:0}) 
          if(found){
            if(found.otp == req.body.otp)
            {
              helper.successResponseWithNoData(res,"OTP verified successfully!")
            }else{
              helper.ErrorResponseWithoutData(res,"Invalid OTP.")
            }
      }else
        {
           helper.notFoundResponseWithNoData(res,"Something Went Wrong!") 
        }
  
        }
      }catch(err)
      {
        return helper.ErrorResponseWithoutData(res, err.message);
      }
    }
  ];

//only for clearing device token so that user has not receive notification
exports.clearDeviceToken = async(req,res)=>{
    try{
        let updated = await USERTABLE.findByIdAndUpdate({'_id':(req.userData._id)},
         { $set:{deviceType:'',deviceToken:''}},{new:true})
        if(!empty(updated))
         helper.successResponseWithNoData(res,"Device Token Cleared successfully!")
        else
         helper.ErrorResponseWithoutData(res,"Something Went Wrong!. Kindly Try after some time")
      
    }
    catch(err){
      helper.ErrorResponseWithoutData(res, err.message);
     }
}