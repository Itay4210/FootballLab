import { Link } from "react-router-dom";
import type { Team, Match } from "../services/api";
interface Props {
  teams: Team[];
  matches: Match[];
  loading: boolean;
  leagueName?: string;
  selectedSeason?: number;
}
export const LeagueTable = ({
  teams,
  matches,
  loading,
  leagueName,
  selectedSeason = 1,
}: Props) => {
  const isChampionsLeague =
    leagueName === "Champions League" ||
    leagueName === "Europe" ||
    leagueName?.includes("Champions");
  if (loading)
    return (
      <div className="text-center p-10 text-lab-accent animate-pulse">
        Loading...
      </div>
    );
  if (teams.length === 0)
    return (
      <div className="text-center p-10 text-slate-500">No data available.</div>
    );
  const knockoutMatches = matches.filter((m) =>
    [27, 30, 33].includes(m.matchday),
  );
  const hasKnockoutStarted = knockoutMatches.length > 0;
  if (isChampionsLeague) {
    const groupsMap: { [key: string]: Team[] } = {};
    teams.forEach((team) => {
      const g = team.clGroup || "Unknown";
      if (!groupsMap[g]) groupsMap[g] = [];
      groupsMap[g].push(team);
    });
    const sortedGroupNames = Object.keys(groupsMap).sort();
    const isGroupStageFinished =
      teams.length > 0 &&
      teams.every((team) => {
        const stats = team.clStats || team.seasonStats;
        return stats.matches >= 6;
      });
    let qualifiedIds: string[] = [];
    if (isGroupStageFinished) {
      const secondPlaceTeams: Team[] = [];
      const firstPlaces: string[] = [];
      sortedGroupNames.forEach((g) => {
        const sorted = [...groupsMap[g]].sort((a, b) => {
          const statsA = a.clStats || a.seasonStats;
          const statsB = b.clStats || b.seasonStats;
          return (
            statsB.points - statsA.points ||
            statsB.goalsFor -
              statsB.goalsAgainst -
              (statsA.goalsFor - statsA.goalsAgainst)
          );
        });
        if (sorted[0]) firstPlaces.push(sorted[0]._id);
        if (sorted[1]) secondPlaceTeams.push(sorted[1]);
      });
      const top3Seconds = secondPlaceTeams
        .sort((a, b) => {
          const statsA = a.clStats || a.seasonStats;
          const statsB = b.clStats || b.seasonStats;
          return (
            statsB.points - statsA.points ||
            statsB.goalsFor -
              statsB.goalsAgainst -
              (statsA.goalsFor - statsA.goalsAgainst)
          );
        })
        .slice(0, 3)
        .map((t) => t._id);
      qualifiedIds = [...firstPlaces, ...top3Seconds];
    }
    return (
      <div className="flex flex-col gap-10 animate-fade-in">
        {hasKnockoutStarted && (
          <div className="flex flex-col gap-6 bg-slate-900/40 p-6 rounded-2xl border border-blue-500/20 shadow-2xl">
            <h2 className="text-xl font-black text-center text-blue-400 tracking-widest uppercase italic border-b border-blue-500/20 pb-4">
              Champions League Knockout
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  Quarter-Finals
                </p>
                {knockoutMatches
                  .filter((m) => m.matchday === 27)
                  .map((m) => (
                    <KnockoutCard
                      key={m._id}
                      match={m}
                      teams={teams}
                      color="blue"
                    />
                  ))}
              </div>
              <div className="space-y-4 md:mt-12">
                <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  Semi-Finals
                </p>
                {knockoutMatches.filter((m) => m.matchday === 30).length > 0 ? (
                  knockoutMatches
                    .filter((m) => m.matchday === 30)
                    .map((m) => (
                      <KnockoutCard
                        key={m._id}
                        match={m}
                        teams={teams}
                        color="purple"
                      />
                    ))
                ) : (
                  <div className="h-20 border border-dashed border-slate-800 rounded-lg flex items-center justify-center text-slate-700 text-xs italic">
                    TBD
                  </div>
                )}
              </div>
              <div className="space-y-4 md:mt-24">
                <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest text-yellow-500">
                  Grand Final
                </p>
                {knockoutMatches.filter((m) => m.matchday === 33).length > 0 ? (
                  knockoutMatches
                    .filter((m) => m.matchday === 33)
                    .map((m) => (
                      <KnockoutCard
                        key={m._id}
                        match={m}
                        teams={teams}
                        color="yellow"
                      />
                    ))
                ) : (
                  <div className="h-20 border border-dashed border-slate-800 rounded-lg flex items-center justify-center text-slate-700 text-xs italic">
                    TBD
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedGroupNames.map((groupName) => {
            const sortedGroup = [...groupsMap[groupName]].sort((a, b) => {
              const statsA = a.clStats || a.seasonStats;
              const statsB = b.clStats || b.seasonStats;
              return (
                statsB.points - statsA.points ||
                statsB.goalsFor -
                  statsB.goalsAgainst -
                  (statsA.goalsFor - statsA.goalsAgainst)
              );
            });
            return (
              <div
                key={groupName}
                className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden shadow-lg"
              >
                <div className="bg-slate-900 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
                  <h3 className="font-bold text-lab-accent">
                    Group {groupName}
                  </h3>
                  {!isGroupStageFinished && (
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                      In Progress
                    </span>
                  )}
                </div>
                <table className="w-full text-[11px] text-left text-gray-300">
                  <thead className="bg-slate-900/50 uppercase text-gray-500">
                    <tr>
                      <th className="px-2 py-2">Pos</th>
                      <th className="px-2 py-2">Club</th>
                      <th className="text-center">W</th>
                      <th className="text-center">D</th>
                      <th className="text-center">L</th>
                      <th className="text-center font-bold text-white">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedGroup.map((team, idx) => {
                      const stats = team.clStats || team.seasonStats;
                      const isQualified = qualifiedIds.includes(team._id);
                      return (
                        <tr
                          key={team._id}
                          className={`border-b border-slate-700/50 ${isQualified ? "bg-blue-500/10" : ""}`}
                        >
                          <td className="px-2 py-2 text-gray-500">{idx + 1}</td>
                          <td className="px-2 py-2">
                            <div className="flex flex-col">
                              <span
                                className={`font-bold ${isQualified ? "text-blue-300" : "text-white"}`}
                              >
                                <Link
                                  to={`/team/${team._id}?season=${selectedSeason}`}
                                  className="hover:text-lab-accent transition-colors"
                                >
                                  {team.name}
                                </Link>
                              </span>
                              {isQualified && (
                                <span className="text-[9px] text-blue-400 font-bold uppercase">
                                  QUALIFIED
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="text-center text-green-400">
                            {stats.wins}
                          </td>
                          <td className="text-center text-gray-400">
                            {stats.draws}
                          </td>
                          <td className="text-center text-red-400">
                            {stats.losses}
                          </td>
                          <td className="px-2 py-2 text-center font-black text-lab-accent">
                            {stats.points}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700 bg-lab-card/30 backdrop-blur-sm">
      <table className="w-full text-sm text-left text-gray-400">
        <thead className="text-xs uppercase bg-slate-900 text-gray-300">
          <tr>
            <th className="px-6 py-4">Pos</th>
            <th className="px-6 py-4">Club</th>
            <th className="px-4 py-4 text-center">MP</th>
            <th className="px-2 py-4 text-center">W</th>
            <th className="px-2 py-4 text-center">D</th>
            <th className="px-2 py-4 text-center">L</th>
            <th className="px-4 py-4 text-center">GD</th>
            <th className="px-6 py-4 text-center text-white font-bold">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {teams.map((team, index) => {
            const isTop4 = index < 4;
            const isBundesliga = teams.length === 18;
            const maxMatches = isBundesliga ? 34 : 38;
            const isSeasonFinished = teams.every(
              (t) => t.seasonStats.matches === maxMatches,
            );
            return (
              <tr
                key={team._id}
                className={`hover:bg-slate-800/50 transition-colors ${isTop4 ? "border-l-4 border-l-lab-accent" : ""}`}
              >
                <td className="px-6 py-4 font-medium text-white">
                  {index + 1}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-white">
                      <Link
                        to={`/team/${team._id}?season=${selectedSeason}`}
                        className="hover:text-lab-accent transition-colors"
                      >
                        {team.name}
                      </Link>
                    </span>
                    {isSeasonFinished && isTop4 && (
                      <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mt-1">
                        Qualified for Champions League
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  {team.seasonStats.matches}
                </td>
                <td className="px-2 py-4 text-center text-green-400">
                  {team.seasonStats.wins}
                </td>
                <td className="px-2 py-4 text-center text-gray-400">
                  {team.seasonStats.draws}
                </td>
                <td className="px-2 py-4 text-center text-red-400">
                  {team.seasonStats.losses}
                </td>
                <td className="px-4 py-4 text-center font-mono">
                  {team.seasonStats.goalsFor - team.seasonStats.goalsAgainst}
                </td>
                <td className="px-6 py-4 text-center font-black text-xl text-lab-accent">
                  {team.seasonStats.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
const KnockoutCard = ({
  match,
  teams,
  color,
}: {
  match: Match;
  teams: Team[];
  color: "blue" | "purple" | "yellow";
}) => {
  const home = teams.find((t) => t._id === match.homeTeam);
  const away = teams.find((t) => t._id === match.awayTeam);
  const isFinished = match.status === "finished";
  const colorClasses = {
    blue: "border-blue-500/30 bg-blue-500/5",
    purple: "border-purple-500/30 bg-purple-500/5",
    yellow: "border-yellow-500/50 bg-yellow-500/5",
  };
  return (
    <div
      className={`p-3 rounded-xl border ${colorClasses[color]} shadow-lg transition-transform hover:scale-[1.02]`}
    >
      <div className="flex justify-between items-center text-[11px]">
        <div className="flex flex-col gap-2 w-full">
          <div className="flex justify-between w-full">
            <span
              className={`font-bold ${isFinished && match.score.home > match.score.away ? "text-white" : "text-slate-400"}`}
            >
              {home?.name || "Unknown"}
            </span>
            <span className="font-black text-lab-accent">
              {isFinished ? match.score.home : "-"}
            </span>
          </div>
          <div className="flex justify-between w-full">
            <span
              className={`font-bold ${isFinished && match.score.away > match.score.home ? "text-white" : "text-slate-400"}`}
            >
              {away?.name || "Unknown"}
            </span>
            <span className="font-black text-lab-accent">
              {isFinished ? match.score.away : "-"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
