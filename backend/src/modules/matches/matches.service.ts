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
      const teamsInLeague = allTeams.filter(t => t.leagueId && t.leagueId.equals(league._id));

      if (teamsInLeague.length < 2) continue;

      if (league.name === 'Champions League') {
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

      await this.teamModel.updateMany(
        { _id: { $in: groupTeams.map(t => t._id) } },
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