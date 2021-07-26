const config = require('./config/app')
const express = require('express')
const app = express()
const mongoose = require('mongoose')
const logger = require('morgan')
const fs = require('fs')
let https = require("https");
const bodyparser = require('body-parser')
var session = require('express-session');
const ejs = require('ejs')
const path = require('path')
const authRouter = require('./routes/customerRoute/authRoute')
const authRouterProvider = require('./routes/serviceProviderRoute/authRoute')
const workingHourRouter = require('./routes/serviceProviderRoute/workingHourRoute')
const servicesRouter = require('./routes/serviceProviderRoute/servicesRoute')
const orderRouter = require('./routes/serviceProviderRoute/orderRoute')
const providerDashboardRouter = require('./routes/serviceProviderRoute/homeRoute')
const homeRouter = require('./routes/customerRoute/homeRoute');
const indexRouter = require('./routes/indexRoute');
const addressRouter = require('./routes/customerRoute/addressRoute')
const paymentRouter = require('./routes/serviceProviderRoute/paymentRoute')
// database coonection with mongodb
mongoose.Promise = global.Promise;
mongoose.connect(
  config.MONGODB_URL , { useNewUrlParser: true, useUnifiedTopology: true }) 
         .then(() => console.log("connection successful"))
          .catch((err) => console.error(err));
          mongoose.set("useCreateIndex", true);
 
app.use('/auth/verifyToken',express.static(path.join(__dirname, 'public')));
app.use('/auth',express.static(path.join(__dirname, 'public')));
app.use('/auth/checkEmailVerification',express.static(path.join(__dirname, 'public')));
app.use('/authProvider/checkEmailVerification',express.static(path.join(__dirname, 'public')));
app.use(logger('dev'));
app.use(bodyparser.json({extended:true}))
app.use(bodyparser.urlencoded({extended:true}))
app.set('view engine','ejs')

app.use(express.static('public/images')); 

app.use(session({
  secret: 'newScan@@#@@@#$@@*&$%$@B!@A&*@@R',
  resave: true,
  saveUninitialized: true,
  cookie: {} //{ secure: true }
}))

app.use('/auth',authRouter)
app.use('/authProvider',authRouterProvider)
app.use('/workingHour',workingHourRouter)
app.use('/order',orderRouter)
app.use('/services',servicesRouter)
app.use('/home',homeRouter)
app.use('/address',addressRouter)
app.use('/payment',paymentRouter)
app.use('/homeProvider',providerDashboardRouter)
app.use('/',indexRouter)

if(process.env.SSL == "On"){
  const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/privkey.pem', 'utf8'),
    cert: fs.readFileSync('/etc/letsencrypt/live/cert.pem', 'utf8'),
    ca : fs.readFileSync("/etc/letsencrypt/live/chain.pem","utf8")
  };
  https.createServer(options,app).listen(process.env.PORT)
}else{
app.listen(process.env.PORT || 3000, () => {
    console.log(`Server started ${process.env.PORT}...`)
  })
}