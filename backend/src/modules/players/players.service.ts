import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { Player, PlayerDocument } from './schemas/player.schema';
import { Team, TeamDocument } from '../teams/schemas/team.schema';
import { Match, MatchDocument } from '../matches/schemas/match.schema';
import { NAMES_DB } from '../../common/constants/names';

@Injectable()
export class PlayersService {
  constructor(
    @InjectModel(Player.name) private playerModel: Model<PlayerDocument>,
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
  ) {}

  async findAll() {
    return this.playerModel.find().exec();
  }

  async findById(id: string) {
    return this.playerModel.findById(id).populate('teamId').exec();
  }

  async findByTeam(teamId: string) {
    return this.playerModel.find({ teamId: new Types.ObjectId(teamId) }).exec();
  }

  async search(term: string) {
    const regex = new RegExp(term, 'i');
    return this.playerModel
      .find({ name: { $regex: regex } })
      .limit(10)
      .populate('teamId')
      .exec();
  }

  async getTopPlayers(
    leagueId: string,
    season: number,
    type: string,
  ): Promise<PlayerDocument[]> {
    const teams = await this.teamModel
      .find({ leagueId: new Types.ObjectId(leagueId) })
      .select('_id');
    const teamIds = teams.map((t) => t._id);

    const filter: FilterQuery<PlayerDocument> = { teamId: { $in: teamIds } };

    if (['saves', 'cleanSheets'].includes(type)) {
      filter.position = 'GK';
    } else if (
      ['tackles', 'interceptions', 'keyPasses', 'goals', 'assists'].includes(
        type,
      )
    ) {
      if (['tackles', 'interceptions', 'keyPasses'].includes(type)) {
        filter.position = { $ne: 'GK' };
      }
    }

    return this.playerModel
      .find(filter)
      .sort({ [`seasonStats.${type}`]: -1 })
      .limit(5)
      .populate('teamId', 'name')
      .exec();
  }

  async getPlayerStatsForSeason(
    playerId: string,
    season?: number,
    leagueId?: string,
  ) {
    const playerObjectId = new Types.ObjectId(playerId);

    const matchFilter: FilterQuery<MatchDocument> = {
      status: 'finished',
      'events.playerId': playerObjectId,
    };

    if (season) matchFilter.seasonNumber = Number(season);
    if (leagueId) matchFilter.leagueId = new Types.ObjectId(leagueId);

    const stats = await this.matchModel.aggregate<{
      goals: number;
      assists: number;
      yellowCards: number;
      redCards: number;
    }>([
      {
        $match: matchFilter,
      },
      { $unwind: '$events' },
      { $match: { 'events.playerId': playerObjectId } },
      {
        $group: {
          _id: null,
          goals: { $sum: { $cond: [{ $eq: ['$events.type', 'goal'] }, 1, 0] } },
          assists: {
            $sum: { $cond: [{ $eq: ['$events.type', 'assist'] }, 1, 0] },
          },
          yellowCards: {
            $sum: { $cond: [{ $eq: ['$events.type', 'yellowCard'] }, 1, 0] },
          },
          redCards: {
            $sum: { $cond: [{ $eq: ['$events.type', 'redCard'] }, 1, 0] },
          },
        },
      },
    ]);

    const matchesCount = await this.matchModel.countDocuments(matchFilter);

    const result = stats[0] || {
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
    };
    return {
      ...result,
      matches: matchesCount,

      cleanSheets: 0,
      tackles: 0,
      interceptions: 0,
      keyPasses: 0,
      saves: 0,
      distanceCovered: 0,
    };
  }

