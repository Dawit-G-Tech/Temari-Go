import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { User } from './user.model';

@Table({ tableName: 'Roles' })
export class Role extends Model {
  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  name!: string;

  @HasMany(() => User)
  users!: User[];
}
