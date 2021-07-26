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
const ORDERTABLE = require('../../models/order');
const USERTABLE = require('../../models/user');
const SELLINGITEMTABLE = require('../../models/sellingItem')
const SELLINGORDERTABLE = require('../../models/sellingOrder')
const stripe = require('stripe')(config.STRIPE_KEY);
const mailer = require("../../helpers/mailer");
let ObjectId= mongoose.Types.ObjectId


exports.myBookings =[
    body("type").exists().isInt({ gt: 0 , lt:4}).notEmpty().withMessage("Type Is required!")
    ,async(req,res)=>{
      try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
           helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }
        else{
          let page = 1;
      if(req.body.page)
      {
          page= parseInt(req.body.page);
      }

      let resPerPage =10;
      if(req.body.resPerPage)
      {
          resPerPage= parseInt(req.body.resPerPage);
      }
      let skip = (resPerPage * page) - resPerPage;
          if(req.body.type == 1){
          let found = await ORDERTABLE.aggregate([
          {$match:{$and:[{'providerId':ObjectId(req.userData._id)},{'status':0}]}},
          {
           $lookup: {
                  from: "users",
                  'let': {customerId: "$customerId" },
                  pipeline: [
                    {
                      $match:{
                        $expr:{
                         $eq:["$_id","$$customerId"]
                    }
                }
                    }
                 ],
                  as: "customer"
                }
          },
          { $unwind: { path: "$customer" } },
          {
            $sort:{createdAt:-1}
          },
          {$skip:skip},
          {$limit:resPerPage},
          {
            $project:{
              _id:1,
              orderId:1,
              deliveryDate:1,
              slotStartTime:1,
              slotEndTime:1,
              evaluation:1,
              status:1,
              estimatedTotalCost:1,
              deliveryOption:1,
              serviceType:1,
              createdAt:1,
              name:"$customer.name",
              image:{ 
                  $cond: { if: {
                    $eq: ["$customer.image",""] },
                 then: "",
                 else: { $concat: ["https://velatedocuments.s3.eu-west-2.amazonaws.com/image/", "$customer.image"] } }}
            }
          },
          {
            $addFields:{orderType:1}
          }
          ])
          if(!empty(found)){
                      helper.successResponseWithData(res,"Orders Found successfully!",found)
         }
         else{
             helper.notFoundResponseWithNoData(res,"No Orders Found!")
         }
        }
        else if(req.body.type == 2)
        {
          let found = await ORDERTABLE.aggregate([
          {$match:{$and:[{'providerId':ObjectId(req.userData._id)},{'status':{$gte:1}},{'status':{$lte:4}}]}},
          {
           $lookup: {
                  from: "users",
                  'let': {customerId: "$customerId" },
                  pipeline: [
                    {
                      $match:{
                        $expr:{
                         $eq:["$_id","$$customerId"]
                    }
                }
                    }
                 ],
                  as: "customer"
                }
          },
          { $unwind: { path: "$customer"} },
          {
            $sort:{createdAt:-1}
          },
          {$skip:skip},
          {$limit:resPerPage},
          {
            $project:{
              _id:1,
              orderId:1,
              deliveryDate:1,
              slotStartTime:1,
              slotEndTime:1,
              evaluation:1,
              status:1,
              estimatedTotalCost:1,
              deliveryOption:1,
              serviceType:1,
              createdAt:1,
              name:"$customer.name",
              image:{ 
                  $cond: { if: {
                    $eq: ["$customer.image",""] },
                 then: "",
                 else: { $concat: ["https://velatedocuments.s3.eu-west-2.amazonaws.com/image/", "$customer.image"] } }}
            }
          },
          {
            $addFields:{orderType:1}
          }
          ])
          if(!empty(found)){
                      helper.successResponseWithData(res,"Orders Found successfully!",found)
         }
         else{
             helper.notFoundResponseWithNoData(res,"No Orders Found!")
         }
        }
        else if(req.body.type == 3)
        {
         let found = await ORDERTABLE.aggregate([
          {$match:{$and:[{'providerId':ObjectId(req.userData._id)},{'status':{$gte:5}},{'status':{$lte:7}}]}},
          {
           $lookup: {
                  from: "users",
                  'let': {customerId: "$customerId" },
                  pipeline: [
                    {
                      $match:{
                        $expr:{
                         $eq:["$_id","$$customerId"]
                    }
                }
                    }
                 ],
                  as: "customer"
                }
          },
          { $unwind: { path: "$customer" } },
          {
            $sort:{createdAt:-1}
          },
          {$skip:skip},
          {$limit:resPerPage},
          {
            $project:{
              _id:1,
              orderId:1,
              deliveryDate:1,
              slotStartTime:1,
              slotEndTime:1,
              evaluation:1,
              status:1,
              estimatedTotalCost:1,
              deliveryOption:1,
              serviceType:1,
              createdAt:1,
              name:"$customer.name",
              image:{ 
                  $cond: { if: {
                    $eq: ["$customer.image",""] },
                 then: "",
                 else: { $concat: ["https://velatedocuments.s3.eu-west-2.amazonaws.com/image/", "$customer.image"] } }}
            }
          },
          {
            $addFields:{orderType:1}
          }
          ])
         if(!empty(found)){
                      helper.successResponseWithData(res,"Orders Found successfully!",found)
         }
         else{
             helper.notFoundResponseWithNoData(res,"No Orders Found!")
         }
        }
         
      }
    }
      catch(err){
        console.log(err)
          helper.ErrorResponseWithoutData(res,err.message)
      }
    }
]


