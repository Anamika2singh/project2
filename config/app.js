require('dotenv').config()
// console.log(process.env.PORT)
module.exports= {
    PORT:process.env.PORT,
    MONGODB_URL:process.env.MONGODB_URL,
    LOG_SECRET_KEY :process.env.LOG_SECRET_KEY,
    SENDER_EMAIL : process.env.SENDER_EMAIL,
    SENDGRID_API_KEY : process.env.SENDGRID_API_KEY,
    S3_BUCKET_ACCESS_KEY : process.env.S3_BUCKET_ACCESS_KEY,
    S3_BUCKET_SECRET_ACCESS_KEY : process.env.S3_BUCKET_SECRET_ACCESS_KEY,
    S3_BUCKET_REGION  : process.env.S3_BUCKET_REGION,
    S3_BUCKET_NAME : process.env.S3_BUCKET_NAME,
    STRIPE_KEY : process.env.STRIPE_KEY,
    APPLE_SECRET_KEY:process.env.APPLE_SECRET_KEY
}
