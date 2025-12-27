import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MatchDocument, MatchEvent } from '../matches/schemas/match.schema';
import { Team, TeamDocument } from '../teams/schemas/team.schema';
import { Player, PlayerDocument } from '../players/schemas/player.schema';

@Injectable()
export class MatchSimulatorService {
  constructor(
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    @InjectModel(Player.name) private playerModel: Model<PlayerDocument>,
  ) {}

  async simulateMatch(match: MatchDocument, isCL = false) {
    const homeTeam = await this.teamModel.findById(match.homeTeam);
    const awayTeam = await this.teamModel.findById(match.awayTeam);
    if (!homeTeam || !awayTeam) return;
    const homePlayers = await this.playerModel.find({ teamId: homeTeam._id });
    const awayPlayers = await this.playerModel.find({ teamId: awayTeam._id });

    const hP =
      homeTeam.attackStrength +
      homeTeam.defenseStrength +
      homeTeam.morale / 10 +
      2 +
      Math.random() * 5;
    const aP =
      awayTeam.attackStrength +
      awayTeam.defenseStrength +
      awayTeam.morale / 10 +
      Math.random() * 5;
    const diff = hP - aP;
    let hG = 0,
      aG = 0;
    const isKnockout = isCL && match.matchday >= 27;
    if (diff > 10) {
      hG = Math.floor(Math.random() * 4) + 2;
      aG = Math.floor(Math.random() * 1);
    } else if (diff > 3) {
      hG = Math.floor(Math.random() * 3) + 1;
      aG = Math.floor(Math.random() * 2);
    } else if (diff < -10) {
      hG = Math.floor(Math.random() * 1);
      aG = Math.floor(Math.random() * 4) + 2;
    } else if (diff < -3) {
      hG = Math.floor(Math.random() * 2);
      aG = Math.floor(Math.random() * 3) + 1;
    } else {
      const total = Math.floor(Math.random() * 5);
      hG = Math.floor(total * (hP / (hP + aP)));
      aG = total - hG;
    }
    if (isKnockout && hG === aG) {
      if (hP > aP) hG++;
      else aG++;
    }

    const homeLineup = this.selectMatchSquad(homePlayers);
    const awayLineup = this.selectMatchSquad(awayPlayers);

    await Promise.all(
      homeLineup.starters.map((p) =>
        this.updatePlayerStats(
          p._id,
          this.generatePlayerMatchStats(p.position, aG === 0, hG, aG),
        ),
      ),
    );
    await Promise.all(
      awayLineup.starters.map((p) =>
        this.updatePlayerStats(
          p._id,
          this.generatePlayerMatchStats(p.position, hG === 0, aG, hG),
        ),
      ),
    );

    const homeSubs = this.pickSubstitutes(homeLineup.subs);
    const awaySubs = this.pickSubstitutes(awayLineup.subs);

    await Promise.all(
      homeSubs.map((p) =>
        this.updatePlayerStats(
          p._id,
          this.generatePlayerMatchStats(p.position, aG === 0, hG, aG),
        ),
      ),
    );
    await Promise.all(
      awaySubs.map((p) =>
        this.updatePlayerStats(
          p._id,
          this.generatePlayerMatchStats(p.position, hG === 0, aG, hG),
        ),
      ),
    );

    const homeActivePlayers = [...homeLineup.starters, ...homeSubs];
    const awayActivePlayers = [...awayLineup.starters, ...awaySubs];

    const events: MatchEvent[] = [];

    await Promise.all(
      Array.from({ length: hG }).map(async () => {
        const s = this.pickScorerFromList(homeActivePlayers);
        if (s) {
          const minute = Math.floor(Math.random() * 90) + 1;
          events.push({
            minute,
            type: 'goal',
            playerId: s._id,
            description: 'Goal',
          });
          await this.updatePlayerStats(s._id, { goals: 1 });

          if (Math.random() < 0.7) {
            const a = this.pickAssisterFromList(homeActivePlayers, s._id);
            if (a) {
              events.push({
                minute,
                type: 'assist',
                playerId: a._id,
                description: 'Assist',
              });
              await this.updatePlayerStats(a._id, { assists: 1 });
            }
          }
        }
      }),
    );
    await Promise.all(
      Array.from({ length: aG }).map(async () => {
        const s = this.pickScorerFromList(awayActivePlayers);
        if (s) {
          const minute = Math.floor(Math.random() * 90) + 1;
          events.push({
            minute,
            type: 'goal',
            playerId: s._id,
            description: 'Goal',
          });
          await this.updatePlayerStats(s._id, { goals: 1 });

          if (Math.random() < 0.7) {
            const a = this.pickAssisterFromList(awayActivePlayers, s._id);
            if (a) {
              events.push({
                minute,
                type: 'assist',
                playerId: a._id,
                description: 'Assist',
              });
              await this.updatePlayerStats(a._id, { assists: 1 });
            }
          }
        }
      }),
    );

    const totalCards = Math.floor(Math.random() * 4) + 1;
    const allActive = [...homeActivePlayers, ...awayActivePlayers];
    await Promise.all(
      Array.from({ length: totalCards }).map(async () => {
        const p = allActive[Math.floor(Math.random() * allActive.length)];
        if (p) {
          const isRed = Math.random() < 0.05;
          const minute = Math.floor(Math.random() * 90) + 1;
          events.push({
            minute,
            type: isRed ? 'redCard' : 'yellowCard',
            playerId: p._id,
            description: isRed ? 'Red Card' : 'Yellow Card',
          });
          await this.updatePlayerStats(p._id, {
            yellowCards: isRed ? 0 : 1,
            redCards: isRed ? 1 : 0,
          });
        }
      }),
    );

    await this.updateTeamStats(homeTeam, hG, aG, isCL);
    await this.updateTeamStats(awayTeam, aG, hG, isCL);
    match.score = { home: hG, away: aG };
    match.events = events.sort((a, b) => a.minute - b.minute);
    match.status = 'finished';
    await match.save();
  }

