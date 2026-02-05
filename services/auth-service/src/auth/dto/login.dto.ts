import { IsEmail, IsString, MinLength } from 'class-validator';

/** DTO = data transfer object (API contract, validation, no DB fields) */
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
