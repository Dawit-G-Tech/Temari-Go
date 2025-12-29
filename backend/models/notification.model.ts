import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { User } from './user.model';

@Table({ tableName: 'notifications' })
export class Notification extends Model {
  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  user_id!: number;

  @Column({ type: DataType.STRING(50), allowNull: false })
  type!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  message!: string;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  sent_at!: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  read_at?: Date;

  @BelongsTo(() => User, 'user_id')
  user!: User;
}

