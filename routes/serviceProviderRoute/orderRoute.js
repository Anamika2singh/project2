const express = require('express')
const router = express.Router()
const orderController = require('../../controllers/serviceProviderController/orderController')
const verifyToken = require('../../middlewares/providerMiddleware')
const verifySeller = require('../../middlewares/sellerMiddleware')
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

var cpUpload = upload.fields([{ name: 'itemImages[0]', maxCount: 1 },
 { name: 'itemImages[1]', maxCount: 1 },
 { name: 'itemImages[2]', maxCount: 1 }
])
var editcpUpload = upload.fields([{ name: 'newItemImages', maxCount: 3 },
{ name: 'deleteImages', maxCount: 3}

])
router.post('/bookingDetails',verifyToken,verifyProvider,orderController.bookingDetails);
router.post('/itemBookingDetails',verifyToken,verifyProvider,verifySeller,orderController.itemBookingDetails);
router.post('/updateBookingStatus',verifyToken,verifyProvider,orderController.updateBookingStatus);
router.post('/updateItemBookingStatus',verifyToken,verifyProvider,verifySeller,orderController.updateItemBookingStatus);
router.post('/myBookings',verifyToken,verifyProvider,orderController.myBookings)
router.post('/myItemBookings',verifyToken,verifyProvider,verifySeller,orderController.myItemBookings)
router.get('/viewReviews',verifyToken,verifyProvider,orderController.viewReviews)
router.post('/addItem',verifyToken,verifyProvider,verifySeller,upload.any(),orderController.addItem)
router.post('/itemSummary',verifyToken,verifyProvider,verifySeller,orderController.itemSummary)
router.post('/sellingItemListing',verifyToken,verifyProvider,verifySeller,orderController.sellingItemListing)
router.post('/deleteItem',verifyToken,verifyProvider,verifySeller,orderController.deleteItem)
router.post('/itemStatus',verifyToken,verifyProvider,verifySeller,orderController.itemStatus)
router.post('/editItem',verifyToken,verifyProvider,verifySeller,upload.any(),orderController.editItem)
module.exports = router;