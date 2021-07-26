const express = require('express')
const router = express.Router()
const workingHourController = require('../../controllers/serviceProviderController/workingHourController')
const verifyToken = require('../../middlewares/providerMiddleware')
const verifyProvider = require('../../middlewares/verifyProviderMiddleware')

router.post('/addWorkingHour',verifyToken,verifyProvider,workingHourController.addWorkingHour);
router.post('/editWorkingHour',verifyToken,verifyProvider,workingHourController.editWorkingHour);
router.get('/getWorkingHour',verifyToken,verifyProvider,workingHourController.getWorkingHour);
router.post('/removeWorkingHour',verifyToken,verifyProvider,workingHourController.removeWorkingHour);

module.exports = router;