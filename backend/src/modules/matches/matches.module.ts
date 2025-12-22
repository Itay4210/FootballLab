import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Match, MatchSchema } from './schemas/match.schema';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { TeamsModule } from '../teams/teams.module';
import { LeaguesModule } from '../leagues/leagues.module';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Match.name, schema: MatchSchema }]),
    TeamsModule,
    LeaguesModule,
  ],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService, MongooseModule],
})
export class MatchesModule {}
