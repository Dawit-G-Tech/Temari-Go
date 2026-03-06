import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { Bus } from './bus.model';

@Table({ tableName: 'locations', underscored: true, timestamps: true })
export class Location extends Model {
  @ForeignKey(() => Bus)
  @Column({ type: DataType.INTEGER, allowNull: false })
  bus_id!: number;

  @Column({
    type: DataType.DECIMAL(10, 8),
    allowNull: false,
    get() {
      return Number(this.getDataValue('latitude'));
    },
  })
  latitude!: number;

  @Column({
    type: DataType.DECIMAL(11, 8),
    allowNull: false,
    get() {
      return Number(this.getDataValue('longitude'));
    },
  })
  longitude!: number;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: true,
    get() {
      const v = this.getDataValue('speed') as unknown;
      return v == null ? null : Number(v);
    },
  })
  speed?: number | null;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  timestamp!: Date;

  @BelongsTo(() => Bus)
  bus!: Bus;
}

