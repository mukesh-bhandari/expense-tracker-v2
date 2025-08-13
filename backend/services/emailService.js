const transporter = require("../config/mail");

function sendVerificationEmail(email, code) {
  return transporter.sendMail({
    from: `"Expense Tracker" <${process.env.GMAIL}>`,
    to: email,
    subject: "Your Verification Code",
    html: `
        <p>Your verification code is:</p>
        <h2>${code}</h2>
        <p>This code expires in 5 minutes.</p>
      `,
  });
}

async function sendInviteEmail(recipientEmail, inviteLink) {
  return transporter.sendMail({
    from: `"Expense Tracker" <${process.env.GMAIL}>`,
    to: recipientEmail,
    subject: "You're Invited!",
    html: `
        <p>Hello,</p>
        <p>You’ve been invited to join <b>Expense Tracker</b>.</p>
        <p>Click the link below to accept your invite:</p>
        <a href="${inviteLink}" target="_blank">${inviteLink}</a>
        <p>This link will expire in 24 hours.</p>
      `,
  });
}


module.exports = { sendVerificationEmail, sendInviteEmail };