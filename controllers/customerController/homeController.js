const config = require('../../config/app')
const express = require('express')
const app = express()
const { body,validationResult } = require("express-validator");
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const helper = require('../../helpers/apiResponse')
const utility = require('../../helpers/utility')
const USERTABLE = require('../../models/user');
const PROVIDERTABLE = require('../../models/provider');
const ORDERTABLE = require('../../models/order');
const PROMOCODE = require('../../models/promoCode')
const SELLINGITEMTABLE = require('../../models/sellingItem')
const SELLINGORDERTABLE = require('../../models/sellingOrder')
const ADMINTABLE = require('../../models/admin')
const stripe = require('stripe')(config.STRIPE_KEY);
let saltRounds = 10;
var empty = require('is-empty'); 
const mongoose = require('mongoose');
const mailer = require("../../helpers/mailer");
let ObjectId = mongoose.Types.ObjectId


/**
 * Mark Favorite.
 *
 * @method POST
 * @param {string}      type
 * @param {string}      providerId
 *
 * @returns {Object}
 */


exports.addFavoritesProviders= [
 body("type").exists().notEmpty().withMessage("Type is required"),//0 for unfav and 1 for  to add as a favourites 
 body('providerId').trim().exists().notEmpty().withMessage("Provider Id is required"),
   async(req,res)=>{
       try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
           helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }
        else{ 
            var userId = req.userData._id
           var checkType= parseInt(req.body.type) // 0 for unfavorite and 1 for favourite
         
           if(checkType){ //if provider is favourite
              
        let update = await USERTABLE.findByIdAndUpdate(
        { _id: userId },
        { $addToSet: {favProviders:req.body.providerId}}
         ,{new:true}
         );

        if(update){       
        helper.successResponseWithData(res,"Successfully set Favourite Provider",{fav:1})

        }else{
        helper.ErrorResponseWithoutData(res,"Problem Occured During Adding favorite provider!")
        }

        }
        else{ //if provider is unfavourite                    
    
            let update = await USERTABLE.findByIdAndUpdate(
            { _id: userId },
            { $pull:{favProviders:req.body.providerId}}
              ,{new:true}
            );
           
            if(update){
                    helper.successResponseWithData(res,"Successfully set Unfavorite Provider!",{fav:0})
              
            }else{
               
            helper.ErrorResponseWithoutData(res,"Some problem Occurred During Unfavorite")
            }
        }
        }
       }
       catch(err){
        helper.ErrorResponseWithoutData(res,err.message)
       }
   }
]


/**
 * List all favorite service providers.
 *
 * @method POST
 * @param {string}      lat
 * @param {string}      long
 *
 * @returns [Array]
 */


exports.favoriteListing =[
 body("lat").exists().notEmpty().withMessage("Lat is required"),
 body('long').exists().notEmpty().withMessage("Long is required"),
async(req,res)=>{
  try{
   const errors = validationResult(req);
           if (!errors.isEmpty()) {
              helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
           }
           else{ 
            var date = new Date();
           var currentMonth = date.getMonth() + 1
           var currentYear = date.getFullYear();
           console.log(currentMonth,currentYear)
let result = await USERTABLE.aggregate([
    {$match:{"_id":ObjectId(req.userData._id)}},
      {
        $lookup: {
        from: "providers",
        'let': {favId: "$favProviders" },
        pipeline: [
          {
             $geoNear: {
                near: { type: "Point", coordinates: [ parseFloat(req.body.long) , parseFloat(req.body.lat) ] },
                distanceField: "distance",
                distanceMultiplier: 1 / 1000,
                spherical: true
             }
           },
          {
            $match:
            {
              $expr:
                { $in : ["$_id","$$favId"] } 
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
                                $eq:["$providerId","$$provider"] 
                          }
                         }
                          },
                          {
                           $project:{
                            month:{$month:"$createdAt"},
                            year:{$year:"$createdAt"}
                           }
                          },
                          {
                            $match:{
                                month:currentMonth,
                                year:currentYear
                            }
                          }
                       ],
                        as: "orderLimitArray"
                      }
                   },
                   {
                    $addFields:{
                        isOrderLimitReached:{
                            "$cond": [
                                      {$and:[
                                      {"$gte": ["$isPremium", 1]},
                                      {"$lte": ["$isPremium", 3]}
                                      ]}, 
                                 0,
                                 { "$cond": [
                                   {"$lt": [ {$size: "$orderLimitArray"}, 2]},
                                   0, 
                                   1
                                 ]}
                              ]
                        },
                        isProfileCompleted:{
                            "$cond": [
                                      {"$eq": [{$size: "$services"}, 0]}, 
                                 0,
                                 1
                              ]
                        },
                        isInsideRange:{
                            "$cond": [
                                      {$lte: ["$distance","$serviceRadius"]}, 
                                 1,
                                 0
                              ]
                        }
                    }
                   },
                {
                  $project:{isOnline:1,isProfileCompleted:1,isInsideRange:1,isOrderLimitReached:1,name:1,profile:1,distance:1,services:1,deliveryOption:1,serviceType:1,businessName:1,businessAddress:1,bio:1,createdAt:1,lat:1,long:1}
                },
          {$addFields: { profile:{ 
            $cond: { if: {
              $eq: ["$profile",""] },
           then: "",
           else: { $concat: ["https://velatedocuments.s3.eu-west-2.amazonaws.com/profile/", "$profile"] } }}}},
          {$addFields:{"startingPrice":"$services.aboutService.priceOfService"}},
          { $unwind: { path: "$startingPrice", preserveNullAndEmptyArrays: true } },
          {$addFields:{"startingPrice":{$min:"$startingPrice"}}},
          {
                 $group:
                   {
                    _id: "$_id",
                     minimumPrice: { $min: "$startingPrice" },
                     "data" : {"$first" : "$$ROOT"}
                   }
               },
               {"$project" : {
                          "_id" : "$data._id",
                          "name" : "$data.name",
                          "profile" : "$data.profile",
                          "distance" : "$data.distance",
                          "minimumPrice":"$minimumPrice",
                          "serviceType":"$data.serviceType",
                          "businessName":"$data.businessName",
                          "businessAddress":"$data.businessAddress",
                          "bio":"$data.bio",
                          "deliveryOption":"$data.deliveryOption",
                          "createdAt":"$data.createdAt",
                          "isOnline":"$data.isOnline",
                          "isProfileCompleted":"$data.isProfileCompleted",
                          "isInsideRange":"$data.isInsideRange",
                          "isOrderLimitReached":"$data.isOrderLimitReached",
                          "lat":"$data.lat",
                          "long":"$data.long"
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
                        as: "result"
                      }
                   },
               {
                $addFields:{rating:"$result.rating"}
               },
               {
               $addFields:{
                "rating": {
                    $cond: { if: {
                        $gt: [{$size: "$rating"}, 0] },
                     then: "$rating",
                     else: [0]
                        }     
                    }
                }
            },
               { $unwind: { path: "$rating", preserveNullAndEmptyArrays: true } },
               {
                $project:{result:0}
               },
               {
               $addFields:{
                "fav": 1
                }
            }
       ],
        as: "favProviders"
      }
    },
    {
      $project:{favProviders:1,_id:0}
    },
    {
            $sort:{distance:1}
          }
          ])
        
                 if(result){               
                  helper.successResponseWithData(res,"SuccessFully Found Favourite Listing",result[0].favProviders)
                 }
                 else{
                     helper.ErrorResponseWithoutData(res,"Something Went Wrong!")
                 }
      }
    }catch(err)
    {
      helper.ErrorResponseWithoutData(res,err.message)
    }
}]



/**
 * Homepage Service Provider Listing.
 *
 * @method POST
 * @param {string}      lat
 * @param {string}      long
 *
 * @returns [Array] */


