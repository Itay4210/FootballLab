import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MatchSchema } from '../matches/schemas/match.schema';
import { TeamSchema } from '../teams/schemas/team.schema';
import { PlayerSchema } from '../players/schemas/player.schema';
import { LeagueSchema } from '../leagues/schemas/league.schema';
import { SimulationService } from './simulation.service';
import { SimulationController } from './simulation.controller';
import { MatchesModule } from '../matches/matches.module';
import { TeamsModule } from '../teams/teams.module';
import { PlayersModule } from '../players/players.module';
import { LeaguesModule } from '../leagues/leagues.module';

@Module({
      imports: [
        MongooseModule.forFeature([
            { name: 'Match', schema: MatchSchema },
            { name: 'Team', schema: TeamSchema },
            { name: 'Player', schema: PlayerSchema },
            { name: 'League', schema: LeagueSchema },
        ]),
        MatchesModule, 
        TeamsModule, 
        PlayersModule, 
        LeaguesModule,
      ],
      controllers: [SimulationController],
      providers: [SimulationService],
    })
export class SimulationModule {}
