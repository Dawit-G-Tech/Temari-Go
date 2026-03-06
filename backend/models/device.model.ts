import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Bus } from './bus.model';

@Table({ tableName: 'devices', underscored: true, timestamps: true })
export class Device extends Model {
  @Column({ type: DataType.STRING(100), allowNull: false })
  name!: string;

  /**
   * API key hash (sha256 hex). Store only hashes, never raw keys.
   */
  @Column({ type: DataType.STRING(64), allowNull: false, unique: true })
  api_key_hash!: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  active!: boolean;

  @ForeignKey(() => Bus)
  @Column({ type: DataType.INTEGER, allowNull: true })
  bus_id?: number;

  @BelongsTo(() => Bus)
  bus?: Bus;
}

