import React, { useState } from "react";
import type { SeasonSummary } from "../services/api";
import styles from "./SummerSummaryModal.module.css";

interface Props {
  summary: SeasonSummary | null;
  onClose: () => void;
  isOpen: boolean;
}

type Tab = "overview" | "transfers" | "retirements";

export const SummerSummaryModal: React.FC<Props> = ({
  summary,
  onClose,
  isOpen,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  if (!isOpen || !summary) return null;

  const formatMoney = (val: number) => {
    if (val >= 1000000) return `€${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `€${(val / 1000).toFixed(0)}K`;
    return `€${val}`;
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {}
        <header className={styles.header}>
          <h2 className={styles.title}>
            ☀️ Summer Report
            <span
              style={{ fontSize: "0.8em", color: "#888", fontWeight: "normal" }}
            >
              Season {summary.season}
            </span>
          </h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            title="Close"
          >
            ×
          </button>
        </header>

        {}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "overview" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={`${styles.tab} ${activeTab === "transfers" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("transfers")}
          >
            Transfers ({summary.transfers?.length || 0})
          </button>
          <button
            className={`${styles.tab} ${activeTab === "retirements" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("retirements")}
          >
            Retirements ({summary.retiredPlayers?.length || 0})
          </button>
        </div>

        {}
        <div className={styles.content}>
          {activeTab === "overview" && (
            <div className={styles.heroSection}>
              <h3 className={styles.sectionTitle}>🚀 Most Improved Player</h3>
              {summary.mostImprovedPlayer && summary.mostImprovedPlayer.name ? (
                <div className={styles.highlightCard}>
                  <div className={styles.highlightAvatar}>💪</div>
                  <div className={styles.highlightInfo}>
                    <h4>{summary.mostImprovedPlayer.name}</h4>
                    <span className={styles.highlightTeam}>
                      {summary.mostImprovedPlayer.teamName}
                    </span>
                    <div className={styles.statChangeBig}>
                      <span className={styles.statValueBig}>
                        {summary.mostImprovedPlayer.oldStrength}
                      </span>
                      <span className={styles.statArrowBig}>➜</span>
                      <span className={styles.statNewBig}>
                        {summary.mostImprovedPlayer.newStrength}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p
                  style={{
                    color: "#888",
                    fontStyle: "italic",
                    textAlign: "center",
                  }}
                >
                  No significant improvements this season.
                </p>
              )}
            </div>
          )}

          {activeTab === "transfers" && (
            <div>
              <h3 className={styles.sectionTitle}>✈️ Major Transfers</h3>
              {summary.transfers && summary.transfers.length > 0 ? (
                <div className={styles.transfersList}>
                  {summary.transfers.map((t, idx) => (
                    <div key={idx} className={styles.transferItem}>
                      <span className={styles.playerName}>{t.playerName}</span>
                      <span className={styles.teamName}>{t.fromTeam}</span>
                      <span className={styles.transferArrow}>➜</span>
                      <span
                        className={styles.teamName}
                        style={{ color: "#fff" }}
                      >
                        {t.toTeam}
                      </span>
                      <span className={styles.transferFee}>
                        {formatMoney(t.fee)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "#888", fontStyle: "italic" }}>
                  No major transfers recorded.
                </p>
              )}
            </div>
          )}

          {activeTab === "retirements" && (
            <div>
              <h3 className={styles.sectionTitle}>👋 Retirements</h3>
              {summary.retiredPlayers && summary.retiredPlayers.length > 0 ? (
                <div className={styles.retirementsGrid}>
                  {summary.retiredPlayers.map((p, idx) => (
                    <div key={idx} className={styles.retirementCard}>
                      <div className={styles.retireeHeader}>
                        <span className={styles.retireeName}>{p.name}</span>
                        <span className={styles.retireeAge}>{p.age}y</span>
                      </div>
                      <span className={styles.retireeTeam}>{p.teamName}</span>
                      <div className={styles.retireeStrength}>
                        <span>Final Strength:</span>
                        <span style={{ color: "#aaa" }}>{p.strength}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "#888", fontStyle: "italic" }}>
                  No players retired this season.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