exports.myItemBookings =[
    body("type").exists().isInt({ gt: 0 , lt:4}).notEmpty().withMessage("Type Is required!")
    ,async(req,res)=>{
      try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
           helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }
        else{
          let page = 1;
      if(req.body.page)
      {
          page= parseInt(req.body.page);
      }

      let resPerPage =10;
      if(req.body.resPerPage)
      {
          resPerPage= parseInt(req.body.resPerPage);
      }
      let skip = (resPerPage * page) - resPerPage;
          if(req.body.type == 1){
          let found = await SELLINGORDERTABLE.aggregate([
          {$match:{'status':0}},
          {
           $lookup: {
                  from: "users",
                  'let': {customerId: "$customerId" },
                  pipeline: [
                    {
                      $match:{
                        $expr:{
                         $eq:["$_id","$$customerId"]
                    }
                }
                    }
                 ],
                  as: "customer"
                }
          },
          { $unwind: { path: "$customer" } },
          {
            $sort:{createdAt:-1}
          },
          {$skip:skip},
          {$limit:resPerPage},
            {
              $project:{
                '_id':1,
                orderId:1,
                'estimatedTotalCost':1,
                'createdAt':1,
                'status':1,
                'cartItems':1,
                'name':"$customer.name",
                'image':{ 
            $cond: { if: {
              $eq: ["$customer.image",""] },
           then: "",
           else: { $concat: ["https://velatedocuments.s3.eu-west-2.amazonaws.com/image/", "$customer.image"] } }}
              }
             },
             {
            $addFields:{orderType:2}
          }
          ])
          if(!empty(found)){
                      helper.successResponseWithData(res,"Orders Found successfully!",found)
         }
         else{
             helper.notFoundResponseWithNoData(res,"No Orders Found!")
         }
        }
        else if(req.body.type == 2)
        {
          let found = await SELLINGORDERTABLE.aggregate([
          {$match:{$and:[{'status':{$gte:1}},{'status':{$lte:2}}]}},
          {
           $lookup: {
                  from: "users",
                  'let': {customerId: "$customerId" },
                  pipeline: [
                    {
                      $match:{
                        $expr:{
                         $eq:["$_id","$$customerId"]
                    }
                }
                    }
                 ],
                  as: "customer"
                }
          },
          { $unwind: { path: "$customer" } },
          {
            $sort:{createdAt:-1}
          },
          {$skip:skip},
          {$limit:resPerPage},
          {
              $project:{
                '_id':1,
                orderId:1,
                'estimatedTotalCost':1,
                'createdAt':1,
                'status':1,
                'cartItems':1,
                'name':"$customer.name",
                'image':{ 
            $cond: { if: {
              $eq: ["$customer.image",""] },
           then: "",
           else: { $concat: ["https://velatedocuments.s3.eu-west-2.amazonaws.com/image/", "$customer.image"] } }}
              }
             },
             {
            $addFields:{orderType:2}
          }
          ])
          if(!empty(found)){
                      helper.successResponseWithData(res,"Orders Found successfully!",found)
         }
         else{
             helper.notFoundResponseWithNoData(res,"No Orders Found!")
         }
        }
        else if(req.body.type == 3)
        {
         let found = await SELLINGORDERTABLE.aggregate([
          {$match:{$and:[{'status':{$gte:3}},{'status':{$lte:5}}]}},
          {
           $lookup: {
                  from: "users",
                  'let': {customerId: "$customerId" },
                  pipeline: [
                    {
                      $match:{
                        $expr:{
                         $eq:["$_id","$$customerId"]
                    }
                }
                    }
                 ],
                  as: "customer"
                }
          },
          { $unwind: { path: "$customer"} },
          {
            $sort:{createdAt:-1}
          },
          {$skip:skip},
          {$limit:resPerPage},
          {
              $project:{
                '_id':1,
                orderId:1,
                'estimatedTotalCost':1,
                'createdAt':1,
                'status':1,
                'cartItems':1,
                'name':"$customer.name",
                'image':{ 
            $cond: { if: {
              $eq: ["$customer.image",""] },
           then: "",
           else: { $concat: ["https://velatedocuments.s3.eu-west-2.amazonaws.com/image/", "$customer.image"] } }}
              }
             },
             {
            $addFields:{orderType:2}
          }
          ])
         if(!empty(found)){
                      helper.successResponseWithData(res,"Orders Found successfully!",found)
         }
         else{
             helper.notFoundResponseWithNoData(res,"No Orders Found!")
         }
        }
         
      }
    }
      catch(err){
        console.log(err)
          helper.ErrorResponseWithoutData(res,err.message)
      }
    }
]


