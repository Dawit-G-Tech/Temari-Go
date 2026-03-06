import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { User } from './user.model';

@Table({ tableName: 'driver_ratings', underscored: true, timestamps: true })
export class DriverRating extends Model {
  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  driver_id!: number;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    get() {
      const v = this.getDataValue('safety_compliance_score') as unknown;
      return v == null ? null : Number(v);
    },
  })
  safety_compliance_score?: number | null;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    get() {
      const v = this.getDataValue('parental_feedback_score') as unknown;
      return v == null ? null : Number(v);
    },
  })
  parental_feedback_score?: number | null;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    get() {
      const v = this.getDataValue('operational_performance_score') as unknown;
      return v == null ? null : Number(v);
    },
  })
  operational_performance_score?: number | null;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    get() {
      const v = this.getDataValue('overall_score') as unknown;
      return v == null ? null : Number(v);
    },
  })
  overall_score?: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true, defaultValue: 0 })
  missed_pickups?: number;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  period_start!: Date;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  period_end!: Date;

  @BelongsTo(() => User, 'driver_id')
  driver!: User;
}

