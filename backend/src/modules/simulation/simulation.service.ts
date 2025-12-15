import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { Match, MatchDocument, MatchEvent } from '../matches/schemas/match.schema';
import { Team, TeamDocument } from '../teams/schemas/team.schema';
import { Player, PlayerDocument } from '../players/schemas/player.schema';
import { League, LeagueDocument } from '../leagues/schemas/league.schema';
import { MatchesService } from '../matches/matches.service';
import { TeamsService } from '../teams/teams.service';
import { LeaguesService } from '../leagues/leagues.service';

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);

  constructor(
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    @InjectModel(Player.name) private playerModel: Model<PlayerDocument>,
    @InjectModel(League.name) private leagueModel: Model<LeagueDocument>,
    private readonly matchesService: MatchesService,
    private readonly teamsService: TeamsService,
    private readonly leaguesService: LeaguesService,
  ) {}

  @Cron('0 0 */3 * *')
  async handleCron() {
    this.logger.log('Running automatic simulation...');
    await this.runSeasonMatchday();
  }

  async runSeasonMatchday() {
    try {
      const leagues = await this.leagueModel.find().exec();

      if (!leagues || leagues.length === 0) {
        this.logger.warn('⚠️ No leagues found in DB! Attempting to run full seed in next step.');
        return this.startNewSeason();
      }

      let mainLeague = leagues.find(l => l.name === 'Premier League' || l.name === 'England');
      if (!mainLeague) {
        mainLeague = leagues.find(l => l.name !== 'Champions League' && l.name !== 'Europe');
      }
      if (!mainLeague) {
        mainLeague = leagues[0];
      }

      const currentGlobalWeek = mainLeague ? mainLeague.currentMatchday : 1;

      const overallResults: any[] = [];
      let activeLeaguesCount = 0;
      let finishedLeaguesCount = 0;

      for (const league of leagues) {
        if (!league || !league.name) continue;

        if (league.name === 'Champions League' || league.name === 'Europe') {
          const shouldRunCL = (currentGlobalWeek % 4 === 0);

          if (!shouldRunCL) {
            overallResults.push({ league: league.name, status: `Waiting (Week ${currentGlobalWeek} is not divisible by 4)` });
            continue;
          }

          if (league.currentMatchday > 6) {
            overallResults.push({ league: league.name, status: 'Group Stage Finished' });
            continue;
          }
        } else {
          activeLeaguesCount++;
        }

        const matchesToPlay = await this.matchModel
          .find({
            leagueId: league._id,
            matchday: league.currentMatchday,
            status: 'scheduled'
          })
          .exec();

        if (matchesToPlay.length === 0) {
          const remainingMatches = await this.matchModel.countDocuments({ leagueId: league._id, status: 'scheduled' });

          if (remainingMatches === 0 && league.name !== 'Champions League' && league.name !== 'Europe') {
            finishedLeaguesCount++;
          } else if (remainingMatches > 0) {
            this.logger.log(`Skipping empty matchday ${league.currentMatchday} for ${league.name}`);
            await this.leagueModel.findByIdAndUpdate(league._id, { $inc: { currentMatchday: 1 } });
          }
          continue;
        }

        let simulatedCount = 0;
        for (const match of matchesToPlay) {
          await this.simulateSingleMatch(match);
          simulatedCount++;
        }

        if (simulatedCount > 0) {
          await this.leagueModel.findByIdAndUpdate(league._id, { $inc: { currentMatchday: 1 } }).exec();
        }

        overallResults.push({
          league: league.name,
          matchday: league.currentMatchday,
          matchesSimulated: simulatedCount
        });
      }

      if (activeLeaguesCount > 0 && finishedLeaguesCount === activeLeaguesCount) {
        this.logger.log('🏁 End of season detected! Starting new season logic...');
        return this.startNewSeason();
      }

      return { message: `Simulated matchday. Global Week: ${currentGlobalWeek}`, results: overallResults };

    } catch (error) {
      this.logger.error('CRITICAL ERROR in runSeasonMatchday:', error);
      return {
        status: 500,
        message: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async startNewSeason() {
    this.logger.log('🔄 Starting New Season Logic...');

    const totalTeams = await this.teamModel.countDocuments().exec();
    const totalLeagues = await this.leagueModel.countDocuments().exec();

    if (totalTeams === 0 || totalLeagues === 0) {
      this.logger.warn('⚠️ DB detected as empty or corrupted. Running FULL SEED (Leagues, Teams, Players).');

      await this.matchModel.deleteMany({});
      await this.teamModel.deleteMany({});
      await this.playerModel.deleteMany({});
      await this.leagueModel.deleteMany({});

      await this.leaguesService.seed();
      await this.teamsService.seed();

      const newlyCreatedTeams = await this.teamModel.find().exec();
      if (newlyCreatedTeams.length === 0) {
        return { message: 'Full Seed Failed: Teams not created. Cannot start season.' };
      }
    }

    await this.matchModel.deleteMany({});
    await this.teamModel.updateMany({}, {
      $set: {
        seasonStats: { matches: 0, points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 },
        clGroup: null
      }
    });
    await this.playerModel.updateMany({}, {
      $set: { seasonStats: { goals: 0, assists: 0, matches: 0, yellowCards: 0, redCards: 0 } }
    });
    await this.leagueModel.updateMany({}, { $set: { currentMatchday: 1 } });

    const hasPreviousSeasonData = (await this.matchModel.countDocuments({ status: 'finished' }).exec()) > 0;

    const championsLeague = await this.leagueModel.findOne({
      name: { $in: ['Champions League', 'Europe'] }
    }).exec();

    if (championsLeague) {
      const nationalLeagues = await this.leagueModel.find({
        name: { $nin: ['Champions League', 'Europe'] }
      }).exec();

      const topTeamsIds: Types.ObjectId[] = [];

      await this.teamModel.updateMany({ leagueId: championsLeague._id }, { $set: { leagueId: null } });

      this.logger.log(`📊 Qualifying Top Teams from ${nationalLeagues.length} leagues...`);

      for (const league of nationalLeagues) {
        let top4: TeamDocument[];

        if (!hasPreviousSeasonData) {
          top4 = await this.teamModel
            .find({ leagueId: league._id })
            .sort({ attackStrength: -1, defenseStrength: -1 })
            .limit(4)
            .exec();
        } else {
          top4 = await this.teamModel
            .find({ leagueId: league._id })
            .sort({ 'seasonStats.points': -1, 'seasonStats.goalsFor': -1 })
            .limit(4)
            .exec();
        }

        if (top4.length > 0) {
          this.logger.log(`Qualifying from ${league.name} (${hasPreviousSeasonData ? 'By Points' : 'By Strength'}): ${top4.map(t => t.name).join(', ')}`);
          topTeamsIds.push(...top4.map(t => t._id as Types.ObjectId));
        }
      }

      if (topTeamsIds.length > 0) {
        await this.teamModel.updateMany(
          { _id: { $in: topTeamsIds } },
          { $set: { leagueId: championsLeague._id } }
        );
        this.logger.log(`✅ Total ${topTeamsIds.length} teams qualified for Champions League.`);
      } else {
        this.logger.warn('⚠️ No teams found to qualify for CL! Check seeds.');
      }
    } else {
      this.logger.error('❌ Champions League not found in DB!');
    }

    this.logger.log('📅 Generating new fixtures...');
    await this.matchesService.seed();

    return { message: 'New Season Started! Top teams qualified based on strength/points.' };
  }

  private async simulateSingleMatch(match: MatchDocument) {
    try {
      const homeTeam = await this.teamModel.findById(match.homeTeam).exec();
      const awayTeam = await this.teamModel.findById(match.awayTeam).exec();

      if (!homeTeam || !awayTeam) {
        this.logger.error(`Match ${match._id}: Missing one or both teams. Skipping.`);
        match.status = 'error';
        await match.save();
        return;
      }

      const homePower = homeTeam.attackStrength + homeTeam.defenseStrength + (homeTeam.morale / 10) + 2 + (Math.random() * 5);
      const awayPower = awayTeam.attackStrength + awayTeam.defenseStrength + (awayTeam.morale / 10) + (Math.random() * 5);

      const powerDiff = homePower - awayPower;

      let homeGoals = 0;
      let awayGoals = 0;

      if (powerDiff > 10) {
        homeGoals = Math.floor(Math.random() * 4) + 2;
        awayGoals = Math.floor(Math.random() * 1);
      } else if (powerDiff > 3) {
        homeGoals = Math.floor(Math.random() * 3) + 1;
        awayGoals = Math.floor(Math.random() * 2);
      } else if (powerDiff < -10) {
        homeGoals = Math.floor(Math.random() * 1);
        awayGoals = Math.floor(Math.random() * 4) + 2;
      } else if (powerDiff < -3) {
        homeGoals = Math.floor(Math.random() * 2);
        awayGoals = Math.floor(Math.random() * 3) + 1;
      } else {
        const totalGoals = Math.floor(Math.random() * 5);

        if (Math.abs(powerDiff) < 1) {
          homeGoals = Math.floor(totalGoals / 2);
          awayGoals = totalGoals - homeGoals;
        } else {
          homeGoals = Math.max(0, Math.floor(totalGoals * (homePower / (homePower + awayPower))));
          awayGoals = totalGoals - homeGoals;
        }
      }

      if (homeGoals === awayGoals && homeGoals < 2 && Math.abs(powerDiff) > 5) {
        if (homePower > awayPower) homeGoals++; else awayGoals++;
      }

      const events: MatchEvent[] = [];
      for (let i = 0; i < homeGoals; i++) {
        const scorer = await this.pickScorer(homeTeam._id);
        if (scorer) events.push({ minute: Math.floor(Math.random() * 90) + 1, type: 'goal', playerId: scorer._id as Types.ObjectId, description: 'Goal' });
      }
      for (let i = 0; i < awayGoals; i++) {
        const scorer = await this.pickScorer(awayTeam._id);
        if (scorer) events.push({ minute: Math.floor(Math.random() * 90) + 1, type: 'goal', playerId: scorer._id as Types.ObjectId, description: 'Goal' });
      }

      await this.updateTeamStats(homeTeam, homeGoals, awayGoals);
      await this.updateTeamStats(awayTeam, awayGoals, homeGoals);

      match.score = { home: homeGoals, away: awayGoals };
      match.events = events.sort((a, b) => a.minute - b.minute);
      match.status = 'finished';

      await match.save();

    } catch (error) {
      this.logger.error(`CRITICAL MATCH ERROR: Failed to simulate single match ${match._id}. Match marked as error.`, error);
      match.status = 'error';
      await match.save();
    }
  }

  private async updateTeamStats(team: TeamDocument, goalsFor: number, goalsAgainst: number) {
    const stats = team.seasonStats;
    stats.matches = (stats.matches || 0) + 1;
    stats.goalsFor += goalsFor;
    stats.goalsAgainst += goalsAgainst;

    if (goalsFor > goalsAgainst) {
      stats.wins += 1;
      stats.points += 3;
      team.morale = Math.min(100, team.morale + 5);
    } else if (goalsFor === goalsAgainst) {
      stats.draws += 1;
      stats.points += 1;
      team.morale = Math.min(100, team.morale + 1);
    } else {
      stats.losses += 1;
      team.morale = Math.max(0, team.morale - 5);
    }
    team.markModified('seasonStats');
    await team.save();
  }

  private async pickScorer(teamId: Types.ObjectId) {
    const players = await this.playerModel.find({ teamId }).exec();
    if (!players || players.length === 0) return null;

    const weightedPool: PlayerDocument[] = [];
    for (const p of players) {
      let weight = 1;
      const pos = p.position || 'CM';
      if (pos === 'ST' || pos === 'FW') weight = 10;
      if (pos === 'LW' || pos === 'RW') weight = 7;
      if (pos === 'CAM' || pos === 'CM') weight = 4;
      if (pos === 'CB' || pos === 'LB' || pos === 'RB') weight = 1;
      for (let i = 0; i < weight; i++) weightedPool.push(p);
    }
    if (weightedPool.length === 0) return players[0];
    return weightedPool[Math.floor(Math.random() * weightedPool.length)];
  }
}