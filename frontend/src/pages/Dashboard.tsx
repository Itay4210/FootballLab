import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  FootballAPI,
  type Team,
  type TeamStats,
  type Player,
  type Match,
} from "../services/api";
import { LeagueTable } from "../components/LeagueTable";
import { TopPlayers } from "../components/TopPlayers";
import { useData } from "../context/DataContext";
import styles from "./Dashboard.module.css";

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
  const { leagues, allTeams, allMatches, loading } = useData();

  const selectedLeague = searchParams.get("league");
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([1]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  const [topScorers, setTopScorers] = useState<Player[]>([]);
  const [topAssisters, setTopAssisters] = useState<Player[]>([]);
  const [topYellowCards, setTopYellowCards] = useState<Player[]>([]);
  const [topRedCards, setTopRedCards] = useState<Player[]>([]);
  const [topCleanSheets, setTopCleanSheets] = useState<Player[]>([]);
  const [topTackles, setTopTackles] = useState<Player[]>([]);
  const [topKeyPasses, setTopKeyPasses] = useState<Player[]>([]);
  const [topSaves, setTopSaves] = useState<Player[]>([]);
  const [topInterceptions, setTopInterceptions] = useState<Player[]>([]);
  const [topDistance, setTopDistance] = useState<Player[]>([]);

  const [activeTab, setActiveTab] = useState<"standings" | "stats">(
    "standings",
  );

  const setSelectedLeague = (id: string) => {
    setSearchParams({ league: id });
  };

  useEffect(() => {
    if (loading) return;

    if (Array.isArray(leagues) && leagues.length > 0 && !selectedLeague) {
      setSelectedLeague(leagues[0]._id);
    }

    const seasons = Array.from(
      new Set(
        (Array.isArray(allMatches) ? allMatches : []).map(
          (m) => m.seasonNumber || 1,
        ),
      ),
    );
    const sortedSeasons = seasons.sort((a, b) => b - a);
    setAvailableSeasons(sortedSeasons.length > 0 ? sortedSeasons : [1]);

    if (sortedSeasons.length > 0 && !sortedSeasons.includes(selectedSeason)) {
      setSelectedSeason(sortedSeasons[0]);
    }
  }, [leagues, allMatches, loading, selectedLeague]);

  useEffect(() => {
    if (
      !selectedLeague ||
      loading ||
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

    const fetchTopPlayers = async () => {
      if (selectedLeague) {
        try {
          const [
            scorers,
            assisters,
            yellow,
            red,
            cleanSheets,
            tackles,
            keyPasses,
            saves,
            interceptions,
            distance,
          ] = await Promise.all([
            FootballAPI.getTopPlayers(selectedLeague, "goals", selectedSeason),
            FootballAPI.getTopPlayers(
              selectedLeague,
              "assists",
              selectedSeason,
            ),
            FootballAPI.getTopPlayers(
              selectedLeague,
              "yellowCards",
              selectedSeason,
            ),
            FootballAPI.getTopPlayers(
              selectedLeague,
              "redCards",
              selectedSeason,
            ),
            FootballAPI.getTopPlayers(
              selectedLeague,
              "cleanSheets",
              selectedSeason,
            ),
            FootballAPI.getTopPlayers(
              selectedLeague,
              "tackles",
              selectedSeason,
            ),
            FootballAPI.getTopPlayers(
              selectedLeague,
              "keyPasses",
              selectedSeason,
            ),
            FootballAPI.getTopPlayers(selectedLeague, "saves", selectedSeason),
            FootballAPI.getTopPlayers(
              selectedLeague,
              "interceptions",
              selectedSeason,
            ),
            FootballAPI.getTopPlayers(
              selectedLeague,
              "distanceCovered",
              selectedSeason,
            ),
          ]);
          setTopScorers(scorers);
          setTopAssisters(assisters);
          setTopYellowCards(yellow);
          setTopRedCards(red);
          setTopCleanSheets(cleanSheets);
          setTopTackles(tackles);
          setTopKeyPasses(keyPasses);
          setTopSaves(saves);
          setTopInterceptions(interceptions);
          setTopDistance(distance);
        } catch (err) {
          console.error("Failed to fetch top players", err);
        }
      }
    };
    fetchTopPlayers();
  }, [selectedLeague, selectedSeason, allTeams, allMatches, leagues, loading]);

  const selectedLeagueObj = Array.isArray(leagues)
    ? leagues.find((l) => l._id === selectedLeague)
    : null;
  const currentLeagueName =
    selectedLeagueObj?.name || selectedLeagueObj?.country || "";

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>FootbalLab 🧪</h1>
          <p className={styles.subtitle}>Season 2025/26 Simulation</p>
          <Link to="/compare" className={styles.compareLink}>
            ⚖️ Compare Head-to-Head
          </Link>
        </div>
        <div className={styles.controls}>
          <div className={styles.seasonSelector}>
            <label className={styles.seasonLabel}>View Season</label>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
              className={styles.seasonSelect}
            >
              {availableSeasons.map((s) => (
                <option key={s} value={s}>
                  Season {s}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.leagueSelector}>
            {Array.isArray(leagues) &&
              leagues.map((league) => (
                <button
                  key={league._id}
                  onClick={() => setSelectedLeague(league._id)}
                  className={`${styles.leagueButton} ${
                    selectedLeague === league._id
                      ? styles.leagueButtonActive
                      : styles.leagueButtonInactive
                  }`}
                >
                  {league.country}
                </button>
              ))}
          </div>
        </div>
      </header>

      <div className={styles.tabsContainer}>
        <button
          onClick={() => setActiveTab("standings")}
          className={`${styles.tabButton} ${
            activeTab === "standings"
              ? styles.tabButtonActive
              : styles.tabButtonInactive
          }`}
        >
          League Table
          {activeTab === "standings" && (
            <span className={styles.activeIndicator} />
          )}
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`${styles.tabButton} ${
            activeTab === "stats"
              ? styles.tabButtonActive
              : styles.tabButtonInactive
          }`}
        >
          Player Stats
          {activeTab === "stats" && <span className={styles.activeIndicator} />}
        </button>
      </div>

      <main>
        {activeTab === "standings" ? (
          <LeagueTable
            matches={matches}
            teams={teams}
            loading={loading}
            leagueName={currentLeagueName}
            selectedSeason={selectedSeason}
          />
        ) : (
          <div className={styles.statsGrid}>
            <TopPlayers players={topScorers} title="Top Scorers" icon="⚽" />
            <TopPlayers
              players={topAssisters}
              title="Top Assisters"
              icon="👟"
            />
            <TopPlayers
              players={topCleanSheets}
              title="Clean Sheets"
              icon="🧤"
            />
            <TopPlayers
              players={topYellowCards}
              title="Yellow Cards"
              icon="🟨"
            />
            <TopPlayers players={topRedCards} title="Red Cards" icon="🟥" />
            <TopPlayers players={topTackles} title="Top Tacklers" icon="⚔️" />
            <TopPlayers players={topKeyPasses} title="Key Passers" icon="🎯" />
            <TopPlayers
              players={topInterceptions}
              title="Top Interceptors"
              icon="🛡️"
            />
            <TopPlayers players={topSaves} title="Top Saves" icon="👐" />
            <TopPlayers
              players={topDistance}
              title="Distance Runners"
              icon="🏃"
            />
          </div>
        )}
      </main>
    </div>
  );
}
