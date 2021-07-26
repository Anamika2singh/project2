const express = require('express')
const router = express.Router()
const indexController = require('../controllers/indexController')
const verifyToken = require('../middlewares/userMiddleware')
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

router.get('/listCar',indexController.listCar)
router.get('/privacyPolicy', function(req, res) {
     res.render('privacy-policy');
});

router.get('/aboutUs', function(req, res) {
    res.render('about-us');
});
router.get('/helpAndSupportPolicy', function(req, res) {
    res.render('help-support');
})
router.get('/termsAndConditionPolicy',indexController.termsAndConditionPolicy)
router.get('/paymentAndRefundPolicy',indexController.paymentAndRefundPolicy)

module.exports = router;