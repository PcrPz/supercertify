// src/auth/services/token-blacklist.service.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TokenBlacklist, TokenBlacklistDocument } from '../schemas/token-blacklist.schema';

@Injectable()
export class TokenBlacklistService {
  constructor(
    @InjectModel(TokenBlacklist.name) private tokenBlacklistModel: Model<TokenBlacklistDocument>,
  ) {}

  async addToBlacklist(userId: string, expiresAt: Date): Promise<TokenBlacklistDocument> {
    const tokenBlacklist = new this.tokenBlacklistModel({
      userId,
      expiresAt,
    });
    
    return tokenBlacklist.save();
  }

  async isBlacklisted(userId: string): Promise<boolean> {
    const blacklistedToken = await this.tokenBlacklistModel.findOne({
      userId,
      expiresAt: { $gt: new Date() },
    }).exec();
    
    return !!blacklistedToken;
  }
}