const config = require('../../config/app')
const express = require('express')
const app = express()
const { body,validationResult } = require("express-validator");
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const helper = require('../../helpers/apiResponse')
const utility = require('../../helpers/utility')
const mailer = require("../../helpers/mailer");
let saltRounds = 10;
var empty = require('is-empty'); 
const mongoose = require('mongoose');
const PROVIDERTABLE = require('../../models/provider');
const USERTABLE = require('../../models/user')
const DELETEACCTABLE = require('../../models/deletedAccount') 
mongoose.set('useFindAndModify', false);
let ObjectId= mongoose.Types.ObjectId

exports.signUp =[
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
    body("name").trim().exists().notEmpty().withMessage("Name is required."),
    body("emailId").trim().exists().notEmpty().withMessage("Email is required.")
    .isEmail().withMessage("Email must be a valid email address."),
    body("countryCode").trim().exists().notEmpty().withMessage("CountryCode is required."),
    body("mobileNumber").trim().exists().notEmpty().withMessage("MobileNumber is required."),
  
  body("businessName").trim().exists().notEmpty().withMessage("businessName is required."),
  body("businessAddress").trim().exists().notEmpty().withMessage("businessAddress is required."),
  body("long").trim().exists().notEmpty().withMessage("long is required."),
  body("lat").trim().exists().notEmpty().withMessage("lat is required."),
  body("idNumber").trim().exists().notEmpty().withMessage("idNumber is required."),
  body("deviceType").trim().exists().notEmpty().withMessage("Device Type is required."),
  body("deviceToken").trim().exists().notEmpty().withMessage("Device Token is required."),
      async(req,res)=>{
          try{ 
           const errors = validationResult(req);
        if (!errors.isEmpty()) {
           helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }
        else if(req.body.serviceType && req.body.serviceType.length<= 0){
            helper.validationError(res,"Service Type required!")
        }
      else{
          var emailId = req.body.emailId.toLowerCase()    
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
      if(req.files && req.files['profile'] && req.files['document']){
       let profileUpload = await  utility.uploadFile(req.files['profile'][0].destination,req.files['profile'][0].filename,req.files['profile'][0].mimetype,config.S3_BUCKET_NAME+'profile')
          // profile = req.files['profile'][0].filename
          
      let documentUpload = await utility.uploadFile(req.files['document'][0].destination,req.files['document'][0].filename,req.files['document'][0].mimetype,config.S3_BUCKET_NAME+'document')
       
      if(profileUpload && documentUpload){
          PROVIDERTABLE.create({
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
              deviceToken:req.body.deviceToken,
              lat:req.body.lat,
              long:req.body.long,
              bio:req.body.bio?req.body.bio:'',
              deliveryOption:req.body.deliveryOption?req.body.deliveryOption:[],//0 = selfDriving 1 = pick and drop by service Provider 
              serviceType:req.body.serviceType,
              location: {
                  type: "Point",
                  coordinates: [parseFloat(req.body.long), parseFloat(req.body.lat)]
              },
              idNumber:req.body.idNumber,
              businessName:req.body.businessName,
              businessAddress:req.body.businessAddress,
              profile:req.files['profile'][0].filename,
              document:req.files['document'][0].filename, 
            }).then(async provider =>{
                
                  let check = {}
                  check._id = provider._id
                  check.name = provider.name
                  check.emailId = provider.emailId
                  check.mobileNumber = provider.mobileNumber
                  check.countryCode = provider.countryCode
                  check.signUpBy  = provider.signUpBy
                  check.googleId = provider.googleId
                  check.facebookId = provider.facebookId
                  check.appleId = provider.appleId
                  check.userType = 2
                  check.deviceType = provider.deviceType
                  check.deviceToken = provider.deviceToken
                  check.lat = provider.lat
                  check.long = provider.long
                  check.location = provider.location
                  check.businessName = provider.businessName
                  check.businessAddress = provider.businessAddress
                  check.deliveryOption = provider.deliveryOption
                  check.serviceType = provider.serviceType
                  check.bio = provider.bio
                  check.idNumber = provider.idNumber
                  check.isVerified = provider.isVerified
                  check.pushNotification = provider.pushNotification
                  check.profile = 'https://velatedocuments.s3.eu-west-2.amazonaws.com/profile/'+provider.profile
                  check.document = 'https://velatedocuments.s3.eu-west-2.amazonaws.com/document/'+provider.document
               helper.successResponseWithData(res,"Account Created Successfully!",check)
          
                // Send confirmation email
                mailer.sendEmailVerificationLink(
                              provider.emailId,
                              `https://api.valetit.uk:3000/authProvider/checkEmailVerification/${provider._id}`,
                              provider.name
                              ).then(success=>{
                                 console.log("We have shared a Email Verification link to your email!")
                               }).catch(error=>{
                                console.log(error)
                               });
               let updateCustomerDevice = await USERTABLE.updateMany(
                    {deviceType:provider.deviceType,deviceToken:provider.deviceToken},
                    {$set:{deviceType:'',deviceToken:''}})
                   let updateProviderDevice = await PROVIDERTABLE.updateMany(
                    {deviceType:provider.deviceType,deviceToken:provider.deviceToken,_id:{$ne:provider._id}},
                    {$set:{deviceType:'',deviceToken:''}})
            }).catch(err=>{
                helper.ErrorResponseWithoutData(res,err.message)
            })
       }
       else{
           helper.ErrorResponseWithoutData(res,"Some problem Occured During Uploading Files!")
       }
    
          }
      else if(req.files['document']) 
      {
          let documentUpload = await utility.uploadFile(req.files['document'][0].destination,req.files['document'][0].filename,req.files['document'][0].mimetype,config.S3_BUCKET_NAME+'document')
          if(documentUpload){
              PROVIDERTABLE.create({
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
                  deviceToken:req.body.deviceToken,
                   lat:req.body.lat,
                   long:req.body.long,
                   location: {
                                type: "Point",
                                coordinates: [parseFloat(req.body.long), parseFloat(req.body.lat)]
                            },
                   idNumber:req.body.idNumber,
                  businessName:req.body.businessName,
                  businessAddress:req.body.businessAddress,
                 
                  bio:req.body.bio?req.body.bio:'',
                  deliveryOption:req.body.deliveryOption?req.body.deliveryOption:[],//0 = selfDriving 1 = pick and drop by service Provider 
                  serviceType:req.body.serviceType,
                  // profile:req.files['profile][0].filename,
                  profile:'',
                  document:req.files['document'][0].filename, 
                }).then(async provider =>{
                    
                      let check = {}
                      check._id = provider._id
                      check.name = provider.name
                      check.emailId = provider.emailId
                      check.mobileNumber = provider.mobileNumber
                      check.countryCode = provider.countryCode
                      check.signUpBy  = provider.signUpBy
                      check.googleId = provider.googleId
                      check.facebookId = provider.facebookId
                      check.appleId = provider.appleId
                      check.userType = 2
                      check.deviceType = provider.deviceType
                      check.deviceToken = provider.deviceToken
                      check.lat = provider.lat
                      check.long = provider.long
                      check.location = provider.location
                      check.businessName = provider.businessName
                      check.businessAddress = provider.businessAddress
                      check.deliveryOption = provider.deliveryOption
                      check.serviceType = provider.serviceType
                      check.bio = provider.bio
                      check.idNumber = provider.idNumber
                      check.profile = provider.profile
                      check.isVerified = provider.isVerified
                      check.pushNotification = provider.push
                      check.document = 'https://velatedocuments.s3.eu-west-2.amazonaws.com/document/'+provider.document
          
                   helper.successResponseWithData(res,"Account Created Successfully!",check)

                    // Send confirmation email
                    mailer.sendEmailVerificationLink(
                              provider.emailId,
                              `https://api.valetit.uk:3000/authProvider/checkEmailVerification/${provider._id}`,
                              provider.name
                              ).then(success=>{
                                 console.log("We have shared a Email Verification link to your email!")
                               }).catch(error=>{
                                console.log(error)
                               });
                   let updateCustomerDevice = await USERTABLE.updateMany(
                    {deviceType:provider.deviceType,deviceToken:provider.deviceToken},
                    {$set:{deviceType:'',deviceToken:''}})
                   let updateProviderDevice = await PROVIDERTABLE.updateMany(
                    {deviceType:provider.deviceType,deviceToken:provider.deviceToken,_id:{$ne:provider._id}},
                    {$set:{deviceType:'',deviceToken:''}})
                }).catch(err=>{
                    helper.ErrorResponseWithoutData(res,err.message)
                })
          }
          else{
              helper.ErrorResponseWithoutData(res,"Some Problem Occured During Uploading Files!")
          }
      }
      else{
          helper.ErrorResponseWithoutData(res,"Please Add Your Document!")
      }
    }  
      }
    }
      catch(err){
        console.log(err)
        helper.ErrorResponseWithoutData(res,err.message)
      }
      }]

