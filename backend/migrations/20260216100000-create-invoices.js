'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `DO $$ BEGIN
        CREATE TYPE invoice_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`
    );

    await queryInterface.createTable('invoices', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      parent_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      student_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'students', key: 'id' },
        onDelete: 'CASCADE',
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      due_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      period_label: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'e.g. "January 2025" or "Jan 2025 Transport"',
      },
      status: {
        type: 'invoice_status',
        allowNull: false,
        defaultValue: 'pending',
      },
      payment_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'payments', key: 'id' },
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

    await queryInterface.addIndex('invoices', ['parent_id']);
    await queryInterface.addIndex('invoices', ['student_id']);
    await queryInterface.addIndex('invoices', ['status']);
    await queryInterface.addIndex('invoices', ['due_date']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('invoices');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS invoice_status');
  },
};
