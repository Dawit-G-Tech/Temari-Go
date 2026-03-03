'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'route_assignments',
      'pickup_order',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
      }
    );
    await queryInterface.addIndex('route_assignments', ['route_id', 'pickup_order'], {
      name: 'route_assignments_route_id_pickup_order_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('route_assignments', 'route_assignments_route_id_pickup_order_idx');
    await queryInterface.removeColumn('route_assignments', 'pickup_order');
  }
};
