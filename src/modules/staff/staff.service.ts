import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashPassword } from '../../common/utils/password';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { Staff, StaffRole } from './staff.entity';

@Injectable()
export class StaffService {
  constructor(@InjectRepository(Staff) private readonly staff: Repository<Staff>) {}

  findAll() {
    return this.staff.find({ order: { createdAt: 'ASC' } });
  }

  async findOne(id: number) {
    const member = await this.staff.findOneBy({ id });
    if (!member) throw new NotFoundException('Staff member not found');
    return member;
  }

  async create(dto: CreateStaffDto) {
    const email = dto.email.toLowerCase();
    if (await this.staff.existsBy({ email })) {
      throw new ConflictException('Email is already used by a staff member');
    }
    const member = this.staff.create({
      email,
      fullName: dto.fullName,
      role: dto.role ?? StaffRole.Staff,
      passwordHash: await hashPassword(dto.password),
    });
    return this.staff.save(member);
  }

  async update(id: number, dto: UpdateStaffDto, currentStaffId: number) {
    const member = await this.findOne(id);
    // Stops an admin from locking themselves out by accident.
    if (id === currentStaffId && (dto.isActive === false || dto.role === StaffRole.Staff)) {
      throw new BadRequestException('You cannot disable or demote your own account');
    }
    Object.assign(member, dto);
    return this.staff.save(member);
  }
}
