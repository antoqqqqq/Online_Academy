import express from "express";
import accountModel from "../models/accout.model.js";
import bcrypt from "bcrypt";
import mailer from "../utils/mailer.js";

const router = express.Router();
router.get("/signup", async (req, res) => {
    res.render("vwaccount/signup", { layout: "account" });
});
router.post("/signup", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const name = req.body.name;
    const hash = await bcrypt.hash(password, 10);

    const otp=Math.floor(100000 + Math.random() * 900000).toString();
    const result = {
        email: email,
        password: hash,
        name: name,
        otp: otp,
        otpCreatedAt: Date.now()
    }
    const sendotp= await mailer.sendOTP(email, otp);
    if(!sendotp.success){
        return res.render("vwaccount/signup", {
            layout: "account",});
    } else {
        req.session.otpStore = result;
        res.redirect("/account/verify-otp");
    }
});
router.get("/resend-otp", async (req, res) => {
    const otp=Math.floor(100000 + Math.random() * 900000).toString();
    const email=req.session.otpStore.email;
    req.session.otpStore.otp=otp;
    req.session.otpStore.otpCreatedAt=Date.now();
    const sendotp= await mailer.sendOTP(email, otp);
    if(!sendotp.success){
        return res.json({ success: false, message: "Failed to resend OTP. Please try again later." });
    } else {
        return res.json({ success: true, message: "OTP resent successfully." });
    }
});
router.get("/verify-otp", async (req, res) => {
    res.render("vwaccount/verify-otp", { layout: "account", email: req.session.otpStore.email });
});
router.post("/verify-otp", async (req, res) => {
    console.log(req.body);
    const enteredOtp = req.body.otp;
    const email = req.body.email;
    const otpStore = req.session.otpStore;
    const currentTime = Date.now();
    if (!otpStore || otpStore.email !== email) {
        return res.json({ success: false, message: "Invalid session. Please sign up again." });
    }else if (currentTime - otpStore.otpCreatedAt > 5 * 60 * 1000) {
        return res.json({ success: false, message: "OTP has expired. Please sign up again." });
    }else if (enteredOtp !== otpStore.otp) {
        return res.json({ success: false, message: "Invalid OTP. Please try again." });
    } else {
        const result ={
            email: otpStore.email,
            password: otpStore.password,
            name: otpStore.name
        }
        await accountModel.add(result);
        req.session.otpStore = null;
        return res.json({ success: true, message: "OTP verified successfully.", redirectUrl: "/account/signin" });
    }
});
router.get("/signin", (req, res) => {
    res.render("vwaccount/signin", { layout: "account" });
});
router.get("/forgot", (req, res) => {
    res.render("vwaccount/forgot", { layout: "account" });
});
router.get("/signup/is-available", async (req, res) => {
    const email = req.query.email;
    await accountModel.isEmailAvailable(email).then((isAvailable) => {
        res.json({ isAvailable });
    });
});

router.post("/signin", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const user = await accountModel.findByEmail(email);
    if (user === null) {
        return res.render("vwaccount/signin", {
            layout: "account",
            err_message: "Invalid email or password.",
        });
    }
    const rs = await bcrypt.compareSync(password, user.password);
    if (rs === false) {
        return res.render("vwaccount/signin", {
            layout: "account",
            err_message: "Invalid email or password.",
        });
    }
    req.session.isAuthenticated = true;
    req.session.authUser = user
    console.log(req.session.authUser.permision);
    const url = req.query.retUrl || "/";
    res.redirect(url);
});
export default router;