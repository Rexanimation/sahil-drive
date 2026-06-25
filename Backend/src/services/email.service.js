const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', // You can change this or use SMTP host
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendMegaSuccessEmail(toEmail, userName) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn("[Email] Nodemailer is not configured in .env (EMAIL_USER, EMAIL_PASS). Skipping email.");
        return;
    }

    const mailOptions = {
        from: `"Sahil Drive" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'MEGA Account Linked Successfully - Sahil Drive',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f9;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #4CAF50; text-align: center;">Success!</h2>
                    <p style="font-size: 16px; color: #333;">Hello <strong>${userName}</strong>,</p>
                    <p style="font-size: 16px; color: #555; line-height: 1.5;">
                        Your personal MEGA Cloud account has been successfully linked to <strong>Sahil Drive</strong>.
                    </p>
                    <p style="font-size: 16px; color: #555; line-height: 1.5;">
                        You have been allocated <strong>20 GB</strong> of decentralized storage space. Any files you upload from now on will be securely routed directly to your personal MEGA cloud.
                    </p>
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="http://localhost:5173" style="background-color: #4CAF50; color: #fff; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
                    </div>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[Email] Success email sent to ${toEmail}`);
    } catch (err) {
        console.error("[Email] Failed to send email:", err.message);
    }
}

module.exports = {
    sendMegaSuccessEmail
};
