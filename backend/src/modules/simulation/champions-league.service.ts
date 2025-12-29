import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Match, MatchDocument } from '../matches/schemas/match.schema';
import { Team, TeamDocument } from '../teams/schemas/team.schema';
import { LeagueDocument } from '../leagues/schemas/league.schema';
import { MatchesService } from '../matches/matches.service';

@Injectable()
export class ChampionsLeagueService {
  constructor(
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    private readonly matchesService: MatchesService,
  ) {}

  async handleKnockoutLogic(league: LeagueDocument) {
    const currentSeason = league.seasonNumber || 1;
    if (league.currentMatchday >= 7 && league.currentMatchday < 27) {
      const existingMatches = await this.matchModel.countDocuments({
        leagueId: league._id,
        matchday: 27,
        seasonNumber: currentSeason,
      });
      if (existingMatches === 0) {
        const qualified = await this.getQualifiedTeams(league._id);
        await this.matchesService.generateKnockoutMatches(
          league._id,
          qualified,
          27,
          currentSeason,
        );
        league.currentMatchday = 27;
        await league.save();
      } else {
        league.currentMatchday = 27;
        await league.save();
      }
    }
    if (league.currentMatchday >= 28 && league.currentMatchday < 30) {
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
      } else if (league.currentMatchday !== 30) {
        league.currentMatchday = 30;
        await league.save();
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
      } else if (league.currentMatchday !== 33) {
        league.currentMatchday = 33;
        await league.save();
      }
    }
  }

  private async getQualifiedTeams(
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
}
