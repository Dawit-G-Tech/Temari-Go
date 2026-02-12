import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { Bus } from './bus.model';

@Table({ tableName: 'locations', underscored: true, timestamps: false })
export class Location extends Model {
  @ForeignKey(() => Bus)
  @Column({ type: DataType.INTEGER, allowNull: false })
  bus_id!: number;

  @Column({ type: DataType.DECIMAL(12, 10), allowNull: false })
  latitude!: number;

  @Column({ type: DataType.DECIMAL(13, 10), allowNull: false })
  longitude!: number;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: true })
  speed?: number;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  timestamp!: Date;

  @BelongsTo(() => Bus)
  bus!: Bus;
}

