import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
  HasMany,
  ForeignKey,
} from 'sequelize-typescript';
import { User } from './user.model';
import { Geofence } from './geofence.model';
import { Attendance } from './attendance.model';
import { Location } from './location.model';
import { Route } from './route.model';
import { AlcoholTest } from './alcoholTest.model';

@Table({ tableName: 'buses' })
export class Bus extends Model {
  @Column({ type: DataType.STRING(20), allowNull: false, unique: true })
  bus_number!: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  driver_id?: number;

  @Column({ type: DataType.INTEGER, allowNull: true, defaultValue: 50 })
  capacity?: number;

  @BelongsTo(() => User, 'driver_id')
  driver?: User;

  @HasMany(() => Geofence)
  geofences!: Geofence[];

  @HasMany(() => Attendance)
  attendances!: Attendance[];

  @HasMany(() => Location)
  locations!: Location[];

  @HasMany(() => Route)
  routes!: Route[];

  @HasMany(() => AlcoholTest)
  alcoholTests!: AlcoholTest[];
}

