import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import {
  Match,
  MatchDocument,
  MatchEvent,
} from '../matches/schemas/match.schema';
import { Team, TeamDocument } from '../teams/schemas/team.schema';
import { Player, PlayerDocument } from '../players/schemas/player.schema';
import { League, LeagueDocument } from '../leagues/schemas/league.schema';
import { MatchesService } from '../matches/matches.service';
import { TeamsService } from '../teams/teams.service';
import { LeaguesService } from '../leagues/leagues.service';
import { PlayersService } from '../players/players.service';

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
    private readonly playersService: PlayersService,
  ) {}

  @Cron('0 0 */3 * *')
  async handleCron() {
    this.logger.log('Running automatic simulation...');
    await this.runSeasonMatchday();
  }

  async resetData() {
    this.logger.warn('⚠️ RESETTING ALL DATA...');
    await this.matchModel.deleteMany({});
    await this.playerModel.deleteMany({});
    await this.teamModel.deleteMany({});
    await this.leagueModel.deleteMany({});
    this.logger.log('Seeding Leagues...');
    await this.leaguesService.seed();
    this.logger.log('Seeding Teams...');
    await this.teamsService.seed();
    this.logger.log('Seeding Players...');
    await this.playersService.seed();
    this.logger.log('Seeding Matches (Season 1)...');
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
        this.logger.log(
          `Processing league: ${league.name}, Matchday: ${league.currentMatchday}, isCL: ${isCL}`,
        );
        if (isCL) {
          await this.handleCLKnockoutLogic(league);
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
          for (const match of matchesToPlay) {
            await this.simulateSingleMatch(match, isCL);
          }
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
        this.logger.log(
          '🏁 All leagues finished. Transitioning to New Season...',
        );
        return this.startNewSeason();
      }
      return { results: overallResults };
    } catch (error) {
      this.logger.error('CRITICAL ERROR in runSeasonMatchday:', error);
      return { status: 500, message: 'Internal Error' };
    }
  }

  private async handleCLKnockoutLogic(
    league: LeagueDocument,
  ) {
    this.logger.log(
      `Entering handleCLKnockoutLogic. Matchday: ${league.currentMatchday}`,
    );
    const currentSeason = league.seasonNumber || 1;
    if (league.currentMatchday >= 7 && league.currentMatchday < 27) {
      this.logger.log(
        `CL Logic: Matchday 7+ detected. Checking for matchday 27 matches.`,
      );
      const existingMatches = await this.matchModel.countDocuments({
        leagueId: league._id,
        matchday: 27,
        seasonNumber: currentSeason,
      });
      if (existingMatches === 0) {
        const qualified = await this.getCLQualifiedTeams(league._id);
        await this.matchesService.generateKnockoutMatches(
          league._id,
          qualified,
          27,
          currentSeason,
        );
        league.currentMatchday = 27;
        await league.save();
        this.logger.log(`🏆 Quarter-Finals Generated. Jumped to Matchday 27.`);
      } else {
        league.currentMatchday = 27;
        await league.save();
        this.logger.log(`🏆 Quarter-Finals exist. Jumped to Matchday 27.`);
      }
    }
    if (league.currentMatchday >= 28 && league.currentMatchday < 30) {
      this.logger.log(
        `CL Logic: Matchday 28+ detected. Checking for matchday 30 matches.`,
      );
      const existingMatches = await this.matchModel.countDocuments({
        leagueId: league._id,
        matchday: 30,
        seasonNumber: currentSeason,
      });
      if (existingMatches === 0) {
        const winners = await this.getWinnersFromMatchday(
          league._id,
          27,
          currentSeason,
        );
        await this.matchesService.generateKnockoutMatches(
          league._id,
          winners,
          30,
          currentSeason,
        );
        league.currentMatchday = 30;
        await league.save();
        this.logger.log(`🏆 Semi-Finals Generated. Jumped to Matchday 30.`);
      } else if (league.currentMatchday !== 30) {
        league.currentMatchday = 30;
        await league.save();
        this.logger.log(`🏆 Semi-Finals exist. Jumped to Matchday 30.`);
      }
    }
    if (league.currentMatchday >= 31 && league.currentMatchday < 33) {
      const existingMatches = await this.matchModel.countDocuments({
        leagueId: league._id,
        matchday: 33,
        seasonNumber: currentSeason,
      });
      if (existingMatches === 0) {
        const winners = await this.getWinnersFromMatchday(
          league._id,
          30,
          currentSeason,
        );
        await this.matchesService.generateKnockoutMatches(
          league._id,
          winners,
          33,
          currentSeason,
        );
        league.currentMatchday = 33;
        await league.save();
        this.logger.log(`🏆 FINAL Generated. Jumped to Matchday 33.`);
      } else if (league.currentMatchday !== 33) {
        league.currentMatchday = 33;
        await league.save();
        this.logger.log(`🏆 FINAL exists. Jumped to Matchday 33.`);
      }
    }
  }

  private async getCLQualifiedTeams(
    leagueId: Types.ObjectId,
  ): Promise<TeamDocument[]> {
    const teams = await this.teamModel.find({ leagueId }).exec();
    const groupsMap: Record<string, TeamDocument[]> = {};
    teams.forEach((t) => {
      const g = t.clGroup || 'A';
      if (!groupsMap[g]) groupsMap[g] = [];
      groupsMap[g].push(t);
    });
    const firstPlaces: TeamDocument[] = [];
    const secondPlaces: TeamDocument[] = [];
    Object.values(groupsMap).forEach((groupTeams) => {
      const sorted = groupTeams.sort(
        (a, b) => (b.clStats?.points || 0) - (a.clStats?.points || 0),
      );
      if (sorted[0]) firstPlaces.push(sorted[0]);
      if (sorted[1]) secondPlaces.push(sorted[1]);
    });
    const bestSeconds = secondPlaces
      .sort((a, b) => (b.clStats?.points || 0) - (a.clStats?.points || 0))
      .slice(0, 3);
    return [...firstPlaces, ...bestSeconds];
  }

  private async getWinnersFromMatchday(
    leagueId: Types.ObjectId,
    matchday: number,
    seasonNumber: number,
  ): Promise<TeamDocument[]> {
    const matches = await this.matchModel
      .find({ leagueId, matchday, status: 'finished', seasonNumber })
      .exec();
    const winnerIds = matches.map((m) =>
      m.score.home > m.score.away ? m.homeTeam : m.awayTeam,
    );
    return this.teamModel.find({ _id: { $in: winnerIds } }).exec();
  }

  private async startNewSeason() {
    this.logger.log('🔄 ARCHIVING SEASON AND STARTING NEW ONE');
    const leagues = await this.leagueModel.find().exec();
    if (leagues.length === 0) {
      await this.leaguesService.seed();
      await this.teamsService.seed();
      return this.matchesService.seed(1);
    }
    const currentSeason = leagues[0]?.seasonNumber || 1;
    const nextSeason = currentSeason + 1;
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
        this.logger.log(
          `League ${nl.name} Top 4 (Season ${currentSeason}): ${top4.map((t) => `${t.name} (${t.seasonStats?.points || 0})`).join(', ')}`,
        );
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
      this.logger.log(
        `Promoting ${topTeamsIds.length} teams to Champions League for Season ${nextSeason}`,
      );
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

  private async simulateSingleMatch(match: MatchDocument, isCL = false) {
    const homeTeam = await this.teamModel.findById(match.homeTeam);
    const awayTeam = await this.teamModel.findById(match.awayTeam);
    if (!homeTeam || !awayTeam) return;
    const homePlayers = await this.playerModel.find({ teamId: homeTeam._id });
    const awayPlayers = await this.playerModel.find({ teamId: awayTeam._id });

    const hP =
      homeTeam.attackStrength +
      homeTeam.defenseStrength +
      homeTeam.morale / 10 +
      2 +
      Math.random() * 5;
    const aP =
      awayTeam.attackStrength +
      awayTeam.defenseStrength +
      awayTeam.morale / 10 +
      Math.random() * 5;
    const diff = hP - aP;
    let hG = 0,
      aG = 0;
    const isKnockout = isCL && match.matchday >= 27;
    if (diff > 10) {
      hG = Math.floor(Math.random() * 4) + 2;
      aG = Math.floor(Math.random() * 1);
    } else if (diff > 3) {
      hG = Math.floor(Math.random() * 3) + 1;
      aG = Math.floor(Math.random() * 2);
    } else if (diff < -10) {
      hG = Math.floor(Math.random() * 1);
      aG = Math.floor(Math.random() * 4) + 2;
    } else if (diff < -3) {
      hG = Math.floor(Math.random() * 2);
      aG = Math.floor(Math.random() * 3) + 1;
    } else {
      const total = Math.floor(Math.random() * 5);
      hG = Math.floor(total * (hP / (hP + aP)));
      aG = total - hG;
    }
    if (isKnockout && hG === aG) {
      if (hP > aP) hG++;
      else aG++;
    }

    const homeLineup = this.selectMatchSquad(homePlayers);
    const awayLineup = this.selectMatchSquad(awayPlayers);

    for (const p of homeLineup.starters) {
      await this.updatePlayerStats(
        p._id,
        this.generatePlayerMatchStats(p.position, aG === 0, hG, aG),
      );
    }
    for (const p of awayLineup.starters) {
      await this.updatePlayerStats(
        p._id,
        this.generatePlayerMatchStats(p.position, hG === 0, aG, hG),
      );
    }

    const homeSubs = this.pickSubstitutes(homeLineup.subs);
    const awaySubs = this.pickSubstitutes(awayLineup.subs);

    for (const p of homeSubs) {
      await this.updatePlayerStats(
        p._id,
        this.generatePlayerMatchStats(p.position, aG === 0, hG, aG),
      );
    }
    for (const p of awaySubs) {
      await this.updatePlayerStats(
        p._id,
        this.generatePlayerMatchStats(p.position, hG === 0, aG, hG),
      );
    }

    const homeActivePlayers = [...homeLineup.starters, ...homeSubs];
    const awayActivePlayers = [...awayLineup.starters, ...awaySubs];

    const events: MatchEvent[] = [];

    for (let i = 0; i < hG; i++) {
      const s = this.pickScorerFromList(homeActivePlayers);
      if (s) {
        const minute = Math.floor(Math.random() * 90) + 1;
        events.push({
          minute,
          type: 'goal',
          playerId: s._id,
          description: 'Goal',
        });
        await this.updatePlayerStats(s._id, { goals: 1 });

        if (Math.random() < 0.7) {
          const a = this.pickAssisterFromList(homeActivePlayers, s._id);
          if (a) {
            events.push({
              minute,
              type: 'assist',
              playerId: a._id,
              description: 'Assist',
            });
            await this.updatePlayerStats(a._id, { assists: 1 });
          }
        }
      }
    }
    for (let i = 0; i < aG; i++) {
      const s = this.pickScorerFromList(awayActivePlayers);
      if (s) {
        const minute = Math.floor(Math.random() * 90) + 1;
        events.push({
          minute,
          type: 'goal',
          playerId: s._id,
          description: 'Goal',
        });
        await this.updatePlayerStats(s._id, { goals: 1 });

        if (Math.random() < 0.7) {
          const a = this.pickAssisterFromList(awayActivePlayers, s._id);
          if (a) {
            events.push({
              minute,
              type: 'assist',
              playerId: a._id,
              description: 'Assist',
            });
            await this.updatePlayerStats(a._id, { assists: 1 });
          }
        }
      }
    }

    const totalCards = Math.floor(Math.random() * 4) + 1;
    const allActive = [...homeActivePlayers, ...awayActivePlayers];
    for (let i = 0; i < totalCards; i++) {
      const p = allActive[Math.floor(Math.random() * allActive.length)];
      if (!p) continue;
      const isRed = Math.random() < 0.05;
      const minute = Math.floor(Math.random() * 90) + 1;
      events.push({
        minute,
        type: isRed ? 'redCard' : 'yellowCard',
        playerId: p._id,
        description: isRed ? 'Red Card' : 'Yellow Card',
      });
      await this.updatePlayerStats(p._id, {
        yellowCards: isRed ? 0 : 1,
        redCards: isRed ? 1 : 0,
      });
    }

    await this.updateTeamStats(homeTeam, hG, aG, isCL);
    await this.updateTeamStats(awayTeam, aG, hG, isCL);
    match.score = { home: hG, away: aG };
    match.events = events.sort((a, b) => a.minute - b.minute);
    match.status = 'finished';
    await match.save();
  }

  private async updateTeamStats(
    team: TeamDocument,
    gF: number,
    gA: number,
    isCL = false,
  ) {
    const s = isCL
      ? team.clStats || {
          matches: 0,
          points: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
        }
      : team.seasonStats;
    s.matches = (s.matches || 0) + 1;
    s.goalsFor += gF;
    s.goalsAgainst += gA;
    if (gF > gA) {
      s.wins++;
      s.points += 3;
      team.morale = Math.min(100, team.morale + 5);
    } else if (gF === gA) {
      s.draws++;
      s.points += 1;
      team.morale = Math.min(100, team.morale + 1);
    } else {
      s.losses++;
      team.morale = Math.max(0, team.morale - 5);
    }
    if (isCL) {
      team.clStats = s;
      team.markModified('clStats');
    } else {
      team.seasonStats = s;
      team.markModified('seasonStats');
    }
    await team.save();
  }

  private selectMatchSquad(allPlayers: PlayerDocument[]) {

    const sorted = allPlayers.sort(
      (a, b) => (b.marketValue * Math.random()) - (a.marketValue * Math.random())
    );

    const starters: PlayerDocument[] = [];
    const subs: PlayerDocument[] = [];
    const reserves: PlayerDocument[] = [];

    const popPos = (positions: string[]) => {
      const idx = sorted.findIndex(p => positions.includes(p.position));
      if (idx !== -1) {
        return sorted.splice(idx, 1)[0];
      }
      return null;
    };

    const gk = popPos(['GK']);
    if (gk) starters.push(gk);

    for(let i=0; i<4; i++) {
      const def = popPos(['CB', 'LB', 'RB']);
      if(def) starters.push(def);
    }

    for(let i=0; i<3; i++) {
      const mid = popPos(['CM', 'CDM', 'CAM']);
      if(mid) starters.push(mid);
    }

    for(let i=0; i<3; i++) {
      const att = popPos(['ST', 'FW', 'LW', 'RW']);
      if(att) starters.push(att);
    }

    while(starters.length < 11 && sorted.length > 0) {
      starters.push(sorted.shift()!);
    }

    subs.push(...sorted);

    return { starters, subs, reserves };
  }

  private pickSubstitutes(availableSubs: PlayerDocument[]) {

    const count = Math.floor(Math.random() * 3) + 3;
    const shuffled = availableSubs.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  private pickScorerFromList(players: PlayerDocument[]) {
    if (!players.length) return null;
    const pool: PlayerDocument[] = [];
    for (const p of players) {
      let w = 1;
      if (['ST', 'FW'].includes(p.position)) w = 10;
      else if (['LW', 'RW'].includes(p.position)) w = 7;
      else if (['CAM', 'CM'].includes(p.position)) w = 4;
      for (let i = 0; i < w; i++) pool.push(p);
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private pickAssisterFromList(players: PlayerDocument[], scorerId: Types.ObjectId) {
    const valid = players.filter(p => !p._id.equals(scorerId));
    if (!valid.length) return null;
    const pool: PlayerDocument[] = [];
    for (const p of valid) {
      let w = 1;
      if (['CAM', 'LW', 'RW'].includes(p.position)) w = 10;
      else if (['CM', 'CDM'].includes(p.position)) w = 6;
      else if (['LB', 'RB'].includes(p.position)) w = 4;
      for (let i = 0; i < w; i++) pool.push(p);
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private async updatePlayerStats(
    playerId: Types.ObjectId,
    updates: Partial<{
      goals: number;
      assists: number;
      matches: number;
      yellowCards: number;
      redCards: number;
      cleanSheets: number;
      tackles: number;
      interceptions: number;
      keyPasses: number;
      saves: number;
      distanceCovered: number;
    }>,
  ) {
    const incUpdate: Record<string, number> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && value !== 0) {
        incUpdate[`seasonStats.${key}`] = value;
      }
    }
    if (Object.keys(incUpdate).length > 0) {
      await this.playerModel.findByIdAndUpdate(playerId, { $inc: incUpdate });
    }
  }

  private generatePlayerMatchStats(
    position: string,
    cleanSheet: boolean,
    teamGoals: number,
    opponentGoals: number,
  ) {
    const stats = {
      matches: 1,
      tackles: 0,
      interceptions: 0,
      keyPasses: 0,
      saves: 0,
      distanceCovered: 0,
      cleanSheets: 0,
    };

    if (position === 'GK') stats.distanceCovered = 4 + Math.random() * 2;
    else if (['CM', 'CDM', 'CAM', 'LW', 'RW'].includes(position))
      stats.distanceCovered = 10 + Math.random() * 3;
    else stats.distanceCovered = 9 + Math.random() * 2;
    stats.distanceCovered = parseFloat(stats.distanceCovered.toFixed(1));

    if (position === 'GK') {
      stats.saves = Math.floor(Math.random() * (opponentGoals + 5));
      if (cleanSheet) stats.cleanSheets = 1;
    } else if (['CB', 'LB', 'RB'].includes(position)) {
      stats.tackles = Math.floor(Math.random() * 5);
      stats.interceptions = Math.floor(Math.random() * 4);
      if (cleanSheet) stats.cleanSheets = 1;
    } else if (['CDM', 'CM'].includes(position)) {
      stats.tackles = Math.floor(Math.random() * 4);
      stats.interceptions = Math.floor(Math.random() * 3);
      stats.keyPasses = Math.floor(Math.random() * 3);
    } else {

      stats.tackles = Math.floor(Math.random() * 2);
      stats.keyPasses = Math.floor(Math.random() * 4);
    }

    return stats;
  }
}
