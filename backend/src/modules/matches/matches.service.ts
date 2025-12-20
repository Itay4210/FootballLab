import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Match, MatchDocument } from './schemas/match.schema';
import { Team, TeamDocument } from '../teams/schemas/team.schema';
import { League, LeagueDocument } from '../leagues/schemas/league.schema';

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    @InjectModel(League.name) private leagueModel: Model<LeagueDocument>,
  ) {}

  async findAll() {
    return this.matchModel.find().exec();
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async seed() {
    await this.matchModel.deleteMany({});
  
    const leagues = await this.leagueModel.find().exec();
    const allTeams = await this.teamModel.find().exec();
    const allMatchesToInsert: Partial<Match>[] = [];
  
    for (const league of leagues) {
      let teamsInLeague: TeamDocument[] = [];
  
      if (league.name === 'Champions League' || league.name === 'Europe') {
        teamsInLeague = allTeams.filter(t => t.leagueId && t.leagueId.equals(league._id));
      } else {
        teamsInLeague = allTeams.filter(t => t.country === league.country);
      }
  
      if (teamsInLeague.length < 2) continue;
  
      if (league.name === 'Champions League' || league.name === 'Europe') {
        const clFixtures = await this.generateChampionsLeagueFixtures(league._id as Types.ObjectId, teamsInLeague);
        allMatchesToInsert.push(...clFixtures);
      } else {
        const leagueFixtures = this.generateRoundRobin(teamsInLeague, league._id as Types.ObjectId);
        allMatchesToInsert.push(...leagueFixtures);
      }
    }
  
    await this.matchModel.insertMany(allMatchesToInsert);
  
    return {
      message: `Fixtures generated! Created ${allMatchesToInsert.length} matches across ${leagues.length} leagues.`
    };
  }

  async generateKnockoutMatches(leagueId: Types.ObjectId, qualifiedTeams: TeamDocument[], matchday: number): Promise<void> {
    const matchesToInsert: Partial<Match>[] = [];
    const shuffled = this.shuffleArray(qualifiedTeams);

    for (let i = 0; i < shuffled.length; i += 2) {
      if (!shuffled[i+1]) break;

      matchesToInsert.push({
        leagueId: leagueId,
        matchday: matchday,
        homeTeam: shuffled[i]._id,
        awayTeam: shuffled[i + 1]._id,
        score: { home: 0, away: 0 },
        status: 'scheduled',
        events: [],
      });
    }

    if (matchesToInsert.length > 0) {
      await this.matchModel.insertMany(matchesToInsert);
      this.logger.log(`✅ Generated ${matchesToInsert.length} knockout matches for matchday ${matchday}`);
    }
  }

  private async generateChampionsLeagueFixtures(leagueId: Types.ObjectId, teams: TeamDocument[]): Promise<Partial<Match>[]> {
    if (teams.length !== 20) {
      console.warn(`[CL Fixtures] Expected 20 teams, got ${teams.length}. Skipping CL fixtures.`);
      return [];
    }

    const matchesToInsert: Partial<Match>[] = [];
    const shuffledTeams = this.shuffleArray(teams);
    const groups: TeamDocument[][] = [];
    const groupNames = ['A', 'B', 'C', 'D', 'E'];

    for (let i = 0; i < 5; i++) {
      const groupTeams = shuffledTeams.slice(i * 4, (i + 1) * 4);
      groups.push(groupTeams);

      const groupName = groupNames[i];
      const teamIds = groupTeams.map(t => t._id);
      
      await this.teamModel.updateMany(
        { _id: { $in: teamIds } },
        { $set: { clGroup: groupName } }
      ).exec();
    }

    const groupMatchups = [
      [[0, 1], [2, 3]],
      [[0, 2], [1, 3]],
      [[0, 3], [1, 2]]
    ];

    for (const group of groups) {
      for (let round = 0; round < 3; round++) {
        const matchupsInRound = groupMatchups[round];

        for (const [homeIndex, awayIndex] of matchupsInRound) {
          matchesToInsert.push({
            leagueId: leagueId,
            matchday: round + 1,
            homeTeam: group[homeIndex]._id,
            awayTeam: group[awayIndex]._id,
            score: { home: 0, away: 0 },
            status: 'scheduled',
            events: [],
          });

          matchesToInsert.push({
            leagueId: leagueId,
            matchday: round + 4,
            homeTeam: group[awayIndex]._id,
            awayTeam: group[homeIndex]._id,
            score: { home: 0, away: 0 },
            status: 'scheduled',
            events: [],
          });
        }
      }
    }

    return matchesToInsert;
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
