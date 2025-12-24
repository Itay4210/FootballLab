import React from "react";
import { Link } from "react-router-dom";
import type { Player } from "../services/api";
import styles from "./TopPlayers.module.css";

export const TopPlayers = ({
  players,
  title,
  icon,
}: {
  players: Player[];
  title: string;
  icon: React.ReactNode;
}) => {
  return (
    <div className={styles.card}>
      <h3 className={styles.header}>
        <span>{icon}</span> {title}
      </h3>
      <div className={styles.list}>
        {players.map((player, idx) => {
          const teamName =
            typeof player.teamId === "object" && player.teamId
              ? player.teamId.name
              : "Unknown";
          return (
            <div key={player._id} className={styles.item}>
              <div className={styles.rankSection}>
                <span className={styles.rank}>#{idx + 1}</span>
                <div className={styles.info}>
                  <Link
                    to={`/player/${player._id}`}
                    className={styles.nameLink}
                  >
                    {player.name}
                  </Link>
                  <span className={styles.teamName}>{teamName}</span>
                </div>
              </div>
              <span className={styles.statValue}>
                {title.includes("Scorers")
                  ? player.seasonStats.goals
                  : title.includes("Assisters")
                    ? player.seasonStats.assists
                    : title.includes("Yellow")
                      ? player.seasonStats.yellowCards
                      : title.includes("Red")
                        ? player.seasonStats.redCards
                        : title.includes("Clean")
                          ? player.seasonStats.cleanSheets || 0
                          : title.includes("Tacklers")
                            ? player.seasonStats.tackles || 0
                            : title.includes("Passers")
                              ? player.seasonStats.keyPasses || 0
                              : title.includes("Saves")
                                ? player.seasonStats.saves || 0
                                : title.includes("Interceptors")
                                  ? player.seasonStats.interceptions || 0
                                  : title.includes("Runners")
                                    ? (
                                        player.seasonStats.distanceCovered || 0
                                      ).toFixed(1)
                                    : 0}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
