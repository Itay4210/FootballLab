import type { Team } from '../services/api';

interface Props {
  teams: Team[];
  loading: boolean;
  leagueName?: string;
}

export const LeagueTable = ({ teams, loading, leagueName }: Props) => {
  const isChampionsLeague = 
    leagueName === 'Champions League' || 
    leagueName === 'Europe' || 
    leagueName?.includes('Champions');

  if (loading) return <div className="text-center p-10 text-lab-accent animate-pulse">Loading...</div>;
  if (teams.length === 0) return <div className="text-center p-10 text-slate-500">No data available.</div>;

  if (isChampionsLeague) {
    const groupsMap: { [key: string]: Team[] } = {};
    
    teams.forEach(team => {
      const g = (team as any).clGroup || 'Unknown';
      if (!groupsMap[g]) groupsMap[g] = [];
      groupsMap[g].push(team);
    });

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
        {Object.keys(groupsMap).sort().map((groupName) => {
          const sortedGroup = [...groupsMap[groupName]].sort((a, b) => {
            const statsA = (a as any).clStats || { points: 0, goalsFor: 0, goalsAgainst: 0 };
            const statsB = (b as any).clStats || { points: 0, goalsFor: 0, goalsAgainst: 0 };
            
            const ptsDiff = statsB.points - statsA.points;
            if (ptsDiff !== 0) return ptsDiff;
            return (statsB.goalsFor - statsB.goalsAgainst) - (statsA.goalsFor - statsA.goalsAgainst);
          });

          return (
            <div key={groupName} className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden shadow-lg">
              <div className="bg-slate-900 px-4 py-2 border-b border-slate-700">
                <h3 className="font-bold text-lab-accent">Group {groupName}</h3>
              </div>
              <table className="w-full text-[11px] text-left text-gray-300">
                <thead className="bg-slate-900/50 uppercase text-gray-500">
                  <tr>
                    <th className="px-2 py-2">Pos</th>
                    <th className="px-2 py-2">Club</th>
                    <th className="text-center">W</th>
                    <th className="text-center">D</th>
                    <th className="text-center">L</th>
                    <th className="text-center">GD</th>
                    <th className="px-2 py-2 text-center text-white">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGroup.map((team, idx) => {
                    const stats = (team as any).clStats || { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
                    return (
                    <tr key={team._id} className={`border-b border-slate-700/50 ${idx < 2 ? 'bg-green-500/5' : ''}`}>
                      <td className="px-2 py-2 text-gray-500">{idx + 1}</td>
                      <td className="px-2 py-2 font-bold truncate max-w-[80px] text-white">{team.name}</td>
                      <td className="text-center text-green-400">{stats.wins}</td>
                      <td className="text-center text-gray-400">{stats.draws}</td>
                      <td className="text-center text-red-400">{stats.losses}</td>
                      <td className="text-center font-mono">{stats.goalsFor - stats.goalsAgainst}</td>
                      <td className="px-2 py-2 text-center font-black text-lab-accent">{stats.points}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700 bg-lab-card/30">
      <table className="w-full text-sm text-left text-gray-400">
        <thead className="text-xs uppercase bg-slate-900 text-gray-300">
          <tr>
            <th className="px-6 py-4">Pos</th>
            <th className="px-6 py-4">Club</th>
            <th className="px-4 py-4 text-center">MP</th>
            <th className="px-2 py-4 text-center">W</th>
            <th className="px-2 py-4 text-center">D</th>
            <th className="px-2 py-4 text-center">L</th>
            <th className="px-2 py-4 text-center hidden md:table-cell">GF</th>
            <th className="px-2 py-4 text-center hidden md:table-cell">GA</th>
            <th className="px-4 py-4 text-center">GD</th>
            <th className="px-6 py-4 text-center text-white font-bold">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {teams.map((team, index) => (
            <tr key={team._id} className={`hover:bg-slate-800/50 ${index < 4 ? 'border-l-4 border-l-lab-accent' : ''}`}>
              <td className="px-6 py-4 font-medium text-white">{index + 1}</td>
              <td className="px-6 py-4 font-bold text-white">{team.name}</td>
              <td className="px-4 py-4 text-center">{team.seasonStats.matches}</td>
              <td className="px-2 py-4 text-center text-green-400">{team.seasonStats.wins}</td>
              <td className="px-2 py-4 text-center text-gray-400">{team.seasonStats.draws}</td>
              <td className="px-2 py-4 text-center text-red-400">{team.seasonStats.losses}</td>
              <td className="px-2 py-4 text-center hidden md:table-cell">{team.seasonStats.goalsFor}</td>
              <td className="px-2 py-4 text-center hidden md:table-cell">{team.seasonStats.goalsAgainst}</td>
              <td className="px-4 py-4 text-center font-mono">{team.seasonStats.goalsFor - team.seasonStats.goalsAgainst}</td>
              <td className="px-6 py-4 text-center font-black text-xl text-lab-accent">{team.seasonStats.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};