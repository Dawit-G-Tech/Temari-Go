import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
  HasMany,
  ForeignKey,
} from 'sequelize-typescript';
import { User } from './user.model';
import { RFIDCard } from './rfidCard.model';
import { Attendance } from './attendance.model';
import { RouteAssignment } from './routeAssignment.model';
import { Payment } from './payment.model';
import { Geofence } from './geofence.model';

@Table({ tableName: 'students', underscored: true })
export class Student extends Model {
  @Column({ type: DataType.STRING(100), allowNull: false })
  full_name!: string;

  @Column({ type: DataType.STRING(20), allowNull: true })
  grade?: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  parent_id!: number;

  @Column({
    type: DataType.DECIMAL(10, 8),
    allowNull: true,
    get() {
      const v = this.getDataValue('home_latitude') as unknown;
      return v == null ? null : Number(v);
    },
  })
  home_latitude?: number | null;

  @Column({
    type: DataType.DECIMAL(11, 8),
    allowNull: true,
    get() {
      const v = this.getDataValue('home_longitude') as unknown;
      return v == null ? null : Number(v);
    },
  })
  home_longitude?: number | null;

  @BelongsTo(() => User, 'parent_id')
  parent!: User;

  @HasMany(() => RFIDCard)
  rfidCards!: RFIDCard[];

  @HasMany(() => Attendance)
  attendances!: Attendance[];

  @HasMany(() => RouteAssignment)
  routeAssignments!: RouteAssignment[];

  @HasMany(() => Payment)
  payments!: Payment[];

  @HasMany(() => Geofence)
  geofences!: Geofence[];
}

