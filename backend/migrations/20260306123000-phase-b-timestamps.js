'use strict';

/**
 * Adds missing `updated_at` / `created_at` columns where they are absent.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const addUpdatedAt = async (table) => {
      await queryInterface.addColumn(table, 'updated_at', {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      });
    };

    const addCreatedAt = async (table) => {
      await queryInterface.addColumn(table, 'created_at', {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      });
    };

    await addUpdatedAt('attendance');
    await addUpdatedAt('locations');
    await addUpdatedAt('payments');
    await addUpdatedAt('notifications');
    await addUpdatedAt('alcohol_tests');
    await addUpdatedAt('driver_feedback');
    await addCreatedAt('driver_ratings');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('driver_ratings', 'created_at');
    await queryInterface.removeColumn('driver_feedback', 'updated_at');
    await queryInterface.removeColumn('alcohol_tests', 'updated_at');
    await queryInterface.removeColumn('notifications', 'updated_at');
    await queryInterface.removeColumn('payments', 'updated_at');
    await queryInterface.removeColumn('locations', 'updated_at');
    await queryInterface.removeColumn('attendance', 'updated_at');
  },
};

