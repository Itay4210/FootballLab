import { Link } from "react-router-dom";
import type { Team, Match } from "../services/api";
import styles from "./LeagueTable.module.css";

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

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (teams.length === 0)
    return <div className={styles.noData}>No data available.</div>;

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
      <div className={styles.container}>
        {hasKnockoutStarted && (
          <div className={styles.knockoutContainer}>
            <h2 className={styles.knockoutTitle}>Champions League Knockout</h2>
            <div className={styles.knockoutGrid}>
              <div className={styles.knockoutColumn}>
                <p className={styles.knockoutStageLabel}>Quarter-Finals</p>
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
              <div
                className={`${styles.knockoutColumn} ${styles.knockoutColumnSemi}`}
              >
                <p className={styles.knockoutStageLabel}>Semi-Finals</p>
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
                  <div className={styles.tbdBox}>TBD</div>
                )}
              </div>
              <div
                className={`${styles.knockoutColumn} ${styles.knockoutColumnFinal}`}
              >
                <p
                  className={`${styles.knockoutStageLabel} ${styles.knockoutStageLabelFinal}`}
                >
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
                  <div className={styles.tbdBox}>TBD</div>
                )}
              </div>
            </div>
          </div>
        )}
        <div className={styles.groupsGrid}>
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
              <div key={groupName} className={styles.groupCard}>
                <div className={styles.groupHeader}>
                  <h3 className={styles.groupTitle}>Group {groupName}</h3>
                  {!isGroupStageFinished && (
                    <span className={styles.groupStatus}>In Progress</span>
                  )}
                </div>
                <table className={styles.groupTable}>
                  <thead className={styles.groupThead}>
                    <tr>
                      <th className={styles.th}>Pos</th>
                      <th className={styles.th}>Club</th>
                      <th className={styles.thCenter}>W</th>
                      <th className={styles.thCenter}>D</th>
                      <th className={styles.thCenter}>L</th>
                      <th className={styles.thPoints}>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedGroup.map((team, idx) => {
                      const stats = team.clStats || team.seasonStats;
                      const isQualified = qualifiedIds.includes(team._id);
                      return (
                        <tr
                          key={team._id}
                          className={`${styles.tr} ${isQualified ? styles.trQualified : ""}`}
                        >
                          <td className={styles.tdPos}>{idx + 1}</td>
                          <td className={styles.tdClub}>
                            <div className={styles.clubNameContainer}>
                              <span
                                className={`${styles.clubName} ${isQualified ? styles.clubNameQualified : ""}`}
                              >
                                <Link
                                  to={`/team/${team._id}?season=${selectedSeason}`}
                                  className={styles.clubLink}
                                >
                                  {team.name}
                                </Link>
                              </span>
                              {isQualified && (
                                <span className={styles.qualifiedLabel}>
                                  QUALIFIED
                                </span>
                              )}
                            </div>
                          </td>
                          <td className={`${styles.tdStat} ${styles.statWin}`}>
                            {stats.wins}
                          </td>
                          <td className={`${styles.tdStat} ${styles.statDraw}`}>
                            {stats.draws}
                          </td>
                          <td className={`${styles.tdStat} ${styles.statLoss}`}>
                            {stats.losses}
                          </td>
                          <td className={styles.tdPoints}>{stats.points}</td>
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
    <div className={styles.mainTableContainer}>
      <table className={styles.mainTable}>
        <thead className={styles.mainThead}>
          <tr>
            <th className={styles.thMain}>Pos</th>
            <th className={styles.thMain}>Club</th>
            <th className={styles.thMainCenter}>MP</th>
            <th className={styles.thMainCenter}>W</th>
            <th className={styles.thMainCenter}>D</th>
            <th className={styles.thMainCenter}>L</th>
            <th className={styles.thMainCenter}>GD</th>
            <th className={styles.thMainPoints}>Pts</th>
          </tr>
        </thead>
        <tbody className={styles.tbody}>
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
                className={`${styles.trMain} ${isTop4 ? styles.trTop4 : ""}`}
              >
                <td className={styles.tdMainPos}>{index + 1}</td>
                <td className={styles.tdMainClub}>
                  <div className={styles.clubNameContainer}>
                    <span className={styles.clubName}>
                      <Link
                        to={`/team/${team._id}?season=${selectedSeason}`}
                        className={styles.clubLink}
                      >
                        {team.name}
                      </Link>
                    </span>
                    {isSeasonFinished && isTop4 && (
                      <span className={styles.qualifiedText}>
                        Qualified for Champions League
                      </span>
                    )}
                  </div>
                </td>
                <td className={styles.tdMainStat}>
                  {team.seasonStats.matches}
                </td>
                <td className={`${styles.tdMainStat} ${styles.statWin}`}>
                  {team.seasonStats.wins}
                </td>
                <td className={`${styles.tdMainStat} ${styles.statDraw}`}>
                  {team.seasonStats.draws}
                </td>
                <td className={`${styles.tdMainStat} ${styles.statLoss}`}>
                  {team.seasonStats.losses}
                </td>
                <td className={styles.tdMainGD}>
                  {team.seasonStats.goalsFor - team.seasonStats.goalsAgainst}
                </td>
                <td className={styles.tdMainPoints}>
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

  const colorClass =
    color === "blue"
      ? styles.cardBlue
      : color === "purple"
        ? styles.cardPurple
        : styles.cardYellow;

  return (
    <div className={`${styles.card} ${colorClass}`}>
      <div className={styles.cardContent}>
        <div className={styles.cardWrapper}>
          <div className={styles.cardTeamRow}>
            <span
              className={`${styles.cardTeamName} ${isFinished && match.score.home > match.score.away ? styles.cardTeamNameWinner : styles.cardTeamNameLoser}`}
            >
              {home?.name || "Unknown"}
            </span>
            <span className={styles.cardScore}>
              {isFinished ? match.score.home : "-"}
            </span>
          </div>
          <div className={styles.cardTeamRow}>
            <span
              className={`${styles.cardTeamName} ${isFinished && match.score.away > match.score.home ? styles.cardTeamNameWinner : styles.cardTeamNameLoser}`}
            >
              {away?.name || "Unknown"}
            </span>
            <span className={styles.cardScore}>
              {isFinished ? match.score.away : "-"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
