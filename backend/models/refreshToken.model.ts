import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { User } from './user.model';

@Table({ tableName: 'RefreshTokens' })
export class RefreshToken extends Model {
  @Column({ type: DataType.STRING })
  token!: string;

  @Column({ type: DataType.DATE })
  expiryDate!: Date;

  @ForeignKey(() => User)
  @Column
  userId!: number;

  @BelongsTo(() => User)
  user!: User;
}
