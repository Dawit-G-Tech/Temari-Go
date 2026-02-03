import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'schools' })
export class School extends Model {
  @Column({ type: DataType.STRING(100), allowNull: false })
  name!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  address?: string;

  @Column({ type: DataType.DECIMAL(10, 8), allowNull: true })
  latitude?: number;

  @Column({ type: DataType.DECIMAL(11, 8), allowNull: true })
  longitude?: number;
}
