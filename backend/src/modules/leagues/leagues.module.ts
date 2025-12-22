import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { League, LeagueSchema } from './schemas/league.schema';
import { LeaguesController } from './leagues.controller';
import { LeaguesService } from './leagues.service';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: League.name, schema: LeagueSchema }]),
  ],
  controllers: [LeaguesController],
  providers: [LeaguesService],
  exports: [
    MongooseModule,
    LeaguesService,
    MongooseModule.forFeature([{ name: 'League', schema: LeagueSchema }]),
  ],
})
export class LeaguesModule {}
