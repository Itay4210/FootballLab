import { Controller, Get, Post } from '@nestjs/common';
import { LeaguesService } from './leagues.service';
@Controller('leagues')
export class LeaguesController {
  constructor(private readonly leaguesService: LeaguesService) {}
  @Get()
  getAll() {
    return this.leaguesService.findAll();
  }
  @Post('seed')
  seed() {
    return this.leaguesService.seed();
  }
}
