'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create enum types only if they don't exist
    await queryInterface.sequelize.query(
      `DO $$ BEGIN
        CREATE TYPE attendance_type AS ENUM ('boarding', 'exiting');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`
    );

    await queryInterface.sequelize.query(
      `DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`
    );

    await queryInterface.sequelize.query(
      `DO $$ BEGIN
        CREATE TYPE geofence_type AS ENUM ('school', 'home');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS geofence_type');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS payment_status');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS attendance_type');
  }
};

