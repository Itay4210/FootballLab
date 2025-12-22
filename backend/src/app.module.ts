import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TeamsModule } from './modules/teams/teams.module';
import { PlayersModule } from './modules/players/players.module';
import { LeaguesModule } from './modules/leagues/leagues.module';
import { MatchesModule } from './modules/matches/matches.module';
import { SimulationModule } from './modules/simulation/simulation.module';
import { ScheduleModule } from '@nestjs/schedule';
@Module({
  imports: [
    MongooseModule.forRoot('mongodb://127.0.0.1:27017/footballab'),
    ScheduleModule.forRoot(),
    TeamsModule,
    PlayersModule,
    LeaguesModule,
    MatchesModule,
    SimulationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
