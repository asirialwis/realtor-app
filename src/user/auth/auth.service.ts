import { ConflictException, HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { UserType } from '@prisma/client';

interface SignupParams {
  email: string;
  password: string;
  name: string;
  phone: string;
}

interface SigninParams {
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly prismaService: PrismaService) {}

  async signup(
    { email, password, name, phone }: SignupParams,
    userType: UserType,
  ) {
    const userExists = await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });

    if (userExists) {
      throw new ConflictException();
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prismaService.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        user_type: userType,
      },
    });

    const token = await this.generateJWT(user.name, user.id);
    return token;
  }

  async signin({ email, password }: SigninParams) {
    const user = await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new HttpException('Invalid credentials', 400);
    }

    const hashedPassword = user.password;
    const isPasswordValid = await bcrypt.compare(password, hashedPassword);

    if (!isPasswordValid) {
      throw new HttpException('Invalid credentials', 400);
    }
    const token = await this.generateJWT(user.name, user.id);
    return token;
  }

  private generateJWT(name: string, id: number) {
    return jwt.sign(
      {
        name,
        id,
      },
      process.env.JSON_TOKEN_KEY,
      {
        expiresIn: '10m',
      },
    );
  }

  async generateProductKey(email: string, userType: UserType) {
    const string = `${email}-${userType}-${process.env.PRODUCT_KEY_SECRET}`;

    const hashedString = await bcrypt.hash(string, 10);

    return hashedString;
  }
}
