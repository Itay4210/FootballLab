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
  async seed(seasonNumber: number = 1) {
    const leagues = await this.leagueModel.find().exec();
    const allTeams = await this.teamModel.find().exec();
    const allMatchesToInsert: Partial<Match>[] = [];
    for (const league of leagues) {
      let teamsInLeague: TeamDocument[] = [];
      if (league.name === 'Champions League' || league.name === 'Europe') {
        teamsInLeague = allTeams.filter(
          (t) => t.leagueId && t.leagueId.equals(league._id),
        );
      } else {
        teamsInLeague = allTeams.filter((t) => t.country === league.country);
      }
      if (teamsInLeague.length < 2) continue;
      if (league.name === 'Champions League' || league.name === 'Europe') {
        const clFixtures = await this.generateChampionsLeagueFixtures(
          league._id as Types.ObjectId,
          teamsInLeague,
          seasonNumber,
        );
        allMatchesToInsert.push(...clFixtures);
      } else {
        const leagueFixtures = this.generateRoundRobin(
          teamsInLeague,
          league._id as Types.ObjectId,
          seasonNumber,
        );
        allMatchesToInsert.push(...leagueFixtures);
      }
    }
    await this.matchModel.insertMany(allMatchesToInsert);
    return {
      message: `Fixtures generated for Season ${seasonNumber}! Created ${allMatchesToInsert.length} matches across ${leagues.length} leagues.`,
    };
  }
  async findByTeam(teamId: string, seasonNumber?: number) {
    const query: any = {
      $or: [
        { homeTeam: new Types.ObjectId(teamId) },
        { awayTeam: new Types.ObjectId(teamId) },
      ],
    };
    if (seasonNumber) {
      query.seasonNumber = seasonNumber;
    }
    const matches = await this.matchModel
      .find(query)
      .populate('homeTeam', 'name')
      .populate('awayTeam', 'name')
      .populate('leagueId', 'name')
      .sort({ matchday: 1 })
      .lean()
      .exec();
    return matches.map((match: any) => ({
      ...match,
      homeTeam: match.homeTeam._id,
      homeTeamName: match.homeTeam.name,
      awayTeam: match.awayTeam._id,
      awayTeamName: match.awayTeam.name,
      leagueName: match.leagueId?.name,
    }));
  }
  async generateKnockoutMatches(
    leagueId: Types.ObjectId,
    qualifiedTeams: TeamDocument[],
    matchday: number,
    seasonNumber: number,
  ): Promise<void> {
    const matchesToInsert: Partial<Match>[] = [];
    const shuffled = this.shuffleArray(qualifiedTeams);
    for (let i = 0; i < shuffled.length; i += 2) {
      if (!shuffled[i + 1]) break;
      matchesToInsert.push({
        leagueId: leagueId,
        matchday: matchday,
        seasonNumber: seasonNumber,
        homeTeam: shuffled[i]._id,
        awayTeam: shuffled[i + 1]._id,
        score: { home: 0, away: 0 },
        status: 'scheduled',
        events: [],
      });
    }
    if (matchesToInsert.length > 0) {
      await this.matchModel.insertMany(matchesToInsert);
      this.logger.log(
        `✅ Generated ${matchesToInsert.length} knockout matches for matchday ${matchday}, Season ${seasonNumber}`,
      );
    }
  }
  private async generateChampionsLeagueFixtures(
    leagueId: Types.ObjectId,
    teams: TeamDocument[],
    seasonNumber: number,
  ): Promise<Partial<Match>[]> {
    if (teams.length !== 20) {
      console.warn(
        `[CL Fixtures] Expected 20 teams, got ${teams.length}. Skipping CL fixtures.`,
      );
      return [];
    }
    const matchesToInsert: Partial<Match>[] = [];
    let groups: TeamDocument[][] = [[], [], [], [], []];
    const groupNames = ['A', 'B', 'C', 'D', 'E'];
    let success = false;
    let attempts = 0;
    while (!success && attempts < 100) {
      attempts++;
      groups = [[], [], [], [], []];
      const shuffledTeams = this.shuffleArray(teams);
      success = true;
      for (const team of shuffledTeams) {
        const validGroupIndices: number[] = [];
        for (let i = 0; i < 5; i++) {
          if (groups[i].length < 4) {
            const hasCountryman = groups[i].some(
              (t) => t.country === team.country,
            );
            if (!hasCountryman) {
              validGroupIndices.push(i);
            }
          }
        }
        if (validGroupIndices.length === 0) {
          success = false;
          break;
        }
        const randomGroupIndex =
          validGroupIndices[
            Math.floor(Math.random() * validGroupIndices.length)
          ];
        groups[randomGroupIndex].push(team);
      }
    }
    if (!success) {
      this.logger.warn(
        `Failed to generate valid CL groups after ${attempts} attempts (Constraint: No same country). Falling back to random.`,
      );
      const shuffledTeams = this.shuffleArray(teams);
      groups = [[], [], [], [], []];
      for (let i = 0; i < 5; i++) {
        groups[i] = shuffledTeams.slice(i * 4, (i + 1) * 4);
      }
    } else {
      this.logger.log(
        `✅ Successfully generated valid CL groups after ${attempts} attempts.`,
      );
    }
    for (let i = 0; i < 5; i++) {
      const groupTeams = groups[i];
      const groupName = groupNames[i];
      const teamIds = groupTeams.map((t) => t._id);
      await this.teamModel
        .updateMany({ _id: { $in: teamIds } }, { $set: { clGroup: groupName } })
        .exec();
    }
    const groupMatchups = [
      [
        [0, 1],
        [2, 3],
      ],
      [
        [0, 2],
        [1, 3],
      ],
      [
        [0, 3],
        [1, 2],
      ],
    ];
    for (const group of groups) {
      for (let round = 0; round < 3; round++) {
        const matchupsInRound = groupMatchups[round];
        for (const [homeIndex, awayIndex] of matchupsInRound) {
          matchesToInsert.push({
            leagueId: leagueId,
            matchday: round + 1,
            seasonNumber: seasonNumber,
            homeTeam: group[homeIndex]._id,
            awayTeam: group[awayIndex]._id,
            score: { home: 0, away: 0 },
            status: 'scheduled',
            events: [],
          });
          matchesToInsert.push({
            leagueId: leagueId,
            matchday: round + 4,
            seasonNumber: seasonNumber,
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
  private generateRoundRobin(
    teams: TeamDocument[],
    leagueId: Types.ObjectId,
    seasonNumber: number,
  ): Partial<Match>[] {
    const matches: Partial<Match>[] = [];
    const numTeams = teams.length;
    const numRounds = (numTeams - 1) * 2;
    const matchesPerRound = numTeams / 2;
    let rotation: Types.ObjectId[] = teams.map((t) => t._id as Types.ObjectId);
    for (let round = 0; round < numRounds; round++) {
      const isSecondHalf = round >= numTeams - 1;
      for (let i = 0; i < matchesPerRound; i++) {
        const home = rotation[i];
        const away = rotation[numTeams - 1 - i];
        matches.push({
          leagueId: leagueId,
          matchday: round + 1,
          seasonNumber: seasonNumber,
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
