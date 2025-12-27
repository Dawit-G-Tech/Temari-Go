import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { db } from '../../models';
const { User, Role } = db;

// Type definitions for Passport callbacks
type PassportDoneCallback = (error: any, user?: any) => void;

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:4000/api/auth/google/callback"
}, async (accessToken: string, refreshToken: string, profile: any, done: PassportDoneCallback) => {
  try {
    console.log('Google OAuth Strategy - Profile:', profile);
    console.log('Google OAuth Strategy - Access Token:', accessToken);
    // Check if user already exists with this Google ID
    let user = await User.findOne({ where: { googleId: profile.id } });
    
    if (user) {
      return done(null, user);
    }
    
    // Check if user exists with same email
    user = await User.findOne({ where: { email: profile.emails?.[0]?.value } });
    
    if (user) {
      // Link Google account to existing user
      user.googleId = profile.id;
      user.avatar = profile.photos?.[0]?.value;
      user.provider = 'google';
      await user.save();
      return done(null, user);
    }
    
    // Create new user
    const role = await Role.findOne({ where: { name: 'user' } });
    const newUser = await User.create({
      name: profile.displayName,
      email: profile.emails?.[0]?.value,
      password: 'social-auth-no-password', // Default password for social auth users
      googleId: profile.id,
      avatar: profile.photos?.[0]?.value,
      provider: 'google',
      roleId: role?.id
    });
    
    return done(null, newUser);
  } catch (error) {
    return done(error, false);
  }
}));



// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await User.findByPk(id, { include: [Role] });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
