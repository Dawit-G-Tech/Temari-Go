import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { Student } from './student.model';
import { Bus } from './bus.model';
import { RFIDCard } from './rfidCard.model';
import { Geofence } from './geofence.model';

@Table({ tableName: 'attendance' })
export class Attendance extends Model {
  @ForeignKey(() => Student)
  @Column({ type: DataType.INTEGER, allowNull: false })
  student_id!: number;

  @ForeignKey(() => Bus)
  @Column({ type: DataType.INTEGER, allowNull: false })
  bus_id!: number;

  @ForeignKey(() => RFIDCard)
  @Column({ type: DataType.INTEGER, allowNull: true })
  rfid_card_id?: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  type!: 'boarding' | 'exiting';

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  timestamp!: Date;

  @Column({ type: DataType.DECIMAL(10, 8), allowNull: true })
  latitude?: number;

  @Column({ type: DataType.DECIMAL(11, 8), allowNull: true })
  longitude?: number;

  @ForeignKey(() => Geofence)
  @Column({ type: DataType.INTEGER, allowNull: true })
  geofence_id?: number;

  @Column({ type: DataType.BOOLEAN, allowNull: true, defaultValue: false })
  manual_override?: boolean;

  @BelongsTo(() => Student)
  student!: Student;

  @BelongsTo(() => Bus)
  bus!: Bus;

  @BelongsTo(() => RFIDCard)
  rfidCard?: RFIDCard;

  @BelongsTo(() => Geofence)
  geofence?: Geofence;
}

