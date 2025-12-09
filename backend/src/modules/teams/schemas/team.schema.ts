import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TeamDocument = Team & Document;

@Schema({ timestamps: true }) 
export class Team {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  country: string;

  @Prop()
  logoUrl: string;

  @Prop({ required: true })
  stadium: string;

  @Prop({ type: Types.ObjectId, ref: 'League', required: false }) 
  leagueId: Types.ObjectId;

  @Prop({ default: 5, min: 1, max: 10 })
  attackStrength: number;

  @Prop({ default: 5, min: 1, max: 10 })
  defenseStrength: number;

  @Prop({ default: 50, min: 0, max: 100 })
  morale: number; 

  @Prop({
    type: Object,
    default: {matches: 0, points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 }
  })
  seasonStats: {
    matches: number;
    points: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
  };
}

export const TeamSchema = SchemaFactory.createForClass(Team);
