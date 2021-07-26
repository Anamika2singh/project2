const PROVIDERTABLE = require('../../models/provider');
const ORDERTABLE = require('../../models/order');
const SUBSCRIPTIONTABLE = require('../../models/subscription');
var empty = require('is-empty'); 
const moment = require('moment');
const helper = require('../../helpers/apiResponse')
const utility = require('../../helpers/utility')
const mongoose = require('mongoose');
let ObjectId= mongoose.Types.ObjectId
const { body,validationResult } = require("express-validator");

exports.dashboard = async(req,res)=>{
  try{
    let dashboardData = await PROVIDERTABLE.aggregate([
       {$match:{'_id':ObjectId(req.userData._id)}},
       {
        $lookup: {
          from: "orders",
          'let': {provider: "$_id" },
          pipeline: [
            {
              $match:{
                $expr:{
                 $and:[
                   {$eq:["$providerId","$$provider"]},
                   {$eq:["$status",5]}] 
            }
           }
            },
            {
             $group:
               {
                 _id: "$providerId",
                 totalEarnings: {$sum:"$estimatedTotalCost"},
               }
           }
         ],
          as: "totalEarnings"
        }
     },
     {
        $lookup: {
          from: "orders",
          'let': {provider: "$_id" },
          pipeline: [
            {
              $match:{
                $expr:{
                 $and:[
                   {$eq:["$providerId","$$provider"]},
                   {$gt:["$evaluation.rating",0]}] 
            }
           }
            },
            {
             $group:
               {
                 _id: "$providerId",
                 rating: { $avg: "$evaluation.rating" }
               }
           }
         ],
          as: "rating"
        }
     },
     { $unwind: { path: "$rating", preserveNullAndEmptyArrays: true } },
     { $unwind: { path: "$totalEarnings", preserveNullAndEmptyArrays: true } },
     {
      $project:{
      	rating:{$ifNull: ["$rating.rating", 0] },
      	totalEarning:{$ifNull: ["$totalEarnings.totalEarnings", 0] },
      	isOnline:1,
      	permissionForSell:1,
      	_id:0
      }
    }
  
    ])
     if(dashboardData){ 
        console.log(dashboardData)
       helper.successResponseWithData(res,"Dashboard Data found SuccessFully!",dashboardData[0])
    }
    else{
      helper.notFoundResponse(res,"No Orders Found!")
    }
  }
  catch(err){
    console.log(err)
    return helper.ErrorResponseWithoutData(res, err.message);

   }
  }


  exports.updateOnlineStatus =[
    body("status").exists().notEmpty().withMessage("Status Is required!"),
    async(req,res)=>{
      try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
           helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }
        else{
            let update = await PROVIDERTABLE.findByIdAndUpdate({'_id':req.userData._id},{
                  $set:{
                    isOnline:parseInt(req.body.status)
                  }
                },
                  {new:true})  
         if(!empty(update)){
         	if(update.isOnline == 0)
           helper.successResponseWithData(res,"You are now offline!",{isOnline:0})
       else
       	helper.successResponseWithData(res,"You are now online!",{isOnline:1})
         }
         else{
             helper.ErrorResponseWithoutData(res,"Something Went Wrong!")
         }
            }
        
      }
      catch(err){
          helper.ErrorResponseWithoutData(res,err.message)
      }
    }
]


exports.dashboardUpcomingOrder = async(req,res)=>{
  try{
      var dashboardData = {};
      let newOrders = await ORDERTABLE.aggregate([
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
          $sort:{createdAt:-1}
        }
        ])
        dashboardData.newOrders = newOrders;
 var firstDate = moment().toISOString().split("T")[0]
 var secondDate = moment().add(1, 'days').toISOString().split("T")[0]
 var thirdDate = moment().add(2, 'days').toISOString().split("T")[0]
 var fourthDate = moment().add(3, 'days').toISOString().split("T")[0]
 let todayOrders = await ORDERTABLE.find({'providerId':req.userData._id,'deliveryDate':{"$gte": new Date(firstDate),"$lt": new Date(secondDate)},'status':{"$gte": 0,"$lte": 4}}).countDocuments()
 let tomorrowOrders = await ORDERTABLE.find({'providerId':req.userData._id,'deliveryDate':{"$gte": new Date(secondDate),"$lt": new Date(thirdDate)},'status':{"$gte": 0,"$lte": 4}}).countDocuments()
 let dayAfterTomorrowOrders = await ORDERTABLE.find({'providerId':req.userData._id,'deliveryDate':{"$gte": new Date(thirdDate),"$lt": new Date(fourthDate)},'status':{"$gte": 0,"$lte": 4}}).countDocuments()

  dashboardData.todayOrders = todayOrders
  dashboardData.tomorrowOrders= tomorrowOrders;
  dashboardData.dayAfterTomorrowOrders= dayAfterTomorrowOrders;

  let providerDetail = await PROVIDERTABLE.findOne({'_id':req.userData._id})
  if(!empty(providerDetail))
  {
    dashboardData.isPremium = providerDetail.isPremium
  }else
  {
    dashboardData.isPremium = 0
  }
  if(providerDetail.isPremium >= 1 && providerDetail.isPremium<= 3)
  {
  let subscriptionData = await SUBSCRIPTIONTABLE.findOne({'userId':req.userData._id,'userType':"serviceProvider"}).sort( { "purchaseDate": -1 } )
  console.log(subscriptionData)
  if(!empty(subscriptionData))
    dashboardData.expiryDate = moment(subscriptionData.expiryDate).format("DD/MM/YYYY")
  else
    dashboardData.expiryDate = ""
  }else
  {
    dashboardData.expiryDate = ""
  }
 
 if(dashboardData){ 
    // console.log(dashboardData)
   helper.successResponseWithData(res,"Dashboard Data found SuccessFully!",dashboardData)
    }
    else{
      helper.notFoundResponse(res,"No Orders Found!")
    }
  }
  catch(err){
    console.log(err)
    return helper.ErrorResponseWithoutData(res, err.message);

   }
  }