exports.getProviders=[
    body("lat").exists().notEmpty().withMessage("Lat is required"),
    body('long').exists().notEmpty().withMessage("Long is required"),
      async(req,res)=>{
        try{
           const errors = validationResult(req);
           if (!errors.isEmpty()) {
              helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
           }
           else{ 
           var date = new Date();
           var currentMonth = date.getMonth() + 1
           var currentYear = date.getFullYear();
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
            const long = req.body.long;
            const lat = req.body.lat;
            var sort = {isAvailable:-1 ,distance:1,createdAt:-1}
            var distanceFilter = {}
            var serviceTypeFilter = {}
            var evaluationFilter = {}
            var search = {}
            if(!empty(req.body.sort) && req.body.sort == 1)
            {
              sort ={rating:1}
            }else
            if(!empty(req.body.sort) && req.body.sort == 2)
            {
              sort = {rating:-1}
            }else
            if(!empty(req.body.sort) && req.body.sort == 3)
            {
              sort = {distance:1}
            }
            if(!empty(req.body.sort) && req.body.sort == 4)
            {
              sort = {fav:-1}
            }
            if(!empty(req.body.distanceFilter))
            {
                  distanceFilter = {distance:{$lte:parseInt(req.body.distanceFilter)}}
            }
            if(req.body.serviceTypeFilter)
            {
                 serviceTypeFilter= {serviceType:{$in:req.body.serviceTypeFilter}}
            }
            if(!empty(req.body.evaluationFilter) && req.body.evaluationFilter == 1)
            {
                 evaluationFilter = {rating:{$gte:1,$lt:2}}
            }
            if(!empty(req.body.evaluationFilter) && req.body.evaluationFilter == 2)
            {
                 evaluationFilter = {rating:{$gte:2,$lt:3}}
            }
            if(!empty(req.body.evaluationFilter) && req.body.evaluationFilter == 3)
            {
                 evaluationFilter = {rating:{$gte:3,$lt:4}}
            }
            if(!empty(req.body.evaluationFilter) && req.body.evaluationFilter == 4)
            {
                 evaluationFilter = {rating:{$gte:4,$lt:5}}
            }
            if(!empty(req.body.evaluationFilter) && req.body.evaluationFilter == 5)
            {
                 evaluationFilter = {rating:5}
            }
            if(req.body.search)
            {
                 search = {"businessName":{'$regex' : (req.body.search)?req.body.search:'', '$options' : 'i'}}
            }
            
           let allProvider = await PROVIDERTABLE.aggregate([
                {
                    $geoNear:{
                     near: {type: "Point", coordinates: [parseFloat(long), parseFloat(lat)]},
                     key:"location",
                     distanceField: "distance",// It seems that maxDistance accepts values as meters.
                     maxDistance: 50 * 1000,// So if I want it to accept KM I need to multiply it by 1000.  
                     distanceMultiplier: 1 / 1000,// To output distance as KM the distanceMultiplier has to be 1/1000.
                     spherical: true                                                                                                                                                        
                    }
                },
                {
                  $match:{$and:[distanceFilter,serviceTypeFilter,search
                    // ,{'services.0': {$exists: true}},
                    // {isOnline:1},
                    //  {$expr: {
                    //     $lte: [
                    //       "$distance",
                    //       "$serviceRadius"
                    //     ]
                    //   }}
                    // {"distance":{"$lte":"$serviceRadius"}}
                    ]}
                },
                {
                      $lookup: {
                        from: "orders",
                        'let': {provider: "$_id" },
                        pipeline: [
                          {
                            $match:{
                              $expr:{
                                $eq:["$providerId","$$provider"] 
                          }
                         }
                          },
                          {
                           $project:{
                            month:{$month:"$createdAt"},
                            year:{$year:"$createdAt"}
                           }
                          },
                          {
                            $match:{
                                month:currentMonth,
                                year:currentYear
                            }
                          }
                       ],
                        as: "orderLimitArray"
                      }
                   },
                   {
                    $addFields:{
                        isOrderLimitReached:{
                            "$cond": [
                                      {$and:[
                                      {"$gte": ["$isPremium", 1]},
                                      {"$lte": ["$isPremium", 3]}
                                      ]}, 
                                 0,
                                 { "$cond": [
                                   {"$lt": [ {$size: "$orderLimitArray"}, 2]},
                                   0, 
                                   1
                                 ]}
                              ]
                        },
                        isProfileCompleted:{
                            "$cond": [
                                      {"$eq": [{$size: "$services"}, 0]}, 
                                 0,
                                 1
                              ]
                        },
                        isInsideRange:{
                            "$cond": [
                                      {$lte: ["$distance","$serviceRadius"]}, 
                                 1,
                                 0
                              ]
                        }
                    }
                   },
                {
                  $project:{isOnline:1,isProfileCompleted:1,isInsideRange:1,isOrderLimitReached:1,name:1,profile:1,distance:1,services:1,deliveryOption:1,serviceType:1,businessName:1,businessAddress:1,bio:1,createdAt:1,lat:1,long:1}
                },
                {$addFields: { profile:{ 
                  $cond: { if: {
                    $eq: ["$profile",""] },
                 then: "",
                 else: { $concat: ["https://velatedocuments.s3.eu-west-2.amazonaws.com/profile/", "$profile"] } }}}},
                {$addFields:{"startingPrice":"$services.aboutService.priceOfService"}},
                { $unwind: { path: "$startingPrice", preserveNullAndEmptyArrays: true } },
                {$addFields:{"startingPrice":{$min:"$startingPrice"}}},
                {
                       $group:
                         {
                          _id: "$_id",
                           minimumPrice: { $min: "$startingPrice" },
                           "data" : {"$first" : "$$ROOT"}
                         }
                     },
                     {"$project" : {
                                  "_id" : "$data._id",
                                  "name" : "$data.name",
                                  "profile" : "$data.profile",
                                  "distance" : "$data.distance",
                                  "minimumPrice":"$minimumPrice",
                                  "serviceType":"$data.serviceType",
                                  "businessName":"$data.businessName",
                                  "businessAddress":"$data.businessAddress",
                                  "bio":"$data.bio",
                                  "deliveryOption":"$data.deliveryOption",
                                  "createdAt":"$data.createdAt",
                                  "isOnline":"$data.isOnline",
                                  "isProfileCompleted":"$data.isProfileCompleted",
                                  "isInsideRange":"$data.isInsideRange",
                                  "isOrderLimitReached":"$data.isOrderLimitReached",
                                  "lat":"$data.lat",
                                  "long":"$data.long"                                  }
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
                        as: "result"
                      }
                   },
               {
                $addFields:{rating:"$result.rating"}
               },
               {
               $addFields:{
                "rating": {
                    $cond: { if: {
                        $gt: [{$size: "$rating"}, 0] },
                     then: "$rating",
                     else: [0]
                        }     
                    }
                }
            },
               { $unwind: { path: "$rating", preserveNullAndEmptyArrays: true } },
               {
                $project:{result:0}
               },
               {
                $match:evaluationFilter
               },
               {
                $lookup: {
                  from: "users",
                  'let': {currentLoggedUser : ObjectId(req.userData._id), providerId: "$_id" },
                  pipeline: [
                    {
                      $match:{
                        $expr:{
                      $and : [
                         {$eq:["$_id","$$currentLoggedUser"] },
                          { $in : ["$$providerId","$favProviders"] } 
                      ]
                    }
                }
                    }
                 ],
                  as: "favourites"
                }
              },
              {
               $addFields:{
                "fav": {
                    $cond: { if: {
                        $gt: [{$size: "$favourites"}, 0] },
                     then: 1,
                     else: 0
                        }     
                    },
                  "isAvailable":{
                    $cond: { if: {
                        $and:[{"$eq": ["$isProfileCompleted", 1]},
                              {"$eq": ["$isOnline", 1]},
                              {"$eq": ["$isOrderLimitReached", 0]},
                              {"$eq": ["$isInsideRange", 1]}]},
                     then: 1,
                     else: 0
                        }     
                    },
                }
            },
            {
              $sort:sort
            },
            {$skip:skip},
            {$limit:resPerPage},
            {
              $project:{favourites:0,isAvailable:0}
            }
           ])
       let customerDetail = await USERTABLE.findOne({"_id":req.userData._id}) 
         helper.successResponseWithExtraData(res,"Providers found Successfully!",{isPremium:customerDetail.isPremium},allProvider)
           }
         }
           catch(err){
               console.log(err)
            helper.ErrorResponseWithoutData(res,err.message)
           }
        }
]


exports.getSellingItems = async(req,res)=>{
   try{
     let customerDetail = await USERTABLE.findOne({"_id":req.userData._id})
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
            let sort = {rating:-1}
            if(!empty(req.body.sort) && (req.body.sort == 2))
            {
                if(customerDetail.isPremium == 0)
                sort = {unitPrice:1}
              else
                sort = {discountPrice:1}
            }
            if(!empty(req.body.sort) && (req.body.sort == 3))
            {
              if(customerDetail.isPremium == 0)
                sort = {unitPrice:-1}
              else
                sort = {discountPrice:-1}

            }
            let search = {}
            if(!empty(req.body.search) && req.body.search)
            {
                search = {"itemName":{'$regex' : (req.body.search)?req.body.search:'', '$options' : 'i'}}
            }
  let allProvider = await SELLINGITEMTABLE.aggregate([
    
      {
        $match:{$and:[{'status':1},search]}
      },
     
      {
        $addFields:{
          'itemImages':  
        {
          $map:
             {
               input: "$itemImages",
               as: "items",
               in: {$concat: ["https://velatedocuments.s3.eu-west-2.amazonaws.com/itemImages/","$$items"]}
             }
        }
        }
      },
      {
        $lookup: {
          from: "sellingitemorders",
          'let': {itemId: "$_id" },
          pipeline: [
            {
              $match:{
                $expr:{
              $and : [
                  { $in : ["$$itemId","$cartItems.itemId"] } 
              ]
            }
        }
            },
            {
              $project:{cartItems:1,_id:0}
            },
            {
              $unwind: { path: "$cartItems", preserveNullAndEmptyArrays: true }
            },
            {
              $match:{
                $expr:{
              $and : [
                  { $eq : ["$cartItems.itemId","$$itemId"] },
                  {$gt:["$cartItems.evaluation.rating",0]} 
              ]
            }
        }
            },
            {
             $group:
               {
                 _id: "$cartItems.itemId",
                 rating: { $avg: "$cartItems.evaluation.rating" },
                 ratingCount:{$sum:1}
               }
           }
         ],
          as: "sellingOrder"
        }
      },
      {
        $unwind: { path: "$sellingOrder", preserveNullAndEmptyArrays: true }
      },
      {
        $addFields:{
          rating:{$ifNull: ["$sellingOrder.rating", 0] },
          ratingCount:{$ifNull: ["$sellingOrder.ratingCount", 0] }
        }
       },
       {
        $project:{sellingOrder:0}
       },
      {
        $sort:sort
      },
      {
        $skip:skip
      },
      {
        $limit:resPerPage
      }
  ])
  // console.log(allProvider)
 
  helper.successResponseWithData(res,"Item Listing Found Successfully",allProvider)
}
catch(err){
  console.log(err)
helper.ErrorResponseWithoutData(res,err.message)
}
}

