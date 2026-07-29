import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";

export const sendMail = async ({ to, subject, html, attachments }) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USENAME,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    await transporter.sendMail({
        from: process.env.EMAIL_USENAME,
        to,
        subject,
        html,
        attachments,
    });
}