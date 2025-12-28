import axios from "axios";
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export interface TeamStats {
  matches: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface PlayerStats {
  goals: number;
  assists: number;
  matches: number;
  yellowCards: number;
  redCards: number;
  cleanSheets?: number;
  tackles?: number;
  interceptions?: number;
  keyPasses?: number;
  saves?: number;
  distanceCovered?: number;
}

export interface Team {
  _id: string;
  name: string;
  country: string;
  seasonStats: TeamStats;
  clGroup?: string;
  clStats?: TeamStats;
  leagueId?: string | { _id: string; name: string };
}

export interface Player {
  _id: string;
  name: string;
  position: string;
  teamId: string | { _id: string; name: string };
  seasonStats: PlayerStats;
}

export interface Match {
  _id: string;
  leagueId: string;
  matchday: number;
  seasonNumber?: number;
  homeTeam: string;
  awayTeam: string;
  score: {
    home: number;
    away: number;
  };
  status: "scheduled" | "finished";
  homeTeamName?: string;
  awayTeamName?: string;
  leagueName?: string;
  events?: {
    minute: number;
    type: "goal" | "card" | "sub" | "assist";
    playerId: string | { _id: string; name: string };
    description: string;
    player?: Player;
  }[];
}

export interface League {
  _id: string;
  name: string;
  country: string;
  seasonNumber?: number;
}

export interface SeasonSummary {
  season: number;
  retiredPlayers: { name: string; age: number; strength: number; teamName: string }[];
  transfers: { playerName: string; fromTeam: string; toTeam: string; fee: number }[];
  mostImprovedPlayer: { name: string; oldStrength: number; newStrength: number; teamName: string };
}

export const FootballAPI = {
  getLeagues: async () => {
    const response = await api.get<League[]>("/leagues");
    return response.data;
  },
  getAllTeams: async () => {
    const response = await api.get<Team[]>("/teams");
    return response.data;
  },
  getLeagueTable: async (leagueId: string) => {
    const response = await api.get<Team[]>(`/teams/league/${leagueId}/table`);
    return response.data;
  },
  getMatches: async () => {
    const response = await api.get<Match[]>("/matches");
    return response.data;
  },
  getLeagueMatches: async (leagueId: string, season?: number) => {
    const response = await api.get<Match[]>(`/matches/league/${leagueId}`, {
      params: { season },
    });
    return response.data;
  },
  getTeamMatches: async (teamId: string, season?: number) => {
    const response = await api.get<Match[]>(`/matches/team/${teamId}`, {
      params: { season },
    });
    return response.data;
  },
  getTeams: async () => {
    const response = await api.get<Team[]>("/teams");
    return response.data;
  },
  getTeam: async (id: string) => {
    const response = await api.get<Team>(`/teams/${id}`);
    return response.data;
  },
  searchTeams: async (term: string) => {
    const response = await api.get<Team[]>(`/teams/search`, { params: { q: term } });
    return response.data;
  },
  getPlayers: async () => {
    const response = await api.get<Player[]>("/players");
    return response.data;
  },
  getPlayer: async (id: string) => {
    const response = await api.get<Player>(`/players/${id}`);
    return response.data;
  },
  getPlayersByTeam: async (teamId: string) => {
    const response = await api.get<Player[]>(`/players/team/${teamId}`);
    return response.data;
  },
  searchPlayers: async (term: string) => {
    const response = await api.get<Player[]>(`/players/search`, { params: { q: term } });
    return response.data;
  },
  getTopPlayers: async (
    leagueId: string,
    type:
      | "goals"
      | "assists"
      | "yellowCards"
      | "redCards"
      | "cleanSheets"
      | "tackles"
      | "interceptions"
      | "keyPasses"
      | "saves"
      | "distanceCovered",
    season: number = 1,
  ) => {
    const response = await api.get<Player[]>(
      `/players/top/${type}/${leagueId}?season=${season}`,
    );
    return response.data;
  },
  getPlayerStats: async (
    playerId: string,
    season?: number,
    leagueId?: string,
  ) => {
    const response = await api.get<PlayerStats>(`/players/stats/${playerId}`, {
      params: { season, leagueId },
    });
    return response.data;
  },
  getTeamStats: async (teamId: string, season?: number, leagueId?: string) => {
    const response = await api.get<TeamStats>(`/teams/stats/${teamId}`, {
      params: { season, leagueId },
    });
    return response.data;
  },
  getPlayerHistory: async (playerId: string) => {
    const response = await api.get<{
      season: number;
      goals: number;
      assists: number;
      yellowCards: number;
      redCards: number;
      matches: number;
    }[]>(`/players/history/${playerId}`);
    return response.data;
  },
  runSimulation: async () => {
    const response = await api.post("/simulation/run");
    return response.data;
  },
  getSeasonSummary: async () => {
    const response = await api.get<SeasonSummary>("/simulation/summary");
    return response.data;
  },
};
