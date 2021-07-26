const sgMail = require('@sendgrid/mail')
const fs = require('fs')
const Handlebars = require('handlebars')
const config = require("../config/app");
sgMail.setApiKey(config.SENDGRID_API_KEY)
exports.send = function (from, to, subject, html)
{
      return new Promise ( function ( resolve , reject){       
        const msg = {
            to: to, // Change to your recipient
            from: from, // Change to your verified sender
            subject: subject,
            // text: html,
            html: html,
          }
          sgMail
            .send(msg)
            .then(() => {
              resolve('Email sent')
            })
            .catch((error) => {
              reject(error)
            })   
    });
};

exports.sendForgotPasswordEmail = (email, url, userName)=> {
  return new Promise ( function ( resolve , reject){
            // send mail for reset password
            fs.readFile("./emailTemplate/forgotPasswordEmail.html", function (
                err,
                forgotPasswordTemplate
            ) {
                if (err) {
                    reject(err);
                }
                var variableData = {
                    email: email,
                    url: url,
                    userName: userName
                };

                var templateHtml = Handlebars.compile(
                    forgotPasswordTemplate.toString()
                );
                var bodyHtml = templateHtml(variableData)
                // send mail with defined transport object
                 const msg = {
                    to: email, // Change to your recipient
                    from: config.SENDER_EMAIL, // Change to your verified sender
                    subject: 'VALET-IT, Get Your password reset link',
                    // text: html,
                    html: bodyHtml,
                  }
                  sgMail
                    .send(msg)
                    .then(() => {
                      resolve('Email sent')
                    })
                    .catch((error) => {
                      reject(error)
                    })
            });
          })
    }
exports.sendEmailVerificationLink = (email, url, userName)=> {
  return new Promise ( function ( resolve , reject){
            // send mail for reset password
            fs.readFile("./emailTemplate/emailVerificationLink.html", function (
                err,
                emailVerificationLinkTemplate
            ) {
                if (err) {
                    reject(err);
                }

                var variableData = {
                    email: email,
                    url: url,
                    userName: userName
                };

                var templateHtml = Handlebars.compile(
                    emailVerificationLinkTemplate.toString()
                );
                var bodyHtml = templateHtml(variableData);
                // send mail with defined transport object
                 const msg = {
                    to: email, // Change to your recipient
                    from: config.SENDER_EMAIL, // Change to your verified sender
                    subject: 'VALET-IT, Get Your email verification link here',
                    // text: html,
                    html: bodyHtml,
                  }
                  sgMail
                    .send(msg)
                    .then(() => {
                      resolve('Email sent')
                    })
                    .catch((error) => {
                      reject(error)
                    })
            });
          })
    }
exports.sendOtpToEmail = (email, otp, userName)=> {
  return new Promise ( function ( resolve , reject){
            // send mail for reset password
            fs.readFile("./emailTemplate/sendOtp.html", function (
                err,
                sendOtpTemplate
            ) {
                if (err) {
                    reject(err);
                }

                var variableData = {
                    email: email,
                    otp: otp,
                    userName: userName
                };

                var templateHtml = Handlebars.compile(
                    sendOtpTemplate.toString()
                );
                var bodyHtml = templateHtml(variableData);
                // send mail with defined transport object
                 const msg = {
                    to: email, // Change to your recipient
                    from: config.SENDER_EMAIL, // Change to your verified sender
                    subject: 'VALET-IT, Find Your OTP here',
                    // text: html,
                    html: bodyHtml,
                  }
                  sgMail
                    .send(msg)
                    .then(() => {
                      resolve('Email sent')
                    })
                    .catch((error) => {
                      reject(error)
                    })
            });
          })
    }
exports.sendOrderUpdate = (email, message, userName)=> {
  return new Promise ( function ( resolve , reject){
            // send mail for reset password
            fs.readFile("./emailTemplate/orderTempelate.html", function (
                err,
                sendOrderUpdateTemplate
            ) {
                if (err) {
                    reject(err);
                }

                var variableData = {
                    email: email,
                    message: message,
                    userName: userName
                };

                var templateHtml = Handlebars.compile(
                    sendOrderUpdateTemplate.toString()
                );
                var bodyHtml = templateHtml(variableData);
                // send mail with defined transport object
                 const msg = {
                    to: email, // Change to your recipient
                    from: config.SENDER_EMAIL, // Change to your verified sender
                    subject: 'VALET-IT, Order Update',
                    // text: html,
                    html: bodyHtml,
                  }
                  sgMail
                    .send(msg)
                    .then(() => {
                      resolve('Email sent')
                    })
                    .catch((error) => {
                      reject(error)
                    })
            });
          })
    }