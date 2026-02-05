import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { RefreshToken } from './refreshToken.model';
import { Role } from './role.model';
import { Student } from './student.model';
import { Bus } from './bus.model';
import { AlcoholTest } from './alcoholTest.model';
import { DriverFeedback } from './driverFeedback.model';
import { DriverRating } from './driverRating.model';
import { Payment } from './payment.model';
import { Notification } from './notification.model';

@Table({ tableName: 'Users', underscored: true })
export class User extends Model {
  @Column({ type: DataType.STRING, allowNull: false })
  name!: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  email!: string;

  @Column({ type: DataType.STRING, allowNull: true })
  password?: string;

  @Column({ type: DataType.STRING(50), allowNull: true, unique: true })
  username?: string;

  @Column({ type: DataType.STRING(20), allowNull: true })
  phone_number?: string;

  @Column({ type: DataType.STRING(10), allowNull: true, defaultValue: 'en' })
  language_preference?: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  fcm_token?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  google_id?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  avatar?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  provider?: string;

  @HasMany(() => RefreshToken)
  refreshTokens!: RefreshToken[];

  @ForeignKey(() => Role)
  @Column({ type: DataType.INTEGER, allowNull: true })
  role_id?: number;

  @BelongsTo(() => Role)
  role?: Role;

  // Relationships for parent role
  @HasMany(() => Student, 'parent_id')
  students!: Student[];

  @HasMany(() => Payment, 'parent_id')
  payments!: Payment[];

  @HasMany(() => DriverFeedback, 'parent_id')
  driverFeedbacksGiven!: DriverFeedback[];

  // Relationships for driver role
  @HasMany(() => Bus, 'driver_id')
  buses!: Bus[];

  @HasMany(() => AlcoholTest, 'driver_id')
  alcoholTests!: AlcoholTest[];

  @HasMany(() => DriverFeedback, 'driver_id')
  driverFeedbacksReceived!: DriverFeedback[];

  @HasMany(() => DriverRating, 'driver_id')
  driverRatings!: DriverRating[];

  // Relationships for all users
  @HasMany(() => Notification, 'user_id')
  notifications!: Notification[];
}
