const express = require('express')
const router = express.Router()
const authController = require('../../controllers/serviceProviderController/authController')
const verifyToken = require('../../middlewares/providerMiddleware')
const verifyProvider = require('../../middlewares/verifyProviderMiddleware')
var multer = require("multer");

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/images/" , function(err , succ) {
            if(err)
                throw err

        });
    },
    filename: function (req, file, cb) {        
        var name  = (Date.now()+ Date.now() +file.originalname);
        name = name.replace(/ /g,'-');       
        cb(null, name , function(err , succ1) {
            if(err)
                throw err
        });
    }
});
const upload = multer({ storage: storage, limits: 1000000});

var cpUpload = upload.fields([{ name: 'profile', maxCount: 1 }, { name: 'document', maxCount: 1 }])

router.post('/signUp',cpUpload,authController.signUp)
router.get('/getProvider',verifyToken,verifyProvider,authController.getProvider)
router.post('/updateProfile',verifyToken,verifyProvider,cpUpload,authController.updateProfile);
router.post('/changePassword',verifyToken,verifyProvider,upload.any(),authController.changePassword)
router.post('/addToGallery',verifyToken,verifyProvider,upload.array('gallery'),authController.addToGallery)
router.post('/deleteFromGallery',verifyToken,verifyProvider,authController.deleteFromGallery)
router.get('/viewGallery',verifyToken,verifyProvider,authController.viewGallery)
router.post('/deleteAccount',verifyToken,verifyProvider,authController.deleteAccount)
router.get('/checkEmailVerification/:providerId',authController.checkEmailVerification)
router.post('/sendProviderAccountVerificationEmail',authController.sendProviderAccountVerificationEmail)
router.post('/sendOtpToProviderEmail',verifyToken,verifyProvider,authController.sendOtpToProviderEmail)
router.post('/verifyOtp',verifyToken,verifyProvider,authController.verifyOtp)
router.get('/clearDeviceToken',verifyToken,verifyProvider,authController.clearDeviceToken)


module.exports = router;