exports.addItemToCart = [
body("itemId").exists().notEmpty().withMessage("Item Id Is required!"),
body("quantity").exists().isInt({ gte: 0 }).withMessage("Item Quantity Is required and must be greater than 0!"),
async(req,res)=>{
try{
const errors = validationResult(req);
if (!errors.isEmpty()) {
helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
}
else{
  let response = {
      itemId:req.body.itemId,
      quantity:req.body.quantity
    }
  if(req.body.quantity == 0)
  {
    let update = await USERTABLE.findByIdAndUpdate({
'_id':req.userData._id,
"cartItems":{"$elemMatch":{"cartItems.itemId":ObjectId(req.body.itemId)}},
},
{
$pull:{
"cartItems":{"itemId":ObjectId(req.body.itemId)}
}
},
{ new: true}
)
if(!empty(update)){
helper.successResponseWithData(res,"Item removed successfully!",response)
}
else{
helper.ErrorResponseWithoutData(res,"Some Problem Occurred During Removing Item From Cart!")
}
  }
  else{
let found = await USERTABLE.findOne({"_id":req.userData._id,
"cartItems":{"$elemMatch":{"itemId":req.body.itemId}}})
if(found){ // Item Id Already Exists

var update = await USERTABLE.findOneAndUpdate({"_id":req.userData._id,
"cartItems":{"$elemMatch":{"itemId":req.body.itemId}}},
{$set:
{
"cartItems.$.quantity":parseInt(req.body.quantity)
}
},
{ new: true} );

if(update){
helper.successResponseWithData(res,"Item Added in Cart Successfully!",response)
}
else{
helper.ErrorResponseWithoutData(res,"Some Problem Occured During Adding Item To the Cart!")
}
}
else{ //when user enters new Item ID

var update = await USERTABLE.findByIdAndUpdate({'_id':ObjectId(req.userData._id)},{
$push:{
"cartItems":{
itemId: ObjectId(req.body.itemId),
quantity:parseInt(req.body.quantity)

}
}
},{new:true})

if(update){


helper.successResponseWithData(res,"Item Added in Cart Successfully!",response)
}
else{
helper.ErrorResponseWithoutData(res,"Some Problem Occured During Adding Item To the Cart!")
}
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

exports.itemDetails = [
body("itemId").exists().notEmpty().withMessage("Item Id Is required!"),

async(req,res)=>{
try{
const errors = validationResult(req);
if (!errors.isEmpty()) {
helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
}
else{
let details = await SELLINGITEMTABLE.aggregate([
{
$match:{'_id':ObjectId(req.body.itemId)}
},
{
$lookup: {
from: "users",
pipeline: [
{
$match:{
$expr:{
  $and:[
   {$eq:["$_id",ObjectId(req.userData._id)]}
]
}
}
},
{$project: {
        cartItems: {$filter: {
            input: '$cartItems',
            as: 'item',
            cond: {$eq: ['$$item.itemId', ObjectId(req.body.itemId)]}
        }},
        '_id':0
    }
     
  }
],
as: "details"
}
},

{ $unwind: { path: "$details" } },
{ $unwind: { path: "$details.cartItems", preserveNullAndEmptyArrays: true } },
{
  $lookup: {
    from: "sellingitemorders",
    'let': {itemId: "$_id" },
    pipeline: [
      {
        $match:{
          $expr:{
        $and : [
            { $in : ["$$itemId","$cartItems.itemId"] } 
        ]
      }
  }
      },
      {
        $project:{cartItems:1,_id:0}
      },
      {
        $unwind: { path: "$cartItems", preserveNullAndEmptyArrays: true }
      },
      {
        $match:{
          $expr:{
        $and : [
            { $eq : ["$cartItems.itemId","$$itemId"] },
            {$gt:["$cartItems.evaluation.rating",0]} 
        ]
      }
  }
      },
      {
       $group:
         {
           _id: "$cartItems.itemId",
           rating: { $avg: "$cartItems.evaluation.rating" },
           ratingCount:{$sum:1}
         }
     }
   ],
    as: "sellingOrder"
  }
},
{
  $unwind: { path: "$sellingOrder", preserveNullAndEmptyArrays: true }
},
{
  $project:{
    itemId:"$_id",
    itemName:"$itemName",
    discountPrice:"$discountPrice",
    unitPrice:"$unitPrice",
    ProviderId:"$ProviderId",
    description:"$description",
    rating:{$ifNull: ["$sellingOrder.rating", 0] },
    ratingCount:{$ifNull: ["$sellingOrder.ratingCount", 0] },
    'itemImages':  
        {
          $map:
             {
               input: "$itemImages",
               as: "items",
               in: {$concat: ["https://velatedocuments.s3.eu-west-2.amazonaws.com/itemImages/","$$items"]}
             }
        },
        quantity:{$ifNull: ["$details.cartItems.quantity", 0] },
        "_id":0
  }
}

])
if(!empty(details))
{
helper.successResponseWithData(res,"Item Details Found Successfully",details[0])
}else
{
 helper.ErrorResponseWithoutData(res,"Item not Found") 
}
}
}
catch(err){
console.log(err)
helper.ErrorResponseWithoutData(res,err.message)
}
}

]


exports.getCartItem = async(req,res)=>{
try{

let itemsdetails = await USERTABLE.aggregate([
{$match:{'_id':ObjectId(req.userData._id)}},
{ $unwind: { path: "$cartItems" } },
{
  $project:{
    itemId:"$cartItems.itemId",
    quantity:"$cartItems.quantity"
  }
},
{
$lookup: {
from: "sellingitems",
'let': {itemId: "$itemId" },
pipeline: [
{
$match:{
$expr:{
  $and:[
{"$eq": [ "$_id", "$$itemId" ]},
{"$eq":["$status",1]}
]
}
}
},
{
  $project:
  {_id:0}
}

],
as: "details"
}
}

,
{ $unwind: { path: "$details" } },
{
$project:{ 
         'itemId':'$itemId',
         'itemName':'$details.itemName',
         'unitPrice':'$details.unitPrice',
         'description':'$details.description',
         'discountPrice':'$details.discountPrice',
         'ProviderId':'$details.ProviderId',
         'status':'$details.status',
         '_id':0,
         'quantity':1,
          'itemImages':
          {
          $map:
          {
          input: "$details.itemImages",
          as: "items",
          in: {$concat: ["https://velatedocuments.s3.eu-west-2.amazonaws.com/itemImages/","$$items"]}
          }
          }
          }
}

])
console.log(itemsdetails)
var response = {}
response.cartItem = itemsdetails
let deliveryFee = await ADMINTABLE.findOne({},{sellingItemDeliveryFee:1})
response.sellingItemDeliveryFee = deliveryFee.sellingItemDeliveryFee
  helper.successResponseWithData(res,"Cart Data Found Successfully",response)

}
catch(err){
console.log(err)
helper.ErrorResponseWithoutData(res,err.message)
}
}

/**
 * See details Of Service Provider
 *
 * @method POST
 * @param {string}      providerId
 *
 * @returns {Object}
 */

exports.viewProvider=[
body('providerId').trim().exists().notEmpty().withMessage("Provider Id is required"),
      async(req,res)=>{
        try{
           const errors = validationResult(req);
           if (!errors.isEmpty()) {
              helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
           }
           else{
            var date = new Date();
           var currentMonth = date.getMonth() + 1
           var currentYear = date.getFullYear();
        let found = await PROVIDERTABLE.aggregate([
                         {
                          $match:{'_id':ObjectId(req.body.providerId)}
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
                               {$gt:["$evaluation.rating",0]}
                               ] 
                          }
                         }
                          },
                          {
                $lookup: {
                  from: "users",
                  'let': {customer: "$customerId" },
                  pipeline: [
                    {
                      $match:{
                        $expr:{
                         $eq:["$_id","$$customer"] 
                    }
                }
                    }
                 ],
                  as: "favourites"
                }
              },
              { $unwind: { path: "$favourites" , preserveNullAndEmptyArrays: true} },
              {
                $addFields:{
                  "name":"$favourites.name",
                  "image":{ 
                              $cond: { if: {
                                $eq: ["$favourites.image",""] },
                             then: "",
                             else: { $concat: ["https://velatedocuments.s3.eu-west-2.amazonaws.com/image/", "$favourites.image"] } }}
                }
              },
              {
                $project:{
                  name:{ $ifNull: [ "$name", "" ] },
                  image:{ $ifNull: [ "$image", "" ] },
                  evaluation:1
                }
              }

                       ],
                        as: "reviews"
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
                                $eq:["$providerId","$$provider"] 
                          }
                         }
                          },
                          {
                           $project:{
                            month:{$month:"$createdAt"},
                            year:{$year:"$createdAt"}
                           }
                          },
                          {
                            $match:{
                                month:currentMonth,
                                year:currentYear
                            }
                          }
                       ],
                        as: "orderLimitArray"
                      }
                   },
                   {
                    $addFields:{
                        isOrderLimitReached:{
                            "$cond": [
                                      {$and:[
                                      {"$gte": ["$isPremium", 1]},
                                      {"$lte": ["$isPremium", 3]}
                                      ]}, 
                                 0,
                                 { "$cond": [
                                   {"$lt": [ {$size: "$orderLimitArray"}, 2]},
                                   0, 
                                   1
                                 ]}
                              ]
                        },
                        isProfileCompleted:{
                            "$cond": [
                                      {"$eq": [{$size: "$services"}, 0]}, 
                                 0,
                                 1
                              ]
                        },
                        isInsideRange:{
                            "$cond": [
                                      {$lte: ["$distance","$serviceRadius"]}, 
                                 1,
                                 0
                              ]
                        },
                        avgRating:{$avg:"$reviews.evaluation.rating"},

                    }
                   },
               {
                $addFields:{
                  avgRating: { $ifNull: [ "$avgRating", 0 ] },
                  galleryPictures: { $ifNull: ["$galleryPictures",[]]}
                }
               },
               {
                          $project:{
                            galleryPictures:
                            {
                               $map:
                                  {
                                    input: "$gallery",
                                    as: "galimg",
                                    in: {$concat: ["https://velatedocuments.s3.eu-west-2.amazonaws.com/gallery/","$$galimg"]}
                                  }
                             },
                             name:1,
                             businessName:1,
                             businessAddress:1,
                             lat:1,
                             long:1,
                             bio:1,
                             isOnline:1,
                             isOrderLimitReached:1,
                             isProfileCompleted:1,
                             isInsideRange:1,
                             avgRating:1,
                             reviews:1,
                             profile:{ 
                              $cond: { if: {
                                $eq: ["$profile",""] },
                             then: "",
                             else: { $concat: ["https://velatedocuments.s3.eu-west-2.amazonaws.com/profile/", "$profile"] } }}
                          }
                         }
          ])
        if(!empty(found)){
            
               helper.successResponseWithData(res,"Provider Profile Found Successfully!",found[0])
        } 
       else{
         helper.unauthorizedResponseWithoutData(res,"Provider Not Found!")
       }
      }
    }
      catch(err){
        helper.ErrorResponseWithoutData(res,err.message)
    }
}]

