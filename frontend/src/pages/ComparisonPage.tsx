import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FootballAPI,
  type League,
  type Team,
  type Player,
} from "../services/api";

export const ComparisonPage = () => {
  const [compareType, setCompareType] = useState<"players" | "teams">(
    "players",
  );
  const [leagues, setLeagues] = useState<League[]>([]);

  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);

  const [entityA, setEntityA] = useState<any>(null);
  const [entityB, setEntityB] = useState<any>(null);

  const [statsA, setStatsA] = useState<any>(null);
  const [statsB, setStatsB] = useState<any>(null);

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
          1,
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="px-4 py-2 bg-slate-800 rounded-lg text-sm font-bold text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
            >
              ← Back
            </Link>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-lab-accent to-blue-500">
              Head-to-Head Comparison
            </h1>
          </div>

          <select
            value={compareType}
            onChange={(e) => setCompareType(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 rounded px-4 py-2 outline-none focus:border-lab-accent text-sm font-bold text-slate-300"
          >
            <option value="players">Players</option>
            <option value="teams">Teams</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative">
          {}
          <div className="hidden md:flex absolute inset-0 items-center justify-center pointer-events-none z-10">
            <div className="bg-lab-accent text-slate-950 font-black p-4 rounded-full shadow-[0_0_20px_rgba(0,255,135,0.5)] text-xl">
              VS
            </div>
          </div>

          {}
          <ComparisonCard
            type={compareType}
            data={entityA}
            onSelect={setEntityA}
            list={compareType === "players" ? allPlayers : allTeams}
            label="Entity A"
            allTeams={allTeams}
            leagues={leagues}
            maxSeason={maxSeason}
            onStatsUpdate={setStatsA}
          />

          {}
          <ComparisonCard
            type={compareType}
            data={entityB}
            onSelect={setEntityB}
            list={compareType === "players" ? allPlayers : allTeams}
            label="Entity B"
            allTeams={allTeams}
            leagues={leagues}
            maxSeason={maxSeason}
            onStatsUpdate={setStatsB}
          />
        </div>

        {}
        {entityA && entityB && statsA && statsB && (
          <StatsTable statsA={statsA} statsB={statsB} type={compareType} />
        )}
      </div>
    </div>
  );
};

interface HistoryOption {
  season?: number;
  leagueId?: string;
  label: string;
}

interface ComparisonCardProps {
  type: "players" | "teams";
  data: any;
  onSelect: (data: any) => void;
  list: any[];
  label: string;
  allTeams: Team[];
  leagues: League[];
  maxSeason: number;
  onStatsUpdate: (stats: any) => void;
}

