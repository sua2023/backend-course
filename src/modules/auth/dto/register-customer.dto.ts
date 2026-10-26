import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).+$/;
export const PASSWORD_MESSAGE = 'password must contain at least one letter and one number';

export class RegisterCustomerDto {
  /** @example "customer@example.com" */
  @IsEmail()
  @MaxLength(255)
  email: string;

  /** 8 to 72 characters, at least one letter and one number. @example "Secret123" */
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  password: string;

  /** @example "Somchai Phommachanh" */
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName: string;

  /** @example "+856 20 5555 1234" */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
