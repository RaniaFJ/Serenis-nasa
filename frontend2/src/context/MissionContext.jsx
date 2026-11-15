import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  ENVIRONMENTS,
  INDICATORS_CATALOG,
  INITIAL_TASKS,
} from '../data/serenisDb';

const MissionContext = createContext(null);

const INITIAL_VALUES = {
  hr: 72,
  bp_sys: 119,
  spo2: 98,
  radiation: 1.6,
  glucose: 93,
  sleep: 7.2,
  mood: 8,
  stress: 3,
  ared_load: 45,
};

export function MissionProvider({ children }) {
  const [envId, setEnvId] = useState('MARS_TRANSIT');
  const [values, setValues] = useState(() => {
    try {
      const saved = localStorage.getItem('sentra_values');
      return saved ? JSON.parse(saved) : INITIAL_VALUES;
    } catch {
      return INITIAL_VALUES;
    }
  });
  const [histories, setHistories] = useState(() => {
    const base = {};
    Object.values(INDICATORS_CATALOG).forEach((ind) => {
      base[ind.id] = ind.history;
    });
    return base;
  });
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [offlineMode, setOfflineMode] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState('hr');
  const [activeTab, setActiveTab] = useState('dashboard');

  const [commCountdown, setCommCountdown] = useState(0);
  const [surgeonCalled, setSurgeonCalled] = useState(false);

  const env = ENVIRONMENTS[envId];

  useEffect(() => {
    try {
      localStorage.setItem('sentra_values', JSON.stringify(values));
    } catch {
      /* stockage indisponible */
    }
  }, [values]);

  useEffect(() => {
    if (commCountdown <= 0) return;
    const timer = setInterval(() => {
      setCommCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [commCountdown]);

  const recordMeasurement = (indId, numVal) => {
    setValues((prev) => ({ ...prev, [indId]: numVal }));
    setHistories((prev) => {
      const list = prev[indId] || [];
      const updated = [...list.slice(1), { day: 'Maint.', val: numVal }];
      return { ...prev, [indId]: updated };
    });
    if (offlineMode) {
      setPendingSync((c) => c + 1);
    }
  };

  const syncOfflineQueue = () => {
    setOfflineMode(false);
    setPendingSync(0);
  };

  const toggleTask = (taskId) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t))
    );
  };

  const triggerSurgeonContact = () => {
    setSurgeonCalled(true);
    setCommCountdown(env.commDelaySec);
  };

  const simulateEmergency = () => {
    setValues((prev) => ({
      ...prev,
      hr: 114,
      bp_sys: 148,
      radiation: 2.9,
      stress: 8,
    }));
    setActiveTab('alerts');
  };

  const resetNominal = () => {
    setValues(INITIAL_VALUES);
    setSurgeonCalled(false);
    setCommCountdown(0);
  };

  const { indicatorStatuses, alerts, globalScore } = useMemo(() => {
    const statuses = {};
    const generatedAlerts = [];
    let score = 100;

    Object.values(INDICATORS_CATALOG).forEach((ind) => {
      const val = values[ind.id];
      const st = ind.evaluate(val, env);
      statuses[ind.id] = st;

      if (st === 'AMBER') {
        score -= 7;
        generatedAlerts.push({
          id: `alert-${ind.id}`,
          indicatorId: ind.id,
          severity: 'AMBER',
          title: `${ind.name} en zone de vigilance (${val} ${ind.unit})`,
          action: `Appliquer la contre-mesure préventive pour ${ind.name.toLowerCase()} et recontrôler sous 2h.`,
          contactSurgeon: false,
        });
      } else if (st === 'RED') {
        score -= 18;
        generatedAlerts.push({
          id: `alert-${ind.id}`,
          indicatorId: ind.id,
          severity: 'RED',
          title: `ALERTE CRITIQUE : ${ind.name} (${val} ${ind.unit})`,
          action:
            ind.id === 'hr' || ind.id === 'bp_sys'
              ? 'Débuter séance LBNP (pression négative) 20 min + bolus hydratation 1000 mL immédiatement.'
              : ind.id === 'radiation'
              ? 'Rejoindre immédiatement le compartiment blindé (abri anti-radiations).'
              : `Protocole d’urgence ${ind.name} : interrompre toute activité extravéhiculaire.`,
          contactSurgeon: true,
        });
      }
    });

    return {
      indicatorStatuses: statuses,
      alerts: generatedAlerts,
      globalScore: Math.max(20, score),
    };
  }, [values, env]);

  const totalXp = 320 + tasks.filter((t) => t.done).reduce((s, t) => s + t.xp, 0);

  return (
    <MissionContext.Provider
      value={{
        envId,
        setEnvId,
        env,
        values,
        histories,
        indicatorStatuses,
        alerts,
        globalScore,
        tasks,
        toggleTask,
        totalXp,
        offlineMode,
        setOfflineMode,
        pendingSync,
        syncOfflineQueue,
        recordMeasurement,
        selectedIndicatorId,
        setSelectedIndicatorId,
        activeTab,
        setActiveTab,
        commCountdown,
        setCommCountdown,
        surgeonCalled,
        triggerSurgeonContact,
        simulateEmergency,
        resetNominal,
      }}
    >
      {children}
    </MissionContext.Provider>
  );
}

export const useMission = () => useContext(MissionContext);