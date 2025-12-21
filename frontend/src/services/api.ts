import axios from 'axios';
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
  status: 'scheduled' | 'finished';
  homeTeamName?: string;
  awayTeamName?: string;
  leagueName?: string;
}
export interface League {
  _id: string;
  name: string;
  country: string;
  seasonNumber?: number;
}
export const FootballAPI = {
  getLeagues: async () => {
    const response = await api.get<League[]>('/leagues');
    return response.data;
  },
  getAllTeams: async () => {
    const response = await api.get<Team[]>('/teams');
    return response.data;
  },
  getLeagueTable: async (leagueId: string) => {
    const response = await api.get<Team[]>(`/teams/league/${leagueId}/table`);
    return response.data;
  },
  getMatches: async () => {
    const response = await api.get<Match[]>('/matches');
    return response.data;
  },
  getTeamMatches: async (teamId: string, season?: number) => {
    const response = await api.get<Match[]>(`/matches/team/${teamId}`, {
      params: { season }
    });
    return response.data;
  },
  getTeams: async () => {
      const response = await api.get<Team[]>('/teams');
      return response.data;
  }
};
