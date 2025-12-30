'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex('attendance', ['timestamp'], {
      name: 'idx_attendance_timestamp',
    });

    await queryInterface.addIndex('locations', ['bus_id', 'timestamp'], {
      name: 'idx_locations_bus_timestamp',
    });

    await queryInterface.addIndex('Users', ['roleId'], {
      name: 'idx_users_role',
    });

    await queryInterface.addIndex('students', ['parent_id'], {
      name: 'idx_students_parent',
    });

    await queryInterface.addIndex('payments', ['status'], {
      name: 'idx_payments_status',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('payments', 'idx_payments_status');
    await queryInterface.removeIndex('students', 'idx_students_parent');
    await queryInterface.removeIndex('Users', 'idx_users_role');
    await queryInterface.removeIndex('locations', 'idx_locations_bus_timestamp');
    await queryInterface.removeIndex('attendance', 'idx_attendance_timestamp');
  }
};
