import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
export type MatchDocument = Match & Document;
@Schema()
export class MatchEvent {
  @Prop({ required: true })
  minute: number;
  @Prop({
    required: true,
    enum: ['goal', 'yellowCard', 'redCard', 'substitution', 'injury', 'assist'],
  })
  type: string;
  @Prop({ type: Types.ObjectId, ref: 'Player', required: true })
  playerId: Types.ObjectId;
  @Prop()
  description: string;
}
@Schema({ timestamps: true })
export class Match {
  @Prop({ type: Types.ObjectId, ref: 'League', required: true })
  leagueId: Types.ObjectId;
  @Prop({ default: 1 })
  seasonNumber: number;
  @Prop({ required: true })
  matchday: number;
  @Prop({ type: Types.ObjectId, ref: 'Team', required: true })
  homeTeam: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Team', required: true })
  awayTeam: Types.ObjectId;
  @Prop({ type: Object, default: { home: 0, away: 0 } })
  score: {
    home: number;
    away: number;
  };
  @Prop({
    required: true,
    enum: ['scheduled', 'finished'],
    default: 'scheduled',
  })
  status: string;
  @Prop({ type: [SchemaFactory.createForClass(MatchEvent)], default: [] })
  events: MatchEvent[];
  @Prop({
    type: Object,
    default: { possession: 50, shots: 0, shotsOnTarget: 0 },
  })
  stats: {
    possession: number;
    shots: number;
    shotsOnTarget: number;
  };
}
export const MatchSchema = SchemaFactory.createForClass(Match);
