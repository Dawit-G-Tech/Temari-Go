'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const busId = await queryInterface.rawSelect(
      'buses',
      {
        where: { bus_number: 'BUS-001' },
      },
      ['id']
    );

    if (!busId) {
      // If the bus is missing, skip to keep the seeder resilient
      return;
    }

    await queryInterface.bulkInsert(
      'routes',
      [
        {
          bus_id: busId,
          name: 'Morning Route - Central High',
          start_time: '07:30:00',
          end_time: '08:30:00',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          bus_id: busId,
          name: 'Afternoon Route - Central High',
          start_time: '15:00:00',
          end_time: '16:00:00',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete(
      'routes',
      {
        name: [
          'Morning Route - Central High',
          'Afternoon Route - Central High',
        ],
      },
      {}
    );
  },
};