exports.chooseServices=[
body('providerId').trim().exists().notEmpty().withMessage("Provider Id is required"),
      async(req,res)=>{
        try{
           const errors = validationResult(req);
           if (!errors.isEmpty()) {
              helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
           }
           else{
        let found = await PROVIDERTABLE.aggregate([
                         {
                          $match:{'_id':ObjectId(req.body.providerId)}
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
         helper.unauthorizedResponseWithoutData(res,"Provider Not Found!")
       }
      }
    }
      catch(err){
        helper.ErrorResponseWithoutData(res,err.message)
    }

}]



/**
 * Apply Promocode
 *
 * @method POST
 * @param {string}      promocode
 * @param {string}      subTotal
 *
 * @returns {Object}
 */


exports.applyPromoCode=[
body('promoCode').trim().exists().notEmpty().withMessage("Promo Code is required"),
body('subTotal').trim().exists().notEmpty().withMessage("Sub Total is required"),
      async(req,res)=>{
        try{
           const errors = validationResult(req);
           if (!errors.isEmpty()) {
              helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
           }
           else{
        let found = await PROMOCODE.findOne({"name":req.body.promoCode})
        if(!empty(found)){
          console.log(new Date().toUTCString() ,found.validFrom,found.validFrom.getTime())
               if(!((Date.now() > found.validFrom.getTime()) && (Date.now() < found.validTill.getTime())))
                helper.ErrorResponseWithoutData(res,"Either Promocode is expired or not valid on this time!")
               else if(req.body.subTotal < found.minimumCartValue)
                helper.ErrorResponseWithoutData(res,"Minimum Cart Value should be "+found.minimumCartValue+"!")
              else
               helper.successResponseWithData(res,"Promo Code Applied SuccessFully!",found)
        } 
       else{
         helper.ErrorResponseWithoutData(res,"Invalid Promo Code!")
       }
      }
    }
      catch(err){
        helper.ErrorResponseWithoutData(res,err.message)
    }

}]



exports.getCartData=[
body('providerId').trim().exists().notEmpty().withMessage("Provider Id is required"),
      async(req,res)=>{
        try{
           const errors = validationResult(req);
           if (!errors.isEmpty()) {
              helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
           }
           else{
            var response = []
            var responseData = {}
        let found = await PROVIDERTABLE.findOne({"_id":req.body.providerId})
        if(!empty(found)){
               for(let day of found.workingHours)
               {
                var tmpObj = {}
                 tmpObj.day    = day.day
                 tmpObj._id    = day._id
                 tmpObj.status = day.status
                 if(day.timeSlot.length == 1)
                 {
                  var resSlots = day.timeSlot[0].slots
                 }else if(day.timeSlot.length == 0)
                 {
                   var resSlots = []
                 }else
                 {
                 var resSlots = day.timeSlot[0].slots.concat(day.timeSlot[1].slots)
                 }
                 tmpObj.slots = resSlots
                 response.push(tmpObj)
               }
               responseData.deliveryCharge = found.deliveryCharges
               responseData.deliveryChargeType = found.deliveryChargeType
               responseData.timeSlots = response;

               helper.successResponseWithData(res,"Required Cart Data Found SuccessFully!",responseData)
        } 
       else{
         helper.unauthorizedResponseWithoutData(res,"Provider Not Found!")
       }
      }
    }
      catch(err){
        helper.ErrorResponseWithoutData(res,err.message)
    }

}]




exports.placeOrder = [
    body("providerId").exists().notEmpty().withMessage("Provider ID is required!"),
    body("deliveryDate").exists().notEmpty().withMessage("Delivery Date is required!"),
    body("serviceType").exists().notEmpty().withMessage("Service is required!"),
    // body("deliveryAddress").exists({ deliveryOption: true }).notEmpty().withMessage("Delivery Address is required!"),
    body("carId").trim().exists().notEmpty().withMessage("Car Id is required!"),
    body("subTotal").exists().notEmpty().withMessage("Subtotal is required!")
    .isNumeric().withMessage("Subtotal should be of type Number!"),
    body("deliveryFee").exists().notEmpty().withMessage("Delivery Fee is required!")
    .isNumeric().withMessage("Delivery Fee should be of type Number!"),
    body("discount").exists().notEmpty().withMessage("Discount is required!")
    .isNumeric().withMessage("Discount should be of type Number!"),
    body("estimatedTotalCost").exists().notEmpty().withMessage("Total Cost is required!")
    .isNumeric().withMessage("Total Cost should be of type Number!"),
    body("choosePaymentMethods").exists().notEmpty().withMessage("Choose Payment Method is required!"),
      async(req,res)=>{
        try{
           const errors = validationResult(req);
           if (!errors.isEmpty()) {
              helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
           }
           else{ 
            var customerDetail = await USERTABLE.findOne({"_id":req.userData._id})
            var providerDetail = await PROVIDERTABLE.findOne({"_id":req.body.providerId})
             var date = new Date();
           var currentMonth = date.getMonth() + 1
           var currentYear = date.getFullYear();
           let availability = await PROVIDERTABLE.aggregate([
               {$match:{
                _id:ObjectId(req.body.providerId)
               }},
               {
                      $lookup: {
                        from: "orders",
                        'let': {provider: "$_id" },
                        pipeline: [
                          {
                            $match:{
                              $expr:{
                                $eq:["$providerId","$$provider"] 
                          }
                         }
                          },
                          {
                           $project:{
                            month:{$month:"$createdAt"},
                            year:{$year:"$createdAt"}
                           }
                          },
                          {
                            $match:{
                                month:currentMonth,
                                year:currentYear
                            }
                          }
                       ],
                        as: "orderLimitArray"
                      }
                   },
                   {
                    $addFields:{
                        isOrderLimitReached:{
                            "$cond": [
                                      {$and:[
                                      {"$gte": ["$isPremium", 1]},
                                      {"$lte": ["$isPremium", 3]}
                                      ]}, 
                                 0,
                                 { "$cond": [
                                   {"$lt": [ {$size: "$orderLimitArray"}, 2]},
                                   0, 
                                   1
                                 ]}
                              ]
                        }
                    }
                   },
                   {
                    $project:{
                        isOnline:1,
                        isOrderLimitReached:1
                    }
                   }
            ])
             if(availability[0].isOnline == 0 || availability[0].isOrderLimitReached == 1)
            helper.ErrorResponseWithoutData(res,"This Service Provider is no longer accepting new order. Please use services of other service providers!")
          else{
             var flag = true
             while(flag)
             {
              var orderId = utility.random_base64(16)
               let checkUnique = await ORDERTABLE.find({orderId:orderId})
               
               if(!empty(checkUnique))
               {
                console.log("Huuhh! , Found Duplicate order Id, Searching for something Unique.")
               continue;
               }
               else
               flag = false
             }
             if(req.body.choosePaymentMethods == '1')
             {
                if((!empty(req.body.stripeCustomerId) && !empty(req.body.cardId)) || !empty(req.body.paymentMethodId))
                {
                  //Converting amount to Lower GBP Currency
                  const amount = parseInt(req.body.estimatedTotalCost * 100)
                  //Deducting 1.4 % +20 Stripe Fee
                  const applicationFeeAmount = Math.ceil((amount * 0.014) + 20)
                  if(!empty(req.body.paymentMethodId))
                  {
                    var paymentIntent = await stripe.paymentIntents.create({
                                        payment_method_types: ['card'],
                                        amount: amount,
                                        currency: 'gbp',
                                        confirm: true,
                                        capture_method:'manual',
                                        payment_method: req.body.paymentMethodId,
                                        receipt_email: customerDetail.emailId,
                                        application_fee_amount: applicationFeeAmount,
                                        metadata: {'orderId': orderId,'userId':req.userData._id},
                                        transfer_data: {
                                                        destination: providerDetail.stripeAccountId
                                                        }
                                      });
                  }else if(!empty(req.body.stripeCustomerId) && !empty(req.body.cardId))
                  {
                    var paymentIntent = await stripe.paymentIntents.create({
                                        payment_method_types: ['card'],
                                        amount: amount,
                                        currency: 'gbp',
                                        confirm: true,
                                        capture_method:'manual',
                                        customer: req.body.stripeCustomerId,
                                        payment_method: req.body.cardId,
                                        receipt_email: customerDetail.emailId,
                                        application_fee_amount: applicationFeeAmount,
                                        metadata: {'orderId': orderId,'userId':req.userData._id},
                                        transfer_data: {
                                                        destination: providerDetail.stripeAccountId
                                                        }
                                      });
                  }
                  
            
                if(paymentIntent.status == "requires_capture")
                {
               ORDERTABLE.create({
                orderId:orderId,
                paymentIntentId:paymentIntent.id,
                customerId:req.userData._id,
                providerId:req.body.providerId,
                deliveryDate:req.body.deliveryDate,
                slotStartTime:req.body.slotStartTime,
                slotEndTime:req.body.slotEndTime,
                deliveryOption:req.body.deliveryOption,
                serviceType:req.body.serviceType,
                deliveryAddress:(req.body.deliveryAddress)?req.body.deliveryAddress:'',
                deliveryLocation: {
                  type: "Point",
                  coordinates: [parseFloat(req.body.deliveryLong), parseFloat(req.body.deliveryLat)]
                },
                carId:req.body.carId,
                services:req.body.services, 
                subTotal:req.body.subTotal,
                deliveryFee:req.body.deliveryFee,
                discount: req.body.discount,
                estimatedTotalCost:req.body.estimatedTotalCost,
                choosePaymentMethods:(req.body.choosePaymentMethods),
                promoCode:(req.body.promoCode)?req.body.promoCode:''            
           }).then( async orderDetails=>{
             helper.successResponseWithData(res,"Order Placed Successfully!",orderDetails)
             if(!empty(customerDetail.emailId)){
             // message email body
                let message = `Your order is placed successfully with Order ID ${orderDetails.orderId}.<br>Your order will be confirmed soon by service provider.<br>Thank You for using VALET-IT Services!`;
                // Send confirmation email
                mailer.sendOrderUpdate(
                    customerDetail.emailId,
                    message,
                    customerDetail.name
                ).then(success=>{
                     console.log("Order Placed Email Sent!")
                }).catch(error=>{
                    console.log(error)
                });
               }
               if(!empty(providerDetail.emailId)){
             // message email body
                let message = `Hey, You have received a CarWash order with Order ID ${orderDetails.orderId}.<br>Kindly Accept or Reject this order.<br>Hope you will provide excelent service to your customer!`;
                // Send confirmation email
                mailer.sendOrderUpdate( 
                    providerDetail.emailId,
                    message,
                    providerDetail.name
                ).then(success=>{
                     console.log("Order Placed Email Sent!")
                }).catch(error=>{
                    console.log(error)
                });
               }
             if(!empty(providerDetail) && providerDetail.pushNotification == 1){
               if(providerDetail.deviceType == 'android')
               {
                 let data = {
                   title:"VALET-IT",
                   message:"You have received a new order. Kindly Accept or Reject.",
                   deviceType:"android",
                   notificationType:"placeCarWashOrder",
                   orderId:orderDetails._id.toString(),
                   customerName:customerDetail.name
                 }
                 let token = providerDetail.deviceToken
                 utility.sendFCMNotificationToAndroid(data,token)
               }else if(providerDetail.deviceType == 'ios')
               {
                let data = {
                   title:"VALET-IT",
                   message:"You have received a new order. Kindly Accept or Reject.",
                   deviceType:"ios",
                   notificationType:"placeCarWashOrder",
                   orderId:orderDetails._id.toString(),
                   customerName:customerDetail.name
                 }
                 let notification = {
                    title:"VALET-IT",
                    body:"You have received a new order. Kindly Accept or Reject."
                 }
                 let token = providerDetail.deviceToken
                 utility.sendFCMNotificationToIOS(notification,data,token)
               }
               
             }
            })
          .catch(err=>{
            console.log(err)
            helper.ErrorResponseWithoutData(res,err.message)
          })
                }else{
                  helper.ErrorResponseWithoutData(res,"Something Went Wrong! If any amount deducted from your account will be refunded in 7 to 10 days.")
                }
            }else
            {
              helper.notFoundResponseWithNoData(res,"Either Payment Method Id or Card Id and customer Id is manadatory for card payment")
             }
            }else{
           ORDERTABLE.create({
                orderId:orderId,
                customerId:req.userData._id,
                providerId:req.body.providerId,
                deliveryDate:req.body.deliveryDate,
                slotStartTime:req.body.slotStartTime,
                slotEndTime:req.body.slotEndTime,
                deliveryOption:req.body.deliveryOption,
                serviceType:req.body.serviceType,
                deliveryAddress:(req.body.deliveryAddress)?req.body.deliveryAddress:'',
                deliveryLocation: {
                  type: "Point",
                  coordinates: [parseFloat(req.body.deliveryLong), parseFloat(req.body.deliveryLat)]
                },
                carId:req.body.carId,
                services:req.body.services, 
                subTotal:req.body.subTotal,
                deliveryFee:req.body.deliveryFee,
                discount: req.body.discount,
                estimatedTotalCost:req.body.estimatedTotalCost,
                choosePaymentMethods:(req.body.choosePaymentMethods),
                promoCode:(req.body.promoCode)?req.body.promoCode:''            
           }).then( async orderDetails=>{
             helper.successResponseWithData(res,"Order Placed Successfully!",orderDetails)
             if(!empty(customerDetail.emailId)){
             // message email body
                let message = `Your order with Order ID ${orderDetails.orderId} is placed successfully.<br>Your order will be confirmed soon by service provider.<br>Thank You for using VALET-IT Services!`;
                // Send confirmation email
                mailer.sendOrderUpdate(
                    customerDetail.emailId,
                    message,
                    customerDetail.name
                ).then(success=>{
                     console.log("Order Placed Email Sent!")
                }).catch(error=>{
                    console.log(error)
                });
               }
               if(!empty(providerDetail.emailId)){
             // message email body
                let message = `Hey, You have received a CarWash order with Order ID ${orderDetails.orderId}.<br>Kindly Accept or Reject this order.<br>Hope you will provide excelent service to your customer!`;
                // Send confirmation email
               mailer.sendOrderUpdate( 
                    providerDetail.emailId,
                    message,
                    providerDetail.name
                ).then(success=>{
                     console.log("Order Placed Email Sent!")
                }).catch(error=>{
                    console.log(error)
                });
               }
             if(!empty(providerDetail) && providerDetail.pushNotification == 1){
               if(providerDetail.deviceType == 'android')
               {
                 let data = {
                   title:"VALET-IT",
                   message:"You have received a new order. Kindly Accept or Reject.",
                   deviceType:"android",
                   notificationType:"placeCarWashOrder",
                   orderId:orderDetails._id.toString(),
                   customerName:customerDetail.name
                 }
                 let token = providerDetail.deviceToken
                 utility.sendFCMNotificationToAndroid(data,token)
               }else if(providerDetail.deviceType == 'ios')
               {
                let data = {
                   title:"VALET-IT",
                   message:"You have received a new order. Kindly Accept or Reject.",
                   deviceType:"ios",
                   notificationType:"placeCarWashOrder",
                   orderId:orderDetails._id.toString(),
                   customerName:customerDetail.name
                 }
                 let notification = {
                    title:"VALET-IT",
                    body:"You have received a new order. Kindly Accept or Reject."
                 }
                 let token = providerDetail.deviceToken
                 utility.sendFCMNotificationToIOS(notification,data,token)
               }
               
             }
            })
          .catch(err=>{
            console.log(err)
            helper.ErrorResponseWithoutData(res,err.message)
          })
      }
    }
           }
        }
        catch(err){
            helper.ErrorResponseWithoutData(res,err.message)
        }

        }
]




exports.placeItemOrder = [
body("deliveryAddress").exists().notEmpty().withMessage("Delivery Address is required!"),
body("lat").exists().notEmpty().withMessage("latitude is required!"),
body("long").exists().notEmpty().withMessage("longitude is required!"),
body('subTotal') .exists() .notEmpty().withMessage('Subtotal is required!').isNumeric().withMessage('Subtotal should be of type Number!'),

body('deliveryFee').exists().notEmpty().withMessage('Delivery Fee is required!').isNumeric().withMessage('Delivery Fee should be of type Number!'),
body('subscriptionDiscount').exists().notEmpty().withMessage('Subscription Discount is required!').isNumeric()
.withMessage('Subscription Discount should be of type Number!'),
body('estimatedTotalCost').exists().notEmpty().withMessage('Total Cost is required!').isNumeric()
.withMessage('Total Cost should be of type Number!'),
body('choosePaymentMethods').exists().notEmpty().withMessage('Choose Payment Method is required!'),
async (req, res) => {
try {
const errors = validationResult(req)
if (!errors.isEmpty()) {
helper.validationErrorWithData(res, 'Validation Error.', errors.array())
} else {
  var providerDetail = await PROVIDERTABLE.find({"permissionForSell":1})
  var customerDetail = await USERTABLE.findOne({"_id":req.userData._id})

  var flag = true
  while(flag)
  {
  var orderId = utility.random_base64(16)
    let checkUnique = await SELLINGORDERTABLE.find({orderId:orderId})
    
    if(!empty(checkUnique))
    {
    console.log("Huuhh! , Found Duplicate order Id, Searching for something Unique.")
    continue;
    }
    else
    flag = false
  }
  if(req.body.choosePaymentMethods == '1')
             {
                if((!empty(req.body.stripeCustomerId) && !empty(req.body.cardId)) || !empty(req.body.paymentMethodId))
                {
                  //Converting amount to Lower GBP Currency
                  const amount = parseInt(req.body.estimatedTotalCost * 100)
                  if(!empty(req.body.paymentMethodId))
                  {
                    var paymentIntent = await stripe.paymentIntents.create({
                                        payment_method_types: ['card'],
                                        amount: amount,
                                        currency: 'gbp',
                                        confirm: true,
                                        capture_method:'manual',
                                        payment_method: req.body.paymentMethodId,
                                        receipt_email: customerDetail.emailId,
                                        metadata: {'orderId': orderId,'userId':req.userData._id}
                                      });
                  }else if(!empty(req.body.stripeCustomerId) && !empty(req.body.cardId)){
                    var paymentIntent = await stripe.paymentIntents.create({
                                        payment_method_types: ['card'],
                                        amount: amount,
                                        currency: 'gbp',
                                        confirm: true,
                                        capture_method:'manual',
                                        customer: req.body.stripeCustomerId,
                                        payment_method: req.body.cardId,
                                        receipt_email: customerDetail.emailId,
                                        metadata: {'orderId': orderId,'userId':req.userData._id}
                                      });
                  }
                  
                  
                if(paymentIntent.status == "requires_capture")
                {
               SELLINGORDERTABLE.create({
                orderId:orderId,
                paymentIntentId:paymentIntent.id,
                customerId: req.userData._id,
                deliveryAddress: req.body.deliveryAddress,
                lat : req.body.lat,
                long: req.body.long,
                deliveryLocation: {
                type: 'Point',
                coordinates: [
                parseFloat(req.body.long),
                parseFloat(req.body.lat),
                ],
                },
                cartItems:req.body.cartItems,
                subTotal: req.body.subTotal,
                deliveryFee: req.body.deliveryFee,
                subscriptionDiscount: req.body.subscriptionDiscount,
                estimatedTotalCost: req.body.estimatedTotalCost,
                choosePaymentMethods: req.body.choosePaymentMethods

                })
                .then(async (orderDetails) => {
                helper.successResponseWithData(
                res,
                'Order Placed Successfully!',
                orderDetails
                )
                 if(!empty(customerDetail.emailId)){
             // message email body
                let message = `Your order is placed successfully with Order ID ${orderDetails.orderId}.<br>Your order will be confirmed soon by service provider.<br>Thank You for using VALET-IT Services!`;
                // Send confirmation email
                mailer.sendOrderUpdate( 
                    customerDetail.emailId,
                    message,
                    customerDetail.name
                ).then(success=>{
                     console.log("Order Placed Email Sent!")
                }).catch(error=>{
                    console.log(error)
                });
               }
               
                 if(!empty(providerDetail)){
                   for(let provider of providerDetail)
                   {
                    if(!empty(provider.emailId)){
                     // message email body
                        let message = `Hey, You have received a Selling Item order with Order ID ${orderDetails.orderId}.<br>Kindly Accept or Reject this order.<br>Hope you will provide excelent service to your customer!`;
                        // Send confirmation email
                        mailer.sendOrderUpdate( 
                            provider.emailId,
                            message,
                            provider.name
                        ).then(success=>{
                             console.log("Order Placed Email Sent!")
                        }).catch(error=>{
                            console.log(error)
                        });
                       }
                    if(provider.pushNotification == 1){
                   if(provider.deviceType == 'android')
                   {
                     let data = {
                       title:"VALET-IT",
                       message:"You have received a new Selling Item order. Kindly Accept or Reject.",
                       deviceType:"android",
                       notificationType:"placeSellingItemOrder",
                       orderId:orderDetails._id.toString(),
                       customerName:customerDetail.name
                     }
                     let token = provider.deviceToken
                     utility.sendFCMNotificationToAndroid(data,token)
                   }else if(provider.deviceType == 'ios')
                   {
                    let data = {
                       title:"VALET-IT",
                       message:"You have received a new Selling Item order. Kindly Accept or Reject.",
                       deviceType:"ios",
                       notificationType:"placeSellingItemOrder",
                       orderId:orderDetails._id.toString(),
                       customerName:customerDetail.name
                     }
                     let notification = {
                        title:"VALET-IT",
                        body:"You have received a new Selling Item order. Kindly Accept or Reject."
                     }
                     let token = provider.deviceToken
                     utility.sendFCMNotificationToIOS(notification,data,token)
                   }
                 }
                  }
                 }
                let update = await USERTABLE.findByIdAndUpdate({'_id':req.userData._id},{
                  $set:{
                    cartItems:[]
                  }
                })
                })
                .catch((err) => {
                  console.log("catch",err)
                helper.ErrorResponseWithoutData(res, err.message)
                })
                }else{
                  helper.ErrorResponseWithoutData(res,"Something Went Wrong! If any amount deducted from your account will be refunded in 7 to 10 days.")
                }
            }else
            {
              helper.notFoundResponseWithNoData(res,"Either Payment Method Id or Card Id and customer Id is manadatory for card payment")
             }
            }else{
           SELLINGORDERTABLE.create({
            orderId:orderId,
            customerId: req.userData._id,
            deliveryAddress: req.body.deliveryAddress,
            lat : req.body.lat,
            long: req.body.long,
            deliveryLocation: {
            type: 'Point',
            coordinates: [
            parseFloat(req.body.long),
            parseFloat(req.body.lat),
            ],
            },
            cartItems:req.body.cartItems,
            subTotal: req.body.subTotal,
            deliveryFee: req.body.deliveryFee,
            subscriptionDiscount: req.body.subscriptionDiscount,
            estimatedTotalCost: req.body.estimatedTotalCost,
            choosePaymentMethods: req.body.choosePaymentMethods

            })
            .then(async (orderDetails) => {
            helper.successResponseWithData(
            res,
            'Order Placed Successfully!',
            orderDetails
            )
            if(!empty(customerDetail.emailId)){
             // message email body
                let message = `Your order is placed successfully with Order ID ${orderDetails.orderId}.<br>Your order will be confirmed soon by service provider.<br>Thank You for using VALET-IT Services!`;
                // Send confirmation email
                mailer.sendOrderUpdate( 
                    customerDetail.emailId,
                    message,
                    customerDetail.name
                ).then(success=>{
                     console.log("Order Placed Email Sent!")
                }).catch(error=>{
                    console.log(error)
                });
               }
           if(!empty(providerDetail)){
             for(let provider of providerDetail)
             {
              if(!empty(provider.emailId)){
                 // message email body
                    let message = `Hey, You have received a Selling Item order with Order ID ${orderDetails.orderId}.<br>Kindly Accept or Reject this order.<br>Hope you will provide excelent service to your customer!`;
                    // Send confirmation email
                    mailer.sendOrderUpdate( 
                            provider.emailId,
                            message,
                            provider.name
                        ).then(success=>{
                             console.log("Order Placed Email Sent!")
                        }).catch(error=>{
                            console.log(error)
                        });
                   }
             if(provider.pushNotification == 1)
             {
             if(provider.deviceType == 'android')
             {
               let data = {
                 title:"VALET-IT",
                 message:"You have received a new Selling Item order. Kindly Accept or Reject.",
                 deviceType:"android",
                 notificationType:"placeSellingItemOrder",
                 orderId:orderDetails._id.toString(),
                 customerName:customerDetail.name
               }
               let token = provider.deviceToken
               utility.sendFCMNotificationToAndroid(data,token)
             }else if(provider.deviceType == 'ios')
                 {
                  let data = {
                     title:"VALET-IT",
                     message:"You have received a new Selling Item order. Kindly Accept or Reject.",
                     deviceType:"ios",
                     notificationType:"placeSellingItemOrder",
                     orderId:orderDetails._id.toString(),
                     customerName:customerDetail.name
                   }
                   let notification = {
                      title:"VALET-IT",
                      body:"You have received a new Selling Item order. Kindly Accept or Reject."
                   }
                   let token = provider.deviceToken
                   utility.sendFCMNotificationToIOS(notification,data,token)
                 }
               }
            }
           }
            let update = await USERTABLE.findByIdAndUpdate({'_id':req.userData._id},{
              $set:{
                cartItems:[]
              }
            })
            })
            .catch((err) => {
              console.log("catch",err)
            helper.ErrorResponseWithoutData(res, err.message)
            })
                  }
            
}
} catch (err) {
helper.ErrorResponseWithoutData(res, err.message)
}
}
]


/**
 * Rate Your Order
 *
 * @method POST
 * @param {string}      orderId
 * @param {string}      rating
 * @param {string}      review
 *
 * @returns {Object}
 */

exports.modifyOrder = [
  body("orderId").exists().notEmpty().withMessage("Order Id Is required!")
  ,async(req,res)=>{
    try{
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
         helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
      }
      else{
        let orderDetail = await ORDERTABLE.findOne({'_id':req.body.orderId})
        if(!empty(orderDetail))
        {
        if(!empty(req.body.status) && req.body.status != 6)
        {
          helper.ErrorResponseWithoutData(res,"You can only cancel the order")
        }else
        if(orderDetail.status > 0)
        {
          helper.ErrorResponseWithoutData(res,"Ongoing order can't be modified")
        }
        else{
        var set = {}
        if(req.body.status)
        {
          set.status = 6
        }
        if(req.body.deliveryDate)
        {
          set.deliveryDate = req.body.deliveryDate
        }
        if(req.body.slotStartTime && req.body.slotEndTime)
        {
          set.slotStartTime = req.body.slotStartTime
          set.slotEndTime = req.body.slotEndTime
        }
          let update = await ORDERTABLE.findByIdAndUpdate({'_id':req.body.orderId},{
            $set:set
          },{new:true})
       if(update){
         helper.successResponseWithData(res,'Order Updated Successfully!',update)
         let providerDetail = await PROVIDERTABLE.findOne({"_id":update.providerId})
         let customerDetail = await USERTABLE.findOne({"_id":req.userData._id})

            if(req.body.status == 6 && update.status == 6)
            {
              if(update.choosePaymentMethods == '1')
              {
              const paymentIntent = await stripe.paymentIntents.cancel(
                                   update.paymentIntentId
               );
              }
              if(!empty(customerDetail.emailId)){
             // message email body
                let message = `Your order is cancelled successfully with Order ID ${update.orderId}.<br>Your amount will be refunded in your original payment accountin 7 to 10 days.<br>Visit Again!`;
                // Send confirmation email
               mailer.sendOrderUpdate( 
                            customerDetail.emailId,
                            message,
                            customerDetail.name
                        ).then(success=>{
                             console.log("Order Canceled Email Sent!")
                        }).catch(error=>{
                            console.log(error)
                        });
               }
              if(!empty(providerDetail.emailId)){
             // message email body
                let message = `Hey, Customer has cancelled the order with order ID ${update.orderId}.<br>Thank you for being a valuable service provider.!`;
                // Send confirmation email
                mailer.sendOrderUpdate( 
                            providerDetail.emailId,
                            message,
                            providerDetail.name
                        ).then(success=>{
                             console.log("Order Canceled Email Sent!")
                        }).catch(error=>{
                            console.log(error)
                        });
               }
            }

             if(!empty(providerDetail) && providerDetail.pushNotification == 1){
               if(providerDetail.deviceType == 'android')
               {
                 let data = {
                   title:"VALET-IT",
                   message:"Customer has modified the order details.",
                   deviceType:"android",
                   notificationType:"modifyCarWashOrder",
                   orderId:update._id.toString(),
                   customerName:customerDetail.name
                 }
                 let token = providerDetail.deviceToken
                 utility.sendFCMNotificationToAndroid(data,token)
               }else if(providerDetail.deviceType == 'ios')
               {
                let data = {
                   title:"VALET-IT",
                   message:"Customer has modified the order details.",
                   deviceType:"ios",
                   notificationType:"modifyCarWashOrder",
                   orderId:update._id.toString(),
                   customerName:customerDetail.name
                 }
                 let notification = {
                    title:"VALET-IT",
                    body:"Customer has modified the order details."
                 }
                 let token = providerDetail.deviceToken
                 utility.sendFCMNotificationToIOS(notification,data,token)
               }
               
             }
       }
       else{
            helper.ErrorResponseWithoutData(res,"Either Order ID not Found or some problem occured During updating order!")
       }
     }
   }else{
            helper.ErrorResponseWithoutData(res,"Invalid OrderId!")
       }
      }
    }
    catch(err){
      helper.ErrorResponseWithoutData(res,err.message)
    }
  }
]

/**
 * Rate Your Order
 *
 * @method POST
 * @param {string}      orderId
 * @param {string}      rating
 * @param {string}      review
 *
 * @returns {Object}
 */

exports.modifyItemOrder = [
  body("orderId").exists().notEmpty().withMessage("Order Id Is required!"),
  body("status").exists().notEmpty().withMessage("Status Id Is required!"),
  async(req,res)=>{
    try{
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
         helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
      }
      else{
        let orderDetail = await SELLINGORDERTABLE.findOne({'_id':req.body.orderId,'customerId':req.userData._id})
        if(!empty(orderDetail))
        {
          if(!empty(req.body.status) && req.body.status != 4)
        {
          helper.ErrorResponseWithoutData(res,"You can only cancel the order")
        }else
        if(orderDetail.status > 0)
        {
          helper.ErrorResponseWithoutData(res,"Ongoing order can't be canceled")
        }
        else{
          let update = await SELLINGORDERTABLE.findByIdAndUpdate({'_id':req.body.orderId},{
            $set:{status:4}
          },{new:true})
       if(update){
         helper.successResponseWithData(res,'Order Updated Successfully!',update)
         let providerDetail = await PROVIDERTABLE.find({"permissionForSell":1})
         let customerDetail = await USERTABLE.findOne({"_id":req.userData._id})

            if(req.body.status == 4 && update.status == 4)
            {
              if(update.choosePaymentMethods == '1'){
              const paymentIntent = await stripe.paymentIntents.cancel(
                                   update.paymentIntentId
              );
            }
              if(!empty(customerDetail.emailId)){
             // message email body
                let message = `Your order is cancelled successfully with order ID ${update.orderId}.<br>Your amount will be refunded in your original payment accountin 7 to 10 days.<br>Visit Again!`;
                // Send confirmation email
                mailer.sendOrderUpdate( 
                            customerDetail.emailId,
                            message,
                            customerDetail.name
                        ).then(success=>{
                             console.log("Order Canceled Email Sent!")
                        }).catch(error=>{
                            console.log(error)
                        });
               }
            }

             if(!empty(providerDetail)){
              for(let provider of providerDetail){
                if(req.body.status == 4 && update.status == 4)
                {
                if(!empty(provider.emailId)){
             // message email body
                let message = `Hey, Customer has cancelled the order with order ID ${update.orderId}.<br>Thank you for being a valuable service provider.!`;
                // Send confirmation email
                mailer.sendOrderUpdate( 
                            provider.emailId,
                            message,
                            provider.name
                        ).then(success=>{
                             console.log("Order Canceled Email Sent!")
                        }).catch(error=>{
                            console.log(error)
                        });
               }
                }
              if(provider.pushNotification == 1){
               if(provider.deviceType == 'android')
               {
                 let data = {
                   title:"VALET-IT",
                   message:"Customer has canceled the order.",
                   deviceType:"android",
                   notificationType:"modifySellingItemOrder",
                   orderId:update._id.toString(),
                   customerName:customerDetail.name
                 }
                 let token = provider.deviceToken
                 utility.sendFCMNotificationToAndroid(data,token)
               }else if(provider.deviceType == 'ios')
               {
                let data = {
                   title:"VALET-IT",
                   message:"Customer has canceled the order.",
                   deviceType:"ios",
                   notificationType:"modifySellingItemOrder",
                   orderId:update._id.toString(),
                   customerName:customerDetail.name
                 }
                 let notification = {
                    title:"VALET-IT",
                    body:"Customer has canceled the order."
                 }
                 let token = provider.deviceToken
                 utility.sendFCMNotificationToIOS(notification,data,token)
               }
             }
              } 
             }
       }
       else{
            helper.ErrorResponseWithoutData(res,"Either Order ID not Found or some problem occured During updating order!")
       }
     }
   }else{
            helper.ErrorResponseWithoutData(res,"Invalid Order ID!")
       }
      }
    }
    catch(err){
      helper.ErrorResponseWithoutData(res,err.message)
    }
  }
]

