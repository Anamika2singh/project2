const express = require('express')
const router = express.Router()
const authController = require('../../controllers/customerController/authController')
const verifyToken = require('../../middlewares/userMiddleware')
const verifyUser = require('../../middlewares/verifyUserMiddleware')
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

router.post('/verifyEmail',authController.verifyEmail)
router.post('/signUp',upload.any(),authController.signUp)
router.post('/logIn',upload.any(),authController.logIn)
router.post('/socialAuthentication',upload.any(),authController.socialAuthentication)
router.get('/getUser',verifyToken,verifyUser,authController.getUser)
router.post('/updateProfile',verifyToken,verifyUser,upload.single('image'),authController.updateProfile);
router.post('/changePassword',verifyToken,verifyUser,upload.any(),authController.changePassword)
router.post('/sendPasswordResetEmail',upload.any(),authController.sendPasswordResetEmail)
router.post('/sendAdminPasswordResetEmail',upload.any(),authController.sendAdminPasswordResetEmail)
router.post("/resetPassword",authController.resetPassword);
router.get("/verifyToken/:token",authController.verifyToken);
router.post('/deleteAccount',verifyToken,verifyUser,authController.deleteAccount)
router.get('/checkEmailVerification/:customerId',authController.checkEmailVerification)
router.post('/sendOtpToCustomerEmail',verifyToken,verifyUser,authController.sendOtpToCustomerEmail)
router.post('/verifyOtp',verifyToken,verifyUser,authController.verifyOtp)

router.get('/clearDeviceToken',verifyToken,verifyUser,authController.clearDeviceToken)

module.exports = router;