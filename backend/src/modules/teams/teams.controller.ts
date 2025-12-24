import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { TeamsService } from './teams.service';
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}
  @Get()
  getAllTeams() {
    return this.teamsService.findAll();
  }
  @Get('league/:leagueId/table')
  getLeagueTable(@Param('leagueId') leagueId: string) {
    return this.teamsService.getTable(leagueId);
  }
  @Get('stats/:teamId')
  async getTeamStatsForSeason(
    @Param('teamId') teamId: string,
    @Query('season') season?: number,
    @Query('leagueId') leagueId?: string,
  ) {
    return this.teamsService.getTeamStatsForSeason(teamId, season, leagueId);
  }
  @Post('seed')
  seedData() {
    return this.teamsService.seed();
  }
}
