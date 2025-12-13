import {type Team } from '../services/api';

interface Props {
  teams: Team[];
  loading: boolean;
}

export const LeagueTable = ({ teams, loading }: Props) => {
  if (loading) {
    return <div className="text-center text-lab-accent animate-pulse">Loading Data... 🧪</div>;
  }

  if (teams.length === 0) {
    return <div className="text-center text-slate-500">No data available. Run simulation first.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700 shadow-2xl">
      <table className="w-full text-sm text-left text-gray-400">
        <thead className="text-xs uppercase bg-lab-dark text-gray-300 border-b border-slate-700">
          <tr>
            <th className="px-6 py-3">Pos</th>
            <th className="px-6 py-3">Club</th>
            <th className="px-4 py-3 text-center">MP</th>
            <th className="px-4 py-3 text-center">W</th>
            <th className="px-4 py-3 text-center">D</th>
            <th className="px-4 py-3 text-center">L</th>
            <th className="px-4 py-3 text-center">GF</th>
            <th className="px-4 py-3 text-center">GA</th>
            <th className="px-4 py-3 text-center">GD</th>
            <th className="px-6 py-3 text-center font-bold text-white">Pts</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, index) => {
            // חישוב הפרש שערים
            const goalDiff = team.seasonStats.goalsFor - team.seasonStats.goalsAgainst;
            
            // צביעת המקומות הראשונים (ליגת האלופות / ירידה)
            let rowClass = "border-b border-slate-800 hover:bg-slate-800 transition-colors";
            if (index < 4) rowClass += " border-l-4 border-l-lab-accent"; // מקום 1-4 ירוק
            if (index >= teams.length - 3) rowClass += " border-l-4 border-l-red-500"; // יורדות אדום

            return (
              <tr key={team._id} className={rowClass}>
                <td className="px-6 py-4 font-medium text-white">{index + 1}</td>
                <td className="px-6 py-4 font-bold text-white">{team.name}</td>
                <td className="px-4 py-4 text-center">{team.seasonStats.matches}</td>
                <td className="px-4 py-4 text-center text-green-400">{team.seasonStats.wins}</td>
                <td className="px-4 py-4 text-center text-gray-400">{team.seasonStats.draws}</td>
                <td className="px-4 py-4 text-center text-red-400">{team.seasonStats.losses}</td>
                <td className="px-4 py-4 text-center">{team.seasonStats.goalsFor}</td>
                <td className="px-4 py-4 text-center">{team.seasonStats.goalsAgainst}</td>
                <td className="px-4 py-4 text-center font-mono">{goalDiff > 0 ? `+${goalDiff}` : goalDiff}</td>
                <td className="px-6 py-4 text-center font-black text-xl text-lab-accent">{team.seasonStats.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};