import { Controller, Get, Post } from '@nestjs/common';
import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  getAllTeams() {
    return this.teamsService.findAll();
  }

  @Post('seed')
  seedData() {
    return this.teamsService.seed();
  }
}