exports.getProvider=async(req,res)=>{
    try{
      console.log(req.userData)
    let found = await PROVIDERTABLE.findOne({'_id':req.userData._id},{password:0,createdAt:0,updatedAt:0,status:0})
    if(found){
        if(empty(found.profile)){
          found.document = 'https://velatedocuments.s3.eu-west-2.amazonaws.com/document/'+found.document 
       helper.successResponseWithData(res,"Provider Profile",found)
        }
        else{
            found.profile = 'https://velatedocuments.s3.eu-west-2.amazonaws.com/profile/'+found.profile
            found.document = 'https://velatedocuments.s3.eu-west-2.amazonaws.com/document/'+found.document 
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
     var userId = req.userData._id;
       var foundUser = await USERTABLE.findOne({'emailId':emailId})
           if(foundUser){
           var found = foundUser;
           }else
           {
            var foundProvider = await PROVIDERTABLE.findOne({'emailId':emailId})
            if(foundProvider && foundProvider._id.toString() != userId.toString()){
            var found = foundProvider;
            }
           }
        if(found){
            helper.ErrorResponseWithoutData(res,"Already Registered with this MailId")
        }else{
      var dataToUpdate = {}
      if(req.body.emailId){
      dataToUpdate.emailId = emailId
    }
  const its = ["name","countryCode","mobileNumber","businessName","businessAddress","idNumber","lat","long","deviceType", "deviceToken","pushNotification","bio","deliveryOption","serviceType","deliveryCharges","deliveryChargeType","serviceRadius","providerAccountSetup"];
  
        for (let iterator of its)
        {  //iterating object 'its'             
          if (req.body[iterator])
            {
              dataToUpdate[iterator] = req.body[iterator];  
            }
            if(iterator == 'lat' && !empty(req.body[iterator])){
                  
              dataToUpdate[iterator] = req.body[iterator];
                var lat = req.body[iterator]
               //  console.log("chk lat",lat)
           }
              if(iterator == 'long' && !empty(req.body[iterator])){
               dataToUpdate[iterator] = req.body[iterator];
                var long = req.body[iterator]
               //  console.log("chk lng", long) 
             
              }
          }

          if(!empty(lat) && !empty(long)){
                dataToUpdate.location ={
                                       "type":"Point",
                                       "coordinates": [parseFloat(long), parseFloat(lat)]
                                        }
                                       }
   
        if(req.files && req.files['profile'] && req.files['document']){
            

                  dataToUpdate.profile = req.files['profile'][0].filename
                  dataToUpdate.document = req.files['document'][0].filename
            
       let profileUpload = await  utility.uploadFile(req.files['profile'][0].destination,req.files['profile'][0].filename,req.files['profile'][0].mimetype,config.S3_BUCKET_NAME+'profile')
            // profile = req.files['profile'][0].filename
            
        let documentUpload = await utility.uploadFile(req.files['document'][0].destination,req.files['document'][0].filename,req.files['document'][0].mimetype,config.S3_BUCKET_NAME+'document')
 if(profileUpload && documentUpload){ 

                let updated = await  PROVIDERTABLE.findByIdAndUpdate({ _id: userId },{ $set:dataToUpdate},{new:true}) 
                if(updated){
           
                   PROVIDERTABLE.findOne({'_id':userId },{password:0,createdAt:0,updatedAt:0,status:0},(err,updateData)=>{
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
                        userType:2               
                        },config.LOG_SECRET_KEY ); 

                            let check = updateData.toJSON()
                            check.profile = 'https://velatedocuments.s3.eu-west-2.amazonaws.com/profile/'+updateData.profile 
                            check.document = 'https://velatedocuments.s3.eu-west-2.amazonaws.com/document/'+updateData.document 
                            check.token = token
                              
                         if(empty(updated.profile))
                             {
                              let toDelete = updated.document
                              utility.deleteS3File(toDelete,config.S3_BUCKET_NAME+'document'); 
                              helper.successResponseWithData(res,"Profile Updated Successfully!",check)
                             }
                          else{
                            let toDelete = updated.document
                            let profileDelete = updated.profile
                            utility.deleteS3File(toDelete,config.S3_BUCKET_NAME+'document'); 
                            utility.deleteS3File(profileDelete,config.S3_BUCKET_NAME+'profile');                           
                                helper.successResponseWithData(res,"Profile Updated Successfully!",check)              
                              }                                                                                                                                                                 
                            }
                                        })                                                                    
                        }
             else{
                  helper.ErrorResponseWithoutData(res,"Data Can't be update. Internal Server Error!")
                 }      
 }
      else{
         helper.ErrorResponseWithoutData(res,"Some problem Occured During Uploading Files!")
     }
          }
          else if(req.files && (req.files['profile'] || req.files['document']))
          {
               if(req.files['profile']){
              dataToUpdate.profile = req.files['profile'][0].filename
     var profileUpload = await  utility.uploadFile(req.files['profile'][0].destination,req.files['profile'][0].filename,req.files['profile'][0].mimetype,config.S3_BUCKET_NAME+'profile')          
          
              }
          else{
              dataToUpdate.document = req.files['document'][0].filename
              var documentUpload = await utility.uploadFile(req.files['document'][0].destination,req.files['document'][0].filename,req.files['document'][0].mimetype,config.S3_BUCKET_NAME+'document')        
            }

            if(profileUpload || documentUpload){
              let updated = await  PROVIDERTABLE.findByIdAndUpdate({ _id: userId },{ $set:dataToUpdate}) 
              if(updated){
         
      let updateData = await PROVIDERTABLE.findOne({'_id':userId },{password:0,createdAt:0,updatedAt:0,status:0})
                    
                    if(updateData){
                           
                      let token = jwt.sign({//creating token after updating profile
                      name:updateData.name,
                      _id:updateData._id,
                      emailId:updateData.emailId,
                      countryCode:updateData.countryCode,
                      mobileNumber:updateData.mobileNumber,
                      deviceType:updateData.deviceType,
                      deviceToken:updateData.deviceToken, 
                      signUpBy:updateData.signUpBy,
                      userType:2                   
                      },config.LOG_SECRET_KEY ); 

                          let check = updateData.toJSON()
                          if(!empty(updateData.profile) )
                           {
                            check.profile = 'https://velatedocuments.s3.eu-west-2.amazonaws.com/profile/'+updateData.profile 
                           }    
                           else{
                             check.profile = updateData.profile
                           }                     
                          check.document = 'https://velatedocuments.s3.eu-west-2.amazonaws.com/document/'+updateData.document 
                          check.token = token

                            if(req.files['profile']|| req.files['document']){
                              if(req.files['profile']){
                                if(empty(updated.profile) )
                                { 
                                  helper.successResponseWithData(res,"Profile Updated Successfully!",check)
                                }
                                else{
                                // let toDelete = updated.document
                                // utility.deleteS3File(toDelete,config.S3_BUCKET_NAME+'document'); 
                                helper.successResponseWithData(res,"Profile Updated Successfully!",check)   
                                let profileDelete = updated.profile
                                utility.deleteS3File(profileDelete,config.S3_BUCKET_NAME+'profile');                                     
                                  }    
                                } 
                                else{
                                  helper.successResponseWithData(res,"Profile Updated Successfully!",check)
                                   let toDelete = updated.document
                                   utility.deleteS3File(toDelete,config.S3_BUCKET_NAME+'document');
                                }
                            }                                                                                                                                                            
                          }
                          else {
                            helper.ErrorResponseWithoutData(res,"User Not Found")
                             }
                                                                                                     
                      }
           else{
                helper.ErrorResponseWithoutData(res,"Data Can't be updated. Internal Server Error!")
               }      

            }
          }
    else // if user doesn't change  profile and document both
               { 
let updated = await  PROVIDERTABLE.findByIdAndUpdate({ _id: userId },{ $set:dataToUpdate}) 
               if(updated){
               console.log(updated)
                PROVIDERTABLE.findOne({'_id':userId },{password:0,createdAt:0,updatedAt:0,status:0},(err,updateData)=>{
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
                          userType:2                    
                          },config.LOG_SECRET_KEY ); 
                          let check = updateData.toJSON()                        
                           check.token = token


                          if(empty(updated.profile ))
                          {
                            check.document = 'https://velatedocuments.s3.eu-west-2.amazonaws.com/document/'+updateData.document
                           helper.successResponseWithData(res,"UserProfile Updated Successfully!",check)
                          }
                          else{                               
                            check.profile = 'https://velatedocuments.s3.eu-west-2.amazonaws.com/profile/'+updateData.profile 
                            check.document = 'https://velatedocuments.s3.eu-west-2.amazonaws.com/document/'+updateData.document
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
        let found = await PROVIDERTABLE.findOne({'_id':req.userData._id})
        if(found){
                 
            bcrypt.compare(req.body.oldPassword, found.password,async(err,user)=>{
                if(user == true){
                      let update = await PROVIDERTABLE.findByIdAndUpdate({'_id':req.userData._id},{
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

exports.addToGallery = async(req,res)=>{
  try{
    console.log(req.files)
    if(!empty(req.files)){
    var isImage = 0;
    var galleryPics = [];
    for (const [i, value] of req.files.entries()) {
      galleryImage = req.files[i].filename
      isImage++;
      galleryPics.push(galleryImage)
       utility.uploadFile(
          req.files[i].destination,
          req.files[i].filename,
          req.files[i].mimetype,
          config.S3_BUCKET_NAME+ "gallery")
          .then(data => console.log(data))
          .catch(err => {
             
              helper.ErrorResponseWithoutData(res,"Some Problem Occurred During Uploading Files!")
          })
  }
  let update = await PROVIDERTABLE.findByIdAndUpdate({'_id':req.userData._id},{
    $addToSet:{gallery:galleryPics}
  },{new:true})
  if(update){
   
    let appnd = await PROVIDERTABLE.aggregate(
      [
        {$match:{'_id':ObjectId(req.userData._id)}},
         { $project:
            { galleryPictures:
               {
                 $map:
                    {
                      input: "$gallery",
                      as: "galimg",
                      in: {$concat: ["https://velatedocuments.s3.eu-west-2.amazonaws.com/gallery/","$$galimg"]}
                    }
               }
            }
         }
      ]
   )
    if(!empty(appnd[0].galleryPictures))
          {
           helper.successResponseWithData(res,"Pictures added Successfully!",appnd[0].galleryPictures)
          }
          else{
           helper.successResponseWithData(res,"Pictures added Successfully!",[])
          }
  }
 }
else{
  helper.ErrorResponseWithoutData(res,"Please Select Pictures to Upload to your Gallery!")
}
  }
  catch(err){
    helper.ErrorResponseWithoutData(req,err.message)
  }
}
 

exports.deleteFromGallery = async(req,res)=>{
  try{
  console.log(req.body)
  var picsToDelete = req.body.toDelete
   // let profileDelete = updated.profile
  
   let found = await PROVIDERTABLE.findOne(
     {'_id':ObjectId(req.userData._id),'gallery': {"$in":picsToDelete}});
      if(found){
        let updated = await PROVIDERTABLE.findByIdAndUpdate({'_id':(req.userData._id)},
         { $pull:{gallery:{ $in: picsToDelete}}}
          ,{new:true}
        )
         if(updated){
          //  var remainPics = updated.gallery
          let appnd = await PROVIDERTABLE.aggregate(
            [
              {$match:{'_id':ObjectId(req.userData._id)}},  
               { $project:
                  { galleryPictures:
                     {
                       $map:
                          {
                            input: "$gallery",
                            as: "galimg",
                            in: {$concat: ["https://velatedocuments.s3.eu-west-2.amazonaws.com/gallery/","$$galimg"]}
                          }
                     }
                  }
               }
            ]
         )
           if(!empty(appnd[0].galleryPictures))
          {
           helper.successResponseWithData(res,"Pictures deleted Successfully!",appnd[0].galleryPictures)
          }
          else{
           helper.successResponseWithData(res,"Pictures deleted Successfully!",[])
          }
           
    for(const pic of picsToDelete) {
        utility.deleteS3File(pic,config.S3_BUCKET_NAME+"gallery");  
        }
         }
         else{
              helper.ErrorResponseWithoutData(res,"Some Problem Occurred During Deleting Pictures from Database!") 
         }
      }
     else{
         helper.ErrorResponseWithoutData(res,"Pictures not Found. May be already deleted")
     }
    }
    catch(err){
      helper.ErrorResponseWithoutData(res,err.message)
    }
  }

exports.viewGallery = async(req,res)=>{
  try{
          let appnd = await PROVIDERTABLE.aggregate(
            [
              {$match:{'_id':ObjectId(req.userData._id)}},
               { $project:
                  { galleryPictures:
                     {
                       $map:
                          {
                            input: "$gallery",
                            as: "galimg",
                            in: {$concat: ["https://velatedocuments.s3.eu-west-2.amazonaws.com/gallery/","$$galimg"]}
                          }
                     }
                  }
               }
            ]
         )
          if(!empty(appnd[0].galleryPictures))
          {
           helper.successResponseWithData(res,"Pictures Found Successfully!",appnd[0].galleryPictures)
          }
          else{
           helper.successResponseWithData(res,"Pictures Found Successfully!",[])
          }
        }
    catch(err){
      helper.ErrorResponseWithoutData(res,err.message)
    }
  }  


  exports.deleteAccount = async(req,res)=>{
    try{
      let found = await PROVIDERTABLE.findOne({'_id':req.userData._id})
      if(found){
          
          let update = await PROVIDERTABLE.deleteOne({          
            '_id':ObjectId(req.userData._id) ,                  
          })        
         
  if(update.n){
       
      helper.successResponseWithNoData(res,"Account Deleted Succesfully!")
      if(!empty(found.profile)){   
        utility.deleteS3File(found.profile,config.S3_BUCKET_NAME+'profile'); 
        utility.deleteS3File(found.document,config.S3_BUCKET_NAME+'document');       
      }
      else{
        utility.deleteS3File(found.document,config.S3_BUCKET_NAME+'document');     
      }
        let setData = await   DELETEACCTABLE.create({
          
          name:found.name,
          emailId:found.emailId,
          countryCode:found.countryCode,
          mobileNumber:found.mobileNumber,
          address:found.businessAddress,
          lat:found.lat,
          long: found.long,       
          cause:req.body.cause? req.body.cause:'',
          type:2
        })
  
      }
      else{
        helper.notFoundResponseWithNoData(res,"Some Problem Occurred During Deletion of Provider Account!")
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

/**
 * Send sendAccountVerificationEmail to provider
 *
 * @param {string}  email 
 *
 * @returns {Object}
 */
  exports.sendProviderAccountVerificationEmail = [
    body("emailId").trim().isLength({ min: 1 }).withMessage("Email must be specified.")
    .isEmail().withMessage("Email must be a valid email address."), 
  async (req, res) => {
      try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }else {
          var emailId = req.body.emailId.toLowerCase()
             var found = await PROVIDERTABLE.findOne({'emailId':emailId},{password:0,createdAt:0,updatedAt:0,status:0}) 
          if(found){
            mailer.sendEmailVerificationLink(
                              found.emailId,
                              `https://api.valetit.uk:3000/authProvider/checkEmailVerification/${found._id}`,
                              found.name
                              ).then(success=>{
                                 helper.successResponseWithNoData(res,"We have shared a Email Verification link to your email!")
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


exports.checkEmailVerification = async(req,res)=>{
    try{
      let provider = await PROVIDERTABLE.findOne({'_id':(req.params.providerId)})
      console.log("This is provider",provider)
      if(empty(provider)){
        res.render("error",{message:"Invalid Email Verification Link!. Kindly generate new Email."})
      }else if(provider.providerAccountSetup >= 1)
      {
        res.render("emailVerified",{message:"Your Email is already Verified!. Kindly login to use VALET-IT Services."})
      }
      else if(provider.workingHours.length>0)
      {
        let updated = await PROVIDERTABLE.findByIdAndUpdate({'_id':(req.params.providerId)},
         { $set:{providerAccountSetup:3}},{new:true})
        if(!empty(updated))
         res.render("emailVerified",{message:"Your Email is Verified. Kindly login again to use VALET-IT Services."})
        else
         res.render("error",{message:"Something Went Wrong!. Kindly Try after some time"}) 
      }else{
        let updated = await PROVIDERTABLE.findByIdAndUpdate({'_id':(req.params.providerId)},
         { $set:{providerAccountSetup:1}},{new:true})
        if(!empty(updated))
         res.render("emailVerified",{message:"Your Email is Verified. Kindly login again to use VALET-IT Services."})
        else
         res.render("error",{message:"Something Went Wrong!. Kindly Try after some time"}) 
      }
      
    }
    catch(err){
      return helper.ErrorResponseWithoutData(res, err.message);
     }
}

/**
 * Send OTP to provider Email
 *
 * @param {string}  email 
 *
 * @returns {Object}
 */
  exports.sendOtpToProviderEmail =[
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
           if(foundUser){
           var found = foundUser;
           }else
           {
            var foundProvider = await PROVIDERTABLE.findOne({'emailId':emailId})
            if(foundProvider && foundProvider._id.toString() != req.userData._id.toString()){
            var found = foundProvider;
            }
           }
          
          if(!found){
          var randomNo = utility.randomNumber()
          console.log(randomNo)
          var updated = await PROVIDERTABLE.findByIdAndUpdate({'_id':(req.userData._id)},
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
             var found = await PROVIDERTABLE.findOne({'_id':req.userData._id},{password:0,createdAt:0,updatedAt:0,status:0}) 
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
        let updated = await PROVIDERTABLE.findByIdAndUpdate({'_id':req.userData._id},
         { $set:{deviceType:'',deviceToken:''}},{new:true})
        console.log(req.userData._id,updated)
        if(!empty(updated))
         helper.successResponseWithNoData(res,"Device Token Cleared successfully!")
        else
         helper.ErrorResponseWithoutData(res,"Something Went Wrong!. Kindly Try after some time")
      
    }
    catch(err){
      helper.ErrorResponseWithoutData(res, err.message);
     }
}
  //   exports.clearDeviceToken = [
  //   body("userId").trim()..withMessage("User Id must be specified."), 
  //  async (req, res) => {
  //     try{
  //       const errors = validationResult(req);
  //       if (!errors.isEmpty()) {
  //         helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
  //       }else {
  //           var foundUser = await USERTABLE.findOne({'_id':req.body.userId})
  //          if(foundUser){
  //          var found = foundUser;
  //          found.userType = 1
  //          }else
  //          {
  //           var foundProvider = await PROVIDERTABLE.findOne({'_id':req.body.userId})
  //           if(foundProvider){
  //           var found = foundProvider;
  //           found.userType = 2
  //           }
  //          }
  //           if(found.userType == 1){
  //           let updated = await USERTABLE.findByIdAndUpdate({'_id':req.body.userId},
  //        { $set:{deviceType:'',deviceToken:''}},{new:true})
  //       }else if(found.userType == 2)
  //       {
  //           let updated = await PROVIDERTABLE.findByIdAndUpdate({'_id':req.body.userId},
  //        { $set:{deviceType:'',deviceToken:''}},{new:true})
  //       }
  //       if(!empty(updated))
  //        helper.successResponseWithNoData(res,"Device Token Cleared successfully!")
  //       else
  //        helper.ErrorResponseWithoutData(res,"Something Went Wrong!. Kindly Try after some time")
  //       }
  //     }catch(err)
  //     {
  //       return helper.ErrorResponseWithoutData(res, err.message);
  //     }
  //   }
  // ];