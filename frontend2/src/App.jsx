import { useEffect, useState } from 'react';
import { MissionProvider, useMission } from './context/MissionContext';
import Shell from './components/Shell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BodyExplorer from './pages/BodyExplorer';
import GuidedMeasure from './pages/GuidedMeasure';
import IndicatorDetail from './pages/IndicatorDetail';
import AlertsAndComms from './pages/AlertsAndComms';
import HazardsAndMissions from './pages/HazardsAndMissions';
import { apiRequest } from './api';

function MissionScreens({ user, onLogout, token }) {
  const { activeTab } = useMission();

  return (
    <Shell user={user} onLogout={onLogout}>
      {activeTab === 'dashboard' && <Dashboard token={token} />}
      {activeTab === 'body' && <BodyExplorer />}
      {activeTab === 'measure' && <GuidedMeasure />}
      {activeTab === 'detail' && <IndicatorDetail />}
      {activeTab === 'alerts' && <AlertsAndComms />}
      {activeTab === 'hazards' && <HazardsAndMissions />}
    </Shell>
  );
}

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('sentra_token'));
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }

    let active = true;

    apiRequest('/me', { token })
      .then((profile) => {
        if (active) setUser(profile.astronaut || profile);
      })
      .catch(() => {
        sessionStorage.removeItem('sentra_token');
        if (active) {
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  function handleLogin(accessToken, astronaut) {
    sessionStorage.setItem('sentra_token', accessToken);
    setUser(astronaut);
    setToken(accessToken);
  }

  async function handleLogout() {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        token,
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      sessionStorage.removeItem('sentra_token');
      setToken(null);
      setUser(null);
    }
  }

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#050816] font-mono text-sm text-cyan-200">
        Verifying astronaut session...
      </div>
    );
  }

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <MissionProvider>
      <MissionScreens user={user} onLogout={handleLogout} token={token} />
    </MissionProvider>
  );
}
