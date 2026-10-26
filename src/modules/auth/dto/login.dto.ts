import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  /** @example "customer@example.com" */
  @IsEmail()
  email: string;

  /** @example "Secret123" */
  @IsString()
  @IsNotEmpty()
  password: string;
}