exports.bookingDetails =[
    body("orderId").exists().notEmpty().withMessage("Order Id Is required!"),
    async(req,res)=>{
      try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
           helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }
        else{
          let found = await ORDERTABLE.findOne({'_id':ObjectId(req.body.orderId)})
              
         if(!empty(found)){
                      helper.successResponseWithData(res,"Orders Details Found Successfully!",found)
         }
         else{
             helper.notFoundResponseWithNoData(res,"No Orders Found!")
         }
            }
            
        
      }
      catch(err){
          helper.ErrorResponseWithoutData(res,err.message)
      }
    }
]

exports.itemBookingDetails =[
    body("orderId").exists().notEmpty().withMessage("Order Id Is required!"),
    async(req,res)=>{
      try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
           helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }
        else{
          let found = await SELLINGORDERTABLE.aggregate([
            {$match:{'_id':ObjectId(req.body.orderId)}},
            {
              $lookup:{
                from:"users",
                localField:"customerId",
                foreignField:"_id",
                as:"customerDetails"
              }
            },
            {$unwind:"$customerDetails"},
            {
              $project:{
                _id:1,
                orderId:1,
                deliveryLocation:1,
                status:1,
                customerId:1,
                deliveryAddress:1,
                lat:1,
                long:1,
                cartItems:1,
                subTotal:1,
                deliveryFee:1,
                subscriptionDiscount:1,
                estimatedTotalCost:1,
                createdAt:1,
                customerCountryCode:"$customerDetails.countryCode",
                customerMobileNumber:"$customerDetails.mobileNumber",
                customerName:"$customerDetails.name",
                customerImage:{ 
                  $cond: { if: {
                    $eq: ["$customerDetails.image",""] },
                 then: "",
                 else: { $concat: ["https://velatedocuments.s3.eu-west-2.amazonaws.com/image/", "$customerDetails.image"] } }}
              }
            }
            ])
              
         if(!empty(found)){
          var response = {}
          
          var tmpCartItem = []
          for(let cartItem of found[0].cartItems)  
          {
            var tmpItemImages = []
          var tmpResponse = {}
            for(let itemImage of cartItem.itemImages)
            {
               tmpItemImages.push("https://velatedocuments.s3.eu-west-2.amazonaws.com/itemImages/"+ itemImage)
               //console.log(itemImage)
            }
            tmpResponse.itemName = cartItem.itemName
            tmpResponse.evaluation = cartItem.evaluation
            tmpResponse.quantity = cartItem.quantity
            tmpResponse.itemImages = tmpItemImages
            tmpResponse.itemId = cartItem.itemId
            tmpResponse.itemPrice = cartItem.itemPrice
            tmpResponse.description = cartItem.description
            tmpCartItem.push(tmpResponse)
          }
          response.orderId = found[0].orderId
            response.deliveryLocation = found[0].deliveryLocation
            response.status = found[0].status
            response._id = found[0]._id
            response.customerId = found[0].customerId
            response.customerCountryCode = found[0].customerCountryCode
            response.customerMobileNumber = found[0].customerMobileNumber
            response.customerName = found[0].customerName
            response.customerImage = found[0].customerImage
            response.deliveryAddress = found[0].deliveryAddress
            response.lat = found[0].lat
            response.long = found[0].long
            response.cartItems = tmpCartItem
            response.subTotal = found[0].subTotal
            response.deliveryFee = found[0].deliveryFee
            response.subscriptionDiscount = found[0].subscriptionDiscount
            response.estimatedTotalCost = found[0].estimatedTotalCost
            response.choosePaymentMethods = found[0].choosePaymentMethods
            response.createdAt = found[0].createdAt
                      helper.successResponseWithData(res,"Orders Details Found Successfully!",response)
         }
         else{
             helper.notFoundResponseWithNoData(res,"No Orders Found!")
         }
            }
        
      }
      catch(err){
          helper.ErrorResponseWithoutData(res,err.message)
      }
    }
]

