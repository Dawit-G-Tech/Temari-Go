'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('attendance', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
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
      bus_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'buses',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      rfid_card_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'rfid_cards',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      timestamp: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true,
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
      },
      geofence_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'geofences',
          key: 'id',
        },
      },
      manual_override: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add type column with enum constraint for attendance
    await queryInterface.sequelize.query(
      `ALTER TABLE attendance ADD COLUMN type attendance_type NOT NULL DEFAULT 'boarding'`
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('attendance');
  }
};
