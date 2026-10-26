import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  /** The slug is generated from the name. @example "Electronics" */
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;
}
