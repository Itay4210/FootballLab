import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import {
  FootballAPI,
  type Team,
  type Match,
  type Player,
} from "../services/api";

export const TeamProfile = () => {
  const { teamId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [team, setTeam] = useState<Team | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([1]);
  const [selectedCompetition, setSelectedCompetition] =
    useState<string>("League");
  const initialSeason = searchParams.get("season")
    ? Number(searchParams.get("season"))
    : 1;
  const [selectedSeason, setSelectedSeason] = useState(initialSeason);
  const [activeTab, setActiveTab] = useState<"fixtures" | "squad">("fixtures");

  useEffect(() => {
    FootballAPI.getMatches().then((allMatches) => {
      const seasons = Array.from(
        new Set(allMatches.map((m) => m.seasonNumber || 1)),
      );
      const sorted = seasons.sort((a, b) => b - a);
      setAvailableSeasons(sorted.length > 0 ? sorted : [1]);
    });
  }, []);

  useEffect(() => {
    if (teamId) {
      FootballAPI.getTeams().then((teams) =>
        setTeam(teams.find((t) => t._id === teamId) || null),
      );
      FootballAPI.getTeamMatches(teamId, selectedSeason).then((matchesData) => {
        setMatches(matchesData);
        const hasCL = matchesData.some(
          (m) =>
            m.leagueName?.includes("Champions") || m.leagueName === "Europe",
        );
      });
      FootballAPI.getPlayers().then((fetchedPlayers) => {
        setAllPlayers(fetchedPlayers);
        setPlayers(fetchedPlayers.filter((p) => p.teamId === teamId));
      });
    }
  }, [teamId, selectedSeason]);

  useEffect(() => {
    setSearchParams({ season: selectedSeason.toString() });
  }, [selectedSeason, setSearchParams]);

  if (!team)
    return (
      <div className="p-10 text-center text-white">Loading Team Profile...</div>
    );

  const hasChampionsLeagueMatches = matches.some(
    (m) => m.leagueName?.includes("Champions") || m.leagueName === "Europe",
  );

  const filteredMatches = matches.filter((m) => {
    if (selectedCompetition === "all") return true;
    if (selectedCompetition === "Champions League") {
      return m.leagueName?.includes("Champions") || m.leagueName === "Europe";
    }
    return !m.leagueName?.includes("Champions") && m.leagueName !== "Europe";
  });

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <Link
        to="/"
        className="inline-flex items-center text-slate-400 hover:text-white mb-6 transition-colors text-sm font-bold uppercase tracking-wider"
      >
        ← Back to Dashboard
      </Link>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 border-b border-slate-800 pb-6 gap-4">
        <div>
          <h1 className="text-5xl font-black italic uppercase text-white">
            {team.name}
          </h1>
          <p className="text-lab-accent font-mono tracking-widest uppercase text-sm mt-2">
            Team History & Fixtures
          </p>
        </div>
        <div className="flex flex-col items-end gap-4">
          <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab("fixtures")}
              className={`px-6 py-2 rounded-md text-sm font-bold uppercase transition-all ${
                activeTab === "fixtures"
                  ? "bg-lab-accent text-lab-dark shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Results
            </button>
            <button
              onClick={() => setActiveTab("squad")}
              className={`px-6 py-2 rounded-md text-sm font-bold uppercase transition-all ${
                activeTab === "squad"
                  ? "bg-lab-accent text-lab-dark shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Stats
            </button>
          </div>

          {}
          {activeTab === "fixtures" && hasChampionsLeagueMatches && (
            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setSelectedCompetition("all")}
                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                  selectedCompetition === "all"
                    ? "bg-slate-700 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedCompetition("League")}
                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                  selectedCompetition === "League"
                    ? "bg-slate-700 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                League
              </button>
              <button
                onClick={() => setSelectedCompetition("Champions League")}
                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                  selectedCompetition === "Champions League"
                    ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                UCL
              </button>
            </div>
          )}

          <div className="flex flex-col items-end">
            <label className="text-[10px] text-slate-500 font-bold mb-1 uppercase">
              Select Season
            </label>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-lab-accent outline-none focus:border-lab-accent"
            >
              {availableSeasons.map((s) => (
                <option key={s} value={s}>
                  Season {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="w-full max-w-4xl mx-auto">
        {activeTab === "fixtures" ? (
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>📅</span> Fixtures & Results
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {filteredMatches.length === 0 && (
                <div className="text-center py-10 text-slate-500 italic border border-dashed border-slate-800 rounded-lg">
                  No matches found for this competition.
                </div>
              )}
              {filteredMatches.map((match) => (
                <div
                  key={match._id}
                  className={`bg-slate-900/50 border border-slate-800 rounded-lg p-4 flex flex-col gap-2 hover:border-slate-600 transition-colors ${match.leagueName?.includes("Champions") || match.leagueName === "Europe" ? "border-l-4 border-l-blue-500" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col w-24">
                      <span className="text-slate-500 font-mono text-xs">
                        {match.leagueName?.includes("Champions") ||
                        match.leagueName === "Europe"
                          ? "UCL"
                          : "League"}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">
                        GW {match.matchday}
                      </span>
                    </div>
                    <div className="flex-1 flex items-center justify-center gap-6">
                      <span
                        className={`flex-1 text-right font-bold ${match.homeTeam === teamId ? "text-lab-accent" : "text-white"}`}
                      >
                        {match.homeTeamName || "Unknown"}
                      </span>
                      <div className="bg-slate-800 px-4 py-1 rounded text-lg font-black min-w-[80px] text-center text-white">
                        {match.status === "finished"
                          ? `${match.score.home} - ${match.score.away}`
                          : "vs"}
                      </div>
                      <span
                        className={`flex-1 text-left font-bold ${match.awayTeam === teamId ? "text-lab-accent" : "text-white"}`}
                      >
                        {match.awayTeamName || "Unknown"}
                      </span>
                    </div>
                    <div className="w-20 text-right">
                      {match.status === "finished" ? (
                        <span
                          className={`text-[10px] font-bold px-2 py-1 rounded ${getMatchResultColor(match, teamId!)}`}
                        >
                          {getMatchResultText(match, teamId!)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-600 uppercase">
                          Upcoming
                        </span>
                      )}
                    </div>
                  </div>
                  {}
                  {match.status === "finished" &&
                    match.events &&
                    match.events.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-800/50 flex justify-center gap-16 px-4">
                        {}
                        <div className="flex-1 flex flex-col items-end gap-1 text-[10px]">
                          {match.events
                            .filter((e) => e.type === "goal")
                            .filter((e) => {
                              const p = allPlayers.find(
                                (pl) => pl._id === e.playerId,
                              );

                              return (
                                p && String(p.teamId) === String(match.homeTeam)
                              );
                            })
                            .map((e, idx) => {
                              const p = allPlayers.find(
                                (pl) => pl._id === e.playerId,
                              );
                              const isMyTeam = match.homeTeam === teamId;
                              return (
                                <span
                                  key={idx}
                                  className={
                                    isMyTeam
                                      ? "text-lab-accent font-bold"
                                      : "text-slate-400"
                                  }
                                >
                                  {p?.name?.split(" ").pop()} {e.minute}' ⚽
                                </span>
                              );
                            })}
                        </div>

                        {/* Away Goals - aligned to the left (towards center) */}
                        <div className="flex-1 flex flex-col items-start gap-1 text-[10px]">
                          {match.events
                            .filter((e) => e.type === "goal")
                            .filter((e) => {
                              const p = allPlayers.find(
                                (pl) => pl._id === e.playerId,
                              );
                              return (
                                p && String(p.teamId) === String(match.awayTeam)
                              );
                            })
                            .map((e, idx) => {
                              const p = allPlayers.find(
                                (pl) => pl._id === e.playerId,
                              );
                              const isMyTeam = match.awayTeam === teamId;
                              return (
                                <span
                                  key={idx}
                                  className={
                                    isMyTeam
                                      ? "text-lab-accent font-bold"
                                      : "text-slate-400"
                                  }
                                >
                                  ⚽ {e.minute}' {p?.name?.split(" ").pop()}
                                </span>
                              );
                            })}
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>👕</span> Squad Statistics
            </h2>
            <div className="bg-slate-900/30 border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs uppercase bg-slate-900 text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Pos</th>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3 text-center">Apps</th>
                    <th className="px-4 py-3 text-center text-white">Goals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {players
                    .sort(
                      (a, b) =>
                        (b.seasonStats?.goals || 0) -
                        (a.seasonStats?.goals || 0),
                    )
                    .map((player) => (
                      <tr
                        key={player._id}
                        className="hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-slate-600 text-xs">
                          {player.position}
                        </td>
                        <td className="px-4 py-3 font-bold text-white">
                          {player.name}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {player.seasonStats?.matches || 0}
                        </td>
                        <td className="px-4 py-3 text-center font-black text-lab-accent">
                          {player.seasonStats?.goals || 0}
                        </td>
                      </tr>
                    ))}
                  {players.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center py-6 italic text-slate-600"
                      >
                        No players found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const getMatchResultText = (match: Match, teamId: string) => {
  const isHome = match.homeTeam === teamId;
  const scoreA = isHome ? match.score.home : match.score.away;
  const scoreB = isHome ? match.score.away : match.score.home;
  if (scoreA > scoreB) return "WIN";
  if (scoreA < scoreB) return "LOSS";
  return "DRAW";
};

const getMatchResultColor = (match: Match, teamId: string) => {
  const res = getMatchResultText(match, teamId);
  if (res === "WIN") return "bg-green-500/20 text-green-400";
  if (res === "LOSS") return "bg-red-500/20 text-red-400";
  return "bg-gray-500/20 text-gray-400";
};
