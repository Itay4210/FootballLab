import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
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
  seasonStats: TeamStats;
}

export interface League {
  _id: string;
  name: string;
  country: string;
}

export const FootballAPI = {
  getLeagues: async () => {
    const response = await api.get<League[]>('/leagues');
    return response.data;
  },

  getLeagueTable: async (leagueId: string) => {
    const response = await api.get<Team[]>(`/teams/league/${leagueId}/table`);
    return response.data;
  }
};