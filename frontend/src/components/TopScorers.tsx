import type { Player, Team } from "../services/api";
import { Link } from "react-router-dom";
interface Props {
  players: Player[];
  teams: Team[];
  loading: boolean;
}
export const TopScorers = ({ players, teams, loading }: Props) => {
  if (loading)
    return (
      <div className="p-6 text-center animate-pulse text-lab-accent">
        Loading Scorers...
      </div>
    );
  if (!players || players.length === 0) return null;
  const sortedPlayers = [...players]
    .sort((a, b) => (b.seasonStats?.goals || 0) - (a.seasonStats?.goals || 0))
    .slice(0, 10);
  const getTeamName = (teamId: string) => {
    return teams.find((t) => t._id === teamId)?.name || "Unknown";
  };
  return (
    <div className="bg-lab-card/30 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden shadow-xl">
      <div className="bg-slate-900 px-6 py-4 border-b border-slate-700">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-xl">⚽</span> Top Scorers
        </h3>
      </div>
      <table className="w-full text-sm text-left text-gray-400">
        <thead className="text-xs uppercase bg-slate-900/50 text-gray-500">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3 text-right">Goals</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {sortedPlayers.map((player, index) => {
            const goals = player.seasonStats?.goals || 0;
            if (goals === 0 && index > 4) return null;
            return (
              <tr
                key={player._id}
                className="hover:bg-slate-800/50 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-slate-500">
                  {index + 1}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-bold text-white">{player.name}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                      {getTeamName(player.teamId)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-black text-lab-accent text-lg">
                  {goals}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sortedPlayers.length === 0 && (
        <div className="p-8 text-center text-slate-500 italic">
          No goals scored yet
        </div>
      )}
    </div>
  );
};
