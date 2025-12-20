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
      if (!leagues || leagues.length === 0) return this.startNewSeason();

      const nationalLeagues = leagues.filter(l => !['Champions League', 'Europe'].includes(l.name));
      const mainLeague = nationalLeagues.find(l => l.name === 'Premier League') || nationalLeagues[0];
      const currentGlobalWeek = mainLeague?.currentMatchday || 1;
      
      let finishedLeaguesCount = 0;
      const overallResults: any[] = [];

      for (const league of leagues) {
        if (!league || !league.name) continue;

        const isCL = ['Champions League', 'Europe'].includes(league.name);
        this.logger.log(`Processing league: ${league.name}, Matchday: ${league.currentMatchday}, isCL: ${isCL}`);
        
        // --- לוגיקת נוקאאוט ליגת האלופות ---
        if (isCL) {
          await this.handleCLKnockoutLogic(league, currentGlobalWeek);
        }

        const remainingScheduled = await this.matchModel.countDocuments({
          leagueId: league._id,
          status: 'scheduled'
        });

        if (!isCL) {
          if (remainingScheduled === 0) {
            finishedLeaguesCount++;
            continue;
          }
        } else {
          const targetWeek = league.currentMatchday * 4;
          // מיוחד לנוקאאוט: אם אנחנו במחזור המטרה של הנוקאאוט, נריץ
          const isKnockoutMatchday = [27, 30, 33].includes(league.currentMatchday);
          const shouldRunCL = isKnockoutMatchday ? (currentGlobalWeek >= league.currentMatchday) : (currentGlobalWeek >= targetWeek);
          
          if (!shouldRunCL || remainingScheduled === 0) continue;
        }

        const matchesToPlay = await this.matchModel.find({
          leagueId: league._id,
          matchday: league.currentMatchday,
          status: 'scheduled'
        }).exec();

        if (matchesToPlay.length > 0) {
          for (const match of matchesToPlay) {
            await this.simulateSingleMatch(match, isCL);
          }
          await this.leagueModel.findByIdAndUpdate(league._id, { $inc: { currentMatchday: 1 } });
          overallResults.push({ league: league.name, matchday: league.currentMatchday });
        } else if (remainingScheduled > 0) {
          await this.leagueModel.findByIdAndUpdate(league._id, { $inc: { currentMatchday: 1 } });
        }
      }

      if (nationalLeagues.length > 0 && finishedLeaguesCount === nationalLeagues.length) {
        this.logger.log('🏁 All leagues finished. Transitioning to New Season...');
        return this.startNewSeason();
      }

      return { results: overallResults };
    } catch (error) {
      this.logger.error('CRITICAL ERROR in runSeasonMatchday:', error);
      return { status: 500, message: 'Internal Error' };
    }
  }

  /**
   * 🏆 ניהול שלבי הנוקאאוט של ליגת האלופות
   * בודק אם הגענו לנקודת מעבר (סיום בתים, סיום רבע גמר וכו') ומייצר את השלב הבא
   */
  private async handleCLKnockoutLogic(league: LeagueDocument, globalWeek: number) {
    this.logger.log(`Entering handleCLKnockoutLogic. Matchday: ${league.currentMatchday}`);
    
    // 1. מעבר משלב הבתים (מחזור 6 הסתיים -> אנחנו ב-7) לרבע הגמר (מחזור 27)
    if (league.currentMatchday >= 7 && league.currentMatchday < 27) {
      this.logger.log(`CL Logic: Matchday 7+ detected. Checking for matchday 27 matches.`);
      const existingMatches = await this.matchModel.countDocuments({ leagueId: league._id, matchday: 27 });
      if (existingMatches === 0) {
        const qualified = await this.getCLQualifiedTeams(league._id);
        await this.matchesService.generateKnockoutMatches(league._id as Types.ObjectId, qualified, 27);
        
        league.currentMatchday = 27;
        await league.save();
        this.logger.log(`🏆 Quarter-Finals Generated. Jumped to Matchday 27.`);
      } else {
        // אם המשחקים כבר קיימים אך משום מה אנחנו עדיין ב-7 (נדיר), נקפוץ
        league.currentMatchday = 27;
        await league.save();
        this.logger.log(`🏆 Quarter-Finals exist. Jumped to Matchday 27.`);
      }
    }

    // 2. מעבר מרבע הגמר (מחזור 27 הסתיים -> אנחנו ב-28) לחצי הגמר (מחזור 30)
    if (league.currentMatchday >= 28 && league.currentMatchday < 30) {
      this.logger.log(`CL Logic: Matchday 28+ detected. Checking for matchday 30 matches.`);
      const existingMatches = await this.matchModel.countDocuments({ leagueId: league._id, matchday: 30 });
      if (existingMatches === 0) {
        const winners = await this.getWinnersFromMatchday(league._id, 27);
        await this.matchesService.generateKnockoutMatches(league._id as Types.ObjectId, winners, 30);
        
        league.currentMatchday = 30;
        await league.save();
        this.logger.log(`🏆 Semi-Finals Generated. Jumped to Matchday 30.`);
      } else if (league.currentMatchday !== 30) {
         league.currentMatchday = 30;
         await league.save();
         this.logger.log(`🏆 Semi-Finals exist. Jumped to Matchday 30.`);
      }
    }

    // 3. מעבר מחצי הגמר (מחזור 30 הסתיים -> אנחנו ב-31) לגמר (מחזור 33)
    if (league.currentMatchday >= 31 && league.currentMatchday < 33) {
      const existingMatches = await this.matchModel.countDocuments({ leagueId: league._id, matchday: 33 });
      if (existingMatches === 0) {
        const winners = await this.getWinnersFromMatchday(league._id, 30);
        await this.matchesService.generateKnockoutMatches(league._id as Types.ObjectId, winners, 33);
        
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

  private async getCLQualifiedTeams(leagueId: Types.ObjectId): Promise<TeamDocument[]> {
    const teams = await this.teamModel.find({ leagueId }).exec();
    const groupsMap: Record<string, TeamDocument[]> = {};

    teams.forEach(t => {
      const g = t.clGroup || 'A';
      if (!groupsMap[g]) groupsMap[g] = [];
      groupsMap[g].push(t);
    });

    const firstPlaces: TeamDocument[] = [];
    const secondPlaces: TeamDocument[] = [];

    Object.values(groupsMap).forEach(groupTeams => {
      const sorted = groupTeams.sort((a, b) => (b.clStats?.points || 0) - (a.clStats?.points || 0));
      if (sorted[0]) firstPlaces.push(sorted[0]);
      if (sorted[1]) secondPlaces.push(sorted[1]);
    });

    const bestSeconds = secondPlaces
      .sort((a, b) => (b.clStats?.points || 0) - (a.clStats?.points || 0))
      .slice(0, 3);

    return [...firstPlaces, ...bestSeconds];
  }

  private async getWinnersFromMatchday(leagueId: Types.ObjectId, matchday: number): Promise<TeamDocument[]> {
    const matches = await this.matchModel.find({ leagueId, matchday, status: 'finished' }).exec();
    const winnerIds = matches.map(m => (m.score.home > m.score.away ? m.homeTeam : m.awayTeam));
    return this.teamModel.find({ _id: { $in: winnerIds } }).exec();
  }

  private async startNewSeason() {
    this.logger.log('🔄 STARTING NEW SEASON TRANSITION');

    const allLeagues = await this.leagueModel.find().exec();
    const clLeague = allLeagues.find(l => ['Champions League', 'Europe'].includes(l.name));
    const nationalLeagues = allLeagues.filter(l => !['Champions League', 'Europe'].includes(l.name));

    if (allLeagues.length === 0) {
      await this.leaguesService.seed();
      await this.teamsService.seed();
      return this.matchesService.seed();
    }

    await this.matchModel.deleteMany({});

    for (const nl of nationalLeagues) {
      await this.teamModel.updateMany({ country: nl.country }, { $set: { leagueId: nl._id } });
    }

    await this.teamModel.updateMany({}, {
      $set: {
        seasonStats: { matches: 0, points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 },
        clStats: { matches: 0, points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 },
        clGroup: null
      }
    });
    
    await this.playerModel.updateMany({}, { $set: { seasonStats: { goals: 0, assists: 0, matches: 0, yellowCards: 0, redCards: 0 } } });
    await this.leagueModel.updateMany({}, { $set: { currentMatchday: 1 } });

    if (clLeague) {
      const topTeamsIds: Types.ObjectId[] = [];
      for (const nl of nationalLeagues) {
        const top4 = await this.teamModel.find({ leagueId: nl._id }).sort({ "seasonStats.points": -1 }).limit(4).exec();
        if (top4.length > 0) topTeamsIds.push(...top4.map(t => t._id as Types.ObjectId));
      }
      await this.teamModel.updateMany({ _id: { $in: topTeamsIds } }, { $set: { leagueId: clLeague._id } });
    }

    await this.matchesService.seed();
    return { message: 'New season started!' };
  }

  private async simulateSingleMatch(match: MatchDocument, isCL = false) {
    const homeTeam = await this.teamModel.findById(match.homeTeam);
    const awayTeam = await this.teamModel.findById(match.awayTeam);
    if (!homeTeam || !awayTeam) return;

    const hP = (homeTeam.attackStrength + homeTeam.defenseStrength) + (homeTeam.morale / 10) + 2 + (Math.random() * 5);
    const aP = (awayTeam.attackStrength + awayTeam.defenseStrength) + (awayTeam.morale / 10) + (Math.random() * 5);
    const diff = hP - aP;

    let hG = 0, aG = 0;
    // הגדלת סיכוי להכרעה בנוקאאוט
    const isKnockout = isCL && match.matchday >= 27;

    if (diff > 10) { hG = Math.floor(Math.random() * 4) + 2; aG = Math.floor(Math.random() * 1); }
    else if (diff > 3) { hG = Math.floor(Math.random() * 3) + 1; aG = Math.floor(Math.random() * 2); }
    else if (diff < -10) { hG = Math.floor(Math.random() * 1); aG = Math.floor(Math.random() * 4) + 2; }
    else if (diff < -3) { hG = Math.floor(Math.random() * 2); aG = Math.floor(Math.random() * 3) + 1; }
    else {
      const total = Math.floor(Math.random() * 5);
      hG = Math.floor(total * (hP / (hP + aP)));
      aG = total - hG;
    }

    // 🔥 הכרעה חובה בנוקאאוט: אם נגמר בתיקו, מוסיפים גול לקבוצה החזקה
    if (isKnockout && hG === aG) {
       if (hP > aP) hG++; else aG++;
    }

    const events: MatchEvent[] = [];
    for (let i = 0; i < hG; i++) {
      const s = await this.pickScorer(homeTeam._id);
      if (s) events.push({ minute: Math.floor(Math.random() * 90) + 1, type: 'goal', playerId: s._id as Types.ObjectId, description: 'Goal' });
    }
    for (let i = 0; i < aG; i++) {
      const s = await this.pickScorer(awayTeam._id);
      if (s) events.push({ minute: Math.floor(Math.random() * 90) + 1, type: 'goal', playerId: s._id as Types.ObjectId, description: 'Goal' });
    }

    await this.updateTeamStats(homeTeam, hG, aG, isCL);
    await this.updateTeamStats(awayTeam, aG, hG, isCL);
    match.score = { home: hG, away: aG };
    match.events = events.sort((a, b) => a.minute - b.minute);
    match.status = 'finished';
    await match.save();
  }

  private async updateTeamStats(team: TeamDocument, gF: number, gA: number, isCL = false) {
    const s = isCL ? (team.clStats || { matches: 0, points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 }) : team.seasonStats;
    s.matches = (s.matches || 0) + 1;
    s.goalsFor += gF; s.goalsAgainst += gA;
    if (gF > gA) { s.wins++; s.points += 3; team.morale = Math.min(100, team.morale + 5); }
    else if (gF === gA) { s.draws++; s.points += 1; team.morale = Math.min(100, team.morale + 1); }
    else { s.losses++; team.morale = Math.max(0, team.morale - 5); }
    
    if (isCL) { team.clStats = s; team.markModified('clStats'); } 
    else { team.seasonStats = s; team.markModified('seasonStats'); }
    await team.save();
  }

  private async pickScorer(teamId: Types.ObjectId) {
    const players = await this.playerModel.find({ teamId }).exec();
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
}