import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { Match, MatchDocument, MatchEvent } from '../matches/schemas/match.schema';
import { Team, TeamDocument } from '../teams/schemas/team.schema';
import { Player, PlayerDocument } from '../players/schemas/player.schema';
import { League, LeagueDocument } from '../leagues/schemas/league.schema';
import { MatchesService } from '../matches/matches.service';

@Injectable()
export class SimulationService {
  constructor(
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    @InjectModel(Player.name) private playerModel: Model<PlayerDocument>,
    @InjectModel(League.name) private leagueModel: Model<LeagueDocument>,
    private readonly matchesService: MatchesService,
  ) {}

  @Cron('0 0 */3 * *')
  async handleCron() {
    console.log('Running automatic simulation...');
    await this.runSeasonMatchday();
  }

  async runSeasonMatchday() {
    const leagues = await this.leagueModel.find().exec();
    
    if (leagues.length === 0) {
      return { message: 'No leagues found. Run seed first.' };
    }
    
    const overallResults: { league: string; matchesSimulated: number }[] = [];
    let leaguesFinishedCount = 0;

    for (const league of leagues) {
      
      const matchesToPlay = await this.matchModel
        .find({ leagueId: league._id, status: 'scheduled' })
        .sort({ matchday: 1 })
        .limit(10)
        .exec();

      if (matchesToPlay.length === 0) {
        leaguesFinishedCount++;
        continue;
      }
      
      let simulatedCount = 0;
      
      for (const match of matchesToPlay) {
        await this.simulateSingleMatch(match);
        simulatedCount++;
      }
      
      if (simulatedCount > 0) {
        const nextMatchday = matchesToPlay[0].matchday + 1;
        await this.leagueModel.findByIdAndUpdate(
          league._id, 
          { $set: { currentMatchday: nextMatchday } }
        ).exec();
      }

      overallResults.push({ league: league.name, matchesSimulated: simulatedCount });
    }

    if (leagues.length > 0 && leaguesFinishedCount === leagues.length) {
      console.log('End of season detected across all leagues! Starting new season...');
      return this.startNewSeason();
    }
    
    return { message: `Simulated matches across ${leagues.length} leagues.`, results: overallResults };
  }

  private async startNewSeason() {
    console.log('Clearing old season data...');

    await this.matchModel.deleteMany({});

    await this.teamModel.updateMany({}, {
      $set: { 
        seasonStats: { matches: 0, points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 } 
      }
    });

    await this.playerModel.updateMany({}, {
      $set: {
        seasonStats: { goals: 0, assists: 0, matches: 0, yellowCards: 0, redCards: 0 }
      }
    });

    const isFirstSeason = (await this.matchModel.countDocuments({ status: 'finished' }).exec()) === 0;

    const championsLeague = await this.leagueModel.findOne({ name: 'Champions League' }).exec();
    
    if (championsLeague) {
        const nationalLeagues = await this.leagueModel.find({ name: { $ne: 'Champions League' } }).exec();
        const topTeamsIds: Types.ObjectId[] = [];

        await this.teamModel.updateMany(
            { leagueId: championsLeague._id }, 
            { $set: { leagueId: null } }
        );

        if (isFirstSeason) {
            console.log('CL Qualification: First season, selecting top 4 teams from seed (default).');
            for (const league of nationalLeagues) {
                const initialTop4 = await this.teamModel
                    .find({ leagueId: league._id })
                    .sort({ name: 1 })
                    .limit(4)
                    .exec();
                
                topTeamsIds.push(...initialTop4.map(t => t._id as Types.ObjectId));
            }
        } else {
            console.log('CL Qualification: Subsequent season, selecting top 4 based on previous standings.');
            for (const league of nationalLeagues) {
                const top4 = await this.teamModel
                    .find({ leagueId: league._id })
                    .sort({ 'seasonStats.points': -1, 'seasonStats.goalsFor': -1 })
                    .limit(4)
                    .exec();
                
                topTeamsIds.push(...top4.map(t => t._id as Types.ObjectId));
            }
        }
        
        if (topTeamsIds.length > 0) {
            await this.teamModel.updateMany(
                { _id: { $in: topTeamsIds } }, 
                { $set: { leagueId: championsLeague._id } }
            );
            console.log(`Champions League updated with ${topTeamsIds.length} top teams.`);
        }
        
        await this.leagueModel.findByIdAndUpdate(championsLeague._id, { $set: { currentMatchday: 1 } }).exec();
    }

    console.log('Generating new fixtures...');
    await this.matchesService.seed();

    return { message: 'New Season Started! Stats reset, fixtures generated.' };
  }

  private async simulateSingleMatch(match: MatchDocument) {
    const homeTeam = await this.teamModel.findById(match.homeTeam).exec();
    const awayTeam = await this.teamModel.findById(match.awayTeam).exec();

    if (!homeTeam || !awayTeam) {
      console.error(`Teams not found for match: ${match._id}`);
      return null;
    }

    const homePower = homeTeam.attackStrength + homeTeam.defenseStrength + 2 + (Math.random() * 5); 
    const awayPower = awayTeam.attackStrength + awayTeam.defenseStrength + (Math.random() * 5);

    let homeGoals = 0;
    let awayGoals = 0;

    if (homePower > awayPower) {
      homeGoals = Math.floor(Math.random() * 4); 
      awayGoals = Math.floor(Math.random() * 2); 
    } else {
      homeGoals = Math.floor(Math.random() * 2);
      awayGoals = Math.floor(Math.random() * 4);
    }
    
    if (Math.abs(homePower - awayPower) < 2) {
      homeGoals = awayGoals; 
    }

    const events: MatchEvent[] = [];
    
    for (let i = 0; i < homeGoals; i++) {
      const scorer = await this.pickScorer(homeTeam._id);
      if (scorer) {
        events.push({
          minute: Math.floor(Math.random() * 90) + 1,
          type: 'goal',
          playerId: scorer._id as Types.ObjectId, 
          description: 'Goal'
        });
      }
    }

    for (let i = 0; i < awayGoals; i++) {
      const scorer = await this.pickScorer(awayTeam._id);
      if (scorer) {
        events.push({
          minute: Math.floor(Math.random() * 90) + 1,
          type: 'goal',
          playerId: scorer._id as Types.ObjectId,
          description: 'Goal'
        });
      }
    }

    await this.updateTeamStats(homeTeam, homeGoals, awayGoals);
    await this.updateTeamStats(awayTeam, awayGoals, homeGoals);

    match.score = { home: homeGoals, away: awayGoals };
    match.events = events.sort((a, b) => a.minute - b.minute);
    match.status = 'finished';
    
    await match.save();

    return {
      match: `${homeTeam.name} vs ${awayTeam.name}`,
      score: `${homeGoals} - ${awayGoals}`
    };
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
      if (pos === 'GK') weight = 0;

      for (let i = 0; i < weight; i++) {
        weightedPool.push(p);
      }
    }

    if (weightedPool.length === 0) return players[0];

    const randomIndex = Math.floor(Math.random() * weightedPool.length);
    return weightedPool[randomIndex];
  }
}