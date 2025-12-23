import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { FootballAPI, type Player, type Match, type Team } from "../services/api";

export const PlayerProfile = () => {
  const { playerId } = useParams();
  const [player, setPlayer] = useState<Player | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [statsHistory, setStatsHistory] = useState<{
    season: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    matches: number;
  }[]>([]);

  useEffect(() => {
    if (!playerId) return;

    const fetchData = async () => {
      try {
        const [players, matches, teams] = await Promise.all([
          FootballAPI.getPlayers(),
          FootballAPI.getMatches(),
          FootballAPI.getTeams()
        ]);

        const p = players.find(x => x._id === playerId);
        setPlayer(p || null);

        if (p) {
            const tId = typeof p.teamId === 'string' ? p.teamId : p.teamId._id;
            const t = teams.find(x => x._id === tId);
            setTeam(t || null);
        }

        const history = new Map<number, {
            goals: number;
            assists: number;
            yellowCards: number;
            redCards: number;
            matches: number;
        }>();

        matches.forEach(m => {
            if (m.status !== 'finished') return;
            const season = m.seasonNumber || 1;
            if (!history.has(season)) {
                history.set(season, {
                    goals: 0,
                    assists: 0,
                    yellowCards: 0,
                    redCards: 0,
                    matches: 0
                });
            }
            const s = history.get(season)!;

            const playerEvents = m.events?.filter(e => e.playerId === playerId) || [];

            if (playerEvents.length > 0) {
                s.matches++;
            }

            s.goals += playerEvents.filter(e => e.type === 'goal').length;
            s.assists += playerEvents.filter(e => e.type === 'assist').length;
            s.yellowCards += playerEvents.filter(e => e.type === 'card' && e.description.toLowerCase().includes('yellow')).length;
            s.redCards += playerEvents.filter(e => e.type === 'card' && e.description.toLowerCase().includes('red')).length;
        });

        const sortedHistory = Array.from(history.entries())
            .map(([season, data]) => ({ season, ...data }))
            .sort((a, b) => b.season - a.season);

        setStatsHistory(sortedHistory);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [playerId]);

  if (!player) return <div className="p-10 text-white">Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <Link to="/" className="text-slate-400 hover:text-white mb-6 inline-block font-bold text-sm uppercase tracking-wider">← Back to Dashboard</Link>
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-slate-800 pb-8">
            <div>
                <h1 className="text-5xl font-black italic text-white mb-2">{player.name}</h1>
                <div className="flex items-center gap-3">
                    <span className="bg-lab-accent text-lab-dark px-3 py-1 rounded font-bold text-sm">{player.position}</span>
                    <span className="text-xl text-slate-400">{team?.name}</span>
                </div>
            </div>
            <div className="text-right">
                <div className="text-slate-500 text-sm uppercase tracking-widest font-bold">Current Market Value</div>
                <div className="text-3xl font-mono text-green-400">€{(Math.random() * 100).toFixed(1)}M</div>
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <div className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-1">Goals</div>
                <div className="text-2xl font-black text-white">{player.seasonStats?.goals || 0}</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <div className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-1">Assists</div>
                <div className="text-2xl font-black text-white">{player.seasonStats?.assists || 0}</div>
            </div>
            {player.position === 'GK' ? (
                <>
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <div className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-1">Clean Sheets</div>
                    <div className="text-2xl font-black text-green-400">{player.seasonStats?.cleanSheets || 0}</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <div className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-1">Saves</div>
                    <div className="text-2xl font-black text-white">{player.seasonStats?.saves || 0}</div>
                </div>
                </>
            ) : (
                <>
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <div className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-1">Key Passes</div>
                    <div className="text-2xl font-black text-white">{player.seasonStats?.keyPasses || 0}</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <div className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-1">Tackles</div>
                    <div className="text-2xl font-black text-white">{player.seasonStats?.tackles || 0}</div>
                </div>
                </>
            )}
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <div className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-1">Distance (km)</div>
                <div className="text-2xl font-black text-blue-400">{(player.seasonStats?.distanceCovered || 0).toFixed(1)}</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <div className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-1">Cards</div>
                <div className="text-2xl font-black text-white flex gap-2">
                    <span className="text-yellow-400">{player.seasonStats?.yellowCards || 0}</span>
                    <span className="text-slate-600">/</span>
                    <span className="text-red-500">{player.seasonStats?.redCards || 0}</span>
                </div>
            </div>
        </div>

        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>📈</span> Career History
        </h2>
        <div className="bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
             <table className="w-full text-left text-slate-300">
                <thead className="text-xs uppercase bg-slate-800 text-slate-500">
                    <tr>
                        <th className="px-6 py-4">Season</th>
                        <th className="px-6 py-4 text-center">Matches*</th>
                        <th className="px-6 py-4 text-center">Goals</th>
                        <th className="px-6 py-4 text-center">Assists</th>
                        <th className="px-6 py-4 text-center">Yellow</th>
                        <th className="px-6 py-4 text-center">Red</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {statsHistory.map(s => (
                        <tr key={s.season} className="hover:bg-slate-800/50 transition-colors">
                            <td className="px-6 py-4 font-mono text-slate-400">202{4+s.season}/2{5+s.season}</td>
                            <td className="px-6 py-4 text-center font-bold text-white">{s.matches}</td>
                            <td className="px-6 py-4 text-center font-bold text-lab-accent text-lg">{s.goals}</td>
                            <td className="px-6 py-4 text-center font-bold text-blue-400 text-lg">{s.assists}</td>
                            <td className="px-6 py-4 text-center font-bold text-yellow-400">{s.yellowCards}</td>
                            <td className="px-6 py-4 text-center font-bold text-red-500">{s.redCards}</td>
                        </tr>
                    ))}
                    {statsHistory.length === 0 && (
                        <tr><td colSpan={6} className="px-6 py-8 text-center italic text-slate-600">No match history recorded yet</td></tr>
                    )}
                </tbody>
             </table>
             <div className="p-2 text-[10px] text-slate-600 italic text-right">* Based on recorded match events</div>
        </div>
      </div>
    </div>
  );
};
