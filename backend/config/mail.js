const nodemailer = require("nodemailer");


// Configure Gmail SMTP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL,
    pass: process.env.APP_PASSWORD, 
  },
});

module.exports = { transporter}
