import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FootballAPI,
  type League,
  type Team,
  type Player,
} from "../services/api";
import styles from "./ComparisonPage.module.css";

export const ComparisonPage = () => {
  const [compareType, setCompareType] = useState<"players" | "teams">("players");
  const [leagues, setLeagues] = useState<League[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);

  const [entityA, setEntityA] = useState<any>(null);
  const [entityB, setEntityB] = useState<any>(null);

  const [statsA, setStatsA] = useState<any>(null);
  const [statsB, setStatsB] = useState<any>(null);

  const [isSearchOpen, setIsSearchOpen] = useState<"A" | "B" | null>(null);
  const [maxSeason, setMaxSeason] = useState(1);

  useEffect(() => {
    const initData = async () => {
      try {
        const [leaguesData, teamsData, playersData] = await Promise.all([
          FootballAPI.getLeagues(),
          FootballAPI.getAllTeams(),
          FootballAPI.getPlayers(),
        ]);
        setLeagues(leaguesData);
        setAllTeams(teamsData);
        setAllPlayers(playersData);

        const maxS = Math.max(
          ...leaguesData.map((l) => l.seasonNumber || 1),
          1
        );
        setMaxSeason(maxS);
      } catch (error) {
        console.error("Failed to load data", error);
      }
    };
    initData();
  }, []);

  useEffect(() => {
    setEntityA(null);
    setEntityB(null);
    setStatsA(null);
    setStatsB(null);
  }, [compareType]);

  const handleSelect = (entity: any) => {
    if (isSearchOpen === "A") {
      setEntityA(entity);
    } else if (isSearchOpen === "B") {
      setEntityB(entity);
    }
    setIsSearchOpen(null);
  };

  return (
    <div className={styles.container}>
      {}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className={styles.backLink}
            >
              ← Back
            </Link>
            <h1 className={styles.title}>
              Compare {compareType === "players" ? "Players" : "Teams"}
            </h1>
          </div>

          <div className={styles.toggleContainer}>
            <button
              onClick={() => setCompareType("players")}
              className={`${styles.toggleButton} ${compareType === "players" ? styles.toggleButtonActive : ""}`}
            >
              Players
            </button>
            <button
              onClick={() => setCompareType("teams")}
              className={`${styles.toggleButton} ${compareType === "teams" ? styles.toggleButtonActive : ""}`}
            >
              Teams
            </button>
          </div>
        </div>
      </header>

      <div className={styles.mainContent}>
        {}
        <div className={styles.comparisonArea}>

          {}
          <div className={styles.vsBadge}>
            VS
          </div>

          {}
          <EntityCard
            side="A"
            type={compareType}
            entity={entityA}
            onRemove={() => setEntityA(null)}
            onAdd={() => setIsSearchOpen("A")}
            leagues={leagues}
            allTeams={allTeams}
            maxSeason={maxSeason}
            onStatsUpdate={setStatsA}
            stats={statsA}
            isCompact={true}
          />

          {}
          <EntityCard
            side="B"
            type={compareType}
            entity={entityB}
            onRemove={() => setEntityB(null)}
            onAdd={() => setIsSearchOpen("B")}
            leagues={leagues}
            allTeams={allTeams}
            maxSeason={maxSeason}
            onStatsUpdate={setStatsB}
            stats={statsB}
            isCompact={true}
          />
        </div>

        {}
        {entityA && entityB && statsA && statsB && (
          <div className={styles.comparisonStatsContainer}>
            <ComparisonStats statsA={statsA} statsB={statsB} type={compareType} />
          </div>
        )}
      </div>

      {}
      {isSearchOpen && (
        <SearchModal
          isOpen={!!isSearchOpen}
          onClose={() => setIsSearchOpen(null)}
          type={compareType}
          list={compareType === "players" ? allPlayers : allTeams}
          onSelect={handleSelect}
          allTeams={allTeams}
        />
      )}
    </div>
  );
};

