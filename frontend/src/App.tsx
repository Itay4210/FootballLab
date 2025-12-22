import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { TeamProfile } from "./pages/TeamProfile";
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/team/:teamId" element={<TeamProfile />} />
      </Routes>
    </Router>
  );
}
export default App;
