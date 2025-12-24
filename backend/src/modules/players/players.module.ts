import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Player, PlayerSchema } from './schemas/player.schema';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';
import { TeamsModule } from '../teams/teams.module';
import { MatchesModule } from '../matches/matches.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Player.name, schema: PlayerSchema }]),
    TeamsModule,
    MatchesModule,
  ],
  controllers: [PlayersController],
  providers: [PlayersService],
  exports: [MongooseModule, PlayersService],
})
export class PlayersModule {}
