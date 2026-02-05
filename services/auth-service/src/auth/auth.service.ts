import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { UnauthorizedException } from '@ecommerce/shared';
import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/** Auth service: login/register/refresh. User data lives in user-service (service boundary). */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    // private readonly config: ConfigService,
    private readonly authRepo: AuthRepository,
  ) {}
  private readonly userServiceUrl = 'http://localhost:3002';
  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    // In a full setup, validate credentials via user-service or local user table
    const userId = await this.validateUser(dto.email, dto.password);
    if (!userId) throw new UnauthorizedException('Invalid email or password');
    return this.issueTokens(userId);
  }

  async register(dto: RegisterDto): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    // In a full setup, create user via user-service HTTP call, then issue tokens
    const userId = await this.createUser(dto);
    return this.issueTokens(userId);
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    const hash = this.hashToken(refreshToken);
    const row = await this.authRepo.findValidToken(hash);
    if (!row || row.expiresAt < new Date())
      throw new UnauthorizedException('Invalid or expired refresh token');
    const payload = { sub: row.userId };
    const accessToken = this.jwt.sign(payload, { expiresIn: '15m' });
    return { accessToken, expiresIn: 900 };
  }

  private async issueTokens(userId: string) {
    const payload = { sub: userId };
    const accessToken = this.jwt.sign(payload, { expiresIn: '15m' });
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const refreshToken = randomBytes(32).toString('hex');
    const hash = this.hashToken(refreshToken);
    await this.authRepo.saveRefreshToken(userId, hash, refreshExpires);
    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }

  private hashToken(token: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /** Placeholder: call user-service to validate credentials. Returns userId or null. */
  private async validateUser(email: string, _password: string): Promise<string | null> {
    // const base = this.config.get<string>('USER_SERVICE_URL');
    const base = this.userServiceUrl;
    // if (!base) return 'demo-user-id'; // dev fallback
    try {
      const res = await fetch(`${base}/users/by-email/${encodeURIComponent(email)}`);
      if (!res.ok) return null;
      const user = (await res.json()) as { id?: string };
      return user?.id ?? null;
    } catch {
      return null;
    }
  }

  /** Placeholder: call user-service to create user. Returns userId. */
  private async createUser(dto: RegisterDto): Promise<string> {
    // const base = this.config.get<string>('USER_SERVICE_URL');
    const base = this.userServiceUrl;
    // if (!base) return 'demo-user-id';
    const res = await fetch(`${base}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: dto.email, password: dto.password, name: dto.name }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      throw new UnauthorizedException(err?.message ?? 'Registration failed');
    }
    const user = (await res.json()) as { id: string };
    return user.id;
  }
}
