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

@Table({ tableName: 'payments', underscored: true })
export class Payment extends Model {
  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  parent_id!: number;

  @ForeignKey(() => Student)
  @Column({ type: DataType.INTEGER, allowNull: false })
  student_id!: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  amount!: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'pending',
  })
  status!: 'pending' | 'completed' | 'failed';

  @Column({ type: DataType.STRING(50), allowNull: true, unique: true })
  chapa_transaction_id?: string;

  @Column({ type: DataType.STRING(20), allowNull: true })
  payment_method?: string;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  timestamp!: Date;

  @BelongsTo(() => User, 'parent_id')
  parent!: User;

  @BelongsTo(() => Student)
  student!: Student;
}

