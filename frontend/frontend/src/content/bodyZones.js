// Contenu éducatif statique de la silhouette cliquable.
// Les risques viennent des pages NASA du défi : https://www.nasa.gov/hrp/risks/ et https://www.nasa.gov/hrp/hazards/
// Les statuts des zones, eux, viennent de l'API (/status).

export const ZONES = {
  brain: {
    indicators: ['mood', 'sleep'],
    fr: {
      name: 'Cerveau et comportement',
      function: 'Pilote le sommeil, l’humeur, la concentration et les décisions.',
      risk: 'L’isolement, le confinement, la distance de la Terre et les horaires irréguliers peuvent dégrader la santé mentale et provoquer une perte de sommeil chronique (risques NASA : changements de comportement, sommeil inadéquat).',
    },
    en: {
      name: 'Brain and behavior',
      function: 'Drives sleep, mood, focus and decision making.',
      risk: 'Isolation, confinement, distance from Earth and irregular schedules can erode mental health and cause chronic sleep loss (NASA risks: behavioral changes, inadequate sleep).',
    },
  },
  eyes: {
    indicators: [],
    fr: {
      name: 'Yeux (SANS)',
      function: 'Assurent la vision ; leur structure peut changer en vol.',
      risk: 'Le syndrome neuro-oculaire associé aux vols spatiaux (SANS) modifie la structure des yeux et du cerveau. La NASA l’étudie avec l’imagerie du fond d’œil et la tomographie par cohérence optique (OCT).',
    },
    en: {
      name: 'Eyes (SANS)',
      function: 'Provide vision; their structure can change in flight.',
      risk: 'Spaceflight Associated Neuro-ocular Syndrome (SANS) alters the structure of the eyes and brain. NASA studies it with fundoscope imaging and optical coherence tomography (OCT).',
    },
  },
  heart: {
    indicators: ['heart_rate', 'blood_pressure'],
    fr: {
      name: 'Cœur et circulation',
      function: 'Fait circuler le sang et l’oxygène dans tout le corps.',
      risk: 'L’apesanteur modifie la circulation sanguine et le fonctionnement du cœur et des vaisseaux, ce qui peut augmenter le risque d’événement cardiovasculaire.',
    },
    en: {
      name: 'Heart and circulation',
      function: 'Pumps blood and oxygen around the body.',
      risk: 'Weightlessness alters blood circulation and how the heart and vessels work, potentially increasing the risk of cardiovascular events.',
    },
  },
  immune: {
    indicators: ['temperature'],
    fr: {
      name: 'Système immunitaire',
      function: 'Défend l’organisme contre les virus et les bactéries.',
      risk: 'Le stress du vol peut réveiller des virus dormants (éruptions, fièvre) et les microbiomes de la peau et de l’intestin changent, d’où un risque accru de tomber malade en milieu fermé.',
    },
    en: {
      name: 'Immune system',
      function: 'Defends the body against viruses and bacteria.',
      risk: 'Flight stress can wake dormant viruses (rashes, fever) and skin and gut microbiomes change, raising the risk of illness in a closed environment.',
    },
  },
  metabolism: {
    indicators: ['glucose'],
    fr: {
      name: 'Métabolisme et nutrition',
      function: 'Transforme l’alimentation en énergie.',
      risk: 'Une alimentation inadéquate pendant de longues missions affecte la santé et la performance de l’équipage.',
    },
    en: {
      name: 'Metabolism and nutrition',
      function: 'Turns food into energy.',
      risk: 'Inadequate food and nutrition on long missions affects crew health and performance.',
    },
  },
  bones: {
    indicators: ['exercise'],
    fr: {
      name: 'Os et muscles',
      function: 'Soutiennent le corps et permettent le mouvement.',
      risk: 'Sans gravité, les os se fragilisent et les muscles s’affaiblissent ; l’exercice quotidien est la principale parade (risques NASA : perte osseuse, baisse de forme physique).',
    },
    en: {
      name: 'Bones and muscles',
      function: 'Support the body and allow movement.',
      risk: 'Without gravity, bones become brittle and muscles weaken; daily exercise is the main countermeasure (NASA risks: bone loss, reduced fitness).',
    },
  },
}
