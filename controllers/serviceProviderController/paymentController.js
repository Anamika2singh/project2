//helper file to prepare responses.
const config = require('../../config/app')
const apiResponse = require("../../helpers/apiResponse");
var empty = require('is-empty');
var axios = require('axios');
const utility = require("../../helpers/utility");
const { body,validationResult } = require("express-validator");
const PROVIDERTABLE = require('../../models/provider');
const USERTABLE = require('../../models/user');
const SUBSCRIPTION = require('../../models/subscription');
const WEBHOOKTABLE = require('../../models/webhook');
const moment = require('moment');
const stripe = require('stripe')(config.STRIPE_KEY);
exports.createAccount = async(req,res)=>{
    try{
        let providerDetail = await PROVIDERTABLE.findOne({"_id":req.userData._id})
        var account;
        
        if(!empty(providerDetail.stripeAccountId))
        {
             account = providerDetail.stripeAccountId
        }
        else{
             const accountData = await stripe.accounts.create({
                type: 'standard'
              });
             if(!empty(accountData))
             {
                account = accountData.id
                let updated = await  PROVIDERTABLE.findByIdAndUpdate({ _id: req.userData._id },{ $set:{stripeAccountId:account}}) 
             }
              
        }
        console.log(account)
    const accountLinks = await stripe.accountLinks.create({
    account: account,
    refresh_url: 'https://api.valetit.uk:3000/payment/refreshURL/'+req.userData._id,
    return_url: 'https://api.valetit.uk:3000/payment/returnURL/'+req.userData._id,
    type: 'account_onboarding',
  });
  if(!empty(accountLinks))
  {
    apiResponse.successResponseWithData(res,"Account Creation URL generated successfully!",accountLinks) 
  }
             
      }
      catch(err){
        console.log(err)
        apiResponse.ErrorResponseWithoutData(res,err.message)
      }
    }

    exports.refreshURL = async(req,res)=>{
        try{
            let providerDetail = await PROVIDERTABLE.findOne({"_id":req.params.providerId})
            var account;
            
            if(!empty(providerDetail.stripeAccountId))
            {
                 account = providerDetail.stripeAccountId
            }
            else{
                 const accountData = await stripe.accounts.create({
                    type: 'standard'
                  });
                 if(!empty(accountData))
                 {
                    account = accountData.id
                    let updated = await  PROVIDERTABLE.findByIdAndUpdate({ _id:  req.params.providerId },{ $set:{stripeAccountId:account}}) 
                 }
                  
            }
            // console.log(account)
        const accountLinks = await stripe.accountLinks.create({
        account: account,
        refresh_url: 'https://api.valetit.uk:3000/payment/refreshURL/'+req.params.providerId,
        return_url: 'https://api.valetit.uk:3000/payment/returnURL/'+req.params.providerId,
        type: 'account_onboarding',
      });
      if(!empty(accountLinks.url))
      {
          res.redirect(accountLinks.url) 
      }
    
    //   apiResponse.successResponseWithData(res,"Pictures Found Successfully!",accountLinks)
                 
          }
          catch(err){
            console.log(err)
            apiResponse.ErrorResponseWithoutData(res,err.message)
          }
        }
