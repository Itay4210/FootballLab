import { Controller, Get, Post, Param } from '@nestjs/common';
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
  @Post('seed')
  seedData() {
    return this.teamsService.seed();
  }
}