const EntityCard = ({
  side,
  type,
  entity,
  onRemove,
  onAdd,
  leagues,
  allTeams,
  maxSeason,
  onStatsUpdate,
  stats,
  isCompact = false
}: any) => {
  const [historyOptions, setHistoryOptions] = useState<any[]>([]);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(0);

  useEffect(() => {
    if (!entity) {
      setHistoryOptions([]);
      onStatsUpdate(null);
      return;
    }

    let team: Team | undefined;
    if (type === "teams") {
      team = entity as Team;
    } else {
      const teamId = typeof entity.teamId === "string" ? entity.teamId : entity.teamId?._id;
      team = allTeams.find((t: any) => t._id === teamId);
    }

    if (team) {
      const options: any[] = [];

      options.push({
        label: "All Time",
        season: undefined,
        leagueId: undefined,
      });

      let domesticLeague = leagues.find(
        (l: any) => l.country === team?.country && !["Champions League", "Europe"].includes(l.name)
      );

      if (!domesticLeague) {
        const leagueId = typeof team.leagueId === "string" ? team.leagueId : (team.leagueId as any)?._id;
        domesticLeague = leagues.find((l: any) => l._id === leagueId);
      }

      const domesticName = domesticLeague ? domesticLeague.name : (team.country + " League");
      const clLeague = leagues.find((l: any) => ["Champions League", "Europe"].includes(l.name));

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
  }, [entity, type, allTeams, leagues, maxSeason]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!entity || !historyOptions[selectedHistoryIndex]) return;

      const { season, leagueId } = historyOptions[selectedHistoryIndex];
      try {
        const statsData = type === "players"
          ? await FootballAPI.getPlayerStats(entity._id, season, leagueId)
          : await FootballAPI.getTeamStats(entity._id, season, leagueId);
        onStatsUpdate(statsData);
      } catch (err) {
        console.error(err);
        onStatsUpdate(null);
      }
    };
    fetchStats();
  }, [entity, selectedHistoryIndex, historyOptions]);

  if (!entity) {
    return (
      <div
        onClick={onAdd}
        className={`${styles.cardEmpty} ${isCompact ? styles.cardEmptyCompact : styles.cardEmptyNormal}`}
      >
        <div className={`${styles.plusIcon} ${isCompact ? styles.plusIconCompact : styles.plusIconNormal}`}>
          +
        </div>
        <p className={styles.emptyText}>
          Select {type === "players" ? "Player" : "Team"} {side}
        </p>
      </div>
    );
  }

  return (
    <div className={`${styles.cardFilled} ${isCompact ? styles.cardFilledCompact : ''}`}>
      <button
        onClick={onRemove}
        className={styles.removeButton}
      >
        ✕
      </button>

      {}
      <div className={`${styles.cardHeader} ${isCompact ? styles.paddingCompact : styles.paddingNormal}`}>
        <div className={`${styles.avatar} ${isCompact ? styles.avatarCompact : styles.avatarNormal}`}>
          {type === "players" ? "👤" : "🛡️"}
        </div>
        <h2 className={`${styles.entityName} ${isCompact ? styles.textLg : styles.textXl}`}>{entity.name}</h2>
        <p className={styles.entityMeta}>
           {type === "players" ? entity.position : entity.country}
           {type === "players" && entity.teamId && (
              <span className="opacity-75"> • {

                   typeof entity.teamId === 'object' ? (entity.teamId as any).name : 'Team'
              }</span>
           )}
        </p>

        {}
        <div className="w-full max-w-[200px]">
          <select
            value={selectedHistoryIndex}
            onChange={(e) => setSelectedHistoryIndex(Number(e.target.value))}
            className={styles.contextSelect}
          >
            {historyOptions.map((opt, idx) => (
              <option key={idx} value={idx}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {}
      <div className={`${styles.statsArea} ${isCompact ? styles.paddingCompact : styles.paddingNormal}`}>
        {!stats ? (
           <div className="animate-pulse text-slate-600 text-sm">Loading stats...</div>
        ) : (
           <div className={styles.statsGrid}>
              <div className={styles.statBox}>
                 <div className={`${styles.statValue} ${isCompact ? styles.textXl : styles.text2Xl} ${styles.textEmerald}`}>{stats.matches || 0}</div>
                 <div className={styles.statLabel}>Matches</div>
              </div>
              <div className={styles.statBox}>
                 <div className={`${styles.statValue} ${isCompact ? styles.textXl : styles.text2Xl} ${styles.textBlue}`}>{
                    type === 'players' ? (stats.goals || 0) : (stats.points || 0)
                 }</div>
                 <div className={styles.statLabel}>
                    {type === 'players' ? 'Goals' : 'Points'}
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

const ComparisonStats = ({ statsA, statsB, type }: any) => {
  const statsConfig = type === "players"
    ? [
        { key: "goals", label: "Goals" },
        { key: "assists", label: "Assists" },
        { key: "keyPasses", label: "Key Passes" },
        { key: "tackles", label: "Tackles" },
        { key: "interceptions", label: "Interceptions" },
        { key: "cleanSheets", label: "Clean Sheets" },
        { key: "yellowCards", label: "Yellow Cards", invert: true },
        { key: "distanceCovered", label: "Distance (km)" },
      ]
    : [
        { key: "points", label: "Points" },
        { key: "wins", label: "Wins" },
        { key: "draws", label: "Draws" },
        { key: "losses", label: "Losses", invert: true },
        { key: "goalsFor", label: "Goals For" },
        { key: "goalsAgainst", label: "Goals Against", invert: true },
      ];

  return (
    <div className={styles.detailedStatsBox}>
      <h3 className={styles.breakdownTitle}>
        Detailed Breakdown
      </h3>
      <div className="space-y-8">
        {statsConfig.map((stat) => {
          const valA = statsA[stat.key] || 0;
          const valB = statsB[stat.key] || 0;
          const max = Math.max(valA, valB, 1);

          const widthA = (valA / max) * 100;
          const widthB = (valB / max) * 100;

          return (
            <div key={stat.key} className="group">
               {}
               <div className={styles.statRowLabel}>
                  <span className={`text-lg font-bold ${valA > valB ? styles.textEmerald : styles.textSlate400}`}>
                    {valA}
                  </span>
                  <span className={`text-sm font-medium uppercase pb-1 ${styles.textSlate500}`}>{stat.label}</span>
                  <span className={`text-lg font-bold ${valB > valA ? styles.textBlue : styles.textSlate400}`}>
                    {valB}
                  </span>
               </div>

               {}
               <div className={styles.statRowBar}>
                  <div className={styles.barContainer} style={{ justifyContent: 'flex-end' }}>
                     <div
                        className={`${styles.barFill} ${valA > valB ? styles.bgEmerald : styles.bgSlate}`}
                        style={{ width: `${widthA}%` }}
                     />
                  </div>

                  <div className="w-1 h-full bg-slate-800 rounded-full shrink-0" />

                  <div className={styles.barContainer} style={{ justifyContent: 'flex-start' }}>
                     <div
                        className={`${styles.barFill} ${valB > valA ? styles.bgBlue : styles.bgSlate}`}
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
};

const SearchModal = ({ isOpen, onClose, type, list, onSelect, allTeams }: any) => {
  const [term, setTerm] = useState("");

  const filtered = useMemo(() => {
    if (!term) return list.slice(0, 20);
    const lower = term.toLowerCase();
    return list.filter((item: any) => {
        if (item.name.toLowerCase().includes(lower)) return true;
        if (type === "players") {
            const teamId = typeof item.teamId === "string" ? item.teamId : item.teamId?._id;
            const team = allTeams.find((t: any) => t._id === teamId);
            if (team && team.name.toLowerCase().includes(lower)) return true;
        }
        return false;
    }).slice(0, 50);
  }, [list, term, type, allTeams]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className={styles.modalOverlay}>
      {}
      <div className={styles.modalBackdrop} onClick={onClose} />

      {}
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
            {filtered.length === 0 && (
                <div className="text-center py-8 text-slate-500">No results found</div>
            )}
            {filtered.map((item: any) => {
                const teamId = typeof item.teamId === "string" ? item.teamId : item.teamId?._id;
                const team = type === "players" ? allTeams.find((t: any) => t._id === teamId) : null;

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
                            <div className="font-bold text-slate-200 group-hover:text-white">{item.name}</div>
                            <div className="text-xs text-slate-500">
                                {type === "players"
                                    ? `${item.position} • ${team?.name || 'Unknown Team'}`
                                    : item.country
                                }
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
      </div>
    </div>
  );
};
