import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
  HasMany,
  ForeignKey,
} from 'sequelize-typescript';
import { Bus } from './bus.model';
import { RouteAssignment } from './routeAssignment.model';

@Table({ tableName: 'routes', underscored: true })
export class Route extends Model {
  @ForeignKey(() => Bus)
  @Column({ type: DataType.INTEGER, allowNull: false })
  bus_id!: number;

  @Column({ type: DataType.STRING(100), allowNull: false })
  name!: string;

  @Column({ type: DataType.TIME, allowNull: true })
  start_time?: string;

  @Column({ type: DataType.TIME, allowNull: true })
  end_time?: string;

  @BelongsTo(() => Bus)
  bus!: Bus;

  @HasMany(() => RouteAssignment)
  routeAssignments!: RouteAssignment[];
}

