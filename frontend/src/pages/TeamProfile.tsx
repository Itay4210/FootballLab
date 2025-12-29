import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import {
  FootballAPI,
  type Team,
  type Match,
  type Player,
} from "../services/api";
import styles from "./TeamProfile.module.css";

export const TeamProfile = () => {
  const { teamId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [team, setTeam] = useState<Team | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([1]);
  const [selectedCompetition, setSelectedCompetition] =
    useState<string>("League");
  const initialSeason = searchParams.get("season")
    ? Number(searchParams.get("season"))
    : 1;
  const [selectedSeason, setSelectedSeason] = useState(initialSeason);
  const [activeTab, setActiveTab] = useState<"fixtures" | "squad">("fixtures");

  useEffect(() => {
    if (teamId) {
      FootballAPI.getTeam(teamId).then(setTeam).catch(() => {});
      FootballAPI.getTeamMatches(teamId, selectedSeason).then((matchesData) => {
        setMatches(matchesData);
      });
      FootballAPI.getPlayersByTeam(teamId)
        .then(setPlayers)
        .catch(() => {});
    }
  }, [teamId, selectedSeason]);

  useEffect(() => {
    if (teamId) {
      FootballAPI.getTeamMatches(teamId).then((all) => {
        const seasons = Array.from(
          new Set(all.map((m) => m.seasonNumber || 1)),
        );
        const sorted = seasons.sort((a, b) => b - a);
        setAvailableSeasons(sorted.length > 0 ? sorted : [1]);
      });
    }
  }, [teamId]);

  useEffect(() => {
    setSearchParams({ season: selectedSeason.toString() });
  }, [selectedSeason, setSearchParams]);

  if (!team)
    return (
      <div className={styles.loading}>Loading Team Profile...</div>
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

  const getResultClass = (res: string) => {
    if (res === "WIN") return styles.badgeWin;
    if (res === "LOSS") return styles.badgeLoss;
    return styles.badgeDraw;
  };

  return (
    <div className={styles.pageContainer}>
      <Link
        to="/"
        className={styles.backLink}
      >
        ← Back to Dashboard
      </Link>
      <div className={styles.headerContainer}>
        <div>
          <h1 className={styles.teamName}>
            {team.name}
          </h1>
          <p className={styles.teamSubtitle}>
            Team History & Fixtures
          </p>
        </div>
        <div className={styles.controlsContainer}>
          <div className={styles.tabsContainer}>
            <button
              onClick={() => setActiveTab("fixtures")}
              className={`${styles.tabButton} ${
                activeTab === "fixtures"
                  ? styles.tabButtonActive
                  : styles.tabButtonInactive
              }`}
            >
              Results
            </button>
            <button
              onClick={() => setActiveTab("squad")}
              className={`${styles.tabButton} ${
                activeTab === "squad"
                  ? styles.tabButtonActive
                  : styles.tabButtonInactive
              }`}
            >
              Stats
            </button>
          </div>
          {activeTab === "fixtures" && hasChampionsLeagueMatches && (
            <div className={styles.tabsContainer}>
              <button
                onClick={() => setSelectedCompetition("all")}
                className={`${styles.filterButton} ${
                  selectedCompetition === "all"
                    ? styles.filterButtonActiveAll
                    : styles.tabButtonInactive
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedCompetition("League")}
                className={`${styles.filterButton} ${
                  selectedCompetition === "League"
                    ? styles.filterButtonActiveAll
                    : styles.tabButtonInactive
                }`}
              >
                League
              </button>
              <button
                onClick={() => setSelectedCompetition("Champions League")}
                className={`${styles.filterButton} ${
                  selectedCompetition === "Champions League"
                    ? styles.filterButtonActiveUCL
                    : styles.tabButtonInactive
                }`}
              >
                UCL
              </button>
            </div>
          )}
          <div className={styles.selectContainer}>
            <label className={styles.selectLabel}>
              Select Season
            </label>
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
        </div>
      </div>
      <div className={styles.contentContainer}>
        {activeTab === "fixtures" ? (
          <div>
            <h2 className={styles.sectionTitle}>
              <span>📅</span> Fixtures & Results
            </h2>
            <div className={styles.matchesGrid}>
              {filteredMatches.length === 0 && (
                <div className={styles.noMatches}>
                  No matches found for this competition.
                </div>
              )}
              {filteredMatches.map((match) => {
                const isUCL = match.leagueName?.includes("Champions") || match.leagueName === "Europe";
                return (
                  <div
                    key={match._id}
                    className={`${styles.matchCard} ${
                      isUCL ? styles.matchCardUCL : ""
                    }`}
                  >
                    <div className={styles.matchHeader}>
                      <div className={styles.matchInfo}>
                        <span className={styles.matchLeague}>
                          {isUCL ? "UCL" : "League"}
                        </span>
                        <span className={styles.matchDate}>
                          GW {match.matchday}
                        </span>
                      </div>
                      <div className={styles.matchScoreBoard}>
                        <span
                          className={`${styles.teamNameDisplay} ${styles.teamNameDisplayHome} ${
                            match.homeTeam === teamId
                              ? styles.textAccent
                              : styles.textWhite
                          }`}
                        >
                          {match.homeTeamName || "Unknown"}
                        </span>
                        <div className={styles.scoreDisplay}>
                          {match.status === "finished"
                            ? `${match.score.home} - ${match.score.away}`
                            : "vs"}
                        </div>
                        <span
                          className={`${styles.teamNameDisplay} ${styles.teamNameDisplayAway} ${
                            match.awayTeam === teamId
                              ? styles.textAccent
                              : styles.textWhite
                          }`}
                        >
                          {match.awayTeamName || "Unknown"}
                        </span>
                      </div>
                      <div className={styles.matchStatus}>
                        {match.status === "finished" ? (
                          <span
                            className={`${styles.matchResultBadge} ${getResultClass(getMatchResultText(match, teamId!))}`}
                          >
                            {getMatchResultText(match, teamId!)}
                          </span>
                        ) : (
                          <span className={styles.badgeUpcoming}>
                            Upcoming
                          </span>
                        )}
                      </div>
                    </div>
                    {match.status === "finished" &&
                      match.events &&
                      match.events.length > 0 && (
                        <div className={styles.matchEvents}>
                          <div className={styles.matchEventsColumn}>
                            {match.events
                              .filter((e) => e.type === "goal")
                              .map((e, idx) => {
                                const pName =
                                  typeof e.playerId === "object"
                                    ? (e.playerId as any).name
                                    : "Unknown";

                                return (
                                  <span key={idx} className={styles.eventText}>
                                    ⚽ {e.minute}' {pName}
                                  </span>
                                );
                              })}
                          </div>
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
            <h2 className={styles.sectionTitle}>
              <span>👕</span> Squad Statistics
            </h2>
            <div className={styles.tableContainer}>
              <table className={styles.statsTable}>
                <thead className={styles.statsThead}>
                  <tr>
                    <th className={styles.statsThSticky}>
                      Pos
                    </th>
                    <th className={styles.statsThSticky2}>
                      Player
                    </th>
                    <th className={styles.statsTh}>Apps</th>
                    <th className={styles.statsTh} style={{ color: 'white' }}>Goals</th>
                    <th className={`${styles.statsTh} ${styles.statsTdBlue}`}>
                      Assists
                    </th>
                    <th className={`${styles.statsTh} ${styles.statsTdYellow}`}>
                      YC
                    </th>
                    <th className={`${styles.statsTh} ${styles.statsTdRed}`}>RC</th>
                    <th className={styles.statsTh}>CS</th>
                    <th className={styles.statsTh}>Tackles</th>
                    <th className={styles.statsTh}>Key Passes</th>
                    <th className={styles.statsTh}>Dist (km)</th>
                  </tr>
                </thead>
                <tbody>
                  {players
                    .sort(
                      (a, b) =>
                        (b.seasonStats?.goals || 0) -
                        (a.seasonStats?.goals || 0),
                    )
                    .map((player) => (
                      <tr
                        key={player._id}
                        className={styles.statsTr}
                      >
                        <td className={styles.statsTdSticky}>
                          {player.position}
                        </td>
                        <td className={styles.statsTdSticky2}>
                          {player.name}
                        </td>
                        <td className={styles.statsTd}>
                          {player.seasonStats?.matches || 0}
                        </td>
                        <td className={`${styles.statsTd} ${styles.statsTdAccent}`}>
                          {player.seasonStats?.goals || 0}
                        </td>
                        <td className={`${styles.statsTd} ${styles.statsTdBlue}`}>
                          {player.seasonStats?.assists || 0}
                        </td>
                        <td className={`${styles.statsTd} ${styles.statsTdYellow}`}>
                          {player.seasonStats?.yellowCards || 0}
                        </td>
                        <td className={`${styles.statsTd} ${styles.statsTdRed}`}>
                          {player.seasonStats?.redCards || 0}
                        </td>
                        <td className={`${styles.statsTd} ${styles.statsTdGreen}`}>
                          {player.seasonStats?.cleanSheets || 0}
                        </td>
                        <td className={styles.statsTd}>
                          {player.seasonStats?.tackles || 0}
                        </td>
                        <td className={styles.statsTd}>
                          {player.seasonStats?.keyPasses || 0}
                        </td>
                        <td className={`${styles.statsTd} ${styles.statsTdBlueLight}`}>
                          {(player.seasonStats?.distanceCovered || 0).toFixed(
                            1,
                          )}
                        </td>
                      </tr>
                    ))}
                  {players.length === 0 && (
                    <tr>
                      <td
                        colSpan={11}
                        className={styles.statsTd}
                        style={{ textAlign: 'center', padding: '1.5rem', fontStyle: 'italic', color: '#475569' }}
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
