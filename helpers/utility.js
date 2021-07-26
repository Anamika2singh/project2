
const config = require('../config/app')

var fs = require('fs');
const AWS = require('aws-sdk');
const jwt = require("jsonwebtoken");
var admin = require('firebase-admin');
var serviceAccount = require("../models/keys/valet-f2361-firebase-adminsdk-rfev9-dc8e3230c2.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://valet-f2361-default-rtdb.firebaseio.com"
});
const s3 = new AWS.S3({
    accessKeyId: config.S3_BUCKET_ACCESS_KEY,
    secretAccessKey: config.S3_BUCKET_SECRET_ACCESS_KEY,
    region:config.S3_BUCKET_REGION
});  


exports.randomNumber = function (length) {
    let random = Math.floor(100000 + Math.random() * 900000);
    return Number(random);
};

exports.uploadFile = (path,fileName,content_type,bucket) => {   
	
    return new Promise( function ( resolve , reject ) {
		// Read content from the file
        //const fileContent = fs.readFileSync(path+fileName);     
        const readStream = fs.createReadStream(path+fileName);
        // Setting up S3 upload parameters       
        // Uploading files to the bucket
        var response = {};
        const params = {
            Bucket: bucket,
            Key: fileName,
            ACL: 'public-read',
            Body: readStream,
            ContentType: content_type                   
        };

        s3.upload(params, async function(err, data) {            
            readStream.destroy();            
            if (err) {
                console.log("Error is here",err);
                response = {
                    message:'error',
                    data: err
                }
            }       

            if(data)
            {
                console.log("Data is here",data);
                fs.unlink(path+fileName, function (err) {
                    if (err) {
                        response = {
                            message:'error',
                            data: err
                        }
                        reject(response);
                    }else{

                        console.log(`File uploaded successfully. ${data.Location}`); 

                        response = {
                            message:'success',
                            data: data.Location
                        }

                        resolve(response);
                    }
                });        
                
            }
            
        });
    });    
};


exports.deleteS3File = (fileName, bucket_name) =>{

    return new Promise(function (resolve, reject){
        var response = {};
        const params = {
            Bucket: bucket_name,
            Key: fileName                             
        };
       
        s3.deleteObject(params, function(err, data) {
            if (err) {

                response = {
                    message:'error',
                    err: err
                }
                reject(response);
            }
            if(data){
             
            response={
                message:"Deleted Successfully.",
                data: data
            }  
            resolve(response);
        }else{
            response = {
                    message:'File Not Found.'
                }
                reject(response);
        }
        });
    });
};
//"notification":{
//     "title":"Portugal vs. Denmark",
//     "body":"great match!"
//   }
// data: {
//     message: msg,
//     title : 'SOCIAL GALAXY',
//     device_type:'android'
// }
//  helpers.sendFCMNotification("c0h8x7yFR2GyrHyxPdzpWH:APA91bF9FYvg-Ir8UF4375nJd658WJ6CZcnmZmpmA9o8I59_2ZXZpw3BxVv1__V_EasVEe7Ne7fRxDbYRBCfkQjddDopa5I5PClC19bFEUXjyjTtFxD6rRgPsznfAI51xj2nbPn3o5dR"," wants to tag you in their post.","android"); 
module.exports.sendFCMNotificationToAndroid = function(data,token)
{   
    
    var message = {};
     console.log(data,token)
            message = {
                data: data,
                token: token
            };    
    // Send a message to only Android devices subscribed to the provided topic.
    admin.messaging().send(message).then((response) => {
        // Response is a message ID string.
        console.log('Successfully sent message:', response);
    })
    .catch((error) => {
        console.log('Error sending message:', error);
    });
}

// data: {
//     message: msg,
//     title : 'SOCIAL GALAXY',
//     device_type:'ios'
// }
module.exports.sendFCMNotificationToIOS = function(notification,data,token)
{   
    console.log("ios",data)
    var message = {}; 
            message = {
                notification: notification,
                data: data,
                apns: {
                    payload: {
                      aps: {
                        badge: 1,
                        sound:'default'
                      },
                    },
                },
                token: token           
            };     

    // Send a message to only IOS devices subscribed to the provided topic.
    admin.messaging().send(message).then((response) => {
        // Response is a message ID string.
        console.log('Successfully sent message:', response);
    })
    .catch((error) => {
        console.log('Error sending message:', error);
    });
}

var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
exports.random_base64 = function random_base64(length) {
    var str = "";
    for (var i=0; i < length; ++i) {
        var rand = Math.floor(Math.random() * ALPHABET.length);
        str += ALPHABET.substring(rand, rand+1);
    }
    return str;
}


exports.calcDistance= function (lat1, lon1, lat2, lon2) 
//This function takes in latitude and longitude of two location and returns the distance between them as the crow flies (in km)

 {
   var R = 6371; // Radius of the earth in km
   var dLat = toRad(lat2-lat1);
   var dLon = toRad(lon2-lon1);
   var lat1 = toRad(lat1);
   var lat2 = toRad(lat2);

   var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
     Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
   var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
   var d = R * c;
   return d;
 }

//  Converts numeric degrees to radians
 function toRad(Value) 
 {
     return Value * Math.PI / 180;
 }