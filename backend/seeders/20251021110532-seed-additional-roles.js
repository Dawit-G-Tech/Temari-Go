'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add additional roles for more granular permissions
    await queryInterface.bulkInsert('Roles', [
      { 
        name: 'moderator', 
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
      { 
        name: 'editor', 
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
      { 
        name: 'viewer', 
        createdAt: new Date(), 
        updatedAt: new Date() 
      }
    ]);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Roles', {
      name: ['moderator', 'editor', 'viewer']
    }, {});
  }
};
