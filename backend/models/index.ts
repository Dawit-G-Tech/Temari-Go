import { Sequelize } from 'sequelize-typescript';
import { config } from '../config';
import { User } from './user.model';
import { Role } from './role.model';
import { RefreshToken } from './refreshToken.model';
import { Student } from './student.model';
import { Bus } from './bus.model';
import { RFIDCard } from './rfidCard.model';
import { Geofence } from './geofence.model';
import { Attendance } from './attendance.model';
import { Location } from './location.model';
import { AlcoholTest } from './alcoholTest.model';
import { DriverFeedback } from './driverFeedback.model';
import { DriverRating } from './driverRating.model';
import { Payment } from './payment.model';
import { Notification } from './notification.model';
import { Route } from './route.model';
import { RouteAssignment } from './routeAssignment.model';
import { School } from './school.model';

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env as 'development' | 'production'];

export const sequelize = new Sequelize(dbConfig.url, {
  dialect: 'postgres',
  models: [
    User,
    Role,
    RefreshToken,
    Student,
    Bus,
    RFIDCard,
    Geofence,
    Attendance,
    Location,
    AlcoholTest,
    DriverFeedback,
    DriverRating,
    Payment,
    Notification,
    Route,
    RouteAssignment,
    School,
  ],
  logging: false,
  define: {
    underscored: true,
    timestamps: true,
  },
});

export const db = {
  sequelize,
  User,
  Role,
  RefreshToken,
  Student,
  Bus,
  RFIDCard,
  Geofence,
  Attendance,
  Location,
  AlcoholTest,
  DriverFeedback,
  DriverRating,
  Payment,
  Notification,
  Route,
  RouteAssignment,
  School,
};
