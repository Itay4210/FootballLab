import { Controller, Get, Post } from '@nestjs/common';
import { PlayersService } from './players.service';
@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}
  @Get()
  getAll() {
    return this.playersService.findAll();
  }
  @Post('seed')
  seed() {
    return this.playersService.seed();
  }
}
