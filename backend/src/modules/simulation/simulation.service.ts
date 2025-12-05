import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { Match, MatchEvent } from '../matches/schemas/match.schema';
import { Team, TeamDocument } from '../teams/schemas/team.schema';
import { Player, PlayerDocument } from '../players/schemas/player.schema';
import { MatchesService } from '../matches/matches.service';

@Injectable()
export class SimulationService {
  constructor(
    @InjectModel(Match.name) private matchModel: Model<Match>,
    @InjectModel(Team.name) private teamModel: Model<Team>,
    @InjectModel(Player.name) private playerModel: Model<Player>,
    private readonly matchesService: MatchesService,
  ) {}

  @Cron('0 0 */3 * *')
  async handleCron() {
    console.log('⏰ Running automatic simulation...');
    await this.runDailySimulation();
  }

  async runDailySimulation(leagueId?: string) {
    const remainingMatches = await this.matchModel.countDocuments({ status: 'scheduled' });

    if (remainingMatches === 0) {
      console.log('🏁 End of season detected! Starting new season...');
      return this.startNewSeason();
    }

    const matchesToPlay = await this.matchModel
      .find({ status: 'scheduled' })
      .limit(10)
      .exec();

    const results: { match: string; score: string }[] = [];

    for (const match of matchesToPlay) {
      const result = await this.simulateSingleMatch(match);
      if (result) {
        results.push(result);
      }
    }

    return { message: `Simulated ${results.length} matches`, results };
  }

  private async startNewSeason() {
    console.log('🧹 Clearing old season data...');

    await this.matchModel.deleteMany({});

    await this.teamModel.updateMany({}, {
      $set: { 
        seasonStats: { points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 } 
      }
    });

    await this.playerModel.updateMany({}, {
      $set: {
        seasonStats: { goals: 0, assists: 0, matches: 0, yellowCards: 0, redCards: 0 }
      }
    });

    console.log('📅 Generating new fixtures...');
    await this.matchesService.seed();

    return { message: '🎊 New Season Started! Stats reset, fixtures generated.' };
  }

  private async simulateSingleMatch(match: any) {
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
          playerId: scorer._id as any,
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
          playerId: scorer._id as any,
          description: 'Goal'
        });
      }
    }

    match.score = { home: homeGoals, away: awayGoals };
    match.events = events.sort((a, b) => a.minute - b.minute);
    match.status = 'finished';
    
    await match.save();

    return {
      match: `${homeTeam.name} vs ${awayTeam.name}`,
      score: `${homeGoals} - ${awayGoals}`
    };
  }

  private async pickScorer(teamId: any) {
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
