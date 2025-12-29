import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FootballAPI,
  type Player,
  type Team,
} from "../services/api";
import styles from "./PlayerProfile.module.css";

export const PlayerProfile = () => {
  const { playerId } = useParams();
  const [player, setPlayer] = useState<Player | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [statsHistory, setStatsHistory] = useState<
    {
      season: number;
      goals: number;
      assists: number;
      yellowCards: number;
      redCards: number;
      matches: number;
    }[]
  >([]);

  useEffect(() => {
    if (!playerId) return;

    const fetchData = async () => {
      try {
        const p = await FootballAPI.getPlayer(playerId);
        setPlayer(p);

        if (p && p.teamId) {
            const tId = typeof p.teamId === "string" ? p.teamId : p.teamId._id;
            try {
                const t = await FootballAPI.getTeam(tId);
                setTeam(t);
            } catch {
            }
        }

        const history = await FootballAPI.getPlayerHistory(playerId);
        setStatsHistory(history);

      } catch (err) {
      }
    };
    fetchData();
  }, [playerId]);

  if (!player) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.pageContainer}>
      <Link
        to="/"
        className={styles.backLink}
      >
        ← Back to Dashboard
      </Link>
      <div className={styles.profileCard}>
        <div className={styles.headerSection}>
          <div>
            <h1 className={styles.playerName}>
              {player.name}
            </h1>
            <div className={styles.playerMeta}>
              <span className={styles.positionBadge}>
                {player.position}
              </span>
              <span className={styles.teamName}>{team?.name}</span>
            </div>
          </div>
          <div className={styles.marketValueContainer}>
            <div className={styles.marketValueLabel}>
              Current Market Value
            </div>
            <div className={styles.marketValue}>
              €{(Math.random() * 100).toFixed(1)}M
            </div>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>
              Goals
            </div>
            <div className={styles.statValue}>
              {player.seasonStats?.goals || 0}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>
              Assists
            </div>
            <div className={styles.statValue}>
              {player.seasonStats?.assists || 0}
            </div>
          </div>
          {player.position === "GK" ? (
            <>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>
                  Clean Sheets
                </div>
                <div className={`${styles.statValue} ${styles.statValueGreen}`}>
                  {player.seasonStats?.cleanSheets || 0}
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>
                  Saves
                </div>
                <div className={styles.statValue}>
                  {player.seasonStats?.saves || 0}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>
                  Key Passes
                </div>
                <div className={styles.statValue}>
                  {player.seasonStats?.keyPasses || 0}
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>
                  Tackles
                </div>
                <div className={styles.statValue}>
                  {player.seasonStats?.tackles || 0}
                </div>
              </div>
            </>
          )}
          <div className={styles.statCard}>
            <div className={styles.statLabel}>
              Distance (km)
            </div>
            <div className={`${styles.statValue} ${styles.statValueBlue}`}>
              {(player.seasonStats?.distanceCovered || 0).toFixed(1)}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>
              Cards
            </div>
            <div className={`${styles.statValue} ${styles.statValueFlex}`}>
              <span className={styles.textYellow}>
                {player.seasonStats?.yellowCards || 0}
              </span>
              <span className={styles.textSlate}>/</span>
              <span className={styles.textRed}>
                {player.seasonStats?.redCards || 0}
              </span>
            </div>
          </div>
        </div>

        <h2 className={styles.sectionTitle}>
          <span>📈</span> Career History
        </h2>
        <div className={styles.historyContainer}>
          <table className={styles.historyTable}>
            <thead className={styles.historyThead}>
              <tr>
                <th className={styles.historyTh}>Season</th>
                <th className={`${styles.historyTh} ${styles.textCenter}`}>Matches*</th>
                <th className={`${styles.historyTh} ${styles.textCenter}`}>Goals</th>
                <th className={`${styles.historyTh} ${styles.textCenter}`}>Assists</th>
                <th className={`${styles.historyTh} ${styles.textCenter}`}>Yellow</th>
                <th className={`${styles.historyTh} ${styles.textCenter}`}>Red</th>
              </tr>
            </thead>
            <tbody>
              {statsHistory.map((s) => (
                <tr
                  key={s.season}
                  className={styles.historyTr}
                >
                  <td className={`${styles.historyTd} ${styles.tdSeason}`}>
                    202{4 + s.season}/2{5 + s.season}
                  </td>
                  <td className={`${styles.historyTd} ${styles.textCenter} ${styles.fontBold} ${styles.textWhite}`}>
                    {s.matches}
                  </td>
                  <td className={`${styles.historyTd} ${styles.textCenter} ${styles.fontBold} ${styles.textAccent} ${styles.textLg}`}>
                    {s.goals}
                  </td>
                  <td className={`${styles.historyTd} ${styles.textCenter} ${styles.fontBold} ${styles.textBlue} ${styles.textLg}`}>
                    {s.assists}
                  </td>
                  <td className={`${styles.historyTd} ${styles.textCenter} ${styles.fontBold} ${styles.textYellow}`}>
                    {s.yellowCards}
                  </td>
                  <td className={`${styles.historyTd} ${styles.textCenter} ${styles.fontBold} ${styles.textRed}`}>
                    {s.redCards}
                  </td>
                </tr>
              ))}
              {statsHistory.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className={`${styles.historyTd} ${styles.textCenter} ${styles.textSlate}`}
                    style={{ fontStyle: 'italic' }}
                  >
                    No match history recorded yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className={styles.disclaimer}>
            * Based on recorded match events
          </div>
        </div>
      </div>
    </div>
  );
};
