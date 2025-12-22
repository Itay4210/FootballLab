import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { MatchesService } from './matches.service';
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}
  @Get('team/:teamId')
  async getTeamMatches(
    @Param('teamId') teamId: string,
    @Query('season') season: string,
  ) {
    return this.matchesService.findByTeam(teamId, Number(season));
  }
  @Get()
  getAll() {
    return this.matchesService.findAll();
  }
  @Post('seed')
  seed() {
    return this.matchesService.seed();
  }
}
