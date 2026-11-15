export const ENVIRONMENTS = [
  { id: 'iss', name: 'Station Spatiale (ISS)', comm_delay_sec: 2, radiation_factor: 1.0 },
  { id: 'moon', name: 'Base Lunaire Artemis', comm_delay_sec: 3, radiation_factor: 1.4 },
  { id: 'mars', name: 'Base Martienne', comm_delay_sec: 720, radiation_factor: 1.8 },
  { id: 'transit', name: 'Vaisseau en transit', comm_delay_sec: 480, radiation_factor: 2.1 },
];

export const INITIAL_INDICATORS = [
  {
    id: 'heart_rate',
    systemId: 'heart',
    system: 'Cœur',
    name: 'Fréquence cardiaque',
    value: 74,
    unit: 'bpm',
    status: 'green',
    min: 35,
    max: 200,
    normalRange: [55, 90],
    warningRange: [45, 110],
    frequency_hours: 12,
    how_to_measure: [
      'Placez le capteur biométrique au poignet gauche ou deux doigts sur l’artère radiale.',
      'Restez immobile et détendu en apesanteur pendant 30 secondes.',
      'Lisez la valeur stabilisée sur le moniteur de bord.'
    ],
    why_important: 'Surveille l’adaptation cardiovasculaire et détecte précocement une arythmie ou une déshydratation.',
    space_effect: 'En microgravité, les fluides remontent vers le thorax et la tête, réduisant le volume plasmatique et modifiant le rythme cardiaque.',
    history: [
      { day: 'J-4', val: 68 },
      { day: 'J-3', val: 70 },
      { day: 'J-2', val: 72 },
      { day: 'J-1', val: 75 },
      { day: 'Auj.', val: 74 },
    ],
  },
  {
    id: 'bone_density',
    systemId: 'musculoskeletal',
    system: 'Os et muscles',
    name: 'Quota exercice ARED',
    value: 62,
    unit: '%',
    status: 'yellow',
    min: 0,
    max: 100,
    normalRange: [80, 100],
    warningRange: [50, 100],
    frequency_hours: 24,
    how_to_measure: [
      'Consultez le terminal de l’appareil de résistance ARED après votre séance.',
      'Relevez le pourcentage du programme quotidien complété.'
    ],
    why_important: 'Prévient la perte de masse osseuse et l’atrophie musculaire.',
    space_effect: 'Sans gravité, un astronaute perd entre 1 % et 1,5 % de densité osseuse par mois sans entraînement résistif.',
    history: [
      { day: 'J-4', val: 92 },
      { day: 'J-3', val: 85 },
      { day: 'J-2', val: 78 },
      { day: 'J-1', val: 65 },
      { day: 'Auj.', val: 62 },
    ],
  },
  {
    id: 'mood_stress',
    systemId: 'brain',
    system: 'Cerveau',
    name: 'Indice de sérénité',
    value: 4,
    unit: '/ 10',
    status: 'red',
    isSlider: true,
    min: 1,
    max: 10,
    normalRange: [7, 10],
    warningRange: [5, 10],
    frequency_hours: 24,
    how_to_measure: [
      'Évaluez votre qualité de sommeil, votre calme et votre concentration sur les dernières 24 h.',
      'Déplacez le curseur tactile de 1 (stress critique) à 10 (calme optimal).'
    ],
    why_important: 'Détecte la fatigue cognitive et les effets de l’isolement avant qu’ils n’affectent la sécurité de la mission.',
    space_effect: 'Le confinement, le bruit constant des systèmes de survie et l’absence de cycle solaire naturel perturbent le rythme circadien.',
    history: [
      { day: 'J-4', val: 8 },
      { day: 'J-3', val: 7 },
      { day: 'J-2', val: 6 },
      { day: 'J-1', val: 5 },
      { day: 'Auj.', val: 4 },
    ],
  },
  {
    id: 'spo2',
    systemId: 'lungs',
    system: 'Poumons',
    name: 'Saturation O₂ (SpO2)',
    value: 98,
    unit: '%',
    status: 'green',
    min: 70,
    max: 100,
    normalRange: [95, 100],
    warningRange: [91, 100],
    frequency_hours: 12,
    how_to_measure: [
      'Insérez votre index dans l’oxymètre de pouls.',
      'Attendez 10 secondes que la courbe pléthysmographique se stabilise.'
    ],
    why_important: 'Vérifie la bonne oxygénation sanguine et détecte une anomalie atmosphérique dans le module.',
    space_effect: 'L’environnement clos et l’accumulation potentielle de poches de CO₂ en l’absence de convection naturelle affectent la respiration.',
    history: [
      { day: 'J-4', val: 98 },
      { day: 'J-3', val: 99 },
      { day: 'J-2', val: 98 },
      { day: 'J-1', val: 97 },
      { day: 'Auj.', val: 98 },
    ],
  },
  {
    id: 'glucose',
    systemId: 'metabolism',
    system: 'Métabolisme',
    name: 'Glycémie',
    value: 104,
    unit: 'mg/dL',
    status: 'green',
    min: 40,
    max: 350,
    normalRange: [70, 125],
    warningRange: [60, 160],
    frequency_hours: 24,
    how_to_measure: [
      'Effectuez un prélèvement capillaire avec le lecteur embarqué.',
      'Saisissez le résultat affiché en mg/dL.'
    ],
    why_important: 'Contrôle l’équilibre nutritionnel et la dépense énergétique.',
    space_effect: 'Le stress oxydatif et la modification du microbiote spatial peuvent entraîner une résistance temporaire à l’insuline.',
    history: [
      { day: 'J-4', val: 96 },
      { day: 'J-3', val: 101 },
      { day: 'J-2', val: 99 },
      { day: 'J-1', val: 106 },
      { day: 'Auj.', val: 104 },
    ],
  },
];

