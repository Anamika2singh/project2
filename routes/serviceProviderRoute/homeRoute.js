const express = require('express')
const router = express.Router()
const homeController = require('../../controllers/serviceProviderController/homeController')
const verifyToken = require('../../middlewares/providerMiddleware')
const verifyProvider = require('../../middlewares/verifyProviderMiddleware')


router.get('/dashboard',verifyToken,verifyProvider,homeController.dashboard)
router.get('/dashboardUpcomingOrder',verifyToken,verifyProvider,homeController.dashboardUpcomingOrder)
router.post('/updateOnlineStatus',verifyToken,verifyProvider,homeController.updateOnlineStatus)

module.exports = router;