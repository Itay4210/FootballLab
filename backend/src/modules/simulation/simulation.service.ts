import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { Match, MatchDocument } from '../matches/schemas/match.schema';
import { Team, TeamDocument } from '../teams/schemas/team.schema';
import { Player, PlayerDocument } from '../players/schemas/player.schema';
import { League, LeagueDocument } from '../leagues/schemas/league.schema';
import { MatchesService } from '../matches/matches.service';
import { TeamsService } from '../teams/teams.service';
import { LeaguesService } from '../leagues/leagues.service';
import { PlayersService } from '../players/players.service';
import { EvolutionService } from './evolution.service';
import { MatchSimulatorService } from './match-simulator.service';
import { ChampionsLeagueService } from './champions-league.service';

@Injectable()
export class SimulationService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    @InjectModel(Player.name) private playerModel: Model<PlayerDocument>,
    @InjectModel(League.name) private leagueModel: Model<LeagueDocument>,
    private readonly matchesService: MatchesService,
    private readonly teamsService: TeamsService,
    private readonly leaguesService: LeaguesService,
    private readonly playersService: PlayersService,
    private readonly evolutionService: EvolutionService,
    private readonly matchSimulatorService: MatchSimulatorService,
    private readonly championsLeagueService: ChampionsLeagueService,
  ) {}

  async onApplicationBootstrap() {
    const leagueCount = await this.leagueModel.countDocuments();
    if (leagueCount === 0) {
      await this.resetData();
    }
  }

  @Cron('0 0 */3 * *')
  async handleCron() {
    await this.runSeasonMatchday();
  }

  async resetData() {
    await this.matchModel.deleteMany({});
    await this.playerModel.deleteMany({});
    await this.teamModel.deleteMany({});
    await this.leagueModel.deleteMany({});

    await this.leaguesService.seed();

    await this.teamsService.seed();

    await this.playersService.seed();

    await this.matchesService.seed(1);
    return { message: 'Full Database Reset & Seed Complete' };
  }

  async runSeasonMatchday() {
    try {
      const leagues = await this.leagueModel.find().exec();
      if (!leagues || leagues.length === 0) return this.startNewSeason();
      const nationalLeagues = leagues.filter(
        (l) => !['Champions League', 'Europe'].includes(l.name),
      );
      const mainLeague =
        nationalLeagues.find((l) => l.name === 'Premier League') ||
        nationalLeagues[0];
      const currentGlobalWeek = mainLeague?.currentMatchday || 1;
      let finishedLeaguesCount = 0;
      const overallResults: { league: string; matchday: number }[] = [];
      for (const league of leagues) {
        if (!league || !league.name) continue;
        const isCL = ['Champions League', 'Europe'].includes(league.name);

        if (isCL) {
          await this.championsLeagueService.handleKnockoutLogic(league);
        }
        const remainingScheduled = await this.matchModel.countDocuments({
          leagueId: league._id,
          status: 'scheduled',
        });
        if (!isCL) {
          if (remainingScheduled === 0) {
            finishedLeaguesCount++;
            continue;
          }

          const nextScheduled = await this.matchModel
            .findOne({
              leagueId: league._id,
              status: 'scheduled',
            })
            .sort({ matchday: 1 })
            .select('matchday');

          if (
            nextScheduled &&
            nextScheduled.matchday < league.currentMatchday
          ) {
            league.currentMatchday = nextScheduled.matchday;
            await this.leagueModel.findByIdAndUpdate(league._id, {
              currentMatchday: league.currentMatchday,
            });
          }
        } else {
          const targetWeek = league.currentMatchday * 4;
          const isKnockoutMatchday = [27, 30, 33].includes(
            league.currentMatchday,
          );
          const shouldRunCL = isKnockoutMatchday
            ? currentGlobalWeek >= league.currentMatchday
            : currentGlobalWeek >= targetWeek;
          if (!shouldRunCL || remainingScheduled === 0) continue;
        }
        const matchesToPlay = await this.matchModel
          .find({
            leagueId: league._id,
            matchday: league.currentMatchday,
            status: 'scheduled',
          })
          .exec();
        if (matchesToPlay.length > 0) {
          await Promise.all(
            matchesToPlay.map((match) =>
              this.matchSimulatorService.simulateMatch(match, isCL),
            ),
          );
          await this.leagueModel.findByIdAndUpdate(league._id, {
            $inc: { currentMatchday: 1 },
          });
          overallResults.push({
            league: league.name,
            matchday: league.currentMatchday,
          });
        } else if (remainingScheduled > 0) {
          await this.leagueModel.findByIdAndUpdate(league._id, {
            $inc: { currentMatchday: 1 },
          });
        }
      }
      if (
        nationalLeagues.length > 0 &&
        finishedLeaguesCount === nationalLeagues.length
      ) {
        return this.startNewSeason();
      }
      return { results: overallResults };
    } catch {
      return { status: 500, message: 'Internal Error' };
    }
  }

  private async startNewSeason() {
    const leagues = await this.leagueModel.find().exec();
    if (leagues.length === 0) {
      await this.leaguesService.seed();
      await this.teamsService.seed();
      return this.matchesService.seed(1);
    }
    const currentSeason = leagues[0]?.seasonNumber || 1;
    const nextSeason = currentSeason + 1;

    await this.evolutionService.processOffSeasonEvolution(currentSeason);

    const clLeague = leagues.find((l) =>
      ['Champions League', 'Europe'].includes(l.name),
    );
    const nationalLeagues = leagues.filter(
      (l) => !['Champions League', 'Europe'].includes(l.name),
    );
    for (const nl of nationalLeagues) {
      await this.teamModel.updateMany(
        { country: nl.country },
        { $set: { leagueId: nl._id } },
      );
    }
    const topTeamsIds: Types.ObjectId[] = [];
    if (clLeague) {
      for (const nl of nationalLeagues) {
        const top4 = await this.teamModel
          .find({ leagueId: nl._id })
          .sort({ 'seasonStats.points': -1, 'seasonStats.goalsFor': -1 })
          .limit(4)
          .exec();

        if (top4.length > 0) topTeamsIds.push(...top4.map((t) => t._id));
      }
    }
    await this.teamModel.updateMany(
      {},
      {
        $set: {
          seasonStats: {
            matches: 0,
            points: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
          },
          clStats: {
            matches: 0,
            points: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
          },
          clGroup: null,
        },
      },
    );
    await this.playerModel.updateMany(
      {},
      {
        $set: {
          seasonStats: {
            goals: 0,
            assists: 0,
            matches: 0,
            yellowCards: 0,
            redCards: 0,
          },
        },
      },
    );
    await this.leagueModel.updateMany(
      {},
      {
        $set: {
          currentMatchday: 1,
          seasonNumber: nextSeason,
        },
      },
    );
    if (clLeague && topTeamsIds.length > 0) {
      await this.teamModel.updateMany(
        { _id: { $in: topTeamsIds } },
        { $set: { leagueId: clLeague._id } },
      );
    }
    await this.matchesService.seed(nextSeason);
    return {
      message: `Season ${currentSeason} archived. Season ${nextSeason} started!`,
    };
  }

  async getLatestSummary() {
    return this.evolutionService.getLatestSummary();
  }
}
