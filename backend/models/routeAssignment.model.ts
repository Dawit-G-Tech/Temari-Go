import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { Route } from './route.model';
import { Student } from './student.model';

@Table({ tableName: 'route_assignments', underscored: true, timestamps: false })
export class RouteAssignment extends Model {
  @ForeignKey(() => Route)
  @Column({ type: DataType.INTEGER, allowNull: false })
  route_id!: number;

  @ForeignKey(() => Student)
  @Column({ type: DataType.INTEGER, allowNull: false })
  student_id!: number;

  @Column({ type: DataType.DECIMAL(10, 8), allowNull: true })
  pickup_latitude?: number;

  @Column({ type: DataType.DECIMAL(11, 8), allowNull: true })
  pickup_longitude?: number;

  /** Order of this stop in the optimized route (0-based). Null if not yet optimized. */
  @Column({ type: DataType.INTEGER, allowNull: true })
  pickup_order?: number;

  @BelongsTo(() => Route)
  route!: Route;

  @BelongsTo(() => Student)
  student!: Student;
}