  async getPlayerHistory(playerId: string) {
    const playerObjectId = new Types.ObjectId(playerId);

    // Get stats grouped by season
    const statsBySeason = await this.matchModel.aggregate<{
      _id: number;
      goals: number;
      assists: number;
      yellowCards: number;
      redCards: number;
    }>([
      {
        $match: {
          status: 'finished',
          'events.playerId': playerObjectId,
        },
      },
      { $unwind: '$events' },
      { $match: { 'events.playerId': playerObjectId } },
      {
        $group: {
          _id: '$seasonNumber',
          goals: { $sum: { $cond: [{ $eq: ['$events.type', 'goal'] }, 1, 0] } },
          assists: {
            $sum: { $cond: [{ $eq: ['$events.type', 'assist'] }, 1, 0] },
          },
          yellowCards: {
            $sum: { $cond: [{ $eq: ['$events.type', 'yellowCard'] }, 1, 0] },
          },
          redCards: {
            $sum: { $cond: [{ $eq: ['$events.type', 'redCard'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    // Get match counts grouped by season (separate aggregation because unwinding events multiplies matches)
    const matchCounts = await this.matchModel.aggregate<{
      _id: number;
      matches: number;
    }>([
      {
        $match: {
          status: 'finished',
          'events.playerId': playerObjectId,
        },
      },
      {
        $group: {
          _id: '$seasonNumber',
          matches: { $sum: 1 },
        },
      },
    ]);

    // Merge results
    return statsBySeason.map((seasonStats) => {
      const seasonMatchCount = matchCounts.find(
        (m) => m._id === seasonStats._id,
      );
      return {
        season: seasonStats._id || 1,
        goals: seasonStats.goals,
        assists: seasonStats.assists,
        yellowCards: seasonStats.yellowCards,
        redCards: seasonStats.redCards,
        matches: seasonMatchCount ? seasonMatchCount.matches : 0,
      };
    });
  }

  async seed() {
    const playerCount = await this.playerModel.countDocuments();
    if (playerCount > 0) return { message: 'Players already exist' };
    const teams = await this.teamModel.find().exec();
    if (teams.length === 0) return { message: 'No teams found!' };
    const playersToInsert: Partial<Player>[] = [];
    const SQUAD_DISTRIBUTION = [
      { pos: 'GK', count: 3 },
      { pos: 'CB', count: 4 },
      { pos: 'LB', count: 2 },
      { pos: 'RB', count: 2 },
      { pos: 'CDM', count: 2 },
      { pos: 'CM', count: 4 },
      { pos: 'CAM', count: 2 },
      { pos: 'LW', count: 2 },
      { pos: 'RW', count: 2 },
      { pos: 'ST', count: 2 },
    ];

    const getRandomName = (country: string) => {
      const db = NAMES_DB[country] || NAMES_DB['England'];
      const first = db.first[Math.floor(Math.random() * db.first.length)];
      const last = db.last[Math.floor(Math.random() * db.last.length)];
      return `${first} ${last}`;
    };
    for (const team of teams) {
      for (const role of SQUAD_DISTRIBUTION) {
        for (let i = 1; i <= role.count; i++) {
          let baseValue = 1000000;
          if (role.pos === 'ST' || role.pos === 'CAM') baseValue = 3000000;
          if (role.pos === 'GK') baseValue = 500000;
          const age = Math.floor(Math.random() * 18) + 18;

          const strength = Math.floor(Math.random() * 30) + 50;

          playersToInsert.push({
            name: getRandomName(team.country),
            age: age,
            position: role.pos,
            nationality: team.country,
            teamId: team._id,
            marketValue: baseValue * (Math.random() + 0.5),
            strength,
            seasonStats: {
              goals: 0,
              assists: 0,
              matches: 0,
              yellowCards: 0,
              redCards: 0,
              cleanSheets: 0,
              tackles: 0,
              interceptions: 0,
              keyPasses: 0,
              saves: 0,
              distanceCovered: 0,
            },
          });
        }
      }
    }
    await this.playerModel.insertMany(playersToInsert);
    return {
      message: `Seed Complete! Created ${playersToInsert.length} players. Each team has 25 balanced players.`,
    };
  }
}