exports.getUpdatedCartItem = [
  body("orderId").exists().notEmpty().withMessage("Order Id Is required!")
  ,async(req,res)=>{
    try{
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
         helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
      }
      else{
        let found = await SELLINGORDERTABLE.aggregate([
          {$match:{"_id":ObjectId(req.body.orderId)}},
          {
            $project:{
              cartItems:1
            }
          },
          { $unwind: { path: "$cartItems" } },
          {
            $lookup:{
              from:"sellingitems",
              let:{itemId:"$cartItems.itemId"},
              
              pipeline:[
                {
                  $match:{
                    $expr:{
                      $and:[
                      {$eq:["$_id","$$itemId"]},
                      {$eq:["$status",1]}
                      ]
                      
                    }
                  }
                },
                {
                  $project:{
                    itemId:"$_id",
                    _id:0,
                    quantity:1,
                    discountPrice:1,
                    unitPrice:1,
                    status:1,
                    itemName:1,
                    description:1,
                    createdAt:1,
                    updatedAt:1,
                    itemImages:  
                    {
                      $map:
                         {
                           input: "$itemImages",
                           as: "items",
                           in: {$concat: ["https://velatedocuments.s3.eu-west-2.amazonaws.com/itemImages/","$$items"]}
                         }
                    }
                  }
                }
              ],
              as:"cartItems1"
            }
          },
          {$addFields:{
            "cartItems1.quantity":"$cartItems.quantity"
          }}
        ])
        if(!empty(found)){
          var tmpCartItems = []
          for(let items of found)
          {
           if(!empty(items.cartItems1[0]))
           tmpCartItems.push(items.cartItems1[0])
          }
          let deliveryFee = await ADMINTABLE.findOne({},{sellingItemDeliveryFee:1})
          let response = {
            _id : found[0]._id,
            cartItems:tmpCartItems,
            sellingItemDeliveryFee:deliveryFee.sellingItemDeliveryFee
          }

          helper.successResponseWithData(res, 'Updated Cart Details Found successfully!', response)
        }
        else{
          helper.ErrorResponseWithoutData(res,"Updated Cart Details not found!")
        }
        
      }
    }
    catch(err){
      helper.ErrorResponseWithoutData(res,err.message)
    }
  }
]


