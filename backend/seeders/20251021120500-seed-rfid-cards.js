'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const studentId = await queryInterface.rawSelect(
      'students',
      {
        where: { full_name: 'Timmy Johnson' },
      },
      ['id']
    );

    if (!studentId) {
      return;
    }

    await queryInterface.bulkInsert(
      'rfid_cards',
      [
        {
          rfid_tag: 'RFID-TIMMY-0001',
          student_id: studentId,
          issued_at: new Date(),
          active: true,
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete(
      'rfid_cards',
      {
        rfid_tag: 'RFID-TIMMY-0001',
      },
      {}
    );
  },
};

