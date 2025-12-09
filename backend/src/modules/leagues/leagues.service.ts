import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { League, LeagueDocument } from './schemas/league.schema';

@Injectable()
export class LeaguesService {
  constructor(@InjectModel(League.name) private leagueModel: Model<LeagueDocument>) {}

  async findAll() {
    return this.leagueModel.find().exec();
  }

  async seed() {
    const count = await this.leagueModel.countDocuments();
    if (count > 0) return { message: 'Leagues already exist' };

    const leagues = [
      { name: 'Premier League', country: 'England' },
      { name: 'La Liga', country: 'Spain' },
      { name: 'Bundesliga', country: 'Germany' },
      { name: 'Serie A', country: 'Italy' },
      { name: 'Ligue 1', country: 'France' },
      { name: 'Champions League', country: 'Europe' },
    ];

    await this.leagueModel.insertMany(leagues);
    return { message: 'Created 5 Major Leagues + UCL' };
  }
}
