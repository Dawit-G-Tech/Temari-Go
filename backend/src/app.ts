import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import session from 'express-session';
import passport from './config/passport';
import { errorMiddleware } from './middlewares/error.middleware';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import paymentRoutes from './routes/payment.routes';
import paymentsRoutes from './routes/payments.routes';
import attendanceRoutes from './routes/attendance.routes';
import studentRoutes from './routes/student.routes';
import busRoutes from './routes/bus.routes';
import locationRoutes from './routes/location.routes';
import geofenceRoutes from './routes/geofence.routes';
import alcoholTestRoutes from './routes/alcoholTest.routes';
import driverFeedbackRoutes from './routes/driverFeedback.routes';
import driverRatingRoutes from './routes/driverRating.routes';
import notificationRoutes from './routes/notification.routes';
import rfidCardRoutes from './routes/rfidCard.routes';

dotenv.config();

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());

// Session configuration for Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Add auth and user routes directly
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/geofences', geofenceRoutes);
app.use('/api/alcohol-tests', alcoholTestRoutes);
app.use('/api/driver-feedback', driverFeedbackRoutes);
app.use('/api/driver-ratings', driverRatingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/rfid-cards', rfidCardRoutes);

app.use(errorMiddleware);

export default app;
