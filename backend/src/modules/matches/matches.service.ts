import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose'; 
import { Match, MatchDocument } from './schemas/match.schema';
import { Team, TeamDocument } from '../teams/schemas/team.schema';
import { League, LeagueDocument } from '../leagues/schemas/league.schema';

@Injectable()
export class MatchesService {
  constructor(
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    @InjectModel(League.name) private leagueModel: Model<LeagueDocument>,
  ) {}

  async findAll() {
    return this.matchModel.find().exec();
  }

  async seed() {
    const count = await this.matchModel.countDocuments();
    if (count > 0) return { message: 'Matches already exist!' };

    const leagues = await this.leagueModel.find().exec();
    const allMatchesToInsert: Partial<Match>[] = [];

    for (const league of leagues) {
      const teams = await this.teamModel.find({ leagueId: league._id }).exec();
      
      if (teams.length < 2) continue; 

      const fixtures = this.generateRoundRobin(teams, league._id as Types.ObjectId);
      allMatchesToInsert.push(...fixtures);
    }

    await this.matchModel.insertMany(allMatchesToInsert);
    
    return { 
      message: `Fixtures generated! Created ${allMatchesToInsert.length} matches across ${leagues.length} leagues.` 
    };
  }

  private generateRoundRobin(teams: TeamDocument[], leagueId: Types.ObjectId): Partial<Match>[] {
    const matches: Partial<Match>[] = [];
    const numTeams = teams.length;
    const numRounds = (numTeams - 1) * 2; 
    const matchesPerRound = numTeams / 2;

    let rotation: Types.ObjectId[] = teams.map(t => t._id as Types.ObjectId);

    for (let round = 0; round < numRounds; round++) {
      const isSecondHalf = round >= (numTeams - 1); 

      for (let i = 0; i < matchesPerRound; i++) {
        const home = rotation[i];
        const away = rotation[numTeams - 1 - i];

        matches.push({
          leagueId: leagueId,
          matchday: round + 1,
          homeTeam: isSecondHalf ? away : home,
          awayTeam: isSecondHalf ? home : away,
          score: { home: 0, away: 0 },
          status: 'scheduled',
          events: [],
          stats: { possession: 50, shots: 0, shotsOnTarget: 0 }
        });
      }

      const fixedTeam = rotation[0];
      const rest = rotation.slice(1);
      
      const lastTeam = rest.pop();
      if (lastTeam) {
        rest.unshift(lastTeam);
      }
      
      rotation = [fixedTeam, ...rest];
    }

    return matches;
  }
}