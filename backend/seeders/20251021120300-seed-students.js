'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    let parentUserId = await queryInterface.rawSelect(
      'Users',
      {
        where: { email: 'jane@example.com' },
      },
      ['id']
    );

    // If the parent user doesn't exist yet (e.g. empty DB or users seeder not run),
    // create a simple parent user first, then link the student to it.
    if (!parentUserId) {
      await queryInterface.bulkInsert(
        'Users',
        [
          {
            name: 'Jane Smith',
            email: 'jane@example.com',
            password: null,
            roleId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          },
        ],
        {}
      );

      parentUserId = await queryInterface.rawSelect(
        'Users',
        {
          where: { email: 'jane@example.com' },
        },
        ['id']
      );
    }

    await queryInterface.bulkInsert(
      'students',
      [
        {
          full_name: 'Timmy Johnson',
          grade: '5A',
          parent_id: parentUserId,
          home_latitude: 40.7145,
          home_longitude: -74.0021,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete(
      'students',
      {
        full_name: 'Timmy Johnson',
      },
      {}
    );
  },
};