  private async updateTeamStats(
    team: TeamDocument,
    gF: number,
    gA: number,
    isCL = false,
  ) {
    const s = isCL
      ? team.clStats || {
          matches: 0,
          points: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
        }
      : team.seasonStats;
    s.matches = (s.matches || 0) + 1;
    s.goalsFor += gF;
    s.goalsAgainst += gA;
    if (gF > gA) {
      s.wins++;
      s.points += 3;
      team.morale = Math.min(100, team.morale + 5);
    } else if (gF === gA) {
      s.draws++;
      s.points += 1;
      team.morale = Math.min(100, team.morale + 1);
    } else {
      s.losses++;
      team.morale = Math.max(0, team.morale - 5);
    }
    if (isCL) {
      team.clStats = s;
      team.markModified('clStats');
    } else {
      team.seasonStats = s;
      team.markModified('seasonStats');
    }
    await team.save();
  }

  private selectMatchSquad(allPlayers: PlayerDocument[]) {
    const sorted = allPlayers.sort(
      (a, b) => b.marketValue * Math.random() - a.marketValue * Math.random(),
    );

    const starters: PlayerDocument[] = [];
    const subs: PlayerDocument[] = [];
    const reserves: PlayerDocument[] = [];

    const popPos = (positions: string[]) => {
      const idx = sorted.findIndex((p) => positions.includes(p.position));
      if (idx !== -1) {
        return sorted.splice(idx, 1)[0];
      }
      return null;
    };

    const gk = popPos(['GK']);
    if (gk) starters.push(gk);

    for (let i = 0; i < 4; i++) {
      const def = popPos(['CB', 'LB', 'RB']);
      if (def) starters.push(def);
    }

    for (let i = 0; i < 3; i++) {
      const mid = popPos(['CM', 'CDM', 'CAM']);
      if (mid) starters.push(mid);
    }

    for (let i = 0; i < 3; i++) {
      const att = popPos(['ST', 'FW', 'LW', 'RW']);
      if (att) starters.push(att);
    }

    while (starters.length < 11 && sorted.length > 0) {
      starters.push(sorted.shift()!);
    }

    subs.push(...sorted);

    return { starters, subs, reserves };
  }

  private pickSubstitutes(availableSubs: PlayerDocument[]) {
    const count = Math.floor(Math.random() * 3) + 3;
    const shuffled = availableSubs.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  private pickScorerFromList(players: PlayerDocument[]) {
    if (!players.length) return null;
    const pool: PlayerDocument[] = [];
    for (const p of players) {
      let w = 1;
      if (['ST', 'FW'].includes(p.position)) w = 10;
      else if (['LW', 'RW'].includes(p.position)) w = 7;
      else if (['CAM', 'CM'].includes(p.position)) w = 4;
      for (let i = 0; i < w; i++) pool.push(p);
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private pickAssisterFromList(
    players: PlayerDocument[],
    scorerId: Types.ObjectId,
  ) {
    const valid = players.filter((p) => !p._id.equals(scorerId));
    if (!valid.length) return null;
    const pool: PlayerDocument[] = [];
    for (const p of valid) {
      let w = 1;
      if (['CAM', 'LW', 'RW'].includes(p.position)) w = 10;
      else if (['CM', 'CDM'].includes(p.position)) w = 6;
      else if (['LB', 'RB'].includes(p.position)) w = 4;
      for (let i = 0; i < w; i++) pool.push(p);
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private async updatePlayerStats(
    playerId: Types.ObjectId,
    updates: Partial<{
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
    }>,
  ) {
    const incUpdate: Record<string, number> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && value !== 0) {
        incUpdate[`seasonStats.${key}`] = value;
      }
    }
    if (Object.keys(incUpdate).length > 0) {
      await this.playerModel.findByIdAndUpdate(playerId, { $inc: incUpdate });
    }
  }

  private generatePlayerMatchStats(
    position: string,
    cleanSheet: boolean,
    teamGoals: number,
    opponentGoals: number,
  ) {
    const stats = {
      matches: 1,
      tackles: 0,
      interceptions: 0,
      keyPasses: 0,
      saves: 0,
      distanceCovered: 0,
      cleanSheets: 0,
    };

    if (position === 'GK') stats.distanceCovered = 4 + Math.random() * 2;
    else if (['CM', 'CDM', 'CAM', 'LW', 'RW'].includes(position))
      stats.distanceCovered = 10 + Math.random() * 3;
    else stats.distanceCovered = 9 + Math.random() * 2;
    stats.distanceCovered = parseFloat(stats.distanceCovered.toFixed(1));

    if (position === 'GK') {
      stats.saves = Math.floor(Math.random() * (opponentGoals + 5));
      if (cleanSheet) stats.cleanSheets = 1;
    } else if (['CB', 'LB', 'RB'].includes(position)) {
      stats.tackles = Math.floor(Math.random() * 5);
      stats.interceptions = Math.floor(Math.random() * 4);
      if (cleanSheet) stats.cleanSheets = 1;
    } else if (['CDM', 'CM'].includes(position)) {
      stats.tackles = Math.floor(Math.random() * 4);
      stats.interceptions = Math.floor(Math.random() * 3);
      stats.keyPasses = Math.floor(Math.random() * 3);
    } else {
      stats.tackles = Math.floor(Math.random() * 2);
      stats.keyPasses = Math.floor(Math.random() * 4);
    }

    return stats;
  }
}
