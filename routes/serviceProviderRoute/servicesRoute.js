const express = require('express')
const router = express.Router()
const servicesController = require('../../controllers/serviceProviderController/servicesController')
const verifyToken = require('../../middlewares/providerMiddleware')
const verifyProvider = require('../../middlewares/verifyProviderMiddleware')

router.post('/addServices',verifyToken,verifyProvider,servicesController.addServices);
router.post('/editServiceDetails',verifyToken,verifyProvider,servicesController.editServiceDetails);

router.post('/removeService',verifyToken,verifyProvider,servicesController.removeService)
router.get('/getServices',verifyToken,verifyProvider,servicesController.getServices)

module.exports = router;