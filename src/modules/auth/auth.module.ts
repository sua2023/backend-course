import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../customers/customer.entity';
import { Staff } from '../staff/staff.entity';
import { AuthService } from './auth.service';
import { CustomerAuthController } from './customer-auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { StaffAuthController } from './staff-auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, Staff]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<number>('JWT_EXPIRES_IN', 3600) },
      }),
    }),
  ],
  controllers: [CustomerAuthController, StaffAuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
