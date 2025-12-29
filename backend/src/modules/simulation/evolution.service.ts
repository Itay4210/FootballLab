import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Player, PlayerDocument } from '../players/schemas/player.schema';
import { Team, TeamDocument } from '../teams/schemas/team.schema';
import { League, LeagueDocument } from '../leagues/schemas/league.schema';
import {
  SeasonSummary,
  SeasonSummaryDocument,
} from './schemas/season-summary.schema';
import { NAMES_DB } from '../../common/constants/names';

@Injectable()
export class EvolutionService {
  constructor(
    @InjectModel(Player.name) private playerModel: Model<PlayerDocument>,
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    @InjectModel(League.name) private leagueModel: Model<LeagueDocument>,
    @InjectModel(SeasonSummary.name)
    private seasonSummaryModel: Model<SeasonSummaryDocument>,
  ) {}

  async processOffSeasonEvolution(seasonNumber: number) {
    const players = await this.playerModel.find().populate('teamId').exec();

    const retiredPlayers = [];
    let mostImproved = {
      name: '',
      oldStrength: 0,
      newStrength: 0,
      teamName: '',
    };
    let maxImprovement = -100;

    for (const player of players) {
      const oldStrength = player.strength || 60;
      let newStrength = oldStrength;

      player.age += 1;

      if (player.age >= 16 && player.age <= 23) {
        newStrength += Math.floor(Math.random() * 4) + 2;
      } else if (player.age >= 24 && player.age <= 30) {
        newStrength += Math.floor(Math.random() * 3) - 1;
      } else if (player.age >= 31) {
        newStrength -= Math.floor(Math.random() * 3) + 2;
      }

      newStrength = Math.min(99, Math.max(1, newStrength));
      player.strength = newStrength;

      const improvement = newStrength - oldStrength;
      if (improvement > maxImprovement) {
        maxImprovement = improvement;
        const team = player.teamId as unknown as TeamDocument;
        mostImproved = {
          name: player.name,
          oldStrength,
          newStrength,
          teamName: team ? team.name : 'Unknown',
        };
      }

      let retirementChance = 0;

      if (player.age > 39) {
        retirementChance = 1.0;
      } else if (player.age >= 36) {
        if (player.strength < 55) retirementChance = 0.5;
        else if (player.strength < 65) retirementChance = 0.1;
      } else if (player.age >= 34) {
        if (player.strength < 50) retirementChance = 0.05;
      }

      const shouldRetire = Math.random() < retirementChance;

      if (shouldRetire) {
        const team = player.teamId as unknown as TeamDocument;
        retiredPlayers.push({
          name: player.name,
          age: player.age,
          strength: player.strength,
          teamName: team ? team.name : 'Unknown',
        });

        await this.replaceWithRegen(player, team);
        await this.playerModel.deleteOne({ _id: player._id });
        continue;
      }

      await player.save();
    }

    const transfers = await this.handleMajorTransfers();

    const summary = new this.seasonSummaryModel({
      season: seasonNumber,
      retiredPlayers,
      transfers,
      mostImprovedPlayer: mostImproved,
    });
    await summary.save();

    return summary;
  }

  private async replaceWithRegen(
    oldPlayer: PlayerDocument,
    team: TeamDocument,
  ) {
    if (!team) return;

    const country = team.country || 'England';
    const nameData = NAMES_DB[country] || NAMES_DB['England'];
    const first =
      nameData.first[Math.floor(Math.random() * nameData.first.length)];
    const last =
      nameData.last[Math.floor(Math.random() * nameData.last.length)];
    const newName = `${first} ${last}`;

    const baseStrength = Math.floor(Math.random() * 16) + 50;

    const newPlayer = new this.playerModel({
      name: newName,
      age: 17,
      position: oldPlayer.position,
      nationality: country,
      teamId: team._id,
      marketValue: 500000 + Math.random() * 1000000,
      strength: baseStrength,
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
    await newPlayer.save();
  }

  private async handleMajorTransfers() {
    const transfers = [];
    const bigCountries = ['England', 'Spain', 'Germany', 'Italy', 'France'];

    const smallLeagues = await this.leagueModel
      .find({ country: { $nin: bigCountries } })
      .exec();
    const smallLeagueIds = smallLeagues.map((l) => l._id);

    if (smallLeagueIds.length === 0) return [];

    const smallTeams = await this.teamModel
      .find({ leagueId: { $in: smallLeagueIds } })
      .select('_id')
      .exec();
    const smallTeamIds = smallTeams.map((t) => t._id);

    const topTalents = await this.playerModel
      .find({ teamId: { $in: smallTeamIds } })
      .sort({ strength: -1 })
      .limit(10)
      .populate('teamId')
      .exec();

    const bigLeagues = await this.leagueModel
      .find({ country: { $in: bigCountries } })
      .exec();
    const bigLeagueIds = bigLeagues.map((l) => l._id);

    const bigTeams = await this.teamModel
      .find({ leagueId: { $in: bigLeagueIds } })
      .exec();
    if (bigTeams.length === 0) return [];

    for (const talent of topTalents) {
      if (!talent) continue;
      if (Math.random() > 0.8) continue;

      const buyer = bigTeams[Math.floor(Math.random() * bigTeams.length)];
      if (!buyer) continue;

      const fromTeam = talent.teamId as unknown as TeamDocument;
      if (fromTeam._id.equals(buyer._id)) continue;

      const oldTeamName = fromTeam.name;

      talent.teamId = buyer._id;
      talent.marketValue = Math.floor(talent.marketValue * 1.5);
      await talent.save();

      transfers.push({
        playerName: talent.name,
        fromTeam: oldTeamName,
        toTeam: buyer.name,
        fee: talent.marketValue,
      });
    }

    return transfers;
  }

  async getLatestSummary() {
    return this.seasonSummaryModel.findOne().sort({ season: -1 }).exec();
  }
}
