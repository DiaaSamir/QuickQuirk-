const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url; // Added this line to make `url` available in the `send` method.
    this.from = `Diaa Samir <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // send grid code
      return nodemailer.createTransport({
        host: process.env.BREVO_HOST, // Changed 'service' to 'host' for more flexibility
        port: process.env.BREVO_PORT,
        auth: {
          user: process.env.BREVO_USERNAME,
          pass: process.env.BREVO_PASSWORD,
        }, // Placeholder for production transport, you should replace this with actual SendGrid configuration.
      });
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST, // Changed 'service' to 'host' for more flexibility
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async send(template, subject) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: subject,
      html,
      text: htmlToText.convert(html),
    };

    // 3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions); // Changed sendEmail to sendMail
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the family!');
  }
  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset link!(Valid for 10 minutes)'
    );
  }
};
