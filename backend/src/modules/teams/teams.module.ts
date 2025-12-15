import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Team, TeamSchema } from './schemas/team.schema';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { LeaguesModule } from '../leagues/leagues.module'; 

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Team.name, schema: TeamSchema }]),
    LeaguesModule, 
  ],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [MongooseModule, TeamsService,MongooseModule.forFeature([{ name: 'Team', schema: TeamSchema }])], 
})
export class TeamsModule {}
