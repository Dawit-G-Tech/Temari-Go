import { Sequelize } from 'sequelize-typescript';
import { config } from '../config';
import { User } from './user.model';
import { Role } from './role.model';
import { RefreshToken } from './refreshToken.model';

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env as 'development' | 'production'];

export const sequelize = new Sequelize(dbConfig.url, {
  dialect: 'postgres',
  models: [User, Role, RefreshToken],
  logging: false,
});

export const db = {
  sequelize,
  User,
  Role,
  RefreshToken,
};