exports.updateBookingStatus =[
    body("orderId").exists().notEmpty().withMessage("Order Id Is required!"),
    body("status").exists().notEmpty().withMessage("Status Is required!")
    ,async(req,res)=>{
      try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
           helper.validationErrorWithData(res, "Validation Error", errors.array());
        }
        else{
          let updated = await ORDERTABLE.findByIdAndUpdate({'_id':ObjectId(req.body.orderId),'providerId':req.userData._id},
         { $set:{status:parseInt(req.body.status)}}
          ,{new:true}
        )
         if(!empty(updated)){
            helper.successResponseWithData(res,"Order Status updated Successfully!",updated)
             console.log(updated)
             var customer = await USERTABLE.findOne({"_id":updated.customerId})
            if(req.body.status == 7 && updated.status == 7)
            {
              if(updated.choosePaymentMethods == '1'){
            	const paymentIntent = await stripe.paymentIntents.cancel(
                                   updated.paymentIntentId
              );
            }
              // message email body
                let message = `Hey!, Your order with order ID ${updated.orderId} is cancelled by service provider due to some reason.<br>Your amount will be refunded in your original payment account in 7 to 10 days.<br>Kindly Use services of other service providers.<br>Thank You!`;
                // Send confirmation email
                mailer.sendOrderUpdate( 
                            customer.emailId,
                            message,
                            customer.name
                        ).then(success=>{
                             console.log("Order Canceled Email Sent!")
                        }).catch(error=>{
                            console.log(error)
                        });
            }else if(req.body.status == 1 && updated.status == 1)
            {
              // message email body
                let message = `Hey!, Your order request with order ID ${updated.orderId} is accepted b service provider.<br>Your car will be washed soon.<br>You can track your order status from order detail page.<br>Thank You!`;
                // Send confirmation email
                mailer.sendOrderUpdate( 
                            customer.emailId,
                            message,
                            customer.name
                        ).then(success=>{
                             console.log("Order Accepted Email Sent!")
                        }).catch(error=>{
                            console.log(error)
                        });
            }else if(req.body.status == 5 && updated.status == 5)
            {
              if(updated.choosePaymentMethods == '1'){
            	const paymentIntent = await stripe.paymentIntents.capture(
								   updated.paymentIntentId								);
            }
              // message email body
                let message = `Hey!, Your order with order ID ${updated.orderId} is successfully completed by service provider.<br>Hope you will like VALET-IT services.<br>Do not forgot to rate service provider.<br>Thank You!`;
                // Send confirmation email
                mailer.sendOrderUpdate( 
                            customer.emailId,
                            message,
                            customer.name
                        ).then(success=>{
                             console.log("Order Completed Email Sent!")
                        }).catch(error=>{
                            console.log(error)
                        });
            }
            
            //  console.log(customer)
             if(!empty(customer) && customer.pushNotification == 1){
               if(customer.deviceType == 'android')
               {
               	let data = {}
                // console.log(customer)`
                if(updated.status == 1) 
                {
                  data = {
                    title:"VALET-IT",
                    message:"Your Order is confirmed.",
                    deviceType:"android",
                    notificationType:"updateCarWashOrderStatus",
                    orderId:updated._id.toString()
                  }
                }else if(updated.status == 2){
                 data = {
                   title:"VALET-IT",
                   message:"Vehicle Picked Up.",
                   deviceType:"android",
                   notificationType:"updateCarWashOrderStatus",
                   orderId:updated._id.toString()
                 }
                }else if(updated.status == 3){
                   data = {
                    title:"VALET-IT",
                    message:"Your vehicle is in washing.",
                    deviceType:"android",
                    notificationType:"updateCarWashOrderStatus",
                    orderId:updated._id.toString()
                  }
                 }else if(updated.status == 4){
                   data = {
                    title:"VALET-IT",
                    message:"Your order is out for delivery.",
                    deviceType:"android",
                    notificationType:"updateCarWashOrderStatus",
                    orderId:updated._id.toString()
                  }
                 }else if(updated.status == 5){
                   data = {
                    title:"VALET-IT",
                    message:"Your order is successfully completed. Please visit again!",
                    deviceType:"android",
                    notificationType:"updateCarWashOrderStatus",
                    orderId:updated._id.toString()
                  }
                 }else if(updated.status == 7){
                   data = {
                    title:"VALET-IT",
                    message:"Sorry! ,Your order is cancelled by Service Provider.",
                    deviceType:"android",
                    notificationType:"updateCarWashOrderStatus",
                    orderId:updated._id.toString()
                  }
                 }
                 let token = customer.deviceToken
                 utility.sendFCMNotificationToAndroid(data,token)
               }else if(customer.deviceType == 'ios')
               {
               	let data = {}
               	let notification = {}
                // console.log(customer)`
                if(updated.status == 1) 
                {
                  data = {
                    title:"VALET-IT",
                    message:"Your Order is confirmed.",
                    deviceType:"ios",
                    notificationType:"updateCarWashOrderStatus",
                    orderId:updated._id.toString()
                  }
                  notification = {
                    title:"VALET-IT",
                    body:"Your Order is confirmed."
                     }
                }else if(updated.status == 2){
                 data = {
                   title:"VALET-IT",
                   message:"Vehicle Picked Up.",
                   deviceType:"ios",
                   notificationType:"updateCarWashOrderStatus",
                   orderId:updated._id.toString()
                 }
                 notification = {
                    title:"VALET-IT",
                    body:"Vehicle Picked Up."
                     }
                }else if(updated.status == 3){
                   data = {
                    title:"VALET-IT",
                    message:"Your vehicle is in washing.",
                    deviceType:"ios",
                    notificationType:"updateCarWashOrderStatus",
                    orderId:updated._id.toString()
                  }
                  notification = {
                    title:"VALET-IT",
                    body:"Your vehicle is in washing."
                     }
                 }else if(updated.status == 4){
                   data = {
                    title:"VALET-IT",
                    message:"Your order is out for delivery.",
                    deviceType:"ios",
                    notificationType:"updateCarWashOrderStatus",
                    orderId:updated._id.toString()
                  }
                  notification = {
                    title:"VALET-IT",
                    body:"Your order is out for delivery."
                     }
                 }else if(updated.status == 5){
                   data = {
                    title:"VALET-IT",
                    message:"Your order is successfully completed. Please visit again!",
                    deviceType:"ios",
                    notificationType:"updateCarWashOrderStatus",
                    orderId:updated._id.toString()
                  }
                  notification = {
                    title:"VALET-IT",
                    body:"Your order is successfully completed. Please visit again!"
                     }
                 }else if(updated.status == 7){
                   data = {
                    title:"VALET-IT",
                    message:"Sorry! ,Your order is cancelled by Service Provider.",
                    deviceType:"ios",
                    notificationType:"updateCarWashOrderStatus",
                    orderId:updated._id.toString()
                  }
                  notification = {
                    title:"VALET-IT",
                    body:"Sorry! ,Your order is cancelled by Service Provider."
                     }
                 }
                 let token = customer.deviceToken
                 utility.sendFCMNotificationToIOS(notification,data,token)
               }
               
             }
         }
         else{
             helper.notFoundResponseWithNoData(res,"No Orders Found!")
         }
            }
        
      }
      catch(err){
      	console.log(err)
          helper.ErrorResponseWithoutData(res,err.message)
      }
    }
]

