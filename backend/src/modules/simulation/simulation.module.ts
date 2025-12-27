import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MatchSchema } from '../matches/schemas/match.schema';
import { TeamSchema } from '../teams/schemas/team.schema';
import { PlayerSchema } from '../players/schemas/player.schema';
import { LeagueSchema } from '../leagues/schemas/league.schema';
import { SeasonSummarySchema } from './schemas/season-summary.schema';
import { SimulationService } from './simulation.service';
import { EvolutionService } from './evolution.service';
import { MatchSimulatorService } from './match-simulator.service';
import { ChampionsLeagueService } from './champions-league.service';
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
      { name: 'SeasonSummary', schema: SeasonSummarySchema },
    ]),
    MatchesModule,
    TeamsModule,
    PlayersModule,
    LeaguesModule,
  ],
  controllers: [SimulationController],
  providers: [
    SimulationService,
    EvolutionService,
    MatchSimulatorService,
    ChampionsLeagueService,
  ],
})
export class SimulationModule {}
