import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'schools', underscored: true })
export class School extends Model {
  @Column({ type: DataType.STRING(100), allowNull: false })
  name!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  address?: string;

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
}
