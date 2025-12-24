import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  FootballAPI,
  type League,
  type Team,
  type Match,
  type Player,
} from "../services/api";

interface DataContextType {
  leagues: League[];
  allTeams: Team[];
  allMatches: Match[];
  allPlayers: Player[];
  loading: boolean;
  error: any;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leaguesData, teamsData, matchesData, playersData] =
        await Promise.all([
          FootballAPI.getLeagues(),
          FootballAPI.getAllTeams(),
          FootballAPI.getMatches(),
          FootballAPI.getPlayers(),
        ]);
      setLeagues(leaguesData);
      setAllTeams(teamsData);
      setAllMatches(matchesData);
      setAllPlayers(playersData);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch data", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <DataContext.Provider
      value={{
        leagues,
        allTeams,
        allMatches,
        allPlayers,
        loading,
        error,
        refreshData: fetchData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
