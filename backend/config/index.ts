import dotenv from 'dotenv';
dotenv.config();

export const config = {
  development: {
    url: process.env.DATABASE_URL!,
    dialect: 'postgres',
  },
  production: {
    url: process.env.DATABASE_URL!,
    dialect: 'postgres',
  },
};
