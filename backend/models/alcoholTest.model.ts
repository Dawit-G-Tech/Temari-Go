import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { User } from './user.model';
import { Bus } from './bus.model';

@Table({ tableName: 'alcohol_tests', underscored: true, timestamps: true })
export class AlcoholTest extends Model {
  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  driver_id!: number;

  @ForeignKey(() => Bus)
  @Column({ type: DataType.INTEGER, allowNull: true })
  bus_id?: number;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: false,
    get() {
      return Number(this.getDataValue('alcohol_level'));
    },
  })
  alcohol_level!: number;

  @Column({ type: DataType.BOOLEAN, allowNull: false })
  passed!: boolean;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  timestamp!: Date;

  @Column({
    type: DataType.DECIMAL(10, 8),
    allowNull: true,
    get() {
      const v = this.getDataValue('latitude') as unknown;
      return v == null ? null : Number(v);
    },
  })
  latitude?: number | null;

  @Column({
    type: DataType.DECIMAL(11, 8),
    allowNull: true,
    get() {
      const v = this.getDataValue('longitude') as unknown;
      return v == null ? null : Number(v);
    },
  })
  longitude?: number | null;

  @BelongsTo(() => User, 'driver_id')
  driver!: User;

  @BelongsTo(() => Bus)
  bus?: Bus;
}

