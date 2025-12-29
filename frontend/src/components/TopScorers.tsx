import type { Player, Team } from "../services/api";
import styles from "./TopScorers.module.css";

interface Props {
  players: Player[];
  teams: Team[];
  loading: boolean;
}

export const TopScorers = ({ players, teams, loading }: Props) => {
  if (loading)
    return (
      <div className={styles.loading}>
        Loading Scorers...
      </div>
    );
  if (!players || players.length === 0) return null;

  const sortedPlayers = [...players]
    .sort((a, b) => (b.seasonStats?.goals || 0) - (a.seasonStats?.goals || 0))
    .slice(0, 10);

  const getTeamName = (
    teamId: string | { _id: string; name: string } | undefined,
  ) => {
    if (!teamId) return "Unknown";
    if (typeof teamId === "object") return teamId.name;
    return teams.find((t) => t._id === teamId)?.name || "Unknown";
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <span className={styles.icon}>⚽</span> Top Scorers
        </h3>
      </div>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th className={styles.th}>#</th>
            <th className={styles.th}>Player</th>
            <th className={`${styles.th} ${styles.textRight}`}>Goals</th>
          </tr>
        </thead>
        <tbody className={styles.tbody}>
          {sortedPlayers.map((player, index) => {
            const goals = player.seasonStats?.goals || 0;
            if (goals === 0 && index > 4) return null;
            return (
              <tr
                key={player._id}
                className={styles.tr}
              >
                <td className={`${styles.td} ${styles.tdRank}`}>
                  {index + 1}
                </td>
                <td className={styles.td}>
                  <div className={styles.playerInfo}>
                    <span className={styles.playerName}>{player.name}</span>
                    <span className={styles.teamName}>
                      {getTeamName(player.teamId)}
                    </span>
                  </div>
                </td>
                <td className={`${styles.td} ${styles.goals}`}>
                  {goals}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sortedPlayers.length === 0 && (
        <div className={styles.noData}>
          No goals scored yet
        </div>
      )}
    </div>
  );
};
