import React from 'react';
import { Link } from 'react-router-dom';
import type { Player } from '../services/api';

export const TopPlayers = ({ players, title, icon }: { players: Player[], title: string, icon: React.ReactNode }) => {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 shadow-lg">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      <div className="space-y-3">
        {players.map((player, idx) => {
          const teamName = typeof player.teamId === 'object' && player.teamId ? player.teamId.name : 'Unknown';
          return (
          <div key={player._id} className="flex justify-between items-center group">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-600">#{idx + 1}</span>
              <div className="flex flex-col">
                <Link to={`/player/${player._id}`} className="text-sm font-bold text-white group-hover:text-lab-accent transition-colors hover:underline">
                  {player.name}
                </Link>
                <span className="text-[10px] text-slate-500 uppercase">{teamName}</span>
              </div>
            </div>
            <span className="text-lg font-black text-lab-accent">
              {title.includes('Scorers')
                  ? player.seasonStats.goals
                  : title.includes('Assisters')
                  ? player.seasonStats.assists
                  : title.includes('Yellow')
                  ? player.seasonStats.yellowCards
                  : title.includes('Red')
                  ? player.seasonStats.redCards
                  : title.includes('Clean')
                  ? (player.seasonStats.cleanSheets || 0)
                  : title.includes('Tacklers')
                  ? (player.seasonStats.tackles || 0)
                  : title.includes('Passers')
                  ? (player.seasonStats.keyPasses || 0)
                  : title.includes('Saves')
                  ? (player.seasonStats.saves || 0)
                  : title.includes('Interceptors')
                  ? (player.seasonStats.interceptions || 0)
                  : title.includes('Runners')
                  ? (player.seasonStats.distanceCovered || 0).toFixed(1)
                  : 0}
            </span>
          </div>
          );
        })}
      </div>
    </div>
  );
};