exports.updateItemBookingStatus =[
    body("orderId").exists().notEmpty().withMessage("Order Id Is required!"),
    body("status").exists().notEmpty().withMessage("Status Is required!")
    ,async(req,res)=>{
      try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
           helper.validationErrorWithData(res, "Validation Error", errors.array());
        }
        else{
          let updated = await SELLINGORDERTABLE.findByIdAndUpdate({'_id':ObjectId(req.body.orderId)},
         { $set:{status:parseInt(req.body.status)}}
          ,{new:true}
        )
         if(!empty(updated)){
            helper.successResponseWithData(res,"Orders Status updated Successfully!",updated)
            var customer = await USERTABLE.findOne({"_id":updated.customerId})
            if(req.body.status == 5 && updated.status == 5)
            {
              if(updated.choosePaymentMethods == '1'){
            	const paymentIntent = await stripe.paymentIntents.cancel(
                                   updated.paymentIntentId
              );
            }
              // message email body
                let message = `Hey!, Your order with order ID ${updated.orderId} is cancelled due to some reason.<br>Your amount will be refunded in your original payment account in 7 to 10 days.<br>Kindly visit again.<br>Thank You!`;
                // Send confirmation email
                mailer.sendOrderUpdate( 
                            customer.emailId,
                            message,
                            customer.name
                        ).then(success=>{
                             console.log("Order Canceled Email Sent!")
                        }).catch(error=>{
                            console.log(error)
                        });
            }else if(req.body.status == 1 && updated.status == 1)
            {
              // message email body
                let message = `Hey!, Your order request with order ID ${updated.orderId} is accepted.<br>Item will be delivered soon.<br>You can track your order status from order detail page.<br>Thank You!`;
                // Send confirmation email
                mailer.sendOrderUpdate( 
                            customer.emailId,
                            message,
                            customer.name
                        ).then(success=>{
                             console.log("Order Accepted Email Sent!")
                        }).catch(error=>{
                            console.log(error)
                        });
            }else if(req.body.status == 3 && updated.status == 3)
            {
              if(updated.choosePaymentMethods == '1'){
              const paymentIntent = await stripe.paymentIntents.capture(
                   updated.paymentIntentId                );
            }
              // message email body
                let message = `Hey!, Your order with order ID ${updated.orderId} is successfully delivered.<br>Hope you have liked VALET-IT services.<br>Do not forgot to rate item.<br>Thank You!`;
                // Send confirmation email
                mailer.sendOrderUpdate( 
                            customer.emailId,
                            message,
                            customer.name
                        ).then(success=>{
                             console.log("Order Completed Email Sent!")
                        }).catch(error=>{
                            console.log(error)
                        });
            }
            
            //  console.log(customer)
             if(!empty(customer) && customer.pushNotification == 1){
               if(customer.deviceType == 'android')
               {
               	let data = {}
                if(updated.status == 1) 
                {
                  data = {
                    title:"VALET-IT",
                    message:"Your order is confirmed.",
                    deviceType:"android",
                    notificationType:"updateSellingOrderStatus",
                    orderId:updated._id.toString()
                  }
                }else if(updated.status == 2){
                 data = {
                   title:"VALET-IT",
                   message:"Your order is Out for delivery.",
                   deviceType:"android",
                   notificationType:"updateSellingOrderStatus",
                   orderId:updated._id.toString()
                 }
                }else if(updated.status == 3){
                  data = {
                    title:"VALET-IT",
                    message:"Order delivered successfully!",
                    deviceType:"android",
                    notificationType:"updateSellingOrderStatus",
                    orderId:updated._id.toString()
                  }
                 }else if(updated.status == 5){
                  data = {
                    title:"VALET-IT",
                    message:"Sorry!, Your order is canceled.",
                    deviceType:"android",
                    notificationType:"updateSellingOrderStatus",
                    orderId:updated._id.toString()
                  }
                 }
                 
                 let token = customer.deviceToken
                 utility.sendFCMNotificationToAndroid(data,token)
               }else if(customer.deviceType == 'ios')
               {
               	let data = {}
               	let notification = {}
                if(updated.status == 1) 
                {
                  data = {
                    title:"VALET-IT",
                    message:"Your order is confirmed.",
                    deviceType:"ios",
                    notificationType:"updateSellingOrderStatus",
                    orderId:updated._id.toString()
                  }
                  notification = {
                    title:"VALET-IT",
                    body:"Your order is confirmed."
                     }
                }else if(updated.status == 2){
                 data = {
                   title:"VALET-IT",
                   message:"Your order is Out for delivery.",
                   deviceType:"ios",
                   notificationType:"updateSellingOrderStatus",
                   orderId:updated._id.toString()
                 }
                 notification = {
                    title:"VALET-IT",
                    body:"Your order is Out for delivery."
                     }
                }else if(updated.status == 3){
                  data = {
                    title:"VALET-IT",
                    message:"Order delivered successfully!",
                    deviceType:"ios",
                    notificationType:"updateSellingOrderStatus",
                    orderId:updated._id.toString()
                  }
                  notification = {
                    title:"VALET-IT",
                    body:"Order delivered successfully!"
                     }
                 }else if(updated.status == 5){
                  data = {
                    title:"VALET-IT",
                    message:"Sorry!, Your order is canceled.",
                    deviceType:"ios",
                    notificationType:"updateSellingOrderStatus",
                    orderId:updated._id.toString()
                  }
                  notification = {
                    title:"VALET-IT",
                    body:"Sorry!, Your order is canceled."
                     }
                 }
                 
                 let token = customer.deviceToken
                 utility.sendFCMNotificationToIOS(notification,data,token)
               }
               
             }
         }
         else{
             helper.notFoundResponseWithNoData(res,"No Orders Found!")
         }
            }
        
      }
      catch(err){
          helper.ErrorResponseWithoutData(res,err.message)
      }
    }
]

