import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { StaffRole } from '../staff.entity';

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsEnum(StaffRole)
  role?: StaffRole;

  /** false disables login and invalidates existing tokens on their next request. */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
