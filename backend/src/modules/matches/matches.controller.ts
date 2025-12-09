import { Controller, Get, Post } from '@nestjs/common';
import { MatchesService } from './matches.service';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  getAll() {
    return this.matchesService.findAll();
  }

  @Post('seed')
  seed() {
    return this.matchesService.seed();
  }
}
