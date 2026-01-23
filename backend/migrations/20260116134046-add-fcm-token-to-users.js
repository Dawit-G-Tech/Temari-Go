'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if column exists before adding it
    const usersColumns = await queryInterface.sequelize.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'Users'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const existingColumns = usersColumns.map(col => col.column_name);

    if (!existingColumns.includes('fcm_token')) {
      await queryInterface.addColumn('Users', 'fcm_token', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Firebase Cloud Messaging token for push notifications',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'fcm_token');
  }
};