exports.returnURL = async(req,res)=>{
    try{
        let providerDetail = await PROVIDERTABLE.findOne({"_id":req.params.providerId})
        const account = await stripe.accounts.retrieve(
                          providerDetail.stripeAccountId
                        );
        console.log(account.details_submitted)
        if(!empty(account.details_submitted) && account.details_submitted == true)
        {
            let updated = await  PROVIDERTABLE.findByIdAndUpdate({ _id: req.params.providerId },{ $set:{stripeAccountSetup:1}})
            res.status(200).json({
                status: 200,
                message: "Hey, Your Account setup has completed. Now you can continue with app."
            })
        }
        else{
            res.status(450).json({
                status: 450,
                message: "Your account setup has not completed. Please complete this process to use VALET-IT services."
            })
        }
        }
        catch(err){
        console.log(err)
        apiResponse.ErrorResponseWithoutData(res,err.message)
        }
    }
    exports.test = async(req,res)=>{
    try{
   // const charge = await stripe.charges.create({
   //                            amount: 2000,
   //                            currency: 'gbp',
   //                            customer:"cus_JTsXMp1u4f3ki3",
   //                            source: "card_1IqwroK7vCVUGgNeRjLGgiSZ",
   //                            description: 'My First Test Charge (created for API docs)',
   //                          });     

// const account = await stripe.charges.capture(
//   'ch_1J9m8LK7vCVUGgNezkXCqt4W'
// );
const paymentMethod = await stripe.paymentMethods.create({
  type: 'card',
  card: {
    number: '4242424242424242',
    exp_month: 7,
    exp_year: 2022,
    cvc: '314',
  },
});
apiResponse.successResponseWithData(res,"Pictures Found Successfully!",paymentMethod)
        }
        catch(err){
        console.log(err)
        apiResponse.ErrorResponseWithoutData(res,err.message)
        }
    }

  exports.providerAppleReceipt =[
    body("receiptData").trim().exists().notEmpty().withMessage("Receipt Data is required."),
     async(req,res)=>{
        
         //console.log('apple receipt data',req.body.receiptData)
         const errors = validationResult(req);
      if (!errors.isEmpty()) {                
         apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
      }else{
        var data = req.body.receiptData
        let bodyData = {
            "receipt-data":data,
            "password":config.APPLE_SECRET_KEY,
            "exclude-old-transactions":true
        }
        axios.post('https://buy.itunes.apple.com/verifyReceipt',bodyData).then(function(resp){
             //console.log("axios apple",resp)
            if(resp.data.status == 21007){
                axios.post('https://sandbox.itunes.apple.com/verifyReceipt',bodyData).then(function(resp){
                   // console.log('sandbox',resp)
                    createTransaction(resp);
                    // return res.status(200).json({ 
                    //     status:'success',
                    //     message:__("YOUR_ACCOUNT_HAS_BEEN_UPGRADED"),
                    //     resp:resp.data
                    // })
                }).catch(error=>{
                    console.log('error',error)
                    apiResponse.ErrorResponseWithoutData(res,"Something Went Wrong!")
                })
            }else{
                createTransaction(resp);
            }
        }).catch(error=>{
            console.log('error',error)
            apiResponse.ErrorResponseWithoutData(res,"Something Went Wrong!")
        })

        async function createTransaction(resp){
            if(resp.data.status == 0){
                let latest_receipt_info = resp.data.latest_receipt_info[0]
                let transactionData = {
                    userId:req.userData._id,
                    userType:"serviceProvider",
                    appleReceiptData:data,
                    productId:latest_receipt_info.product_id,
                    appleTransactionId:latest_receipt_info.transaction_id,
                    appleOriginalTransactionId:latest_receipt_info.original_transaction_id,
                    purchaseDate:latest_receipt_info.purchase_date_ms,
                    expiryDate:latest_receipt_info.expires_date_ms,
                    appleSubscriptionGroupIdentifier:latest_receipt_info.subscription_group_identifier,
                    purchaseFrom:"ios"
                }
            if(latest_receipt_info.product_id == "com.app.valetIT.OneMonth")
                var premiumType = 1
            else if(latest_receipt_info.product_id == "com.app.valetIT.SixMonths")
                var premiumType = 2
            else if(latest_receipt_info.product_id == "com.app.valetIT.OneYear")
                var premiumType = 3
            else
                var premiumType = 0
                SUBSCRIPTION.create(transactionData).then( async subscriptionDetail=>{
                        let subscribed = await PROVIDERTABLE.findByIdAndUpdate({"_id":req.userData._id},{$set:{isPremium:premiumType}},{new:true})
                        if(subscribed.isPremium >=1 && subscribed.isPremium <=3)
                            apiResponse.successResponseWithData(res,"Your Account is upgraded successfully!",{isPremium:subscribed.isPremium,expiryDate:moment(subscriptionDetail.expiryDate).format("DD/MM/YYYY")})
                        else
                            apiResponse.ErrorResponseWithoutData(res,"Something Went Wrong")
                    }).catch(err=>{
                       console.log(err)
                       apiResponse.ErrorResponseWithoutData(res,"Something Went Wrong")
                    })
            
                
            }else{
                apiResponse.ErrorResponseWithoutData(res,"Something Went Wrong")
            }
        }
    }
    }]

    exports.customerAppleReceipt =[
    body("receiptData").trim().exists().notEmpty().withMessage("Receipt Data is required."),
     async(req,res)=>{
         const errors = validationResult(req);
      if (!errors.isEmpty()) {                
         apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
      }else{
        var data = req.body.receiptData
        let bodyData = {
            "receipt-data":data,
            "password":config.APPLE_SECRET_KEY,
            "exclude-old-transactions":true
        }
        axios.post('https://buy.itunes.apple.com/verifyReceipt',bodyData).then(function(resp){
             //console.log("axios apple",resp)
            if(resp.data.status == 21007){
                axios.post('https://sandbox.itunes.apple.com/verifyReceipt',bodyData).then(function(resp){
                   // console.log('sandbox',resp)
                    createTransaction(resp);
                    // return res.status(200).json({ 
                    //     status:'success',
                    //     message:__("YOUR_ACCOUNT_HAS_BEEN_UPGRADED"),
                    //     resp:resp.data
                    // })
                }).catch(error=>{
                    console.log('error',error)
                    apiResponse.ErrorResponseWithoutData(res,"Something Went Wrong!")
                })
            }else{
                createTransaction(resp);
            }
        }).catch(error=>{
            console.log('error',error)
            apiResponse.ErrorResponseWithoutData(res,"Something Went Wrong!")
        })

        async function createTransaction(resp){
            if(resp.data.status == 0){
                let latest_receipt_info = resp.data.latest_receipt_info[0]
                let transactionData = {
                    userId:req.userData._id,
                    userType:"customer",
                    appleReceiptData:data,
                    productId:latest_receipt_info.product_id,
                    appleTransactionId:latest_receipt_info.transaction_id,
                    appleOriginalTransactionId:latest_receipt_info.original_transaction_id,
                    purchaseDate:latest_receipt_info.purchase_date_ms,
                    expiryDate:latest_receipt_info.expires_date_ms,
                    appleSubscriptionGroupIdentifier:latest_receipt_info.subscription_group_identifier,
                    purchaseFrom:"ios"
                }
            if(latest_receipt_info.product_id == "com.app.valetIT.CustomerOneMonth")
                var premiumType = 1
            else
                var premiumType = 0
                SUBSCRIPTION.create(transactionData).then( async subscriptionDetail=>{
                        let subscribed = await USERTABLE.findByIdAndUpdate({"_id":req.userData._id},{$set:{isPremium:premiumType}},{new:true})
                        if(subscribed.isPremium ==1)
                            apiResponse.successResponseWithData(res,"Your Account is upgraded successfully!",{isPremium:subscribed.isPremium,expiryDate:moment(subscriptionDetail.expiryDate).format("DD/MM/YYYY")})
                        else
                            apiResponse.ErrorResponseWithoutData(res,"Something Went Wrong")
                    }).catch(err=>{
                       console.log(err)
                       apiResponse.ErrorResponseWithoutData(res,"Something Went Wrong")
                    })
            
                
            }else{
                apiResponse.ErrorResponseWithoutData(res,"Something Went Wrong")
            }
        }
    }
    }]

    exports.customerGoogleReceipt = [
    body("orderId").trim().exists().notEmpty().withMessage("Order ID is required."),
    body("productId").trim().exists().notEmpty().withMessage("Product ID is required."),
    body("purchaseToken").trim().exists().notEmpty().withMessage("Purchase Token is required."),
    body("purchaseDate").trim().exists().notEmpty().withMessage("Purchase Date is required."),
    body("expiryDate").trim().exists().notEmpty().withMessage("Expiry Date is required."),
    
    async(req,res)=>{
        try{
            let data = req.body;
            // Extract the validation errors from a request.
      const errors = validationResult(req);
      if (!errors.isEmpty()) {                
        apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
      }
      else
      {
        if(data.productId != "cust_1month_item")
           apiResponse.validationError(res,"Invalid Product Id.")
        else{
            if(data.productId == "cust_1month_item")
                var premiumType = 1
        
                    SUBSCRIPTION.create({
                        userId:req.userData._id,
                        userType:"customer",
                        purchaseFrom:"android",
                        androidOrderId:data.orderId,
                        productId:data.productId,
                        androidPurchaseToken:data.purchaseToken,
                        purchaseDate:data.purchaseDate,
                        expiryDate:data.expiryDate
                    }).then( async subscriptionDetail=>{
                        let subscribed = await USERTABLE.findByIdAndUpdate({"_id":req.userData._id},{$set:{isPremium:premiumType}},{new:true})
                        if(subscribed.isPremium ==1)
                            apiResponse.successResponseWithData(res,"Your Account is upgraded successfully!",{isPremium:subscribed.isPremium,expiryDate:moment(subscriptionDetail.expiryDate).format("DD/MM/YYYY")})
                        else
                            apiResponse.ErrorResponseWithoutData(res,"Something Went Wrong")
                    }).catch(err=>{
                       console.log(err)
                       apiResponse.ErrorResponseWithoutData(res,"Something Went Wrong")
                    })
            }
        }
        }catch(err)
        {   
            console.log(err.message)
            apiResponse.ErrorResponseWithoutData(res,"Something Went Wrong");
        }
    }
    ];

    exports.providerGoogleReceipt = [
    body("orderId").trim().exists().notEmpty().withMessage("Order ID is required."),
    body("productId").trim().exists().notEmpty().withMessage("Product ID is required."),
    body("purchaseToken").trim().exists().notEmpty().withMessage("Purchase Token is required."),
    body("purchaseDate").trim().exists().notEmpty().withMessage("Purchase Date is required."),
    body("expiryDate").trim().exists().notEmpty().withMessage("Expiry Date is required."),
    
    async(req,res)=>{
        try{
            let data = req.body;
            // Extract the validation errors from a request.
      const errors = validationResult(req);
      if (!errors.isEmpty()) {                
        apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
      }
      else
      {
        if((data.productId != "1_month_sub") && (data.productId != "6_months_sub") && (data.productId != "1_year_sub"))
           apiResponse.validationError(res,"Invalid Product Id.")
        else{
            if(data.productId == "1_month_sub")
                var premiumType = 1
            else if(data.productId == "6_months_sub")
                var premiumType = 2
            else if(data.productId == "1_year_sub")
                var premiumType = 3
        
                    SUBSCRIPTION.create({
                        userId:req.userData._id,
                        userType:"serviceProvider",
                        purchaseFrom:"android",
                        androidOrderId:data.orderId,
                        productId:data.productId,
                        androidPurchaseToken:data.purchaseToken,
                        purchaseDate:data.purchaseDate,
                        expiryDate:data.expiryDate
                    }).then( async subscriptionDetail=>{
                        let subscribed = await PROVIDERTABLE.findByIdAndUpdate({"_id":req.userData._id},{$set:{isPremium:premiumType}},{new:true})
                        if(subscribed.isPremium >=1 && subscribed.isPremium <=3)
                            apiResponse.successResponseWithData(res,"Your Account is upgraded successfully!",{isPremium:subscribed.isPremium,expiryDate:moment(subscriptionDetail.expiryDate).format("DD/MM/YYYY")})
                        else
                            apiResponse.ErrorResponseWithoutData(res,"Something Went Wrong")
                    }).catch(err=>{
                       console.log(err)
                       apiResponse.ErrorResponseWithoutData(res,"Something Went Wrong")
                    })
            }
        }
        }catch(err)
		{	
            console.log(err.message)
			apiResponse.ErrorResponseWithoutData(res,"Something Went Wrong");
		}
    }
    ];
    exports.appleWebHook = async(req,res)=>{
        try{
            if(req.body){
               let body =  JSON.stringify(req.body) // body sent by server
                console.log('apple web hook body',body)
               //finding record in subscription
               var subscription=await SUBSCRIPTION.findOne({"appleOriginalTransactionId":req.body.latest_receipt_info.original_transaction_id})
               
               let purchaseDate=req.body.latest_receipt_info.purchase_date?req.body.latest_receipt_info.purchase_date:'';
               let expiryDate=req.body.latest_receipt_info.expires_date?req.body.latest_receipt_info.expires_date:'';
               let productId=req.body.latest_receipt_info.product_id?req.body.latest_receipt_info.product_id:'';
               if(productId == "com.app.valetIT.OneMonth")
               {
                var userType = "serviceProvider"
                var premiumType = 1
               }
               else if(productId == "com.app.valetIT.SixMonths")
               {
                var userType = "serviceProvider"
                var premiumType = 2
               }
               else if(productId == "com.app.valetIT.OneYear")
               {
                var userType = "serviceProvider"
                var premiumType = 3
               }
               else if(productId == "com.app.valetIT.CustomerOneMonth")
               {
                var userType = "customer"
                var premiumType = 1
               }else{                
                var premiumType = 0
               }
               if(subscription){ // subscription
                 let create = await WEBHOOKTABLE.create({
                    'userId':subscription.userId,
                    "userType":userType,
                    "purchaseFrom":"ios",
                    'response':body
                  })
                    let subscriptionStatus;
                    if(req.body.notification_type.toString() == "CANCEL"){
                        //Indicates that either Apple customer support canceled the subscription or the user upgraded their 
                        //subscription. The cancellation_date key contains the date and time of the change.
                        //updating status to 0
                        subscriptionStatus=0;
                    }else if(req.body.notification_type.toString() == "DID_CHANGE_RENEWAL_PREF"){
                        //Indicates the customer made a change in their subscription plan that takes effect at the next renewal. 
                        //The currently active plan is not affected.
                        //updating status to 1
                        subscriptionStatus=premiumType;
                  }else if(req.body.notification_type.toString() == "DID_CHANGE_RENEWAL_STATUS"){
                        //Indicates a change in the subscription renewal status. 
                        //Check auto_renew_status_change_date_ms and auto_renew_status in the JSON response to know the date 
                        //and time of the last status update and the current renewal status.
                        subscriptionStatus=premiumType;
                    }else if(req.body.notification_type.toString() == "DID_FAIL_TO_RENEW"){
                        // Indicates a subscription that failed to renew due to a billing issue. 
                        //Check is_in_billing_retry_period to know the current retry status of the subscription, 
                        //and grace_period_expires_date to know the new service expiration date if the subscription 
                        //is in a billing grace period.
                        //   updating status to 0
                        subscriptionStatus=0;
                    }else if(req.body.notification_type.toString() == "DID_RECOVER"){
                        // Indicates a successful automatic renewal of an expired subscription that failed to renew in the past.
                        // Check expires_date to determine the next renewal date and time.
                        //   updating status to 1
                        subscriptionStatus=premiumType;
                    }else if(req.body.notification_type.toString() == "RENEWAL"){
                        //Indicates a successful automatic renewal of an expired subscription that failed to renew in the past. 
                        //Check expires_date to determine the next renewal date and time.
                        //   updating status to 1
                        subscriptionStatus=premiumType;
                    }
                  // updating subscription status
                  if(userType == "customer")
                  {
                   let updateUser = await USERTABLE.findByIdAndUpdate({'_id':subscription.userId},{$set:{"isPremium":premiumType}},{new:true})
                  }else if(userType == "serviceProvider"){
                    let updateUser = await PROVIDERTABLE.findByIdAndUpdate({'_id':subscription.userId},{$set:{"isPremium":premiumType}},{new:true})
                   }
                   if(!empty(updateUser))
                   {
                    apiResponse.successResponse(res,"Subscription updated!");
                   }else{
                    apiResponse.ErrorResponseWithoutData(res,"Something Went Wrong");
                   }
                   let updateHistory = await SUBSCRIPTION.findByIdAndUpdate({'_id':subscription._id},{$set:{productId:productId,purchaseDate:purchaseDate,expiryDate:expiryDate}})
               }else{ // subscription not found with original transaction id
                  let create = await WEBHOOKTABLE.create({
                    "userType":userType,
                    "purchaseFrom":"ios",
                    'response':body
                  })
                  apiResponse.ErrorResponseWithoutData(res,"Transaction History not found");
               }
            }else{
                console.log('body is empty')
            }
         }catch(e){
            console.log(e)
            apiResponse.ErrorResponseWithoutData(res,"Something Went Wrong");
         }
    }
    exports.providerGoogleWebHook = [
    async(req,res)=>{
        try{
            console.log('google web hook body',req.body)
            let buff = new Buffer(req.body.message.data, 'base64');
            let strData = buff.toString('ascii');
            var data = JSON.parse(strData);
            console.log('google web hook body',data)

            console.log(data.subscriptionNotification,'========>Notification')
            if(!data.testNotification && data.subscriptionNotification.notificationType){
                let subscription= await SUBSCRIPTION.findOne({"purchaseToken":data.subscriptionNotification.purchaseToken});
            if(subscription.productId == "1_month_sub")
                var premiumType = 1
            else if(subscription.productId == "6_months_sub")
                var premiumType = 2
            else if(subscription.productId == "1_year_sub")
                var premiumType = 3
                if(subscription.length>0){ // if record found
                    let subscriptionStatus = -1;
                    let insert = await WEBHOOKTABLE.create
                                    ({
                                       userId:subscription.userId,
                                       userType:"serviceProvider",
                                       purchaseFrom:"android",
                                       response: JSON.stringify(data)
                                    })
                    //await db.query("INSERT INTO web_hook (user_id , response) VALUES (?,?)",[auth.userID ,JSON.stringify(data)]);
                    if(data.subscriptionNotification.notificationType==1){       //SUBSCRIPTION_RECOVERED 
                        subscriptionStatus= 1;
                    }else if(data.subscriptionNotification.notificationType==2){ //SUBSCRIPTION_RENEWED 
                        subscriptionStatus= 1;
                    }else if(data.subscriptionNotification.notificationType==3){//SUBSCRIPTION_CANCELED 
                        subscriptionStatus= 0;
                    }else if(data.subscriptionNotification.notificationType==4){ // SUBSCRIPTION_PURCHASED
                        subscriptionStatus= 1;
                    }else if(data.subscriptionNotification.notificationType==5){ //SUBSCRIPTION_ON_HOLD  
                        subscriptionStatus= 0;
                    }else if(data.subscriptionNotification.notificationType==6){ //SUBSCRIPTION_IN_GRACE_PERIOD 
                        subscriptionStatus= 1;
                    }else if(data.subscriptionNotification.notificationType==7){ //SUBSCRIPTION_RESTARTED 
                        subscriptionStatus= 1;
                    }else if(data.subscriptionNotification.notificationType==8){ //SUBSCRIPTION_PRICE_CHANGE_CONFIRMED 
                        subscriptionStatus= 1;
                    }else if(data.subscriptionNotification.notificationType==9){ //SUBSCRIPTION_DEFERRED 
                        subscriptionStatus= 1;
                    }else if(data.subscriptionNotification.notificationType==10){ //SUBSCRIPTION_PAUSED 
                        subscriptionStatus= 0;
                    }else if(data.subscriptionNotification.notificationType==11){ //SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED
                        subscriptionStatus= 0;
                    }else if(data.subscriptionNotification.notificationType==12){ //SUBSCRIPTION_REVOKED 
                        subscriptionStatus= 0;
                    }else if(data.subscriptionNotification.notificationType==13){ //SUBSCRIPTION_EXPIRED 
                        subscriptionStatus= 0;
                    }

                    if(subscriptionStatus === 1){
                        let subscribed = await PROVIDERTABLE.findByIdAndUpdate({"_id":subscription.userId},{$set:{isPremium:premiumType},new:true})
                    }else if (subscriptionStatus === 0)
                    {
                        let subscribed = await PROVIDERTABLE.findByIdAndUpdate({"_id":subscription.userId},{$set:{isPremium:0},new:true})
                    }
                }       
              }
               apiResponse.successResponse(res,"Subscription updated!");
        } catch(err){
            console.log('error',err)
            apiResponse.ErrorResponse(res, err.message,{});
        }
    }
]