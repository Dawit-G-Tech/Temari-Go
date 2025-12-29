import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { User } from './user.model';

@Table({ tableName: 'driver_feedback' })
export class DriverFeedback extends Model {
  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  driver_id!: number;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  parent_id!: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  rating?: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  comment?: string;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  timestamp!: Date;

  @BelongsTo(() => User, 'driver_id')
  driver!: User;

  @BelongsTo(() => User, 'parent_id')
  parent!: User;
}

