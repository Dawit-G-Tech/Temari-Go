'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('devices', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      api_key_hash: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      bus_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'buses',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('devices', ['active'], {
      name: 'idx_devices_active',
    });
    await queryInterface.addIndex('devices', ['bus_id'], {
      name: 'idx_devices_bus_id',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('devices', 'idx_devices_bus_id');
    await queryInterface.removeIndex('devices', 'idx_devices_active');
    await queryInterface.dropTable('devices');
  },
};

