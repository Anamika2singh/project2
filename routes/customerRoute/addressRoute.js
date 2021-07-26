const express = require('express')
const router = express.Router()
const addressController = require('../../controllers/customerController/addressController')
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

router.post('/addNewLocation',verifyToken,verifyUser,addressController.addNewLocation)
router.post('/deleteLocation',verifyToken,verifyUser,addressController.deleteLocation)
router.post('/rangedLocations',verifyToken,verifyUser,addressController.rangedLocations)
router.get('/savedLocations',verifyToken,verifyUser,addressController.savedLocations)

module.exports = router;