exports.viewReviews = async(req,res)=>{
    try{
       let found = await ORDERTABLE.aggregate([
         {$match:{'providerId':ObjectId(req.userData._id)}},
         {
          $lookup:
            {
              from: "users",
              localField: "customerId",
              foreignField: "_id",
              as: "customerDetails"
            }
       },
           { $unwind: { path: "$customerDetails" } },
       {
        $project:{evaluation:1, 'name':'$customerDetails.name',
        'image':{ 
          $cond: { if: {
            $eq: ["$customerDetails.image",""] },
         then: "",
         else: { $concat: ["https://velatedocuments.s3.eu-west-2.amazonaws.com/image/", "$customerDetails.image"] } }
        },
      
      }
    },
       ])
       if(found.length>0){
        helper.successResponseWithData(res,"SuccessFully found Rating and Reviews of Customers!",found)
       }
       else{
                helper.successResponseWithData(res," There is No Ratings and Reviews!")
       }
    }
    catch(err){
      helper.ErrorResponseWithoutData(res,err.message)
    }
}
exports.addItem=[
 
  body("itemName").trim().exists().notEmpty().withMessage("Item Name is required!"),
  body("unitPrice").trim().exists().notEmpty().withMessage(" Unit Price is required!"),
  body("description").trim().exists().notEmpty().withMessage("Description is required!"),
 
  async(req,res)=>{
      try{       
         console.log(req.files)
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
           helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }
        else{
        if(!empty(req.files) && req.files.length <= 3)
          {  
            var itemPics = [];
            var count = 0;
           for(let i=0; i<req.files.length;i++)
           {
              count++;
              for(let j=0; j<req.files.length;j++)
              {
              if(req.files[j].fieldname == 'itemImages['+i+']')
                {                  
                 let uploaded = await utility.uploadFile(req.files[j].destination,req.files[j].filename,req.files[j].mimetype,config.S3_BUCKET_NAME+ "itemImages")
                    if(uploaded  &&  uploaded.data)
                    {
                      let filename = uploaded.data.split('/');
                      var image = filename[4];
                      itemPics.push(image)
                    }  
                }
              }
           }
        if(count == req.files.length){
          let sellingItem = await SELLINGITEMTABLE.create({
            itemName:req.body.itemName,
            unitPrice:req.body.unitPrice,
            discountPrice:req.body.discountPrice?req.body.discountPrice:0,
            description:req.body.description,
            itemImages: itemPics
          }).then(sellingItem=>{
            let tmpItemImages = []
            for(let itemImage of sellingItem.itemImages)
            {
              itemImage =  "https://velatedocuments.s3.eu-west-2.amazonaws.com/itemImages/" + itemImage
              tmpItemImages.push(itemImage)
            }
            let response = {
            _id:sellingItem._id,
            itemName:sellingItem.itemName,
            unitPrice:sellingItem.unitPrice,
            discountPrice:sellingItem.discountPrice,
            description:sellingItem.description,
            itemImages: tmpItemImages,
            status:sellingItem.status
          }
            helper.successResponseWithData(res,"Item Added Successfully!",response)
          }).catch(err=>{
            console.log("Add item Error",err)
                helper.ErrorResponseWithoutData(res,"Some Problem Occurred During adding new Item")
            })
              }
          else{
             helper.ErrorResponseWithoutData(res,"Some Problem Occurred During Adding Items!")
            }
      
          }
          else
          {
            helper.ErrorResponseWithoutData(res,"You have to add minimum 1 Image and maximum 3 Images!")
          }
        }
      }
   catch(err){
     console.log(err)
       helper.ErrorResponseWithoutData(res,err.message)
   }
  }
]

