import { Controller, Get, Post, Query, Param } from '@nestjs/common';
import { PlayersService } from './players.service';

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  getAll() {
    return this.playersService.findAll();
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.playersService.search(q);
  }

  @Get(':id')
  getPlayerById(@Param('id') id: string) {
    return this.playersService.findById(id);
  }

  @Get('team/:teamId')
  getPlayersByTeam(@Param('teamId') teamId: string) {
    return this.playersService.findByTeam(teamId);
  }

  @Get('top/:type/:leagueId')
  async getTopPlayers(
    @Param('leagueId') leagueId: string,
    @Param('type') type: string,
    @Query('season') season: number,
  ) {
    return this.playersService.getTopPlayers(leagueId, season || 1, type);
  }

  @Get('stats/:playerId')
  async getPlayerStatsForSeason(
    @Param('playerId') playerId: string,
    @Query('season') season?: number,
    @Query('leagueId') leagueId?: string,
  ) {
    return this.playersService.getPlayerStatsForSeason(
      playerId,
      season,
      leagueId,
    );
  }

  @Get('history/:playerId')
  async getPlayerHistory(@Param('playerId') playerId: string) {
    return this.playersService.getPlayerHistory(playerId);
  }

  @Post('seed')
  seed() {
    return this.playersService.seed();
  }
}