const ComparisonCard = ({
  type,
  data,
  onSelect,
  list,
  label,
  allTeams,
  leagues,
  maxSeason,
  onStatsUpdate,
}: ComparisonCardProps) => {
  const [historyOptions, setHistoryOptions] = useState<HistoryOption[]>([]);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number>(-1);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredList = useMemo(() => {
    if (!searchTerm) return list;
    return list.filter((item) => {
      const nameMatch = item.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      if (nameMatch) return true;

      if (type === "players") {
        const teamId =
          typeof item.teamId === "string" ? item.teamId : item.teamId?._id;
        const team = allTeams.find((t: any) => t._id === teamId);
        if (team && team.name.toLowerCase().includes(searchTerm.toLowerCase()))
          return true;
      }
      return false;
    });
  }, [list, searchTerm, type, allTeams]);

  useEffect(() => {
    if (!data) {
      setHistoryOptions([]);
      setSelectedHistoryIndex(-1);
      onStatsUpdate(null);
      return;
    }

    let team: Team | undefined;
    if (type === "teams") {
      team = data as Team;
    } else {
      const teamId =
        typeof data.teamId === "string" ? data.teamId : data.teamId?._id;
      team = allTeams.find((t) => t._id === teamId);
    }

    if (team) {
      const options: HistoryOption[] = [];

      options.push({
        label: "All Career (All Seasons & Competitions)",
        season: undefined,
        leagueId: undefined,
      });

      let domesticLeague: League | undefined;

      if (team.country) {
        domesticLeague = leagues.find(
          (l) =>
            l.country === team?.country &&
            l.name !== "Champions League" &&
            l.name !== "Europe",
        );
      }

      if (!domesticLeague) {
        const leagueId =
          typeof team.leagueId === "string"
            ? team.leagueId
            : (team.leagueId as any)?._id;
        const l = leagues.find((l) => l._id === leagueId);
        if (l && l.name !== "Champions League" && l.name !== "Europe") {
          domesticLeague = l;
        }
      }

      const domesticName = domesticLeague
        ? domesticLeague.name
        : team.country + " League";

      const clLeague = leagues.find(
        (l) => l.name === "Champions League" || l.name === "Europe",
      );

      for (let s = 1; s <= maxSeason; s++) {
        if (domesticLeague) {
          options.push({
            season: s,
            leagueId: domesticLeague._id,
            label: `${domesticName} - Season ${s}`,
          });
        }

        if (
          clLeague &&
          (team.clGroup || (team.clStats && (team.clStats.matches || 0) > 0))
        ) {
          options.push({
            season: s,
            leagueId: clLeague._id,
            label: `Champions League - Season ${s}`,
          });
        }
      }

      setHistoryOptions(options);

      setSelectedHistoryIndex(0);
    }
  }, [data, type, allTeams, leagues, maxSeason]);

  useEffect(() => {
    const fetchStats = async () => {
      if (
        !data ||
        selectedHistoryIndex === -1 ||
        !historyOptions[selectedHistoryIndex]
      )
        return;

      const { season, leagueId } = historyOptions[selectedHistoryIndex];

      try {
        let statsData;
        if (type === "players") {
          statsData = await FootballAPI.getPlayerStats(
            data._id,
            season as number,
            leagueId as string,
          );
        } else {
          statsData = await FootballAPI.getTeamStats(
            data._id,
            season as number,
            leagueId as string,
          );
        }
        onStatsUpdate(statsData);
      } catch (error) {
        console.error("Failed to fetch stats", error);
        onStatsUpdate(null);
      }
    };
    fetchStats();
  }, [data, selectedHistoryIndex, historyOptions, type]);

  return (
    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 flex flex-col items-center min-h-[400px]">
      <h3 className="text-slate-400 font-bold uppercase text-sm mb-4">
        {label}
      </h3>

      {}
      <div className="w-full mb-6">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder={`Search ${type}...`}
            className="flex-1 bg-slate-800 p-3 rounded-lg border border-slate-700 text-sm outline-none focus:border-lab-accent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-lg font-semibold outline-none focus:border-lab-accent"
          onChange={(e) => {
            const selected = list.find(
              (item: any) => item._id === e.target.value,
            );
            onSelect(selected);
            setSearchTerm("");
          }}
          value={data ? data._id : ""}
          size={searchTerm ? 5 : 1}
        >
          <option value="">
            Select {type === "players" ? "Player" : "Team"}
          </option>
          {filteredList.map((item: any) => {
            let displayName = item.name;
            if (type === "players") {
              const teamId =
                typeof item.teamId === "string"
                  ? item.teamId
                  : item.teamId?._id;
              const team = allTeams.find((t: any) => t._id === teamId);
              if (team) displayName += ` - ${item.position} - ${team.name}`;
            }
            return (
              <option key={item._id} value={item._id}>
                {displayName}
              </option>
            );
          })}
        </select>
      </div>

      {data && (
        <div className="w-full animate-fade-in flex flex-col items-center">
          {}
          <div className="w-full mb-6">
            <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">
              Context
            </label>
            <select
              value={selectedHistoryIndex}
              onChange={(e) => setSelectedHistoryIndex(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 outline-none focus:border-lab-accent font-bold text-lab-accent"
              disabled={historyOptions.length === 0}
            >
              {historyOptions.map((opt, idx) => (
                <option key={idx} value={idx}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 mb-4 bg-slate-800/50 p-4 rounded-xl w-full justify-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-2xl shadow-lg border-2 border-slate-700">
              {type === "players" ? "👤" : "🛡️"}
            </div>
            <div className="text-left">
              <h2 className="text-xl font-bold text-white leading-tight">
                {data.name}
              </h2>
              <p className="text-slate-400 text-sm">
                {type === "players" ? data.position : data.country}
              </p>
            </div>
          </div>
        </div>
      )}

      {!data && (
        <div className="h-40 flex items-center justify-center text-slate-600 italic">
          Select an entity to start comparison
        </div>
      )}
    </div>
  );
};

const StatsTable = ({ statsA, statsB, type }: any) => {
  const statsToCompare =
    type === "players"
      ? [
          { key: "matches", label: "Matches" },
          { key: "goals", label: "Goals" },
          { key: "assists", label: "Assists" },
          { key: "yellowCards", label: "Yellow Cards" },
          { key: "redCards", label: "Red Cards" },
          { key: "cleanSheets", label: "Clean Sheets" },
          { key: "tackles", label: "Tackles" },
          { key: "interceptions", label: "Interceptions" },
          { key: "keyPasses", label: "Key Passes" },
          { key: "saves", label: "Saves" },
          { key: "distanceCovered", label: "Distance (km)" },
        ]
      : [
          { key: "matches", label: "Matches" },
          { key: "points", label: "Points" },
          { key: "wins", label: "Wins" },
          { key: "draws", label: "Draws" },
          { key: "losses", label: "Losses" },
          { key: "goalsFor", label: "Goals For" },
          { key: "goalsAgainst", label: "Goals Against" },
        ];

  return (
    <div className="mt-12 bg-slate-900/80 p-8 rounded-2xl border border-slate-800">
      <h3 className="text-center text-xl font-bold mb-8 text-slate-300">
        Statistical Comparison
      </h3>
      <div className="space-y-6 max-w-3xl mx-auto">
        {statsToCompare.map((stat) => {
          const valA = statsA[stat.key] || 0;
          const valB = statsB[stat.key] || 0;
          const total = valA + valB;
          const percentA = total === 0 ? 50 : (valA / total) * 100;
          const percentB = total === 0 ? 50 : (valB / total) * 100;

          return (
            <div key={stat.key} className="flex flex-col">
              <div className="flex justify-between text-sm text-slate-400 mb-1 px-1">
                <span>{valA}</span>
                <span className="font-bold text-white">{stat.label}</span>
                <span>{valB}</span>
              </div>
              <div className="flex h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`transition-all duration-500 ${valA > valB ? "bg-lab-accent" : "bg-slate-600"}`}
                  style={{ width: `${percentA}%` }}
                />
                <div className="w-0.5 bg-slate-900"></div>
                <div
                  className={`transition-all duration-500 ${valB > valA ? "bg-blue-500" : "bg-slate-600"}`}
                  style={{ width: `${percentB}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
