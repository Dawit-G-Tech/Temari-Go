import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { User } from './user.model';
import { Student } from './student.model';
import { Payment } from './payment.model';

export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

@Table({ tableName: 'invoices', underscored: true })
export class Invoice extends Model {
  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  parent_id!: number;

  @ForeignKey(() => Student)
  @Column({ type: DataType.INTEGER, allowNull: false })
  student_id!: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  amount!: number;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  due_date!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  period_label!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'pending',
  })
  status!: InvoiceStatus;

  @ForeignKey(() => Payment)
  @Column({ type: DataType.INTEGER, allowNull: true })
  payment_id?: number;

  @BelongsTo(() => User, 'parent_id')
  parent!: User;

  @BelongsTo(() => Student)
  student!: Student;

  @BelongsTo(() => Payment, 'payment_id')
  payment!: Payment | null;
}
