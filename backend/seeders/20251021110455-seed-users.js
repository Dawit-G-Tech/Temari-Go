'use strict';

const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Get role IDs first
    const adminRole = await queryInterface.rawSelect('Roles', {
      where: { name: 'admin' }
    }, ['id']);
    
    const userRole = await queryInterface.rawSelect('Roles', {
      where: { name: 'user' }
    }, ['id']);

    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const userPassword = await bcrypt.hash('user123', 10);

    // Insert sample users
    await queryInterface.bulkInsert('Users', [
      {
        name: 'Admin User',
        email: 'admin@phoenixauth.com',
        password: adminPassword,
        roleId: adminRole,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: userPassword,
        roleId: userRole,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: userPassword,
        roleId: userRole,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', null, {});
  }
};
