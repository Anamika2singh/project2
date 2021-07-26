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

exports.addWorkingHour= [
  body("day").trim().exists().notEmpty().withMessage("day is required!"),
  body("startTime").trim().exists().notEmpty().withMessage("startTime is required!"),
  body("endTime").trim().exists().notEmpty().withMessage("EndTime is required!"),
    async(req,res)=>{
      try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
           helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }
        else{
           var startTime = req.body.startTime.split(" ")
           var endTime = req.body.endTime.split(" ")
           var startHour = parseInt(req.body.startTime.split(":")[0])
           var startMinute = parseInt(req.body.startTime.split(":")[1])
           var endHour = parseInt(req.body.endTime.split(":")[0])
           var endMinute = parseInt(req.body.endTime.split(":")[1])
           var startDuration = startHour * 60 + startMinute
           var endDuration = endHour * 60 + endMinute
           var slots = []
           var flag = 0
           //console.log(startDuration,endDuration)
           if((endDuration - startDuration) < 60){
            helper.ErrorResponseWithoutData(res,"Please Enter Valid Start Time and End Time of minimum 1 hour Duration.")
          }else{
              let found = await PROVIDERTABLE.findOne({"_id":req.userData._id,
              "workingHours":{"$elemMatch":{"day":parseInt(req.body.day)}}})

      if(found){ //if day is present
        for(let day of found.workingHours)
        {
          if(day.day == req.body.day){
          for(let times of day.timeSlot)
          {
            // console.log("timessss",times)
            var storedStartTime = times.startTime.split(" ")
           var storedEndTime = times.endTime.split(" ")
           var storedStartHour = parseInt(times.startTime.split(":")[0])
           var storedStartMinute = parseInt(times.startTime.split(":")[1])
           var storedEndHour = parseInt(times.endTime.split(":")[0])
           var storedEndMinute = parseInt(times.endTime.split(":")[1])
           var storedStartDuration = storedStartHour * 60 + storedStartMinute
           var storedEndDuration = storedEndHour * 60 + storedEndMinute
           //console.log(storedStartDuration,storedEndDuration)
           if((startDuration > endDuration) || (startDuration>=storedStartDuration && startDuration<storedEndDuration) || (endDuration>storedEndDuration && endDuration<=storedEndDuration) || (startDuration<storedStartDuration && endDuration>storedStartDuration))
            flag = 1
        }
          }
        }
        if(flag== 0){
          while(startDuration<endDuration && ((endDuration - startDuration) >= 60))
           {
            
            slots.push({
              startTime:((startDuration - startMinute)/60<12)?(('0'+(startDuration - startMinute)/60).slice(-2)+":"+('0'+startMinute).slice(-2)):(('0'+(startDuration - startMinute)/60).slice(-2)+":"+('0'+startMinute).slice(-2)),
              endTime  :(((startDuration - startMinute)/60)+1<12)?(('0'+(((startDuration - startMinute)/60)+1)).slice(-2)+":"+('0'+startMinute).slice(-2)):(('0'+(((startDuration - startMinute)/60)+1)).slice(-2)+":"+('0'+startMinute).slice(-2))
            })
          
            startDuration = startDuration + 60
           } 
            var update = await PROVIDERTABLE.findByIdAndUpdate({"_id":req.userData._id,
            "workingHours":{"$elemMatch":{"day":parseInt(req.body.day)}}},
            {
              "$push":{
              "workingHours.$[inner].timeSlot":{
                                startTime: (('0'+startHour).slice(-2)+":"+('0'+startMinute).slice(-2)),
                                endTime: (('0'+endHour).slice(-2)+":"+('0'+endMinute).slice(-2)),
                                slots:slots
                                }
            }
          },
            {  new: true,"arrayFilters": [
              { "inner.day": parseInt(req.body.day) }
              ] }
            );
  
            
         if(update){
          helper.successResponseWithData(res,"working hours Added Successfully!",update.workingHours)
        }
        else{
         helper.ErrorResponseWithoutData(res,"Some Problem Occured During Adding working hours!")
             } 
  
          }else{
            helper.ErrorResponseWithoutData(res,"Please Enter Valid Start Time and End Time!")
          }
        }
        else{ //when user enters timeslot of new day  
         while(startDuration<endDuration && ((endDuration - startDuration) >= 60))
           {
            
            slots.push({
              startTime:((startDuration - startMinute)/60<12)?(('0'+(startDuration - startMinute)/60).slice(-2)+":"+('0'+startMinute).slice(-2)):(('0'+(startDuration - startMinute)/60).slice(-2)+":"+('0'+startMinute).slice(-2)),
              endTime  :(((startDuration - startMinute)/60)+1<12)?(('0'+(((startDuration - startMinute)/60)+1)).slice(-2)+":"+('0'+startMinute).slice(-2)):(('0'+(((startDuration - startMinute)/60)+1)).slice(-2)+":"+('0'+startMinute).slice(-2))
            })
          
            startDuration = startDuration + 60
           }
          if(!empty(req.body.applyForAll) && req.body.applyForAll == 1)
          {
            var tmpWorkingHour = []
            for(let k=1 ;k<=7;k++)
            {
              tmpWorkingHour.push({
                       day: k,
                       timeSlot:[{
                        startTime: (('0'+startHour).slice(-2)+":"+('0'+startMinute).slice(-2)),
                        endTime: (('0'+endHour).slice(-2)+":"+('0'+endMinute).slice(-2)),
                        slots:slots
                        }]
              })
            }
            // console.log(tmpWorkingHour)
         var update = await PROVIDERTABLE.findByIdAndUpdate({'_id':req.userData._id},{
           $push:{ workingHours:tmpWorkingHour
              } },{new:true})
            
          }else{
         var update = await PROVIDERTABLE.findByIdAndUpdate({'_id':req.userData._id},{
           $push:{ workingHours:{
                       day:parseInt(req.body.day),
                       timeSlot:[{
                        startTime: (('0'+startHour).slice(-2)+":"+('0'+startMinute).slice(-2)),
                        endTime: (('0'+endHour).slice(-2)+":"+('0'+endMinute).slice(-2)),
                        slots:slots
                        }]
  
                 }
              } },{new:true})
       }
           
         if(update){
          
          helper.successResponseWithData(res,"working hours Added Successfully!",update.workingHours)
        }
        else{
         helper.ErrorResponseWithoutData(res,"Some Problem Occured During Adding working hours!")
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


exports.editWorkingHour =[
    body("day").trim().exists().notEmpty().withMessage("day is required!"),
     async(req,res)=>{
      try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
           helper.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }
        else{

           var flag =0;
          var set = {}
          var match = {'_id':req.userData._id,
                    'workingHours.day':parseInt(req.body.day)}
          if(!empty(req.body.startTime) && !empty(req.body.endTime))
          {
           var startTime = req.body.startTime.split(" ")
           var endTime = req.body.endTime.split(" ")
           var startHour = parseInt(req.body.startTime.split(":")[0])
           var startMinute = parseInt(req.body.startTime.split(":")[1])
           var endHour = parseInt(req.body.endTime.split(":")[0])
           var endMinute = parseInt(req.body.endTime.split(":")[1])
           var startDuration = startHour * 60 + startMinute
           var endDuration = endHour * 60 + endMinute
           console.log(startHour,startDuration)
           var slots = []
           if((endDuration - startDuration) < 60){
            helper.ErrorResponseWithoutData(res,"Please Enter Valid Start Time and End Time of minimum 1 hour Duration.")
          }else{
            let found = await PROVIDERTABLE.findOne({"_id":req.userData._id,
              "workingHours":{"$elemMatch":{"day":parseInt(req.body.day)}}})
            if(found){
          for(let day of found.workingHours)
          {
            if(day.day == req.body.day){
          for(let times of day.timeSlot)
          {
            if(times._id.toString() == req.body.timeSlotId)
              continue;
            // console.log("timessss",times)
            var storedStartTime = times.startTime.split(" ")
           var storedEndTime = times.endTime.split(" ")
           var storedStartHour = parseInt(times.startTime.split(":")[0])
           var storedStartMinute = parseInt(times.startTime.split(":")[1])
           var storedEndHour = parseInt(times.endTime.split(":")[0])
           var storedEndMinute = parseInt(times.endTime.split(":")[1])
           var storedStartDuration = storedStartHour * 60 + storedStartMinute
           var storedEndDuration = storedEndHour * 60 + storedEndMinute
           console.log(storedStartDuration,storedEndDuration)
           if((startDuration > endDuration) || (startDuration>=storedStartDuration && startDuration<storedEndDuration) || (endDuration>storedEndDuration && endDuration<=storedEndDuration) || (startDuration<storedStartDuration && endDuration>storedStartDuration))
            flag = 1
        }
          }
        }
        if(flag== 0){
          while(startDuration<endDuration && ((endDuration - startDuration) >= 60))
           {  
            slots.push({
              startTime:((startDuration - startMinute)/60<12)?(('0'+(startDuration - startMinute)/60).slice(-2)+":"+('0'+startMinute).slice(-2)):(('0'+(startDuration - startMinute)/60).slice(-2)+":"+('0'+startMinute).slice(-2)),
              endTime  :(((startDuration - startMinute)/60)+1<12)?(('0'+(((startDuration - startMinute)/60)+1)).slice(-2)+":"+('0'+startMinute).slice(-2)):(('0'+(((startDuration - startMinute)/60)+1)).slice(-2)+":"+('0'+startMinute).slice(-2))
            })
          
            startDuration = startDuration + 60
           } 
            }else{
              helper.ErrorResponseWithoutData(res,"Please Enter Valid Start Time and End Time.This slot is already registered.")
            }
          }
           set = {
                      "workingHours.$.timeSlot.$[inner].startTime" :  (('0'+startHour).slice(-2)+":"+('0'+startMinute).slice(-2)),
                      "workingHours.$.timeSlot.$[inner].endTime" : (('0'+endHour).slice(-2)+":"+('0'+endMinute).slice(-2)),
                      "workingHours.$.timeSlot.$[inner].slots" : slots
                     }
           match["workingHours.timeSlot"] = {"$elemMatch":{"_id":ObjectId(req.body.timeSlotId)}} 
          }
        }
        if(flag==0){
          if(req.body.status)
          {
            set["workingHours.$.status"] = parseInt(req.body.status);
          }
          console.log(set,match)
           let update = await PROVIDERTABLE.findOneAndUpdate(match,
                  {$set:
                    set
                  },
                    {  new: true ,
                      arrayFilters: 
                      [{
                        "inner._id": ObjectId(req.body.timeSlotId)
                      }]
                    }
                    )
               if(update)
               {
                helper.successResponseWithData(res,"Successfully updated Working Hours!",update.workingHours)
               }else
               {
                helper.notFoundResponseWithNoData(res,"Day or Time slot ID Not Found!")
               }
             }
          }
      }
      catch(err){
        helper.ErrorResponseWithoutData(res,err.message)
        console.log(err)
      }
     }
    ]

exports.getWorkingHour=async(req,res)=>{
    try{
        let found = await PROVIDERTABLE.findOne({'_id':ObjectId(req.userData._id)})
        if(found){  
               helper.successResponseWithData(res,"Working Hours Found Successfully!",found.workingHours)
        } 
       else{
         helper.ErrorResponseWithoutData(res,"Service Provider Not Found!")
       }
      }
      catch(err){
        helper.ErrorResponseWithoutData(res,err.message)
    }

}
 
exports.removeWorkingHour=[
    body("day").trim().exists().notEmpty().withMessage("Day is required!"),
    body("timeSlotId").trim().exists().notEmpty().withMessage("TimeSlot ID is required!"),
        async(req,res)=>{
              try{
                const errors = validationResult(req);
            if(!errors.isEmpty()){
                  helper.validationErrorWithData(res,"Validation Errror.",errors.array());
                }
            else{
                    let update = await PROVIDERTABLE.findOneAndUpdate({
                      '_id':req.userData._id,
                      'workingHours.day':req.body.day,
                     "workingHours.timeSlot":{"$elemMatch":{"_id":ObjectId(req.body.timeSlotId)}}
                    },
                    {                
                     $pull:{   
                       "workingHours.$[outer].timeSlot":{"_id":ObjectId(req.body.timeSlotId)}
                        }                  
                      }
 
                      ,{  new: true,"arrayFilters": [
                        { "outer.day": req.body.day },
                      
                        ] }
                      )                  
        if(update){
                for(let day of update.workingHours)
                {
                  if(day.day == req.body.day)
                  {
                    if(day.timeSlot.length <= 0)
                    {
                      let updateStatus = await PROVIDERTABLE.findOneAndUpdate({
                      '_id':req.userData._id,
                      'workingHours.day':req.body.day
                    },
                    {                
                     $pull:{   
                       "workingHours":{"day":req.body.day}
                        }                  
                      }
                      ,{  new: true}
                      )
                      if(updateStatus)
                      {
                        helper.successResponseWithData(res,"Working Hours removed successfully!",updateStatus.workingHours)
                        break;
                      }    
                    }else
                    {
                      helper.successResponseWithData(res,"Working Hours removed successfully!",update.workingHours)
                        break;
                    }
                  }
                }
                  
                  }
          else{
            helper.ErrorResponseWithoutData(res,"Day or TimeSlot ID Not Found!")
          }
                  }
              }
              catch(err){
                helper.ErrorResponseWithoutData(res,err.message)
              }
        }
]