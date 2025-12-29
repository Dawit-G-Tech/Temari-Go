import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
  HasMany,
  ForeignKey,
} from 'sequelize-typescript';
import { Student } from './student.model';
import { Bus } from './bus.model';
import { Attendance } from './attendance.model';

@Table({ tableName: 'geofences' })
export class Geofence extends Model {
  @Column({ type: DataType.STRING(100), allowNull: false })
  name!: string;

  @Column({
    type: DataType.ENUM('school', 'home'),
    allowNull: false,
  })
  type!: 'school' | 'home';

  @Column({ type: DataType.DECIMAL(10, 8), allowNull: false })
  latitude!: number;

  @Column({ type: DataType.DECIMAL(11, 8), allowNull: false })
  longitude!: number;

  @Column({ type: DataType.INTEGER, allowNull: true, defaultValue: 50 })
  radius_meters?: number;

  @ForeignKey(() => Student)
  @Column({ type: DataType.INTEGER, allowNull: true })
  student_id?: number;

  @ForeignKey(() => Bus)
  @Column({ type: DataType.INTEGER, allowNull: true })
  bus_id?: number;

  @BelongsTo(() => Student)
  student?: Student;

  @BelongsTo(() => Bus)
  bus?: Bus;

  @HasMany(() => Attendance)
  attendances!: Attendance[];
}

