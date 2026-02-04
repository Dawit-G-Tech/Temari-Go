'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Find a driver user; reuse existing seeded user for now
    const driverUserId = await queryInterface.rawSelect(
      'Users',
      {
        where: { email: 'john@example.com' },
      },
      ['id']
    );

    const centralSchoolId = await queryInterface.rawSelect(
      'schools',
      {
        where: { name: 'Central High School' },
      },
      ['id']
    );

    await queryInterface.bulkInsert(
      'buses',
      [
        {
          bus_number: 'BUS-001',
          driver_id: driverUserId || null,
          school_id: centralSchoolId || null,
          capacity: 50,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete(
      'buses',
      {
        bus_number: 'BUS-001',
      },
      {}
    );
  },
};

