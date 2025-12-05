import { Module } from '@nestjs/common';
import { SimulationService } from './simulation.service';
import { SimulationController } from './simulation.controller';
import { MatchesModule } from '../matches/matches.module';
import { TeamsModule } from '../teams/teams.module';
import { PlayersModule } from '../players/players.module';

@Module({
  imports: [
    MatchesModule,
    TeamsModule,
    PlayersModule,
  ],
  controllers: [SimulationController],
  providers: [SimulationService],
})
export class SimulationModule {}