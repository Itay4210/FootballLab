import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SeasonSummaryDocument = HydratedDocument<SeasonSummary>;

@Schema({ timestamps: true })
export class SeasonSummary {
  @Prop({ required: true })
  season: number;

  @Prop({ type: [Object], default: [] })
  retiredPlayers: {
    name: string;
    age: number;
    strength: number;
    teamName: string;
  }[];

  @Prop({ type: [Object], default: [] })
  transfers: {
    playerName: string;
    fromTeam: string;
    toTeam: string;
    fee: number;
  }[];

  @Prop({ type: Object })
  mostImprovedPlayer: {
    name: string;
    oldStrength: number;
    newStrength: number;
    teamName: string;
  };
}

export const SeasonSummarySchema = SchemaFactory.createForClass(SeasonSummary) as import('mongoose').Schema<SeasonSummary>;
