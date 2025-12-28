import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { TeamsService } from './teams.service';
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}
  @Get()
  getAllTeams() {
    return this.teamsService.findAll();
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.teamsService.search(q);
  }

  @Get(':id')
  getTeamById(@Param('id') id: string) {
    return this.teamsService.findById(id);
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
