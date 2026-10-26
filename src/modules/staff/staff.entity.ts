import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Column, Entity, Index } from 'typeorm';
import { TimestampedEntity } from '../../common/entities/timestamped.entity';

export enum StaffRole {
  Admin = 'admin',
  Staff = 'staff',
}

/** Employees who run the shop. Only an admin can create staff accounts. */
@Entity('staff')
export class Staff extends TimestampedEntity {
  @Index('UQ_staff_email', { unique: true })
  @Column({ length: 255 })
  email: string;

  @ApiHideProperty()
  @Exclude()
  @Column({ name: 'password_hash', length: 255, select: false })
  passwordHash: string;

  @Column({ name: 'full_name', length: 120 })
  fullName: string;

  @Column({ type: 'enum', enum: StaffRole, default: StaffRole.Staff })
  role: StaffRole;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
