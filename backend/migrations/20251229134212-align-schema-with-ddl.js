'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Step 1: Add missing columns to Users table (all nullable to preserve existing data)
      await queryInterface.addColumn('Users', 'username', {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true,
      }, { transaction });

      await queryInterface.addColumn('Users', 'phone_number', {
        type: Sequelize.STRING(20),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('Users', 'language_preference', {
        type: Sequelize.STRING(10),
        allowNull: true,
        defaultValue: 'en',
      }, { transaction });

      // Add check constraint for language_preference
      await queryInterface.sequelize.query(
        `ALTER TABLE "Users" ADD CONSTRAINT check_language_preference CHECK (language_preference IN ('en', 'am'))`,
        { transaction }
      );

      // Step 2: Create Enum Types
      await queryInterface.sequelize.query(
        `CREATE TYPE attendance_type AS ENUM ('boarding', 'exiting')`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed')`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE TYPE geofence_type AS ENUM ('school', 'home')`,
        { transaction }
      );

      // Step 3: Create Students Table
      await queryInterface.createTable('students', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        full_name: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        grade: {
          type: Sequelize.STRING(20),
          allowNull: true,
        },
        parent_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        home_latitude: {
          type: Sequelize.DECIMAL(10, 8),
          allowNull: true,
        },
        home_longitude: {
          type: Sequelize.DECIMAL(11, 8),
          allowNull: true,
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
      }, { transaction });

      // Step 4: Create Buses Table
      await queryInterface.createTable('buses', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        bus_number: {
          type: Sequelize.STRING(20),
          allowNull: false,
          unique: true,
        },
        driver_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'Users',
            key: 'id',
          },
          onDelete: 'SET NULL',
        },
        capacity: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 50,
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
      }, { transaction });

      // Step 5: Create RFID Cards Table
      await queryInterface.createTable('rfid_cards', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        rfid_tag: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true,
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
        issued_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        active: {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          defaultValue: true,
        },
      }, { transaction });

      // Step 6: Create Geofences Table
      await queryInterface.createTable('geofences', {
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
        latitude: {
          type: Sequelize.DECIMAL(10, 8),
          allowNull: false,
        },
        longitude: {
          type: Sequelize.DECIMAL(11, 8),
          allowNull: false,
        },
        radius_meters: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 50,
        },
        student_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'students',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        bus_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'buses',
            key: 'id',
          },
          onDelete: 'CASCADE',
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
      }, { transaction });

      // Add type column with enum constraint for geofences
      await queryInterface.sequelize.query(
        `ALTER TABLE geofences ADD COLUMN type geofence_type NOT NULL`,
        { transaction }
      );

      // Step 7: Create Attendance Table
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
      }, { transaction });

      // Add type column with enum constraint for attendance
      await queryInterface.sequelize.query(
        `ALTER TABLE attendance ADD COLUMN type attendance_type NOT NULL DEFAULT 'boarding'`,
        { transaction }
      );

      // Step 8: Create Locations Table
      await queryInterface.createTable('locations', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
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
        latitude: {
          type: Sequelize.DECIMAL(10, 8),
          allowNull: false,
        },
        longitude: {
          type: Sequelize.DECIMAL(11, 8),
          allowNull: false,
        },
        speed: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
        },
        timestamp: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }, { transaction });

      // Step 9: Create Alcohol Tests Table
      await queryInterface.createTable('alcohol_tests', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        driver_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id',
          },
          onDelete: 'CASCADE',
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
        alcohol_level: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: false,
        },
        passed: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
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
        created_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }, { transaction });

      // Step 10: Create Driver Feedback Table
      await queryInterface.createTable('driver_feedback', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        driver_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        parent_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        rating: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        comment: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        timestamp: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }, { transaction });

      // Add check constraint for rating
      await queryInterface.sequelize.query(
        `ALTER TABLE driver_feedback ADD CONSTRAINT check_rating CHECK (rating BETWEEN 1 AND 5)`,
        { transaction }
      );

      // Step 11: Create Driver Ratings Table
      await queryInterface.createTable('driver_ratings', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        driver_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        safety_compliance_score: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
          defaultValue: 0,
        },
        parental_feedback_score: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
          defaultValue: 0,
        },
        operational_performance_score: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
          defaultValue: 0,
        },
        overall_score: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
          defaultValue: 0,
        },
        missed_pickups: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 0,
        },
        period_start: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        period_end: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        updated_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }, { transaction });

      // Step 12: Create Payments Table
      await queryInterface.createTable('payments', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        parent_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Users',
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
        amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        chapa_transaction_id: {
          type: Sequelize.STRING(50),
          allowNull: true,
          unique: true,
        },
        payment_method: {
          type: Sequelize.STRING(20),
          allowNull: true,
        },
        timestamp: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }, { transaction });

      // Add status column with enum constraint for payments
      await queryInterface.sequelize.query(
        `ALTER TABLE payments ADD COLUMN status payment_status NOT NULL DEFAULT 'pending'`,
        { transaction }
      );

      // Step 13: Create Notifications Table
      await queryInterface.createTable('notifications', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        type: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        message: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        sent_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        read_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }, { transaction });

      // Step 14: Create Routes Table
      await queryInterface.createTable('routes', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
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
        name: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        start_time: {
          type: Sequelize.TIME,
          allowNull: true,
        },
        end_time: {
          type: Sequelize.TIME,
          allowNull: true,
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
      }, { transaction });

      // Step 15: Create Route Assignments Table
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
      }, { transaction });

      // Add unique constraint for route_assignments
      await queryInterface.addIndex('route_assignments', ['route_id', 'student_id'], {
        unique: true,
        name: 'route_assignments_route_id_student_id_unique',
        transaction,
      });

      // Step 16: Create Performance Indexes
      await queryInterface.addIndex('attendance', ['timestamp'], {
        name: 'idx_attendance_timestamp',
        transaction,
      });

      await queryInterface.addIndex('locations', ['bus_id', 'timestamp'], {
        name: 'idx_locations_bus_timestamp',
        transaction,
      });

      await queryInterface.addIndex('Users', ['roleId'], {
        name: 'idx_users_role',
        transaction,
      });

      await queryInterface.addIndex('students', ['parent_id'], {
        name: 'idx_students_parent',
        transaction,
      });

      await queryInterface.addIndex('payments', ['status'], {
        name: 'idx_payments_status',
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Drop indexes first
      await queryInterface.removeIndex('payments', 'idx_payments_status', { transaction });
      await queryInterface.removeIndex('students', 'idx_students_parent', { transaction });
      await queryInterface.removeIndex('Users', 'idx_users_role', { transaction });
      await queryInterface.removeIndex('locations', 'idx_locations_bus_timestamp', { transaction });
      await queryInterface.removeIndex('attendance', 'idx_attendance_timestamp', { transaction });

      // Drop tables in reverse order (respecting foreign key dependencies)
      await queryInterface.dropTable('route_assignments', { transaction });
      await queryInterface.dropTable('routes', { transaction });
      await queryInterface.dropTable('notifications', { transaction });
      await queryInterface.dropTable('payments', { transaction });
      await queryInterface.dropTable('driver_ratings', { transaction });
      await queryInterface.dropTable('driver_feedback', { transaction });
      await queryInterface.dropTable('alcohol_tests', { transaction });
      await queryInterface.dropTable('locations', { transaction });
      await queryInterface.dropTable('attendance', { transaction });
      await queryInterface.dropTable('geofences', { transaction });
      await queryInterface.dropTable('rfid_cards', { transaction });
      await queryInterface.dropTable('buses', { transaction });
      await queryInterface.dropTable('students', { transaction });

      // Drop enum types
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS geofence_type', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS payment_status', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS attendance_type', { transaction });

      // Remove columns from Users table
      await queryInterface.removeConstraint('Users', 'check_language_preference', { transaction });
      await queryInterface.removeColumn('Users', 'language_preference', { transaction });
      await queryInterface.removeColumn('Users', 'phone_number', { transaction });
      await queryInterface.removeColumn('Users', 'username', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

