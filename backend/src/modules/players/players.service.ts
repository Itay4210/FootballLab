import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Player, PlayerDocument } from './schemas/player.schema';
import { Team, TeamDocument } from '../teams/schemas/team.schema';

@Injectable()
export class PlayersService {
  constructor(
    @InjectModel(Player.name) private playerModel: Model<PlayerDocument>,
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
  ) {}

  async findAll() {
    return this.playerModel.find().populate('teamId', 'name').exec();
  }

  async seed() {
    const playerCount = await this.playerModel.countDocuments();
    if (playerCount > 0) return { message: 'Players already exist' };

    const teams = await this.teamModel.find().exec();
    if (teams.length === 0) return { message: 'No teams found!' };

    const playersToInsert: Partial<Player>[] = [];

    const SQUAD_DISTRIBUTION = [
      { pos: 'GK', count: 3 },
      { pos: 'CB', count: 4 },
      { pos: 'LB', count: 2 },
      { pos: 'RB', count: 2 },
      { pos: 'CDM', count: 2 },
      { pos: 'CM', count: 4 },
      { pos: 'CAM', count: 2 },
      { pos: 'LW', count: 2 },
      { pos: 'RW', count: 2 },
      { pos: 'ST', count: 2 },
    ];

    console.log('Starting massive player seed...');

    for (const team of teams) {
      
      for (const role of SQUAD_DISTRIBUTION) {
        for (let i = 1; i <= role.count; i++) {
          
          let baseValue = 1000000;
          if (role.pos === 'ST' || role.pos === 'CAM') baseValue = 3000000;
          if (role.pos === 'GK') baseValue = 500000;

          const age = Math.floor(Math.random() * 18) + 18;

          playersToInsert.push({
            name: `${team.name} ${role.pos} ${i}`,
            age: age,
            position: role.pos,
            nationality: team.country,
            teamId: team._id,
            marketValue: baseValue * (Math.random() + 0.5),
            seasonStats: {
               goals: 0, assists: 0, matches: 0, yellowCards: 0, redCards: 0 
            }
          });
        }
      }
    }

    await this.playerModel.insertMany(playersToInsert);
    
    return { 
      message: `Seed Complete! Created ${playersToInsert.length} players. Each team has 25 balanced players.` 
    };
  }
}