/**
 * Display All Orders
 *
 * @method GET
 * @param JWT Token
 *
 * @returns [Array]
 */


exports.myItemOrders = async(req,res)=>{
try {
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
let found = await SELLINGORDERTABLE.find({'customerId':req.userData._id},
{createdAt:1,estimatedTotalCost:1,status:1,orderId:1,cartItems:1},{sort:{createdAt: -1},skip:skip,limit:resPerPage})

if (!empty(found)) {
helper.successResponseWithData(res, 'Orders Found successfully!', found)
} else {
helper.notFoundResponseWithNoData(res, 'No Orders Found!')
}
} catch (err) {
helper.ErrorResponseWithoutData(res, err.message)
}
}


exports.myOrders =async(req,res)=>{
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
        let found = await ORDERTABLE.aggregate([
          {$match:{'customerId':ObjectId(req.userData._id)}},
          {
           $lookup: {
                  from: "providers",
                  'let': {providerId: "$providerId" },
                  pipeline: [
                    {
                      $match:{
                        $expr:{
                         $eq:["$_id","$$providerId"]
                    }
                }
                    }
                 ],
                  as: "provider"
                }
          },
          { $unwind: { path: "$provider" } },
          {
            $sort:{createdAt:-1}
          },
          {
            $project:{
              _id:1,
              orderId:1,
              deliveryDate:1,
              slotStartTime:1,
              slotEndTime:1,
              evaluation:1,
              services:1,
              status:1,
              estimatedTotalCost:1,
              deliveryOption:1,
              serviceType:1,
              businessName:"$provider.businessName",
              profile:{ 
                  $cond: { if: {
                    $eq: ["$provider.profile",""] },
                 then: "",
                 else: { $concat: ["https://velatedocuments.s3.eu-west-2.amazonaws.com/profile/", "$provider.profile"] } }}
            }
          },
          {
            $skip:skip
          },
          {
            $limit:resPerPage
          }
          ])
         if(!empty(found)){
                      helper.successResponseWithData(res,"Orders Found successfully!",found)
         }
         else{
             helper.notFoundResponseWithNoData(res,"No Orders Found!")
         }
      }
      catch(err){
          helper.ErrorResponseWithoutData(res,err.message)
      }
    }


