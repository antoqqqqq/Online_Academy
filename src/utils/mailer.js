import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER, // Email của bạn
        pass: process.env.EMAIL_PASSWORD // App password
    }
});
// Hàm gửi OTP
export default {
    async sendOTP(email, otp) {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Mã OTP Xác Thực - Hệ Thống',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #667eea;">Mã OTP Xác Thực</h2>
                <p>Xin chào,</p>
                <p>Mã OTP của bạn là:</p>
                <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #667eea;">
                    ${otp}
                </div>
                <p style="color: #666;">Mã OTP có hiệu lực trong <strong>5 phút</strong>.</p>
                <p style="color: #999; font-size: 12px;">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
            </div>
        `
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log('Email sent: ' + info.response);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending email:', error);
            return { success: false, error: error.message };
        }
    }
};