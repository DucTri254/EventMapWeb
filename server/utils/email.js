const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendVerificationCode = async (email, code) => {
  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: email,
    subject: 'EventMap - Email Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2d5016;">EventMap - Email Verification</h2>
        <p>Your verification code is:</p>
        <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${code}
        </div>
        <p>This code will expire in 60 seconds.</p>
        <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

const sendPasswordResetCode = async (email, code) => {
  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: email,
    subject: 'EventMap - Password Reset Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2d5016;">EventMap - Password Reset</h2>
        <p>Your password reset code is:</p>
        <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${code}
        </div>
        <p>This code will expire in 60 seconds.</p>
        <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

const sendEventChanged = async (email, eventName, changes) => {
  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: email,
    subject: 'EventMap - Event Updated',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2d5016;">Event Updated</h2>
        <p>The event <strong>${eventName}</strong> has been updated:</p>
        <ul>
          ${changes.map(change => `<li>${change}</li>`).join('')}
        </ul>
        <p>Please check the event details for more information.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

const sendEventCancelled = async (email, eventName) => {
  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: email,
    subject: 'EventMap - Event Cancelled',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d32f2f;">Event Cancelled</h2>
        <p>The event <strong>${eventName}</strong> has been cancelled.</p>
        <p>We apologize for any inconvenience.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

const sendEventReminder = async (email, eventName, eventDate, eventTime, eventLocation) => {
  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: email,
    subject: 'EventMap - Event Reminder',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2d5016;">Event Reminder</h2>
        <p>This is a reminder that the event <strong>${eventName}</strong> is happening tomorrow!</p>
        <div style="background-color: #f0f0f0; padding: 15px; margin: 20px 0;">
          <p><strong>Date:</strong> ${eventDate}</p>
          <p><strong>Time:</strong> ${eventTime}</p>
          <p><strong>Location:</strong> ${eventLocation}</p>
        </div>
        <p>We hope to see you there!</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

const sendUserInterested = async (email, eventName, userName) => {
  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: email,
    subject: 'EventMap - Someone Interested in Your Event',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2d5016;">New Interest in Your Event</h2>
        <p><strong>${userName}</strong> has shown interest in your event <strong>${eventName}</strong>.</p>
        <p>Check your dashboard to see all interested users.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

const sendPermissionRequest = async (email, userName, requestedRole) => {
  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: email,
    subject: 'EventMap - Permission Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2d5016;">Permission Request</h2>
        <p><strong>${userName}</strong> has requested to change their role to <strong>${requestedRole}</strong>.</p>
        <p>Please review and approve/reject this request in the admin panel.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendVerificationCode,
  sendPasswordResetCode,
  sendEventChanged,
  sendEventCancelled,
  sendEventReminder,
  sendUserInterested,
  sendPermissionRequest,
};
