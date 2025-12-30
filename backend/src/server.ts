import 'reflect-metadata';
import app from './app';
import { sequelize } from '../models';

const PORT = process.env.PORT || 4000;

// Initialize database connection
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Note: We use migrations for schema changes, so we don't sync/alter here
    // Run migrations with: npx sequelize-cli db:migrate
    // await sequelize.sync({ alter: true });
    
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();