exports.itemSummary=[
  body("itemId").trim().exists().notEmpty().withMessage("Item ID is required!"),
  async(req,res)=>{
      try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
           helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }
        else{
          
          let found = await SELLINGITEMTABLE.aggregate(
            [
              {$match:{'_id':ObjectId(req.body.itemId)}},
               { $project:
                  { itemImages:
                     {
                       $map:
                          {
                            input: "$itemImages",
                            as: "items",
                            in: {$concat: ["https://velatedocuments.s3.eu-west-2.amazonaws.com/itemImages/","$$items"]}
                          }
                     },
                     discountPrice:1,
                  unitPrice:1,
                  description:1,
                  itemName:1
                  },
                  
               }
            ]
         )
         if(found.length>0){
       
           helper.successResponseWithData(res,"Item Summary as Follows!",found[0])
         }
         else{
            helper.notFoundResponseWithNoData(res,"This item not Found!")
         }
         
          }
      }
   catch(err){
       helper.ErrorResponseWithoutData(res,err.message)
   }
  }
]

exports.sellingItemListing = async(req,res)=>{
  try{
      let page = 1;
      if(req.body.page)
      {
          page= parseInt(req.body.page);
      }

      let resPerPage =10;
      if(req.body.resPerPage)
      {
          resPerPage= parseInt(req.body.resPerPage);
      }
      let skip = (resPerPage * page) - resPerPage;
      let found = await SELLINGITEMTABLE.aggregate(
            [
              {
                $sort:{
                  createdAt:-1
                }
              },
               { $project:
                  { itemImages:  
                     {
                       $map:
                          {
                            input: "$itemImages",
                            as: "items",
                            in: {$concat: ["https://velatedocuments.s3.eu-west-2.amazonaws.com/itemImages/","$$items"]}
                          }
                     },
                     discountPrice:1,
                  unitPrice:1,
                  description:1,
                  itemName:1 ,
                  status:1
                  },
                  
               },
               {$skip:skip},
               {$limit:resPerPage}
            ]
         )
         if(found.length>0){
       
           helper.successResponseWithData(res,"Items Listing as Follows!",found)
         }
         else{
            helper.notFoundResponseWithNoData(res,"No items Added For Sell First Add..!")
         }
  }
  catch(err){
    helper.ErrorResponseWithoutData(res,err.message)
}
}

exports.deleteItem = [
  body("itemId").trim().exists().notEmpty().withMessage("Item ID is required!"),
 
  async(req,res)=>{
      try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
           helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }
        else{
          let found = await SELLINGITEMTABLE.findOne({'_id':req.body.itemId})
          if(found){
            var picsToDelete = found.itemImages
            let update = await SELLINGITEMTABLE.deleteOne({          
              '_id':ObjectId(req.body.itemId) ,                  
            })        
                              
  if(update.n){
         
        helper.successResponseWithNoData(res,"Item Deleted Succesfully!")
  
        for(const pic of picsToDelete) {
          utility.deleteS3File(pic,config.S3_BUCKET_NAME+"itemImages");  
          }
  
        }
        else{
          helper.notFoundResponseWithNoData(res,"Not Found it Might be Already Deleted!")
        }
          }
          else{
            helper.notFoundResponseWithNoData(res,"Not Found it Might be Already Deleted!")
          }
         
    }
  }
   catch(err){
       helper.ErrorResponseWithoutData(res,err.message)
   }
  }
]

