import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./routes/Dashboard";
import { InvestigationDetail } from "./routes/Investigation";
import { Sources } from "./routes/Sources";
import { Activity } from "./routes/Activity";
import { Settings } from "./routes/Settings";
import { Home } from "./routes/Home";

// App routes that show the sidebar + layout shell
const APP_ROUTES = ["/dashboard", "/investigations", "/activity", "/sources", "/settings"];

function AppShell() {
  const location = useLocation();
  const isAppRoute = APP_ROUTES.some((r) => location.pathname.startsWith(r));

  if (!isAppRoute) {
    return (
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/investigations/:id" element={<InvestigationDetail />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
