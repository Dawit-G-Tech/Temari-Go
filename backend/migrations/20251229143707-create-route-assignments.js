'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('route_assignments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      route_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'routes',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      student_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'students',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      pickup_latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true,
      },
      pickup_longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
      },
    });

    await queryInterface.addIndex('route_assignments', ['route_id', 'student_id'], {
      unique: true,
      name: 'route_assignments_route_id_student_id_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('route_assignments', 'route_assignments_route_id_student_id_unique');
    await queryInterface.dropTable('route_assignments');
  }
};
