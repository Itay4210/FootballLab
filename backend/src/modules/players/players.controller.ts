import { Controller, Get, Post, Query, Param } from '@nestjs/common';
import { PlayersService } from './players.service';

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  getAll() {
    return this.playersService.findAll();
  }

  @Get('top/:type/:leagueId')
  async getTopPlayers(
    @Param('leagueId') leagueId: string,
    @Param('type') type: string,
    @Query('season') season: number
  ) {
    return this.playersService.getTopPlayers(leagueId, season || 1, type);
  }

  @Post('seed')
  seed() {
    return this.playersService.seed();
  }
}
