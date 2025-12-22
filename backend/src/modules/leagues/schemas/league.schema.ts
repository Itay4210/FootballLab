import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export type LeagueDocument = League & Document;
@Schema({ timestamps: true })
export class League {
  @Prop({ required: true, unique: true })
  name: string;
  @Prop({ required: true })
  country: string;
  @Prop({ default: 1 })
  currentMatchday: number;
  @Prop({ default: '2025/2026' })
  season: string;
  @Prop({ default: 1 })
  seasonNumber: number;
}
export const LeagueSchema = SchemaFactory.createForClass(League);
