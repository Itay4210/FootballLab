import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FootballAPI,
  type Team,
  type League,
  type Match,
  type TeamStats,
  type Player,
} from "../services/api";
import { LeagueTable } from "../components/LeagueTable";
import { TopScorers } from "../components/TopScorers";
const emptyStats = (): TeamStats => ({
  matches: 0,
  points: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
});
export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [leagues, setLeagues] = useState<League[]>([]);
  const selectedLeague = searchParams.get("league");
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([1]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const setSelectedLeague = (id: string) => {
    setSearchParams({ league: id });
  };
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const [leaguesData, teamsData, matchesData, playersData] =
          await Promise.all([
            FootballAPI.getLeagues(),
            FootballAPI.getAllTeams(),
            FootballAPI.getMatches(),
            FootballAPI.getPlayers(),
          ]);
        setLeagues(leaguesData);
        setAllTeams(teamsData);
        setAllMatches(matchesData);
        setAllPlayers(playersData);
        if (
          Array.isArray(leaguesData) &&
          leaguesData.length > 0 &&
          !selectedLeague
        ) {
          setSelectedLeague(leaguesData[0]._id);
        }
        const seasons = Array.from(
          new Set(
            (Array.isArray(matchesData) ? matchesData : []).map(
              (m) => m.seasonNumber || 1,
            ),
          ),
        );
        const sortedSeasons = seasons.sort((a, b) => b - a);
        setAvailableSeasons(sortedSeasons.length > 0 ? sortedSeasons : [1]);
        if (sortedSeasons.length > 0) {
          setSelectedSeason(sortedSeasons[0]);
        }
      } catch (error) {
        console.error("Failed to init data", error);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);
  useEffect(() => {
    if (
      !selectedLeague ||
      !Array.isArray(leagues) ||
      leagues.length === 0 ||
      allTeams.length === 0
    )
      return;
    const currentLeagueObj = Array.isArray(leagues)
      ? leagues.find((l) => l._id === selectedLeague)
      : null;
    const isChampionsLeague =
      currentLeagueObj?.name === "Champions League" ||
      currentLeagueObj?.name === "Europe";
    const leagueMatches = allMatches.filter(
      (m) =>
        m.leagueId === selectedLeague &&
        (m.seasonNumber || 1) === selectedSeason,
    );
    setMatches(leagueMatches);
    const teamStatsMap = new Map<
      string,
      { season: TeamStats; cl: TeamStats }
    >();
    allTeams.forEach((t) => {
      teamStatsMap.set(t._id, {
        season: emptyStats(),
        cl: emptyStats(),
      });
    });
    leagueMatches.forEach((m) => {
      if (m.status !== "finished") return;
      const homeStats = teamStatsMap.get(m.homeTeam);
      const awayStats = teamStatsMap.get(m.awayTeam);
      if (!homeStats || !awayStats) return;
      const update = (stats: TeamStats, gf: number, ga: number) => {
        stats.matches++;
        stats.goalsFor += gf;
        stats.goalsAgainst += ga;
        if (gf > ga) {
          stats.wins++;
          stats.points += 3;
        } else if (gf === ga) {
          stats.draws++;
          stats.points += 1;
        } else {
          stats.losses++;
        }
      };
      if (isChampionsLeague) {
        update(homeStats.cl, m.score.home, m.score.away);
        update(awayStats.cl, m.score.away, m.score.home);
      } else {
        update(homeStats.season, m.score.home, m.score.away);
        update(awayStats.season, m.score.away, m.score.home);
      }
    });
    const participatingTeamIds = new Set<string>();
    leagueMatches.forEach((m) => {
      participatingTeamIds.add(m.homeTeam);
      participatingTeamIds.add(m.awayTeam);
    });
    const teamsWithStats = allTeams
      .filter((t) => participatingTeamIds.has(t._id))
      .map((t) => {
        const stats = teamStatsMap.get(t._id);
        return {
          ...t,
          seasonStats: stats?.season || t.seasonStats,
          clStats: stats?.cl || t.clStats,
        };
      });
    const sortedTeams = teamsWithStats.sort((a, b) => {
      const statsA = isChampionsLeague
        ? a.clStats || emptyStats()
        : a.seasonStats;
      const statsB = isChampionsLeague
        ? b.clStats || emptyStats()
        : b.seasonStats;
      return (
        statsB.points - statsA.points ||
        statsB.goalsFor -
          statsB.goalsAgainst -
          (statsA.goalsFor - statsA.goalsAgainst)
      );
    });
    setTeams(sortedTeams);
    const leagueTeamIds = new Set(sortedTeams.map((t) => t._id));
    const playerGoalsMap = new Map<string, number>();
    leagueMatches.forEach((m) => {
      if (m.status === "finished" && m.events) {
        m.events.forEach((e) => {
          if (e.type === "goal" && e.playerId) {
            const current = playerGoalsMap.get(e.playerId) || 0;
            playerGoalsMap.set(e.playerId, current + 1);
          }
        });
      }
    });
    const leaguePlayers = allPlayers
      .filter((p) => leagueTeamIds.has(p.teamId))
      .map((p) => ({
        ...p,
        seasonStats: {
          ...p.seasonStats,
          goals: playerGoalsMap.get(p._id) || 0,
        },
      }));
    setFilteredPlayers(leaguePlayers);
  }, [
    selectedLeague,
    selectedSeason,
    allTeams,
    allMatches,
    leagues,
    allPlayers,
  ]);
  const selectedLeagueObj = Array.isArray(leagues)
    ? leagues.find((l) => l._id === selectedLeague)
    : null;
  const currentLeagueName =
    selectedLeagueObj?.name || selectedLeagueObj?.country || "";
  return (
    <div className="min-h-screen p-5 md:p-10 max-w-7xl mx-auto">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-lab-accent to-blue-500">
            FootbalLab 🧪
          </h1>
          <p className="text-slate-400 text-sm">Season 2025/26 Simulation</p>
        </div>
        <div className="flex flex-col items-end gap-4">
          <div className="flex flex-col items-end">
            <label className="text-[10px] uppercase text-slate-500 font-bold mb-1">
              View Season
            </label>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-lab-accent outline-none focus:border-lab-accent"
            >
              {availableSeasons.map((s) => (
                <option key={s} value={s}>
                  Season {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {Array.isArray(leagues) &&
              leagues.map((league) => (
                <button
                  key={league._id}
                  onClick={() => setSelectedLeague(league._id)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    selectedLeague === league._id
                      ? "bg-lab-accent text-lab-dark shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                      : "bg-lab-card hover:bg-slate-700 text-slate-300"
                  }`}
                >
                  {league.country}
                </button>
              ))}
          </div>
        </div>
      </header>
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <LeagueTable
            matches={matches}
            teams={teams}
            loading={loading}
            leagueName={currentLeagueName}
            selectedSeason={selectedSeason}
          />
        </div>
        <div>
          <TopScorers
            players={filteredPlayers}
            teams={teams}
            loading={loading}
          />
        </div>
      </main>
    </div>
  );
}
