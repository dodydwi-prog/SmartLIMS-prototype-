import { MotionValue, motion, useReducedMotion, useTransform } from 'motion/react';
import { MatrixType } from '../data/limsPreviewData';

interface ErlenmeyerReactionProps {
  matrix: MatrixType;
  regulationCode: string;
  scrollProgress: MotionValue<number>;
  selectedParamCount: number;
  pointCount: number;
}

const MATRIX_REACTION_THEME: Record<
  MatrixType,
  {
    liquidTop: string;
    liquidBottom: string;
    liquidDeep: string;
    meniscus: string;
    bubble: string;
    accentText: string;
    reagentLabel: string;
    reactionNote: string;
  }
> = {
  'Air Limbah': {
    liquidTop: '#22D3EE',
    liquidBottom: '#0891B2',
    liquidDeep: '#0E7490',
    meniscus: '#67E8F9',
    bubble: '#ECFEFF',
    accentText: 'text-cyan-700',
    reagentLabel: 'Titrimetri COD / BOD & Spektrofotometri',
    reactionNote:
      'Simulasi oksidasi dikromat dan pengukuran padatan tersuspensi (TSS) sesuai baku mutu air limbah industri.',
  },
  'Udara Ambien': {
    liquidTop: '#34D399',
    liquidBottom: '#059669',
    liquidDeep: '#047857',
    meniscus: '#6EE7B7',
    bubble: '#ECFDF5',
    accentText: 'text-emerald-700',
    reagentLabel: 'Larutan Penyerap Impinger SO₂ / NO₂',
    reactionNote:
      'Penyerapan gas ambien melalui tabung impinger dan analisis spektrofotometri untuk parameter kualitas udara.',
  },
  'Emisi Cerobong': {
    liquidTop: '#FBBF24',
    liquidBottom: '#D97706',
    liquidDeep: '#B45309',
    meniscus: '#FDE68A',
    bubble: '#FFFBEB',
    accentText: 'text-amber-700',
    reagentLabel: 'Isokinetik Partikulat & Gas Analyzer',
    reactionNote:
      'Pengujian partikulat isokinetik dan penangkapan gas pembakaran dari sumber emisi tidak bergerak.',
  },
  'Air Bersih': {
    liquidTop: '#38BDF8',
    liquidBottom: '#0284C7',
    liquidDeep: '#0369A1',
    meniscus: '#BAE6FD',
    bubble: '#F0F9FF',
    accentText: 'text-sky-700',
    reagentLabel: 'Uji Kekeruhan, Mineral & Mikrobiologi',
    reactionNote:
      'Verifikasi kejernihan optik, kandungan ion terlarut, serta indikator mikrobiologi standar air minum.',
  },
};

const BUBBLES = [
  { cx: 52, r: 2.6, delay: 0, duration: 2.7, driftX: -4 },
  { cx: 66, r: 3.4, delay: 0.55, duration: 3.2, driftX: 5 },
  { cx: 79, r: 2.3, delay: 1.15, duration: 2.5, driftX: -3 },
  { cx: 59, r: 2.1, delay: 1.75, duration: 3.0, driftX: 4 },
  { cx: 73, r: 2.9, delay: 0.85, duration: 3.5, driftX: -5 },
  { cx: 86, r: 1.9, delay: 1.45, duration: 2.8, driftX: 3 },
  { cx: 62, r: 2.5, delay: 2.1, duration: 3.1, driftX: -2 },
];

