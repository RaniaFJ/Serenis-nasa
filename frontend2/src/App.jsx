import { MissionProvider, useMission } from './context/MissionContext';
import Shell from './components/Shell';
import Dashboard from './pages/Dashboard';
import BodyExplorer from './pages/BodyExplorer';
import GuidedMeasure from './pages/GuidedMeasure';
import IndicatorDetail from './pages/IndicatorDetail';
import AlertsAndComms from './pages/AlertsAndComms';
import HazardsAndMissions from './pages/HazardsAndMissions';

function MissionScreens() {
  const { activeTab } = useMission();

  return (
    <Shell>
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'body' && <BodyExplorer />}
      {activeTab === 'measure' && <GuidedMeasure />}
      {activeTab === 'detail' && <IndicatorDetail />}
      {activeTab === 'alerts' && <AlertsAndComms />}
      {activeTab === 'hazards' && <HazardsAndMissions />}
    </Shell>
  );
}

export default function App() {
  return (
    <MissionProvider>
      <MissionScreens />
    </MissionProvider>
  );
}