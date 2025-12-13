import { useEffect, useState } from 'react';
import { FootballAPI, type Team, type League } from './services/api';
import { LeagueTable } from './components/LeagueTable';

function App() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        const data = await FootballAPI.getLeagues();
        setLeagues(data);
        if (data.length > 0) {
          setSelectedLeague(data[0]._id); 
        }
      } catch (error) {
        console.error("Failed to fetch leagues", error);
      }
    };
    fetchLeagues();
  }, []);

  useEffect(() => {
    if (!selectedLeague) return;

    const fetchTable = async () => {
      setLoading(true);
      try {
        const data = await FootballAPI.getLeagueTable(selectedLeague);
        setTeams(data);
      } catch (error) {
        console.error("Failed to fetch table", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTable();
  }, [selectedLeague]);

  return (
    <div className="min-h-screen p-5 md:p-10 max-w-7xl mx-auto">
      
      <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-lab-accent to-blue-500">
            FootbalLab 🧪
          </h1>
          <p className="text-slate-400 text-sm">Season 2025/26 Simulation</p>
        </div>

        <div className="flex gap-2">
          {leagues.map(league => (
            <button
              key={league._id}
              onClick={() => setSelectedLeague(league._id)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                selectedLeague === league._id 
                  ? 'bg-lab-accent text-lab-dark shadow-[0_0_15px_rgba(16,185,129,0.5)]' 
                  : 'bg-lab-card hover:bg-slate-700 text-slate-300'
              }`}
            >
              {league.country}
            </button>
          ))}
        </div>
      </header>

      <main>
        <LeagueTable teams={teams} loading={loading} />
      </main>

    </div>
  )
}

export default App