export function ErlenmeyerReaction({
  matrix,
  regulationCode,
  scrollProgress,
  selectedParamCount,
  pointCount,
}: ErlenmeyerReactionProps) {
  const shouldReduceMotion = useReducedMotion();
  const theme = MATRIX_REACTION_THEME[matrix];

  // Scroll-linked liquid tilt and gentle vertical float inside the simulation slide
  const liquidTilt = useTransform(scrollProgress, [0, 0.5, 1], [-5.5, 0, 5.5]);
  const flaskFloatY = useTransform(scrollProgress, [0, 1], [10, -10]);

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 sm:p-7">
      {/* Enlarged Erlenmeyer Reaction Viewport */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50/85 px-6 py-8 min-h-[260px] sm:min-h-[300px]">
        {/* Subtle volumetric background grid */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 55%, rgba(148, 163, 184, 0.14) 0%, transparent 65%)',
          }}
        />

        <motion.div
          style={shouldReduceMotion ? undefined : { y: flaskFloatY }}
          className="relative flex h-56 w-48 items-center justify-center sm:h-64 sm:w-56"
          aria-hidden="true"
        >
          <svg viewBox="0 0 140 156" className="h-full w-full overflow-visible">
            <defs>
              <clipPath id="erlenmeyer-liquid-clip-lg">
                <path d="M58 24 V50 L25.5 120.5 C22.5 128.5 28.5 137 38 137 H102 C111.5 137 117.5 128.5 114.5 120.5 L82 50 V24 Z" />
              </clipPath>
              <linearGradient id="erlenmeyer-fluid-grad-lg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.liquidTop} stopOpacity="0.86" />
                <stop offset="100%" stopColor={theme.liquidBottom} stopOpacity="0.96" />
              </linearGradient>
              <linearGradient id="erlenmeyer-fluid-deep-lg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.liquidBottom} stopOpacity="0.4" />
                <stop offset="100%" stopColor={theme.liquidDeep} stopOpacity="0.85" />
              </linearGradient>
            </defs>

            {/* Subtle vapor wisps escaping flask neck */}
            {!shouldReduceMotion && (
              <g>
                <motion.circle
                  cx="65"
                  cy="14"
                  r="3"
                  fill={theme.liquidTop}
                  initial={{ opacity: 0, y: 0, scale: 0.7 }}
                  animate={{
                    opacity: [0, 0.42, 0],
                    y: [-2, -14, -24],
                    scale: [0.7, 1.15, 1.45],
                  }}
                  transition={{ duration: 3.0, repeat: Infinity, ease: 'easeOut' }}
                />
                <motion.circle
                  cx="75"
                  cy="16"
                  r="2.4"
                  fill={theme.meniscus}
                  initial={{ opacity: 0, y: 0, scale: 0.6 }}
                  animate={{
                    opacity: [0, 0.38, 0],
                    y: [0, -12, -21],
                    scale: [0.6, 1.05, 1.3],
                  }}
                  transition={{ duration: 2.6, delay: 1.0, repeat: Infinity, ease: 'easeOut' }}
                />
                <motion.circle
                  cx="69"
                  cy="12"
                  r="2.1"
                  fill={theme.liquidTop}
                  initial={{ opacity: 0, y: 0, scale: 0.65 }}
                  animate={{
                    opacity: [0, 0.32, 0],
                    y: [-1, -15, -26],
                    scale: [0.65, 1.0, 1.35],
                  }}
                  transition={{ duration: 3.4, delay: 1.8, repeat: Infinity, ease: 'easeOut' }}
                />
              </g>
            )}

            {/* Liquid & Effervescence Clipped Inside Flask */}
            <g clipPath="url(#erlenmeyer-liquid-clip-lg)">
              <motion.g
                style={
                  shouldReduceMotion
                    ? undefined
                    : { rotate: liquidTilt, transformOrigin: '70px 104px' }
                }
              >
                {/* Secondary Deeper Liquid Swell */}
                <motion.path
                  d="M-30 85 Q-6 90 18 85 T66 85 T114 85 T162 85 T210 85 V156 H-30 Z"
                  fill="url(#erlenmeyer-fluid-deep-lg)"
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : {
                          x: [-48, 0],
                        }
                  }
                  transition={{
                    duration: 4.8,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />

                {/* Primary Oscillating Wave + Fluid Body */}
                <motion.path
                  d="M-30 84 Q-6 78 18 84 T66 84 T114 84 T162 84 T210 84 V156 H-30 Z"
                  fill="url(#erlenmeyer-fluid-grad-lg)"
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : {
                          x: [0, -48],
                        }
                  }
                  transition={{
                    duration: 3.6,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />

                {/* Meniscus Highlight Line */}
                <motion.path
                  d="M-30 84 Q-6 78 18 84 T66 84 T114 84 T162 84 T210 84"
                  fill="none"
                  stroke={theme.meniscus}
                  strokeWidth="2.2"
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : {
                          x: [0, -48],
                        }
                  }
                  transition={{
                    duration: 3.6,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
              </motion.g>

              {/* Reaction Glow Core at Bottom of Flask */}
              <motion.ellipse
                cx="70"
                cy="125"
                rx="28"
                ry="8"
                fill={theme.meniscus}
                animate={
                  shouldReduceMotion
                    ? { opacity: 0.28 }
                    : { opacity: [0.18, 0.45, 0.18], scale: [0.92, 1.08, 0.92] }
                }
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Rising Micro-Bubbles */}
              {BUBBLES.map((b, i) => (
                <motion.circle
                  key={i}
                  cx={b.cx}
                  cy={130}
                  r={b.r}
                  fill={theme.bubble}
                  initial={{ opacity: 0, y: 0, x: 0 }}
                  animate={
                    shouldReduceMotion
                      ? { opacity: 0.55, y: -18 - i * 5 }
                      : {
                          opacity: [0, 0.88, 0.78, 0],
                          y: [0, -18, -36, -48],
                          x: [0, b.driftX, -b.driftX * 0.5, b.driftX * 0.65],
                        }
                  }
                  transition={{
                    duration: b.duration,
                    delay: b.delay,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </g>

            {/* Erlenmeyer Borosilicate Glass Body */}
            <path
              d="M54 20 H86 M57.5 20 V50 L24 121.5 C20.5 130 27 139 37.5 139 H102.5 C113 139 119.5 130 116 121.5 L82.5 50 V20"
              fill="none"
              stroke="#0F172A"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Flask Rim */}
            <rect x="51" y="16" width="38" height="4.5" rx="2.25" fill="#0F172A" />

            {/* Glass Specular Reflections */}
            <path
              d="M61 31 V50 L36 106"
              fill="none"
              stroke="rgba(255,255,255,0.72)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M34 114 L31 121"
              fill="none"
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Volumetric Graduation Marks */}
            <g stroke="#334155" strokeWidth="1.2" strokeLinecap="round" opacity="0.7">
              <line x1="81" y1="68" x2="89" y2="68" />
              <line x1="86" y1="84" x2="96" y2="84" />
              <line x1="92" y1="100" x2="103" y2="100" />
              <line x1="98" y1="116" x2="110" y2="116" />
            </g>
            <g fill="#475569" fontSize="6.5" fontFamily="monospace" opacity="0.8">
              <text x="92" y="70">100</text>
              <text x="99" y="86">150</text>
              <text x="106" y="102">200</text>
              <text x="113" y="118">250 mL</text>
            </g>
          </svg>
        </motion.div>
      </div>

      {/* Descriptive Text Placed Directly Below the Erlenmeyer Animation */}
      <div className="mt-6 border-t border-slate-200 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={`font-mono text-xs font-semibold ${theme.accentText}`}>
            Simulasi Reaksi Uji · {matrix}
          </p>
          <span className="font-mono text-xs text-slate-500">
            {regulationCode} · {selectedParamCount} parameter · {pointCount} titik
          </span>
        </div>
        <h3 className="mt-2 font-display text-lg font-semibold text-slate-900">
          {theme.reagentLabel}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{theme.reactionNote}</p>
        <p className="mt-2 text-xs text-slate-500">
          Pilih matriks atau sesuaikan parameter pada kartu simulasi di samping untuk melihat
          perubahan reaksi serta estimasi tarif secara langsung.
        </p>
      </div>
    </div>
  );
}
