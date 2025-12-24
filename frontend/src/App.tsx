import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { DataProvider } from "./context/DataContext";
import { Dashboard } from "./pages/Dashboard";
import { TeamProfile } from "./pages/TeamProfile";
import { PlayerProfile } from "./pages/PlayerProfile";
import { ComparisonPage } from "./pages/ComparisonPage";

function App() {
  return (
    <DataProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/team/:teamId" element={<TeamProfile />} />
          <Route path="/player/:playerId" element={<PlayerProfile />} />
          <Route path="/compare" element={<ComparisonPage />} />
        </Routes>
      </Router>
    </DataProvider>
  );
}
export default App;
