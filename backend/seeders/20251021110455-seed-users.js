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
        role_id: adminRole,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: userPassword,
        role_id: userRole,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: userPassword,
        role_id: userRole,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', null, {});
  }
};
