'use strict';

/**
  integrity + performance hardening.
 * - Avoids changing PK types and avoids partitioning.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Attendance idempotency hook: allow offline sync to store an event_id for dedupe.
    await queryInterface.addColumn('attendance', 'event_id', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.addIndex('driver_ratings', ['driver_id', 'period_start', 'period_end'], {
      unique: true,
      name: 'uq_driver_ratings_driver_period',
    });

    // Attendance: enforce idempotency when event_id provided
    await queryInterface.addIndex('attendance', ['event_id'], {
      unique: true,
      name: 'uq_attendance_event_id',
      where: {
        event_id: { [Sequelize.Op.ne]: null },
      },
    });

    await queryInterface.addIndex('invoices', ['parent_id', 'student_id', 'period_label'], {
      unique: true,
      name: 'uq_invoices_parent_student_period_label',
    });

    // Performance indexes -> attendance: student history + bus feeds + missed-pickup checks
    await queryInterface.addIndex('attendance', ['student_id', 'timestamp'], {
      name: 'idx_attendance_student_timestamp',
    });
    await queryInterface.addIndex('attendance', ['bus_id', 'timestamp'], {
      name: 'idx_attendance_bus_timestamp',
    });
    await queryInterface.addIndex('attendance', ['student_id', 'bus_id', 'type', 'timestamp'], {
      name: 'idx_attendance_student_bus_type_timestamp',
    });

    await queryInterface.addIndex('locations', ['bus_id', 'timestamp'], {
      name: 'idx_locations_bus_timestamp_v2',
    });

    // notifications: inbox + type filter + unread
    await queryInterface.addIndex('notifications', ['user_id', 'sent_at'], {
      name: 'idx_notifications_user_sent_at',
    });
    await queryInterface.addIndex('notifications', ['user_id', 'type', 'sent_at'], {
      name: 'idx_notifications_user_type_sent_at',
    });
    await queryInterface.addIndex('notifications', ['user_id', 'sent_at'], {
      name: 'idx_notifications_unread_user_sent_at',
      where: {
        read_at: null,
      },
    });

    // payments: parent dashboard + student detail + admin status feeds
    await queryInterface.addIndex('payments', ['parent_id', 'timestamp'], {
      name: 'idx_payments_parent_timestamp',
    });
    await queryInterface.addIndex('payments', ['parent_id', 'status', 'timestamp'], {
      name: 'idx_payments_parent_status_timestamp',
    });
    await queryInterface.addIndex('payments', ['student_id', 'timestamp'], {
      name: 'idx_payments_student_timestamp',
    });
    await queryInterface.addIndex('payments', ['status', 'timestamp'], {
      name: 'idx_payments_status_timestamp',
    });

    // invoices: link-payment lookup + parent list ordering
    await queryInterface.addIndex('invoices', ['parent_id', 'student_id', 'status', 'due_date', 'id'], {
      name: 'idx_invoices_parent_student_status_due_id',
    });
    await queryInterface.addIndex('invoices', ['parent_id', 'due_date', 'id'], {
      name: 'idx_invoices_parent_due_id',
    });

    // geofences: attendance processing lookups
    await queryInterface.addIndex('geofences', ['type', 'school_id'], {
      name: 'idx_geofences_type_school_id',
    });
    await queryInterface.addIndex('geofences', ['type', 'bus_id', 'student_id'], {
      name: 'idx_geofences_type_bus_student',
    });

    // alcohol_tests: latest failed test per bus/driver
    await queryInterface.addIndex('alcohol_tests', ['bus_id', 'passed', 'timestamp'], {
      name: 'idx_alcohol_tests_bus_passed_timestamp',
    });
    await queryInterface.addIndex('alcohol_tests', ['driver_id', 'passed', 'timestamp'], {
      name: 'idx_alcohol_tests_driver_passed_timestamp',
    });

    // driver_feedback: timelines
    await queryInterface.addIndex('driver_feedback', ['driver_id', 'timestamp'], {
      name: 'idx_driver_feedback_driver_timestamp',
    });
    await queryInterface.addIndex('driver_feedback', ['parent_id', 'timestamp'], {
      name: 'idx_driver_feedback_parent_timestamp',
    });

    // route_assignments: manual attendance uses student_id; route stop ordering uses route_id+pickup_order
    await queryInterface.addIndex('route_assignments', ['student_id'], {
      name: 'idx_route_assignments_student_id',
    });
    await queryInterface.addIndex('route_assignments', ['route_id', 'pickup_order', 'id'], {
      name: 'idx_route_assignments_route_pickup_id',
    });

    // routes: list routes by bus
    await queryInterface.addIndex('routes', ['bus_id'], {
      name: 'idx_routes_bus_id',
    });

    // refresh tokens: common ops by user
    await queryInterface.addIndex('RefreshTokens', ['user_id'], {
      name: 'idx_refresh_tokens_user_id',
    });

    // buses: common scoping
    await queryInterface.addIndex('buses', ['driver_id'], {
      name: 'idx_buses_driver_id',
    });
    await queryInterface.addIndex('buses', ['school_id'], {
      name: 'idx_buses_school_id',
    });

    // driver_ratings: history queries
    await queryInterface.addIndex('driver_ratings', ['driver_id', 'period_start'], {
      name: 'idx_driver_ratings_driver_period_start',
    });

    // ---------- CHECK constraints (DB boundary validation) ----------
    // Use DO blocks so reruns in partially-applied environments are safe.
    await queryInterface.sequelize.query(`
DO $$ BEGIN
  ALTER TABLE payments
    ADD CONSTRAINT check_payments_amount_positive
    CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`);

    await queryInterface.sequelize.query(`
DO $$ BEGIN
  ALTER TABLE driver_ratings
    ADD CONSTRAINT check_driver_ratings_period_order
    CHECK (period_start <= period_end);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`);

    await queryInterface.sequelize.query(`
DO $$ BEGIN
  ALTER TABLE geofences
    ADD CONSTRAINT check_geofences_radius_positive
    CHECK (radius_meters IS NULL OR radius_meters > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`);

    // Coordinate bounds
    await queryInterface.sequelize.query(`
DO $$ BEGIN
  ALTER TABLE locations
    ADD CONSTRAINT check_locations_latitude_bounds
    CHECK (latitude BETWEEN -90 AND 90);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`);
    await queryInterface.sequelize.query(`
DO $$ BEGIN
  ALTER TABLE locations
    ADD CONSTRAINT check_locations_longitude_bounds
    CHECK (longitude BETWEEN -180 AND 180);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`);

    await queryInterface.sequelize.query(`
DO $$ BEGIN
  ALTER TABLE geofences
    ADD CONSTRAINT check_geofences_latitude_bounds
    CHECK (latitude BETWEEN -90 AND 90);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`);
    await queryInterface.sequelize.query(`
DO $$ BEGIN
  ALTER TABLE geofences
    ADD CONSTRAINT check_geofences_longitude_bounds
    CHECK (longitude BETWEEN -180 AND 180);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`);

    await queryInterface.sequelize.query(`
DO $$ BEGIN
  ALTER TABLE attendance
    ADD CONSTRAINT check_attendance_latitude_bounds
    CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`);
    await queryInterface.sequelize.query(`
DO $$ BEGIN
  ALTER TABLE attendance
    ADD CONSTRAINT check_attendance_longitude_bounds
    CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`);

    await queryInterface.sequelize.query(`
DO $$ BEGIN
  ALTER TABLE alcohol_tests
    ADD CONSTRAINT check_alcohol_tests_latitude_bounds
    CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`);
    await queryInterface.sequelize.query(`
DO $$ BEGIN
  ALTER TABLE alcohol_tests
    ADD CONSTRAINT check_alcohol_tests_longitude_bounds
    CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`);

    await queryInterface.sequelize.query(`
DO $$ BEGIN
  ALTER TABLE schools
    ADD CONSTRAINT check_schools_latitude_bounds
    CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`);
    await queryInterface.sequelize.query(`
DO $$ BEGIN
  ALTER TABLE schools
    ADD CONSTRAINT check_schools_longitude_bounds
    CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`);

    await queryInterface.sequelize.query(`
DO $$ BEGIN
  ALTER TABLE students
    ADD CONSTRAINT check_students_home_latitude_bounds
    CHECK (home_latitude IS NULL OR (home_latitude BETWEEN -90 AND 90));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`);
    await queryInterface.sequelize.query(`
DO $$ BEGIN
  ALTER TABLE students
    ADD CONSTRAINT check_students_home_longitude_bounds
    CHECK (home_longitude IS NULL OR (home_longitude BETWEEN -180 AND 180));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`);

    // Geofence relational validity by type (safe minimum)
    await queryInterface.sequelize.query(`
DO $$ BEGIN
  ALTER TABLE geofences
    ADD CONSTRAINT check_geofences_school_requires_school_id
    CHECK (type <> 'school' OR school_id IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`);
    await queryInterface.sequelize.query(`
DO $$ BEGIN
  ALTER TABLE geofences
    ADD CONSTRAINT check_geofences_home_requires_student_id
    CHECK (type <> 'home' OR student_id IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`);
  },

  async down(queryInterface, Sequelize) {
    const dropConstraint = async (table, name) => {
      await queryInterface.sequelize.query(
        `ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${name};`
      );
    };

    await dropConstraint('geofences', 'check_geofences_home_requires_student_id');
    await dropConstraint('geofences', 'check_geofences_school_requires_school_id');
    await dropConstraint('students', 'check_students_home_longitude_bounds');
    await dropConstraint('students', 'check_students_home_latitude_bounds');
    await dropConstraint('schools', 'check_schools_longitude_bounds');
    await dropConstraint('schools', 'check_schools_latitude_bounds');
    await dropConstraint('alcohol_tests', 'check_alcohol_tests_longitude_bounds');
    await dropConstraint('alcohol_tests', 'check_alcohol_tests_latitude_bounds');
    await dropConstraint('attendance', 'check_attendance_longitude_bounds');
    await dropConstraint('attendance', 'check_attendance_latitude_bounds');
    await dropConstraint('geofences', 'check_geofences_longitude_bounds');
    await dropConstraint('geofences', 'check_geofences_latitude_bounds');
    await dropConstraint('locations', 'check_locations_longitude_bounds');
    await dropConstraint('locations', 'check_locations_latitude_bounds');
    await dropConstraint('geofences', 'check_geofences_radius_positive');
    await dropConstraint('driver_ratings', 'check_driver_ratings_period_order');
    await dropConstraint('payments', 'check_payments_amount_positive');

    await queryInterface.removeIndex('driver_ratings', 'idx_driver_ratings_driver_period_start');
    await queryInterface.removeIndex('buses', 'idx_buses_school_id');
    await queryInterface.removeIndex('buses', 'idx_buses_driver_id');
    await queryInterface.removeIndex('RefreshTokens', 'idx_refresh_tokens_user_id');
    await queryInterface.removeIndex('routes', 'idx_routes_bus_id');
    await queryInterface.removeIndex('route_assignments', 'idx_route_assignments_route_pickup_id');
    await queryInterface.removeIndex('route_assignments', 'idx_route_assignments_student_id');
    await queryInterface.removeIndex('driver_feedback', 'idx_driver_feedback_parent_timestamp');
    await queryInterface.removeIndex('driver_feedback', 'idx_driver_feedback_driver_timestamp');
    await queryInterface.removeIndex('alcohol_tests', 'idx_alcohol_tests_driver_passed_timestamp');
    await queryInterface.removeIndex('alcohol_tests', 'idx_alcohol_tests_bus_passed_timestamp');
    await queryInterface.removeIndex('geofences', 'idx_geofences_type_bus_student');
    await queryInterface.removeIndex('geofences', 'idx_geofences_type_school_id');
    await queryInterface.removeIndex('invoices', 'idx_invoices_parent_due_id');
    await queryInterface.removeIndex('invoices', 'idx_invoices_parent_student_status_due_id');
    await queryInterface.removeIndex('payments', 'idx_payments_status_timestamp');
    await queryInterface.removeIndex('payments', 'idx_payments_student_timestamp');
    await queryInterface.removeIndex('payments', 'idx_payments_parent_status_timestamp');
    await queryInterface.removeIndex('payments', 'idx_payments_parent_timestamp');
    await queryInterface.removeIndex('notifications', 'idx_notifications_unread_user_sent_at');
    await queryInterface.removeIndex('notifications', 'idx_notifications_user_type_sent_at');
    await queryInterface.removeIndex('notifications', 'idx_notifications_user_sent_at');
    await queryInterface.removeIndex('locations', 'idx_locations_bus_timestamp_v2');
    await queryInterface.removeIndex('attendance', 'idx_attendance_student_bus_type_timestamp');
    await queryInterface.removeIndex('attendance', 'idx_attendance_bus_timestamp');
    await queryInterface.removeIndex('attendance', 'idx_attendance_student_timestamp');

    await queryInterface.removeIndex('invoices', 'uq_invoices_parent_student_period_label');
    await queryInterface.removeIndex('attendance', 'uq_attendance_event_id');
    await queryInterface.removeIndex('driver_ratings', 'uq_driver_ratings_driver_period');

    // Remove column
    await queryInterface.removeColumn('attendance', 'event_id');
  },
};

