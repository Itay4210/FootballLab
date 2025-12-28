import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FootballAPI,
  type League,
  type Team,
  type Player,
  type PlayerStats,
  type TeamStats,
} from "../services/api";
import { useData } from "../context/DataContext";
import styles from "./ComparisonPage.module.css";

type CompareType = "players" | "teams";

export const ComparisonPage = () => {
  const [compareType, setCompareType] = useState<CompareType>("players");
  const { leagues } = useData();

  const [entityA, setEntityA] = useState<Player | Team | null>(null);
  const [entityB, setEntityB] = useState<Player | Team | null>(null);

  const [statsA, setStatsA] = useState<PlayerStats | TeamStats | null>(null);
  const [statsB, setStatsB] = useState<PlayerStats | TeamStats | null>(null);

  const [isSearchOpen, setIsSearchOpen] = useState<"A" | "B" | null>(null);
  const [maxSeason, setMaxSeason] = useState(1);

  useEffect(() => {
    if (leagues.length > 0) {
      const maxS = Math.max(
        ...leagues.map((l) => l.seasonNumber || 1),
        1
      );
      setMaxSeason(maxS);
    }
  }, [leagues]);

  useEffect(() => {
    setEntityA(null);
    setEntityB(null);
    setStatsA(null);
    setStatsB(null);
  }, [compareType]);

  const handleSelect = (entity: Player | Team) => {
    if (isSearchOpen === "A") {
      setEntityA(entity);
    } else if (isSearchOpen === "B") {
      setEntityB(entity);
    }
    setIsSearchOpen(null);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className="flex items-center gap-4">
            <Link to="/" className={styles.backLink}>
              ← Back
            </Link>
            <h1 className={styles.title}>
              Compare {compareType === "players" ? "Players" : "Teams"}
            </h1>
          </div>

          <div className={styles.toggleContainer}>
            <button
              onClick={() => setCompareType("players")}
              className={`${styles.toggleButton} ${
                compareType === "players" ? styles.toggleButtonActive : ""
              }`}
            >
              Players
            </button>
            <button
              onClick={() => setCompareType("teams")}
              className={`${styles.toggleButton} ${
                compareType === "teams" ? styles.toggleButtonActive : ""
              }`}
            >
              Teams
            </button>
          </div>
        </div>
      </header>

      <div className={styles.mainContent}>
        {/* Top Section: Two Entities */}
        <div className={styles.comparisonArea}>
          {/* VS Badge */}
          <div className={styles.vsBadge}>VS</div>

          {/* Left Side (A) */}
          <EntityCard
            side="A"
            type={compareType}
            entity={entityA}
            onRemove={() => setEntityA(null)}
            onAdd={() => setIsSearchOpen("A")}
            leagues={leagues}
            maxSeason={maxSeason}
            onStatsUpdate={setStatsA}
            stats={statsA}
            isCompact={true}
          />

          {/* Right Side (B) */}
          <EntityCard
            side="B"
            type={compareType}
            entity={entityB}
            onRemove={() => setEntityB(null)}
            onAdd={() => setIsSearchOpen("B")}
            leagues={leagues}
            maxSeason={maxSeason}
            onStatsUpdate={setStatsB}
            stats={statsB}
            isCompact={true}
          />
        </div>

        {/* Detailed Stats Comparison */}
        {entityA && entityB && statsA && statsB && (
          <div className={styles.comparisonStatsContainer}>
            <ComparisonStats
              statsA={statsA}
              statsB={statsB}
              type={compareType}
            />
          </div>
        )}
      </div>

      {/* Search Modal */}
      {isSearchOpen && (
        <SearchModal
          isOpen={!!isSearchOpen}
          onClose={() => setIsSearchOpen(null)}
          type={compareType}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
};

interface EntityCardProps {
  side: "A" | "B";
  type: CompareType;
  entity: Player | Team | null;
  onRemove: () => void;
  onAdd: () => void;
  leagues: League[];
  maxSeason: number;
  onStatsUpdate: (stats: PlayerStats | TeamStats | null) => void;
  stats: PlayerStats | TeamStats | null;
  isCompact?: boolean;
}

const EntityCard = ({
  side,
  type,
  entity,
  onRemove,
  onAdd,
  leagues,
  maxSeason,
  onStatsUpdate,
  stats,
  isCompact = false,
}: EntityCardProps) => {
  const [historyOptions, setHistoryOptions] = useState<
    { label: string; season?: number; leagueId?: string }[]
  >([]);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(0);

  useEffect(() => {
    if (!entity) {
      setHistoryOptions([]);
      onStatsUpdate(null);
      return;
    }

    const loadOptions = async () => {
      let team: Team | undefined;
      if (type === "teams") {
        team = entity as Team;
      } else {
        const player = entity as Player;
        if (typeof player.teamId === "object" && player.teamId !== null) {
          try {
            team = await FootballAPI.getTeam(player.teamId._id);
          } catch (e) {
            console.error(e);
          }
        } else {
          try {
            team = await FootballAPI.getTeam(player.teamId as string);
          } catch (e) {
            console.error(e);
          }
        }
      }

      if (team) {
        const options: {
          label: string;
          season?: number;
          leagueId?: string;
        }[] = [];

        options.push({
          label: "All Time",
          season: undefined,
          leagueId: undefined,
        });

        let domesticLeague = leagues.find(
          (l) =>
            l.country === team?.country &&
            !["Champions League", "Europe"].includes(l.name),
        );

        if (!domesticLeague) {
          const leagueId =
            typeof team.leagueId === "string"
              ? team.leagueId
              : team.leagueId?._id;
          domesticLeague = leagues.find((l) => l._id === leagueId);
        }

        const domesticName = domesticLeague
          ? domesticLeague.name
          : team.country + " League";
        const clLeague = leagues.find((l) =>
          ["Champions League", "Europe"].includes(l.name),
        );

        for (let s = maxSeason; s >= 1; s--) {
          if (domesticLeague) {
            options.push({
              season: s,
              leagueId: domesticLeague._id,
              label: `${domesticName} ${s}`,
            });
          }
          if (clLeague && (team.clGroup || (team.clStats?.matches || 0) > 0)) {
            options.push({
              season: s,
              leagueId: clLeague._id,
              label: `UCL ${s}`,
            });
          }
        }
        setHistoryOptions(options);
        setSelectedHistoryIndex(0);
      }
    };
    loadOptions();
  }, [entity, type, leagues, maxSeason, onStatsUpdate]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!entity || !historyOptions[selectedHistoryIndex]) return;

      const { season, leagueId } = historyOptions[selectedHistoryIndex];
      try {
        let statsData: PlayerStats | TeamStats;
        if (type === "players") {
          statsData = await FootballAPI.getPlayerStats(
            entity._id,
            season,
            leagueId,
          );
        } else {
          statsData = await FootballAPI.getTeamStats(
            entity._id,
            season,
            leagueId,
          );
        }
        onStatsUpdate(statsData);
      } catch (err) {
        onStatsUpdate(null);
      }
    };
    fetchStats();
  }, [entity, selectedHistoryIndex, historyOptions, onStatsUpdate, type]);

  if (!entity) {
    return (
      <div
        onClick={onAdd}
        className={`${styles.cardEmpty} ${
          isCompact ? styles.cardEmptyCompact : styles.cardEmptyNormal
        }`}
      >
        <div
          className={`${styles.plusIcon} ${
            isCompact ? styles.plusIconCompact : styles.plusIconNormal
          }`}
        >
          +
        </div>
        <p className={styles.emptyText}>
          Select {type === "players" ? "Player" : "Team"} {side}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`${styles.cardFilled} ${
        isCompact ? styles.cardFilledCompact : ""
      }`}
    >
      <button onClick={onRemove} className={styles.removeButton}>
        ✕
      </button>

      {/* Header Info */}
      <div
        className={`${styles.cardHeader} ${
          isCompact ? styles.paddingCompact : styles.paddingNormal
        }`}
      >
        <div
          className={`${styles.avatar} ${
            isCompact ? styles.avatarCompact : styles.avatarNormal
          }`}
        >
          {type === "players" ? "👤" : "🛡️"}
        </div>
        <h2
          className={`${styles.entityName} ${
            isCompact ? styles.textLg : styles.textXl
          }`}
        >
          {entity.name}
        </h2>
        <p className={styles.entityMeta}>
          {type === "players"
            ? (entity as Player).position
            : (entity as Team).country}
          {type === "players" && (entity as Player).teamId && (
            <span className="opacity-75">
              {" "}
              •{" "}
              {typeof (entity as Player).teamId === "object"
                ? ((entity as Player).teamId as { name: string }).name
                : "Team"}
            </span>
          )}
        </p>

        {/* Context Select (League/Season) */}
        <div className="w-full max-w-[200px]">
          <select
            value={selectedHistoryIndex}
            onChange={(e) => setSelectedHistoryIndex(Number(e.target.value))}
            className={styles.contextSelect}
          >
            {historyOptions.map((opt, idx) => (
              <option key={idx} value={idx}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Big Stats */}
      <div
        className={`${styles.statsArea} ${
          isCompact ? styles.paddingCompact : styles.paddingNormal
        }`}
      >
        {!stats ? (
          <div className="animate-pulse text-slate-600 text-sm">
            Loading stats...
          </div>
        ) : (
          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <div
                className={`${styles.statValue} ${
                  isCompact ? styles.textXl : styles.text2Xl
                } ${styles.textEmerald}`}
              >
                {stats.matches || 0}
              </div>
              <div className={styles.statLabel}>Matches</div>
            </div>
            <div className={styles.statBox}>
              <div
                className={`${styles.statValue} ${
                  isCompact ? styles.textXl : styles.text2Xl
                } ${styles.textBlue}`}
              >
                {type === "players"
                  ? (stats as PlayerStats).goals || 0
                  : (stats as TeamStats).points || 0}
              </div>
              <div className={styles.statLabel}>
                {type === "players" ? "Goals" : "Points"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface ComparisonStatsProps {
  statsA: PlayerStats | TeamStats | null;
  statsB: PlayerStats | TeamStats | null;
  type: CompareType;
}

const ComparisonStats = ({ statsA, statsB, type }: ComparisonStatsProps) => {
  if (!statsA || !statsB) return null;

  if (type === "players") {
    const sA = statsA as PlayerStats;
    const sB = statsB as PlayerStats;
    const config: {
      key: keyof PlayerStats;
      label: string;
      invert?: boolean;
    }[] = [
      { key: "goals", label: "Goals" },
      { key: "assists", label: "Assists" },
      { key: "keyPasses", label: "Key Passes" },
      { key: "tackles", label: "Tackles" },
      { key: "interceptions", label: "Interceptions" },
      { key: "cleanSheets", label: "Clean Sheets" },
      { key: "yellowCards", label: "Yellow Cards", invert: true },
      { key: "distanceCovered", label: "Distance (km)" },
    ];
    return <StatsDisplay config={config} statsA={sA} statsB={sB} />;
  } else {
    const sA = statsA as TeamStats;
    const sB = statsB as TeamStats;
    const config: { key: keyof TeamStats; label: string; invert?: boolean }[] = [
      { key: "points", label: "Points" },
      { key: "wins", label: "Wins" },
      { key: "draws", label: "Draws" },
      { key: "losses", label: "Losses", invert: true },
      { key: "goalsFor", label: "Goals For" },
      { key: "goalsAgainst", label: "Goals Against", invert: true },
    ];
    return <StatsDisplay config={config} statsA={sA} statsB={sB} />;
  }
};

interface StatsDisplayProps<T> {
  config: { key: keyof T; label: string; invert?: boolean }[];
  statsA: T;
  statsB: T;
}

function StatsDisplay<T>({ config, statsA, statsB }: StatsDisplayProps<T>) {
  return (
    <div className={styles.detailedStatsBox}>
      <h3 className={styles.breakdownTitle}>Detailed Breakdown</h3>
      <div className="space-y-8">
        {config.map((stat) => {
          const valA = (statsA[stat.key] as number) || 0;
          const valB = (statsB[stat.key] as number) || 0;
          const max = Math.max(valA, valB, 1);

          const widthA = (valA / max) * 100;
          const widthB = (valB / max) * 100;

          return (
            <div key={String(stat.key)} className="group">
              <div className={styles.statRowLabel}>
                <span
                  className={`text-lg font-bold ${
                    valA > valB ? styles.textEmerald : styles.textSlate400
                  }`}
                >
                  {valA}
                </span>
                <span
                  className={`text-sm font-medium uppercase pb-1 ${styles.textSlate500}`}
                >
                  {stat.label}
                </span>
                <span
                  className={`text-lg font-bold ${
                    valB > valA ? styles.textBlue : styles.textSlate400
                  }`}
                >
                  {valB}
                </span>
              </div>

              <div className={styles.statRowBar}>
                <div
                  className={styles.barContainer}
                  style={{ justifyContent: "flex-end" }}
                >
                  <div
                    className={`${styles.barFill} ${
                      valA > valB ? styles.bgEmerald : styles.bgSlate
                    }`}
                    style={{ width: `${widthA}%` }}
                  />
                </div>

                <div className="w-1 h-full bg-slate-800 rounded-full shrink-0" />

                <div
                  className={styles.barContainer}
                  style={{ justifyContent: "flex-start" }}
                >
                  <div
                    className={`${styles.barFill} ${
                      valB > valA ? styles.bgBlue : styles.bgSlate
                    }`}
                    style={{ width: `${widthB}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: CompareType;
  onSelect: (entity: Player | Team) => void;
}

const SearchModal = ({ onClose, type, onSelect }: SearchModalProps) => {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<(Player | Team)[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!term) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        let data: (Player | Team)[] = [];
        if (type === "players") {
          data = await FootballAPI.searchPlayers(term);
        } else {
          data = await FootballAPI.searchTeams(term);
        }
        setResults(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [term, type]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div className={styles.modalOverlay}>
      {/* Backdrop */}
      <div className={styles.modalBackdrop} onClick={onClose} />

      {/* Modal Window */}
      <div className={styles.modalContent}>
        <div className="p-4 border-b border-slate-800">
          <input
            autoFocus
            type="text"
            placeholder={`Search ${type}...`}
            className={styles.searchInput}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>

        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {loading && (
            <div className="text-center py-4 text-slate-400">Searching...</div>
          )}
          {!loading && results.length === 0 && term && (
            <div className="text-center py-8 text-slate-500">
              No results found
            </div>
          )}
          {!loading &&
            results.map((item) => {
              let subtitle = "";
              if (type === "players") {
                const p = item as Player;
                const teamName =
                  typeof p.teamId === "object"
                    ? (p.teamId as any).name
                    : "Team";
                subtitle = `${p.position} • ${teamName}`;
              } else {
                subtitle = (item as Team).country;
              }

              return (
                <button
                  key={item._id}
                  onClick={() => onSelect(item)}
                  className={styles.resultItem}
                >
                  <div className={styles.resultAvatar}>
                    {type === "players" ? "👤" : "🛡️"}
                  </div>
                  <div>
                    <div className="font-bold text-slate-200 group-hover:text-white">
                      {item.name}
                    </div>
                    <div className="text-xs text-slate-500">{subtitle}</div>
                  </div>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
};
