import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PASSWORD_MESSAGE, PASSWORD_RULE } from '../../auth/dto/register-customer.dto';
import { StaffRole } from '../staff.entity';

export class CreateStaffDto {
  /** @example "staff1@shop.local" */
  @IsEmail()
  @MaxLength(255)
  email: string;

  /** @example "Staff@12345" */
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  password: string;

  /** @example "Noy Vongsa" */
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName: string;

  @IsOptional()
  @IsEnum(StaffRole)
  role?: StaffRole;
}
