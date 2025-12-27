import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_APP_PASSWORD,
  },
});

export interface PasswordResetEmailData {
  email: string;
  resetToken: string;
  userName: string;
}

export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void> {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${data.resetToken}`;
  
  const mailOptions = {
    from: process.env.NODEMAILER_USER,
    to: data.email,
    subject: 'Password Reset Request - Phoenix Auth',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .button {
              display: inline-block;
              background: #667eea;
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .button:hover {
              background: #5a6fd8;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 12px;
              color: #666;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
            <p>Phoenix Auth System</p>
          </div>
          
          <div class="content">
            <h2>Hello ${data.userName}!</h2>
            
            <p>We received a request to reset your password for your Phoenix Auth account. If you made this request, click the button below to reset your password:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset My Password</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 5px; font-family: monospace;">
              ${resetUrl}
            </p>
            
            <div class="warning">
              <strong>⚠️ Important Security Information:</strong>
              <ul>
                <li>This link will expire in 1 hour for security reasons</li>
                <li>If you didn't request this password reset, please ignore this email</li>
                <li>Your password will not be changed until you click the link above</li>
              </ul>
            </div>
            
            <p>If you're having trouble clicking the button, copy and paste the URL above into your web browser.</p>
            
            <p>Best regards,<br>
            The Phoenix Auth Team</p>
          </div>
          
          <div class="footer">
            <p>This email was sent from Phoenix Auth System. If you have any questions, please contact our support team.</p>
            <p>© 2024 Phoenix Auth. All rights reserved.</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Password Reset Request - Phoenix Auth
      
      Hello ${data.userName}!
      
      We received a request to reset your password for your Phoenix Auth account. 
      If you made this request, please click the link below to reset your password:
      
      ${resetUrl}
      
      This link will expire in 1 hour for security reasons.
      
      If you didn't request this password reset, please ignore this email.
      Your password will not be changed until you click the link above.
      
      Best regards,
      The Phoenix Auth Team
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${data.email}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

export default transporter;
