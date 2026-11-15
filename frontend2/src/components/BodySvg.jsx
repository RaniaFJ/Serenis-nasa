import { getStatusMeta } from './StatusBadge';

export default function BodySvg({ statuses, selected, onSelect }) {
  const getMeta = (sysId) => getStatusMeta(statuses[sysId] || 'GREEN');

  const brain = getMeta('brain');
  const lungs = getMeta('lungs');
  const heart = getMeta('heart');
  const metabolic = getMeta('metabolic');
  const musculo = getMeta('musculoskeletal');

  const isSelected = (id) => selected === id;

  return (
    <div className="relative w-full flex flex-col items-center">
      <svg
        viewBox="0 0 360 470"
        className="w-full max-w-[360px] h-[440px] select-none drop-shadow-[0_0_18px_rgba(34,211,238,0.28)]"
        role="img"
        aria-label="Scanner anatomique holographique interactif"
      >
        <defs>
          {/* Halo holographique */}
          <filter id="holoGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Grille scanline */}
          <pattern id="holoScanlines" width="6" height="6" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="6" y2="0" stroke="rgba(103,232,249,0.12)" strokeWidth="1" />
          </pattern>

          {/* Dégradé corps holographique */}
          <linearGradient id="bodyFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.18" />
            <stop offset="50%" stopColor="#0284c7" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.18" />
          </linearGradient>

          <linearGradient id="scanBeamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 1. ARRIÈRE-PLAN HUD & CERCLES RADAR */}
        <circle cx="180" cy="235" r="165" fill="none" stroke="rgba(34,211,238,0.12)" strokeDasharray="3 6" />
        <circle cx="180" cy="235" r="125" fill="none" stroke="rgba(139,92,246,0.16)" strokeDasharray="8 4" />
        {/* Viseurs d'angles HUD */}
        <path d="M 18 35 L 18 18 L 35 18 M 325 18 L 342 18 L 342 35 M 18 435 L 18 452 L 35 452 M 325 452 L 342 452 L 342 435"
          fill="none" stroke="#22d3ee" strokeWidth="1.5" opacity="0.6" />

        {/* 2. SILHOUETTE HUMAINE HOLOGRAPHIQUE EXTERNE */}
        <g>
          <path
            d="M180,22 C202,22 215,38 215,60 C215,79 203,92 193,97 L193,109 C222,113 246,122 254,145 L278,242 C281,253 271,260 262,254 L239,168 L234,245 L244,442 C244,452 231,456 225,446 L195,286 L186,286 L180,286 L174,286 L165,286 L135,446 C129,456 116,452 116,442 L126,245 L121,168 L98,254 C89,260 79,253 82,242 L106,145 C114,122 138,113 167,109 L167,97 C157,92 145,79 145,60 C145,38 158,22 180,22 Z"
            fill="url(#bodyFill)"
            stroke="#38bdf8"
            strokeWidth="1.8"
            filter="url(#holoGlow)"
          />
          {/* Texture scanline interne */}
          <path
            d="M180,22 C202,22 215,38 215,60 C215,79 203,92 193,97 L193,109 C222,113 246,122 254,145 L278,242 C281,253 271,260 262,254 L239,168 L234,245 L244,442 C244,452 231,456 225,446 L195,286 L165,286 L135,446 C129,456 116,452 116,442 L126,245 L121,168 L98,254 C89,260 79,253 82,242 L106,145 C114,122 138,113 167,109 L167,97 C157,92 145,79 145,60 C145,38 158,22 180,22 Z"
            fill="url(#holoScanlines)"
          />
        </g>

        {/* 3. SYSTÈME OS & MUSCLES (Squelette holographique cliquable) */}
        <g
          onClick={() => onSelect('musculoskeletal')}
          className="cursor-pointer transition-opacity hover:opacity-100"
          opacity={isSelected('musculoskeletal') ? 1 : 0.72}
        >
          {/* Colonne vertébrale */}
          {[96, 106, 116, 126, 136, 146, 156, 166, 176, 186, 196, 206, 216, 226, 236].map((y, idx) => (
            <rect
              key={idx}
              x="176"
              y={y}
              width="8"
              height="6"
              rx="2"
              fill={`${musculo.hex}33`}
              stroke={musculo.hex}
              strokeWidth={isSelected('musculoskeletal') ? 1.5 : 0.9}
            />
          ))}

          {/* Clavicules */}
          <path
            d="M175,116 Q145,112 122,122 M185,116 Q215,112 238,122"
            fill="none"
            stroke={musculo.hex}
            strokeWidth={isSelected('musculoskeletal') ? 2.4 : 1.5}
          />

          {/* Cage thoracique (6 paires de côtes) */}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const y = 128 + i * 10;
            const spread = 36 + Math.sin((i / 5) * Math.PI) * 14;
            return (
              <g key={i}>
                <path
                  d={`M175,${y} Q${180 - spread},${y + 3} ${180 - spread + 8},${y + 11}`}
                  fill="none"
                  stroke={musculo.hex}
                  strokeWidth={isSelected('musculoskeletal') ? 2 : 1.2}
                />
                <path
                  d={`M185,${y} Q${180 + spread},${y + 3} ${180 + spread - 8},${y + 11}`}
                  fill="none"
                  stroke={musculo.hex}
                  strokeWidth={isSelected('musculoskeletal') ? 2 : 1.2}
                />
              </g>
            );
          })}

          {/* Bassin (Pelvis) */}
          <path
            d="M142,248 C134,258 138,278 156,282 L180,272 L204,282 C222,278 226,258 218,248 C204,256 192,256 180,252 C168,256 156,256 142,248 Z"
            fill={`${musculo.hex}25`}
            stroke={musculo.hex}
            strokeWidth={isSelected('musculoskeletal') ? 2.2 : 1.3}
          />

          {/* Os des bras et jambes (Humérus & Fémurs) */}
          <line x1="115" y1="132" x2="92" y2="236" stroke={musculo.hex} strokeWidth={isSelected('musculoskeletal') ? 4 : 2.5} strokeLinecap="round" opacity="0.7" />
          <line x1="245" y1="132" x2="268" y2="236" stroke={musculo.hex} strokeWidth={isSelected('musculoskeletal') ? 4 : 2.5} strokeLinecap="round" opacity="0.7" />
          <line x1="150" y1="282" x2="128" y2="430" stroke={musculo.hex} strokeWidth={isSelected('musculoskeletal') ? 5 : 3} strokeLinecap="round" opacity="0.75" />
          <line x1="210" y1="282" x2="232" y2="430" stroke={musculo.hex} strokeWidth={isSelected('musculoskeletal') ? 5 : 3} strokeLinecap="round" opacity="0.75" />
        </g>

        {/* 4. CERVEAU (Hémisphères & circonvolutions) */}
        <g onClick={() => onSelect('brain')} className="cursor-pointer" filter="url(#holoGlow)">
          <path
            d="M180,29 C163,29 152,41 153,55 C153,65 161,71 171,72 L180,72 L189,72 C199,71 207,65 207,55 C208,41 197,29 180,29 Z"
            fill={`${brain.hex}55`}
            stroke={brain.hex}
            strokeWidth={isSelected('brain') ? 3 : 1.8}
          />
          {/* Sillons cérébraux */}
          <path
            d="M180,31 L180,70 M162,43 Q170,48 164,56 M198,43 Q190,48 196,56 M166,62 Q173,60 177,65 M194,62 Q187,60 183,65"
            fill="none"
            stroke="#fff"
            strokeWidth="1"
            opacity="0.65"
          />
        </g>

        {/* 5. POUMONS & TRACHÉE */}
        <g onClick={() => onSelect('lungs')} className="cursor-pointer" filter="url(#holoGlow)">
          {/* Trachée */}
          <path d="M180,98 L180,126 M180,126 L166,138 M180,126 L194,138" stroke={lungs.hex} strokeWidth="2.5" fill="none" />
          {/* Poumon droit (gauche à l'écran) */}
          <path
            d="M174,124 C156,125 142,144 140,174 C139,182 147,185 174,181 Z"
            fill={`${lungs.hex}44`}
            stroke={lungs.hex}
            strokeWidth={isSelected('lungs') ? 3 : 1.6}
          />
          {/* Poumon gauche (droite à l'écran, avec incisure cardiaque) */}
          <path
            d="M186,124 C204,125 218,144 220,174 C221,182 210,185 196,181 C190,175 186,166 186,154 Z"
            fill={`${lungs.hex}44`}
            stroke={lungs.hex}
            strokeWidth={isSelected('lungs') ? 3 : 1.6}
          />
        </g>

        {/* 6. CŒUR ANATOMIQUE PULSANT */}
        <g onClick={() => onSelect('heart')} className="cursor-pointer" filter="url(#holoGlow)">
          {/* Halo de battement */}
          <circle
            cx="187"
            cy="154"
            r={isSelected('heart') ? 22 : 17}
            fill="none"
            stroke={heart.hex}
            strokeWidth="1"
            strokeDasharray="3 3"
            className="animate-spin"
            style={{ transformOrigin: '187px 154px', animationDuration: '9s' }}
          />
          {/* Forme anatomique du cœur + aorte */}
          <path
            d="M184,141 C179,136 172,141 174,149 C175,157 184,167 191,170 C197,166 202,156 199,147 C197,140 190,138 184,141 Z"
            fill={`${heart.hex}88`}
            stroke={heart.hex}
            strokeWidth={isSelected('heart') ? 3 : 2}
          />
          <path d="M184,141 L184,133 M189,140 L191,134" stroke="#fff" strokeWidth="1.5" opacity="0.8" />
        </g>

        {/* 7. MÉTABOLISME (Foie, Estomac & Intestins comme sur l'image de référence) */}
        <g onClick={() => onSelect('metabolic')} className="cursor-pointer" filter="url(#holoGlow)">
          {/* Foie */}
          <path
            d="M145,189 C160,186 178,189 183,195 C173,204 156,211 144,207 C141,201 142,193 145,189 Z"
            fill={`${metabolic.hex}66`}
            stroke={metabolic.hex}
            strokeWidth={isSelected('metabolic') ? 2.5 : 1.5}
          />
          {/* Estomac */}
          <path
            d="M184,193 C198,191 212,199 209,211 C206,220 191,220 183,213 C180,206 181,197 184,193 Z"
            fill={`${metabolic.hex}44`}
            stroke={metabolic.hex}
            strokeWidth={isSelected('metabolic') ? 2.5 : 1.5}
          />
          {/* Intestins */}
          <rect
            x="148"
            y="216"
            width="64"
            height="32"
            rx="13"
            fill={`${metabolic.hex}40`}
            stroke={metabolic.hex}
            strokeWidth={isSelected('metabolic') ? 2.5 : 1.5}
          />
          <path
            d="M156,224 Q180,220 202,225 M155,233 Q180,237 203,232 M158,241 Q180,238 200,242"
            fill="none"
            stroke="#fff"
            strokeWidth="1.1"
            opacity="0.55"
          />
        </g>

        {/* 8. FAISCEAU DE SCAN LASER ANIMÉ */}
        <g className="holo-beam" style={{ pointerEvents: 'none' }}>
          <rect x="75" y="25" width="210" height="8" fill="url(#scanBeamGrad)" />
          <line x1="75" y1="29" x2="285" y2="29" stroke="#67e8f9" strokeWidth="1.2" opacity="0.85" />
        </g>

        {/* 9. ÉTIQUETTES HUD LATÉRALES AVEC ICÔNE D'ACCESSIBILITÉ (✓ ⚠ ✖) */}
        <g fontFamily="JetBrains Mono, monospace" fontSize="9.5" fontWeight="700">
          {/* Cerveau */}
          <g onClick={() => onSelect('brain')} className="cursor-pointer">
            <polyline points="205,46 245,32 342,32" fill="none" stroke={brain.hex} strokeWidth="1" opacity="0.8" />
            <text x="248" y="27" fill={brain.hex}>{brain.icon} CERVEAU</text>
          </g>

          {/* Poumons */}
          <g onClick={() => onSelect('lungs')} className="cursor-pointer">
            <polyline points="142,148 105,134 16,134" fill="none" stroke={lungs.hex} strokeWidth="1" opacity="0.8" />
            <text x="16" y="129" fill={lungs.hex}>{lungs.icon} POUMONS</text>
          </g>

          {/* Cœur */}
          <g onClick={() => onSelect('heart')} className="cursor-pointer">
            <polyline points="200,152 248,142 342,142" fill="none" stroke={heart.hex} strokeWidth="1" opacity="0.8" />
            <text x="252" y="137" fill={heart.hex}>{heart.icon} CŒUR</text>
          </g>

          {/* Métabolisme */}
          <g onClick={() => onSelect('metabolic')} className="cursor-pointer">
            <polyline points="208,218 248,218 342,218" fill="none" stroke={metabolic.hex} strokeWidth="1" opacity="0.8" />
            <text x="244" y="213" fill={metabolic.hex}>{metabolic.icon} MÉTABOLISME</text>
          </g>

          {/* Os & Muscles */}
          <g onClick={() => onSelect('musculoskeletal')} className="cursor-pointer">
            <polyline points="134,340 96,340 16,340" fill="none" stroke={musculo.hex} strokeWidth="1" opacity="0.8" />
            <text x="16" y="335" fill={musculo.hex}>{musculo.icon} OS & MUSCLES</text>
          </g>
        </g>
      </svg>
    </div>
  );
}