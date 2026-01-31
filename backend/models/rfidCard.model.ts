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
import { Attendance } from './attendance.model';

@Table({ tableName: 'rfid_cards' })
export class RFIDCard extends Model {
  @Column({ type: DataType.STRING(50), allowNull: false, unique: true })
  rfid_tag!: string;

  @ForeignKey(() => Student)
  @Column({ type: DataType.INTEGER, allowNull: false })
  student_id!: number;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  issued_at!: Date;

  @Column({ type: DataType.BOOLEAN, allowNull: true, defaultValue: true })
  active!: boolean;

  @BelongsTo(() => Student)
  student!: Student;

  @HasMany(() => Attendance)
  attendances!: Attendance[];
}

