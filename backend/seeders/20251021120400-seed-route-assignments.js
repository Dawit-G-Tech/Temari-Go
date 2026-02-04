'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const routeId = await queryInterface.rawSelect(
      'routes',
      {
        where: { name: 'Morning Route - Central High' },
      },
      ['id']
    );

    const studentId = await queryInterface.rawSelect(
      'students',
      {
        where: { full_name: 'Timmy Johnson' },
      },
      ['id']
    );

    // If route or student is missing, keep the seeder safe to run
    if (!routeId || !studentId) {
      return;
    }

    await queryInterface.bulkInsert(
      'route_assignments',
      [
        {
          route_id: routeId,
          student_id: studentId,
          pickup_latitude: 40.7145,
          pickup_longitude: -74.0021,
          pickup_order: 0,
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    const routeId = await queryInterface.rawSelect(
      'routes',
      {
        where: { name: 'Morning Route - Central High' },
      },
      ['id']
    );

    const studentId = await queryInterface.rawSelect(
      'students',
      {
        where: { full_name: 'Timmy Johnson' },
      },
      ['id']
    );

    await queryInterface.bulkDelete(
      'route_assignments',
      {
        route_id: routeId || null,
        student_id: studentId || null,
      },
      {}
    );
  },
};

