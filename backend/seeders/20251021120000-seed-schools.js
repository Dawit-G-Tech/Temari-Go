/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      'schools',
      [
        {
          name: 'Central High School',
          address: '123 Main St, Springfield',
          latitude: 40.712776,
          longitude: -74.005974,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          name: 'Westside Elementary',
          address: '456 Oak Ave, Springfield',
          latitude: 40.713776,
          longitude: -74.015974,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete(
      'schools',
      {
        name: ['Central High School', 'Westside Elementary'],
      },
      {}
    );
  },
};