exports.itemStatus = [
  body("itemId").trim().exists().notEmpty().withMessage("Item ID is required!"),
 
  async(req,res)=>{
      try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
           helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }
        else{
          let update = await SELLINGITEMTABLE.findOneAndUpdate({
            '_id':req.body.itemId          
          },
          {$set:
            {
             "status": req.body.status
            }
          },
            {  new: true        
            }
            )
       if(update)
       {
        helper.successResponseWithData(res,"Item Status has changed Successfully.",update)
       }else
       {
        helper.notFoundResponseWithNoData(res,"Item ID Not Found!")
       }
         
    }
  }
   catch(err){
       helper.ErrorResponseWithoutData(res,err.message)
   }
  }
]
exports.editItem =[
  body("itemId").trim().exists().notEmpty().withMessage("Item ID is required!"),
    async(req,res)=>{
      try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
           helper.validationErrorWithData(res, "Validation Error", errors.array());
        }
        else{
          console.log("chk",req.files,req.body.deleteImages)
          var dataToUpdate = {}
          var deleteImg = []
          if(!empty(req.body.deleteImages))
          {
            deleteImg = req.body.deleteImages
          }
          const its = ["itemName","unitPrice","discountPrice","description"];      
                for (let iterator of its)
                {  //iterating object 'its'             
                  if (req.body[iterator])
                    {
                      dataToUpdate[iterator] = req.body[iterator];  
                    }                    
                }
          if(!empty(req.files)){
            var count = 0;
            var itemPics = [];
          
            var toadd = req.files.newItemImages

            for(let i=0; i<req.files.length;i++)
           {
            for(let j=0; j<req.files.length;j++)
            {
            count++;
              if(req.files[j].fieldname == 'newItemImages['+i+']')
                {                  
                 let uploaded = await utility.uploadFile(req.files[j].destination,req.files[j].filename,req.files[j].mimetype,config.S3_BUCKET_NAME+ "itemImages")
                    if(uploaded  &&  uploaded.data)
                    {
                      let filename = uploaded.data.split('/');
                      var image = filename[4];
                      itemPics.push(image)
                    }  
                }
              }
           }  
          let update = await SELLINGITEMTABLE.findOneAndUpdate({
            '_id':ObjectId(req.body.itemId)          
          },
          
          {
            $push: { itemImages: itemPics},
            $set: dataToUpdate
            
          },   
            {  new: true          
            }
            )
          console.log(update)
       if(update)
       {
        let deleted = await SELLINGITEMTABLE.findOneAndUpdate({
            '_id':ObjectId(req.body.itemId)          
          },
          
          {
            $pull:{itemImages:{ $in: deleteImg}},
            $set: dataToUpdate
            
          },   
            {  new: true          
            }
            )
        if(deleted){
           let tmpItemImages = []
            for(let itemImage of deleted.itemImages)
            {
              itemImage =  "https://velatedocuments.s3.eu-west-2.amazonaws.com/itemImages/" + itemImage
              tmpItemImages.push(itemImage)
            }
            let response = {
            _id:deleted._id,
            itemName:deleted.itemName,
            unitPrice:deleted.unitPrice,
            discountPrice:deleted.discountPrice,
            description:deleted.description,
            itemImages: tmpItemImages,
            status:deleted.status
          }
            helper.successResponseWithData(res,"Item Added Successfully!",response)
        for(const pic of deleteImg) {
          utility.deleteS3File(pic,config.S3_BUCKET_NAME+"itemImages");  
          }
        }
        else{
        helper.notFoundResponseWithNoData(res,"Item ID Not Found!")
        }
       }else
       {
        helper.notFoundResponseWithNoData(res,"Item ID Not Found!")
       }
      }else
      {

        let deleted = await SELLINGITEMTABLE.findOneAndUpdate({
            '_id':ObjectId(req.body.itemId)          
          },
          
          {
            $pull:{itemImages:{ $in: deleteImg}},
            $set: dataToUpdate
            
          },   
            {  new: true          
            }
            )
        if(deleted){
           let tmpItemImages = []
            for(let itemImage of deleted.itemImages)
            {
              itemImage =  "https://velatedocuments.s3.eu-west-2.amazonaws.com/itemImages/" + itemImage
              tmpItemImages.push(itemImage)
            }
            let response = {
            _id:deleted._id,
            itemName:deleted.itemName,
            unitPrice:deleted.unitPrice,
            discountPrice:deleted.discountPrice,
            description:deleted.description,
            itemImages: tmpItemImages,
            status:deleted.status
          }
            helper.successResponseWithData(res,"Item Added Successfully!",response)
        for(const pic of deleteImg) {
          utility.deleteS3File(pic,config.S3_BUCKET_NAME+"itemImages");  
          }
        }
      }
    }
 }
   catch(err){
       helper.ErrorResponseWithoutData(res,err.message)
   }
  }
]