export const INITIAL_ALERTS = [
  {
    id: 'al-1',
    severity: 'red',
    title: 'Stress élevé & fatigue cognitive détectés (Cerveau)',
    recommendation: 'Réaliser 15 min de cohérence cardiaque et passer l’éclairage de cabine en spectre ambré.',
    contact_surgeon: true,
  },
  {
    id: 'al-2',
    severity: 'yellow',
    title: 'Quota d’exercice résistif ARED incomplet (Os & muscles)',
    recommendation: 'Effectuer 20 min supplémentaires de squats résistifs avant la période de sommeil.',
    contact_surgeon: false,
  },
];

export const INITIAL_TASKS = [
  { id: 't1', label: 'Relever la fréquence cardiaque matinale', xp: 50, done: true },
  { id: 't2', label: 'Séance ARED (protection osseuse 45 min)', xp: 120, done: false },
  { id: 't3', label: 'Hydratation : 2,5 L d’eau recyclée', xp: 40, done: false },
  { id: 't4', label: 'Auto-évaluation humeur & sommeil', xp: 60, done: false },
];

export const NASA_HAZARDS = [
  {
    id: 'rad',
    title: '1. Radiations spatiales',
    impact: 'Endommage l’ADN, augmente le risque cardiovasculaire et affaiblit le système immunitaire.',
    affected: 'Cœur, Métabolisme',
  },
  {
    id: 'iso',
    title: '2. Isolement et confinement',
    impact: 'Troubles du sommeil, baisse de moral, conflits d’équipage et fatigue cognitive.',
    affected: 'Cerveau',
  },
  {
    id: 'dist',
    title: '3. Distance de la Terre',
    impact: 'Jusqu’à 20 min de délai radio vers Mars : l’équipage doit diagnostiquer et traiter en autonomie.',
    affected: 'Tous les systèmes',
  },
  {
    id: 'grav',
    title: '4. Champs de gravité altérés',
    impact: 'Perte osseuse (1,5 %/mois), atrophie musculaire et migration des fluides vers la tête.',
    affected: 'Os et muscles, Cœur',
  },
  {
    id: 'env',
    title: '5. Environnement clos hostile',
    impact: 'Accumulation de CO₂, microbes résistants et qualité de l’air/eau recyclée.',
    affected: 'Poumons, Métabolisme',
  },
];