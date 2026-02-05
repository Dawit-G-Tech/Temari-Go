import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { User } from './user.model';

@Table({ tableName: 'RefreshTokens', underscored: true })
export class RefreshToken extends Model {
  @Column({ type: DataType.STRING })
  token!: string;

  @Column({ type: DataType.DATE })
  expiry_date!: Date;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER })
  user_id!: number;

  @BelongsTo(() => User)
  user!: User;
}