/**
 * View Order Details
 *
 * @method POST
 * @param {string}      OrderId
 *
 * @returns {Object}
 */


exports.orderDetails =[
    body("orderId").exists().notEmpty().withMessage("Order Id Is required!")
    ,async(req,res)=>{
      try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
           helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }
        else{
              let found = await ORDERTABLE.aggregate([
          {$match:{'_id':ObjectId(req.body.orderId)}},
          {
           $lookup: {
                  from: "providers",
                  'let': {providerId: "$providerId" },
                  pipeline: [
                    {
                      $match:{
                        $expr:{
                         $eq:["$_id","$$providerId"]
                    }
                }
                    },
                    {
                      $project:{
                        orderId:1,
                        businessName:1,
                        businessAddress:1,
                        lat:1,
                        long:1,
                        serviceType:1,
                        deliveryOption:1,
                        profile:{ 
                            $cond: { if: {
                              $eq: ["$profile",""] },
                           then: "",
                           else: { $concat: ["https://velatedocuments.s3.eu-west-2.amazonaws.com/profile/", "$profile"] } }}

                      }
                    }
                 ],
                  as: "provider"
                }
          },
          { $unwind: { path: "$provider" } }
          ])
         if(!empty(found)){
                      helper.successResponseWithData(res,"Orders Details Found Successfully!",found[0])
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

exports.itemOrderDetails =[
    body("orderId").exists().notEmpty().withMessage("Order Id Is required!")
    ,async(req,res)=>{
      try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
           helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }
        else{
          let found = await SELLINGORDERTABLE.findOne({'_id':ObjectId(req.body.orderId)})
            

         if(!empty(found)){
            var response = {}
          
          
          var tmpCartItem = []
          for(let cartItem of found.cartItems)  
          {
            var tmpItemImages = []
            var tmpResponse = {}
            for(let itemImage of cartItem.itemImages)
            {
               tmpItemImages.push("https://velatedocuments.s3.eu-west-2.amazonaws.com/itemImages/"+ itemImage)
              
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
          response.orderId = found.orderId
            response.deliveryLocation = found.deliveryLocation
            response.status = found.status
            response._id = found._id
            response.customerId = found.customerId
            response.deliveryAddress = found.deliveryAddress
            response.lat = found.lat
            response.long = found.long
            response.cartItems = tmpCartItem
            response.subTotal = found.subTotal
            response.deliveryFee = found.deliveryFee
            response.subscriptionDiscount = found.subscriptionDiscount
            response.estimatedTotalCost = found.estimatedTotalCost
            response.choosePaymentMethods = found.choosePaymentMethods
            response.createdAt = found.createdAt
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

/**
 * Rate Your Order
 *
 * @method POST
 * @param {string}      orderId
 * @param {string}      rating
 * @param {string}      review
 *
 * @returns {Object}
 */

exports.rateOrder = [
  body("orderId").exists().notEmpty().withMessage("Order Id Is required!"),
  body("rating").exists().notEmpty().withMessage("Rating Is required!")
  ,async(req,res)=>{
    try{
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
         helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
      }
      else{
          let order = await ORDERTABLE.findOne({'_id':req.body.orderId})
          if(order){
          if(order.customerId.toString() == req.userData._id.toString())
          {
          if(order.evaluation.rating == 0)
          {
          let update = await ORDERTABLE.findByIdAndUpdate({'_id':req.body.orderId},{
            $set:{
              'evaluation.rating' : req.body.rating,
              'evaluation.review' :(req.body.review)?req.body.review:''
            }
          },{new:true})
       if(update){
         helper.successResponseWithData(res,'Successfully Saved Rating and Review!',update)
       }
       else{
            helper.ErrorResponseWithoutData(res,"Either Order ID not Found or problem to save the Rating and Review!")
       }
     }else
     {
      helper.ErrorResponseWithoutData(res,"You can rate order only one time")
     }
    }else{
      helper.ErrorResponseWithoutData(res,"This order is not placed by You")
    }
  }else
  {
    helper.ErrorResponseWithoutData(res,"No Order Found with this order Id")
  }
      }
    }
    catch(err){
      helper.ErrorResponseWithoutData(res,err.message)
    }
  }
]

/**
 * Rate Your Order
 *
 * @method POST
 * @param {string}      orderId
 * @param {string}      itemId
 * @param {string}      rating
 * @param {string}      review
 *
 * @returns {Object}
 */

exports.rateSellingOrder = [
  body("orderId").exists().notEmpty().withMessage("Order Id Is required!"),
  body("itemId").exists().notEmpty().withMessage("Item Id Is required!"),
  body("rating").exists().notEmpty().withMessage("Rating Is required!")
  ,async(req,res)=>{
    try{
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
         helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
      }
      else{
          let order = await SELLINGORDERTABLE.findOne({'_id':req.body.orderId})
          if(order){
          if(order.customerId.toString() == req.userData._id.toString())
          {
          // if(order.evaluation.rating == 0)
          // {
          let update = await SELLINGORDERTABLE.findByIdAndUpdate({'_id':req.body.orderId,"cartItems":{"$elemMatch":{"itemId":req.body.itemId}}},{
            $set:{
              'cartItems.$[outer].evaluation.rating' : req.body.rating,
              'cartItems.$[outer].evaluation.review' :(req.body.review)?req.body.review:''
            }
          },{new:true,"arrayFilters": [
                        { "outer.itemId": ObjectId(req.body.itemId) }
                      
                        ]})
       if(update){
         helper.successResponseWithData(res,'Successfully Saved Rating and Review!',update)
       }
       else{
            helper.ErrorResponseWithoutData(res,"Either Order ID not Found or problem to save the Rating and Review!")
       }
     // }else
     // {
     //  helper.ErrorResponseWithoutData(res,"You can rate order only one time")
     // }
      }else{
        helper.ErrorResponseWithoutData(res,"This order is not placed by You")
      }
    }else{
      helper.ErrorResponseWithoutData(res,"No Order Found With this order Id")
    }
      }
    }
    catch(err){
      helper.ErrorResponseWithoutData(res,err.message)
    }
  }
]