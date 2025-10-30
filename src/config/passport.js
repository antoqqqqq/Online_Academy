import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcrypt';
import accountModel from '../models/accout.model.js';
import dotenv from "dotenv";
dotenv.config();

// Local login
passport.use(new LocalStrategy(async (email, password, done) => {
  const user = await accountModel.findByEmail(email);
  if (!user) return done(null, false, { message: 'User not found' });
  console.log(user);

  const match = await bcrypt.compareSync(password, user.password);
  console.log(match);
  if (!match) return done(null, false, { message: 'Wrong password' });

  return done(null, user);
}));

// Google login
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.CALLBACKURL
}, async (accessToken, refreshToken, profile, done) => {
  const user = await accountModel.findOrCreateGoogleUser(profile);
  return done(null, user);
}));

// Serialize / deserialize
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  const user = await accountModel.findUserById(id);
  done(null, user);
});
export default passport;