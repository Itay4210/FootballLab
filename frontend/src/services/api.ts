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
  seasonStats: {
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
  };
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
    playerId: string;
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
  getPlayers: async () => {
    const response = await api.get<Player[]>("/players");
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
    const response = await api.get(`/players/stats/${playerId}`, {
      params: { season, leagueId },
    });
    return response.data;
  },
  getTeamStats: async (teamId: string, season?: number, leagueId?: string) => {
    const response = await api.get(`/teams/stats/${teamId}`, {
      params: { season, leagueId },
    });
    return response.data;
  },
};
