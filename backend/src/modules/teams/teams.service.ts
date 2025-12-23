import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Team, TeamDocument } from './schemas/team.schema';
import { League, LeagueDocument } from '../leagues/schemas/league.schema';
@Injectable()
export class TeamsService {
  constructor(
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    @InjectModel(League.name) private leagueModel: Model<LeagueDocument>,
  ) {}
  async findAll() {
    return this.teamModel.find().populate('leagueId').exec();
  }
  async getTable(leagueId: string) {
    const objectId = new Types.ObjectId(leagueId);
    const teams = await this.teamModel.find({ leagueId: objectId }).exec();
    return teams.sort((a, b) => {
      const ptsDiff = b.seasonStats.points - a.seasonStats.points;
      if (ptsDiff !== 0) return ptsDiff;
      const goalDiffA =
        (a.seasonStats.goalsFor || 0) - (a.seasonStats.goalsAgainst || 0);
      const goalDiffB =
        (b.seasonStats.goalsFor || 0) - (b.seasonStats.goalsAgainst || 0);
      if (goalDiffB - goalDiffA !== 0) return goalDiffB - goalDiffA;
      return (b.seasonStats.goalsFor || 0) - (a.seasonStats.goalsFor || 0);
    });
  }
  async seed() {
    await this.teamModel.deleteMany({});
    await this.leagueModel.deleteMany({
      name: { $in: ['Champions League', 'Europe'] },
    });
    const nationalLeagues = await this.leagueModel
      .find({
        name: { $nin: ['Champions League', 'Europe'] },
      })
      .exec();
    if (nationalLeagues.length === 0)
      return {
        message: 'Run Leagues Seed first! (Only National Leagues should exist)',
      };
    const teamsToInsert: Partial<Team>[] = [];
    const realTeams: Record<string, string[]> = {
      England: [
        'Man City',
        'Arsenal',
        'Liverpool',
        'Man Utd',
        'Chelsea',
        'Spurs',
        'Newcastle',
        'Aston Villa',
        'Brighton',
        'West Ham',
        'Crystal Palace',
        'Fulham',
        'Wolves',
        'Everton',
        'Nottingham Forest',
        'Brentford',
        'Southampton',
        'Leeds',
        'Leicester',
        'Bournemouth',
      ],
      Spain: [
        'Real Madrid',
        'Barcelona',
        'Atletico Madrid',
        'Sevilla',
        'Valencia',
        'Real Sociedad',
        'Betis',
        'Villarreal',
        'Athletic Club',
        'Celta Vigo',
        'Osasuna',
        'Rayo Vallecano',
        'Mallorca',
        'Girona',
        'Cadiz',
        'Almería',
        'Valladolid',
        'Elche',
        'Getafe',
        'Espanyol',
      ],
      Germany: [
        'Bayern Munich',
        'Dortmund',
        'Leipzig',
        'Leverkusen',
        'Wolfsburg',
        'Frankfurt',
        'Union Berlin',
        'Freiburg',
        'Koln',
        'Mainz',
        'Hoffenheim',
        'Mönchengladbach',
        'Werder Bremen',
        'Augsburg',
        'Stuttgart',
        'Bochum',
        'Hertha Berlin',
        'Schalke',
      ],
      Italy: [
        'Napoli',
        'Inter',
        'Milan',
        'Juventus',
        'Roma',
        'Lazio',
        'Atalanta',
        'Fiorentina',
        'Bologna',
        'Torino',
        'Monza',
        'Udinese',
        'Sassuolo',
        'Empoli',
        'Salernitana',
        'Lecce',
        'Spezia',
        'Verona',
        'Cremonese',
        'Sampdoria',
      ],
      France: [
        'PSG',
        'Marseille',
        'Lyon',
        'Monaco',
        'Lille',
        'Nice',
        'Rennes',
        'Lorient',
        'Lens',
        'Reims',
        'Toulouse',
        'Montpellier',
        'Angers',
        'Nantes',
        'Strasbourg',
        'Troyes',
        'Ajaccio',
        'Auxerre',
        'Brest',
        'Clermont',
      ],
    };
    for (const league of nationalLeagues) {
      const leagueTeamNames = [...(realTeams[league.country] || [])];
      const targetCount = league.country === 'Germany' ? 18 : 20;
      for (let i = leagueTeamNames.length + 1; i <= targetCount; i++) {
        leagueTeamNames.push(`${league.country} Club ${i}`);
      }
      for (const teamName of leagueTeamNames) {
        const baseStr = Math.floor(Math.random() * 5) + 5;
        teamsToInsert.push({
          name: teamName,
          country: league.country,
          stadium: `${teamName} Stadium`,
          leagueId: league._id,
          attackStrength: baseStr,
          defenseStrength: baseStr,
          morale: 80,
          clGroup: null,
        });
      }
    }
    const createdTeams = await this.teamModel.insertMany(teamsToInsert);
    const championsLeague = await this.leagueModel.create({
      name: 'Champions League',
      country: 'Europe',
      currentMatchday: 1,
    });
    const topTeamsIds: Types.ObjectId[] = [];
    for (const league of nationalLeagues) {
      const leagueTeams = createdTeams.filter(
        (t) => t.leagueId && t.leagueId.equals(league._id),
      );
      const top4 = leagueTeams
        .sort((a, b) => {
          const bPower = (b.attackStrength ?? 0) + (b.defenseStrength ?? 0);
          const aPower = (a.attackStrength ?? 0) + (a.defenseStrength ?? 0);
          return bPower - aPower;
        })
        .slice(0, 4);
      topTeamsIds.push(...top4.map((t) => t._id));
    }
    if (topTeamsIds.length > 0) {
      await this.teamModel.updateMany(
        { _id: { $in: topTeamsIds } },
        { $set: { leagueId: championsLeague._id } },
      );
    }
    return {
      message: `Created ${teamsToInsert.length} teams and set up Champions League qualification.`,
    };
  }
}
