import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  FootballAPI,
  type Team,
  type Player,
  type Match,
  type SeasonSummary,
} from "../services/api";
import { LeagueTable } from "../components/LeagueTable";
import { TopPlayers } from "../components/TopPlayers";
import { SummerSummaryModal } from "../components/SummerSummaryModal";
import { useData } from "../context/DataContext";
import styles from "./Dashboard.module.css";

export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { leagues, loading, refreshData } = useData();

  const [isSimulating, setIsSimulating] = useState(false);
  const selectedLeague = searchParams.get("league");
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([1]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<SeasonSummary | null>(null);

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
    // We assume 1 for now if we can't easily get max season without fetching matches
    // Or we could fetch a lightweight endpoint for available seasons
  }, [leagues, loading, selectedLeague]);

  useEffect(() => {
    if (
      !selectedLeague ||
      loading ||
      !Array.isArray(leagues) ||
      leagues.length === 0
    )
      return;

    const fetchLeagueData = async () => {
        try {
            const [leagueMatches, leagueTable] = await Promise.all([
                FootballAPI.getLeagueMatches(selectedLeague, selectedSeason),
                FootballAPI.getLeagueTable(selectedLeague)
            ]);
            setMatches(leagueMatches);
            setTeams(leagueTable);
            
            // Extract seasons from matches (optional, or better keep logic)
             const seasons = Array.from(
                new Set(
                    (Array.isArray(leagueMatches) ? leagueMatches : []).map(
                    (m) => m.seasonNumber || 1,
                    ),
                ),
                );
             const sortedSeasons = seasons.sort((a, b) => b - a);
             setAvailableSeasons(sortedSeasons.length > 0 ? sortedSeasons : [1]);
        } catch (e) {
            console.error("Failed to fetch league data", e);
        }
    };
    fetchLeagueData();

  }, [selectedLeague, selectedSeason, loading, leagues]);

  useEffect(() => {
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

        }
      }
    };
    fetchTopPlayers();
  }, [selectedLeague, selectedSeason, leagues, loading]);

  const selectedLeagueObj = Array.isArray(leagues)
    ? leagues.find((l) => l._id === selectedLeague)
    : null;
  const currentLeagueName =
    selectedLeagueObj?.name || selectedLeagueObj?.country || "";

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>FootballLab 🧪</h1>
          <p className={styles.subtitle}>Season 2025/26 Simulation</p>
          <Link to="/compare" className={styles.compareLink}>
            ⚖️ Compare Head-to-Head
          </Link>
          <button
            onClick={async () => {
                const data = await FootballAPI.getSeasonSummary();
                setSummaryData(data);
                setShowSummary(true);
            }}
            style={{
                marginLeft: '10px',
                padding: '8px 16px',
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold'
            }}
          >
            ☀️ Summer Report
          </button>
          <button
            onClick={async () => {
                if (isSimulating) return;
                setIsSimulating(true);
                try {

                    await FootballAPI.runSimulation();
                    await refreshData();
                } catch(e) {

                    alert("Failed to run simulation");
                } finally {
                    setIsSimulating(false);
                }
            }}
            className={`${styles.runSimButton} ${isSimulating ? styles.disabled : ''}`}
            title="Run Simulation Manually"
            disabled={isSimulating}
          >
            {isSimulating ? "⏳" : "▶"}
          </button>
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
      <SummerSummaryModal
        isOpen={showSummary}
        summary={summaryData}
        onClose={() => setShowSummary(false)}
      />
    </div>
  );
}
