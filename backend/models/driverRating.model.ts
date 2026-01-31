import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { User } from './user.model';

@Table({ tableName: 'driver_ratings' })
export class DriverRating extends Model {
  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  driver_id!: number;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: true, defaultValue: 0 })
  safety_compliance_score?: number;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: true, defaultValue: 0 })
  parental_feedback_score?: number;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: true, defaultValue: 0 })
  operational_performance_score?: number;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: true, defaultValue: 0 })
  overall_score?: number;

  @Column({ type: DataType.INTEGER, allowNull: true, defaultValue: 0 })
  missed_pickups?: number;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  period_start!: Date;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  period_end!: Date;

  @BelongsTo(() => User, 'driver_id')
  driver!: User;
}

