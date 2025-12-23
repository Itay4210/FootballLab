import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
export type PlayerDocument = Player & Document;
export enum PlayerPosition {
  GK = 'GK',
  CB = 'CB',
  LB = 'LB',
  RB = 'RB',
  CDM = 'CDM',
  CM = 'CM',
  CAM = 'CAM',
  LW = 'LW',
  RW = 'RW',
  ST = 'ST',
}
@Schema({ timestamps: true })
export class Player {
  @Prop({ required: true })
  name: string;
  @Prop({ required: true })
  age: number;
  @Prop({ required: true, enum: PlayerPosition })
  position: string;
  @Prop({ required: true })
  nationality: string;
  @Prop({ type: Types.ObjectId, ref: 'Team', required: true })
  teamId: Types.ObjectId;
  @Prop({ default: 100000 })
  marketValue: number;
  @Prop({
    type: Object,
    default: {
      goals: 0,
      assists: 0,
      matches: 0,
      yellowCards: 0,
      redCards: 0,
      cleanSheets: 0,
      tackles: 0,
      interceptions: 0,
      keyPasses: 0,
      saves: 0,
      distanceCovered: 0,
    },
  })
  seasonStats: {
    goals: number;
    assists: number;
    matches: number;
    yellowCards: number;
    redCards: number;
    cleanSheets: number;
    tackles: number;
    interceptions: number;
    keyPasses: number;
    saves: number;
    distanceCovered: number;
  };
}
export const PlayerSchema = SchemaFactory.createForClass(Player);
