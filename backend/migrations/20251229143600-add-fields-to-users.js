'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if columns exist before adding them
    const usersColumns = await queryInterface.sequelize.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'Users'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const existingColumns = usersColumns.map(col => col.column_name);

    if (!existingColumns.includes('username')) {
      await queryInterface.addColumn('Users', 'username', {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true,
      });
    }

    if (!existingColumns.includes('phone_number')) {
      await queryInterface.addColumn('Users', 'phone_number', {
        type: Sequelize.STRING(20),
        allowNull: true,
      });
    }

    if (!existingColumns.includes('language_preference')) {
      await queryInterface.addColumn('Users', 'language_preference', {
        type: Sequelize.STRING(10),
        allowNull: true,
        defaultValue: 'en',
      });
    }

    // Add check constraint for language_preference (only if it doesn't exist)
    await queryInterface.sequelize.query(
      `DO $$ BEGIN
        ALTER TABLE "Users" ADD CONSTRAINT check_language_preference CHECK (language_preference IN ('en', 'am'));
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `ALTER TABLE "Users" DROP CONSTRAINT IF EXISTS check_language_preference`
    );
    await queryInterface.removeColumn('Users', 'language_preference');
    await queryInterface.removeColumn('Users', 'phone_number');
    await queryInterface.removeColumn('Users', 'username');
  }
};

