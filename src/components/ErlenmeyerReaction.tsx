import {
  MotionValue,
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react';

interface ErlenmeyerReactionProps {
  scrollProgress: MotionValue<number>;
}

const REACTION_BUBBLES = [
  { cx: 58, cy: 154, r: 2.2, delay: 0, duration: 2.9, driftX: -3 },
  { cx: 73, cy: 151, r: 1.8, delay: 0.7, duration: 3.3, driftX: 2.5 },
  { cx: 112, cy: 152, r: 2.4, delay: 0.35, duration: 3.1, driftX: -2.5 },
  { cx: 127, cy: 155, r: 1.7, delay: 1.25, duration: 2.7, driftX: 3 },
  { cx: 64, cy: 149, r: 1.5, delay: 1.75, duration: 3.4, driftX: 2 },
  { cx: 120, cy: 150, r: 1.9, delay: 2.05, duration: 3.0, driftX: -2 },
];

export function ErlenmeyerReaction({ scrollProgress }: ErlenmeyerReactionProps) {
  const shouldReduceMotion = useReducedMotion();

  const smoothProgress = useSpring(scrollProgress, {
    stiffness: 115,
    damping: 22,
    restDelta: 0.001,
  });

  // Gentle vertical float & organic breeze sway responding to scroll
  const flaskFloatY = useTransform(smoothProgress, [0, 1], [6, -4]);
  const plantSway = useTransform(smoothProgress, [0, 0.5, 1], [-1.8, 1.2, 0]);

  // Progressive growth stages: reaches 100% when user arrives at the simulation slide
  const rootProgress = useTransform(smoothProgress, [0.02, 0.34], [0.18, 1]);
  const stemProgress = useTransform(smoothProgress, [0.04, 0.72], [0.08, 1]);

  const cotyledonLeftScale = useTransform(smoothProgress, [0.12, 0.34], [0.12, 1]);
  const cotyledonLeftOpacity = useTransform(smoothProgress, [0.1, 0.24], [0.25, 1]);

  const cotyledonRightScale = useTransform(smoothProgress, [0.16, 0.38], [0.12, 1]);
  const cotyledonRightOpacity = useTransform(smoothProgress, [0.14, 0.28], [0.25, 1]);

  const midLeftLeafScale = useTransform(smoothProgress, [0.24, 0.5], [0.05, 1]);
  const midLeftLeafOpacity = useTransform(smoothProgress, [0.22, 0.38], [0, 1]);

  const midRightLeafScale = useTransform(smoothProgress, [0.34, 0.6], [0.05, 1]);
  const midRightLeafOpacity = useTransform(smoothProgress, [0.32, 0.48], [0, 1]);

  const upperLeftLeafScale = useTransform(smoothProgress, [0.44, 0.7], [0.05, 1]);
  const upperLeftLeafOpacity = useTransform(smoothProgress, [0.42, 0.58], [0, 1]);

  const upperRightLeafScale = useTransform(smoothProgress, [0.52, 0.78], [0.05, 1]);
  const upperRightLeafOpacity = useTransform(smoothProgress, [0.5, 0.66], [0, 1]);

  const mouthLeafScale = useTransform(smoothProgress, [0.62, 0.88], [0.05, 1]);
  const mouthLeafOpacity = useTransform(smoothProgress, [0.6, 0.78], [0, 1]);

  const crownScale = useTransform(smoothProgress, [0.7, 0.96], [0.05, 1]);
  const crownOpacity = useTransform(smoothProgress, [0.68, 0.86], [0, 1]);

  const bubblesOpacity = useTransform(smoothProgress, [0.35, 0.75], [0.2, 0.9]);

  return (
    <div className="flex items-center justify-center">
      <motion.div
        style={shouldReduceMotion ? undefined : { y: flaskFloatY }}
        className="relative flex h-72 w-72 items-center justify-center sm:h-80 sm:w-80 lg:h-[340px] lg:w-[340px]"
        aria-hidden="true"
      >
        <svg viewBox="0 -26 210 222" className="h-full w-full overflow-visible">
          <defs>
            {/* Exact centerline match with outer glass wall so bottom soil sits 100% flush */}
            <clipPath id="erlenmeyer-plant-clip">
              <path d="M75.5 23 V63 L32 161 C28 171 36 183 48.5 183 H135.5 C148 183 156 171 152 161 L108.5 63 V23 Z" />
            </clipPath>
            <linearGradient id="hydro-medium-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.34" />
            </linearGradient>
            <linearGradient id="soil-bed-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="55%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>
            <linearGradient id="leaf-emerald-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="leaf-bright-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6EE7B7" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>

          {/* Lower Contents Clipped Inside Borosilicate Erlenmeyer */}
          <g clipPath="url(#erlenmeyer-plant-clip)">
            {/* Subtle Nutrient Moisture Layer Above Soil */}
            <path
              d="M20 147 Q56 143 92 147 T164 147 V190 H20 Z"
              fill="url(#hydro-medium-grad)"
            />
            <path
              d="M20 147 Q56 143 92 147 T164 147"
              fill="none"
              stroke="#34D399"
              strokeWidth="1.5"
              strokeOpacity="0.55"
            />

            {/* Bottom Soil Substrate Sitting Flush Against Bottom Glass Line */}
            <path
              d="M20 160 Q56 156.5 92 160 T164 160 V190 H20 Z"
              fill="url(#soil-bed-grad)"
            />
            <path
              d="M20 160 Q56 156.5 92 160 T164 160"
              fill="none"
              stroke="#475569"
              strokeWidth="1.2"
              strokeOpacity="0.8"
            />

            {/* Subtle Soil Texture Granules */}
            <g fill="#64748B" opacity="0.45">
              <circle cx="52" cy="171" r="1.4" />
              <circle cx="67" cy="176" r="1.1" />
              <circle cx="80" cy="168" r="1.3" />
              <circle cx="105" cy="174" r="1.5" />
              <circle cx="122" cy="169" r="1.2" />
              <circle cx="134" cy="177" r="1.3" />
            </g>

            {/* Reaction Bubbles Rising Inside Lower Flask Moisture Chamber */}
            <motion.g style={shouldReduceMotion ? { opacity: 0.6 } : { opacity: bubblesOpacity }}>
              {REACTION_BUBBLES.map((bubble, idx) => (
                <motion.circle
                  key={idx}
                  cx={bubble.cx}
                  cy={bubble.cy}
                  r={bubble.r}
                  fill={idx % 2 === 0 ? '#06B6D4' : '#34D399'}
                  initial={{ opacity: 0, y: 0, x: 0 }}
                  animate={
                    shouldReduceMotion
                      ? { opacity: 0.45, y: -18 - idx * 3 }
                      : {
                          opacity: [0, 0.72, 0.55, 0],
                          y: [0, -16, -34, -48],
                          x: [0, bubble.driftX, -bubble.driftX * 0.6, bubble.driftX * 0.4],
                        }
                  }
                  transition={{
                    duration: bubble.duration,
                    delay: bubble.delay,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </motion.g>

            {/* Root System Growing Downward into Soil */}
            <g fill="none" stroke="#6EE7B7" strokeLinecap="round" strokeOpacity="0.85">
              <motion.path
                d="M92 158 Q91 168 92 179"
                strokeWidth="1.9"
                style={{ pathLength: shouldReduceMotion ? 1 : rootProgress }}
              />
              <motion.path
                d="M92 161 Q81 168 68 177"
                strokeWidth="1.5"
                style={{ pathLength: shouldReduceMotion ? 1 : rootProgress }}
              />
              <motion.path
                d="M92 163 Q103 169 116 178"
                strokeWidth="1.5"
                style={{ pathLength: shouldReduceMotion ? 1 : rootProgress }}
              />
              <motion.path
                d="M81 168 Q77 174 74 180"
                strokeWidth="1.1"
                style={{ pathLength: shouldReduceMotion ? 1 : rootProgress }}
              />
              <motion.path
                d="M103 169 Q108 175 111 180"
                strokeWidth="1.1"
                style={{ pathLength: shouldReduceMotion ? 1 : rootProgress }}
              />
            </g>

            {/* Germinating Seed Base Seated in Soil */}
            <ellipse cx="92" cy="158" rx="5" ry="3.4" fill="#047857" />

            {/* Lower & Mid Foliage Clipped Safely Inside Conical Body */}
            <motion.g
              style={
                shouldReduceMotion
                  ? undefined
                  : { rotate: plantSway, transformOrigin: '92px 158px' }
              }
            >
              {/* Stage 1A: Lower Left Cotyledon (y=137) */}
              <g transform="translate(91, 137)">
                <motion.g
                  style={
                    shouldReduceMotion
                      ? undefined
                      : {
                          scale: cotyledonLeftScale,
                          opacity: cotyledonLeftOpacity,
                          transformOrigin: '0px 0px',
                        }
                  }
                >
                  <path
                    d="M0 0 C-11 -2, -21 -9, -24 -17 C-14 -17, -4 -10, 0 0 Z"
                    fill="url(#leaf-bright-grad)"
                  />
                  <path
                    d="M-1 -1 C-8 -5, -15 -9, -20 -15"
                    fill="none"
                    stroke="#065F46"
                    strokeWidth="0.9"
                    strokeOpacity="0.45"
                    strokeLinecap="round"
                  />
                </motion.g>
              </g>

              {/* Stage 1B: Lower Right Cotyledon (y=133) */}
              <g transform="translate(93, 133)">
                <motion.g
                  style={
                    shouldReduceMotion
                      ? undefined
                      : {
                          scale: cotyledonRightScale,
                          opacity: cotyledonRightOpacity,
                          transformOrigin: '0px 0px',
                        }
                  }
                >
                  <path
                    d="M0 0 C11 -2, 21 -9, 24 -17 C14 -17, 4 -10, 0 0 Z"
                    fill="url(#leaf-emerald-grad)"
                  />
                  <path
                    d="M1 -1 C8 -5, 15 -9, 20 -15"
                    fill="none"
                    stroke="#065F46"
                    strokeWidth="0.9"
                    strokeOpacity="0.45"
                    strokeLinecap="round"
                  />
                </motion.g>
              </g>

              {/* Stage 2A: Mid-Lower Left Leaf (y=116) */}
              <g transform="translate(91, 116)">
                <motion.g
                  style={
                    shouldReduceMotion
                      ? undefined
                      : {
                          scale: midLeftLeafScale,
                          opacity: midLeftLeafOpacity,
                          transformOrigin: '0px 0px',
                        }
                  }
                >
                  <path
                    d="M0 0 C-13 -1, -29 -11, -34 -24 C-20 -25, -6 -15, 0 0 Z"
                    fill="url(#leaf-emerald-grad)"
                  />
                  <path
                    d="M-1 -1 C-11 -7, -21 -13, -29 -21"
                    fill="none"
                    stroke="#064E3B"
                    strokeWidth="1"
                    strokeOpacity="0.4"
                    strokeLinecap="round"
                  />
                </motion.g>
              </g>

              {/* Stage 2B: Mid-Upper Right Leaf (y=102) */}
              <g transform="translate(93, 102)">
                <motion.g
                  style={
                    shouldReduceMotion
                      ? undefined
                      : {
                          scale: midRightLeafScale,
                          opacity: midRightLeafOpacity,
                          transformOrigin: '0px 0px',
                        }
                  }
                >
                  <path
                    d="M0 0 C13 -1, 27 -11, 31 -22 C18 -23, 6 -14, 0 0 Z"
                    fill="url(#leaf-bright-grad)"
                  />
                  <path
                    d="M1 -1 C10 -7, 19 -13, 26 -19"
                    fill="none"
                    stroke="#064E3B"
                    strokeWidth="1"
                    strokeOpacity="0.4"
                    strokeLinecap="round"
                  />
                </motion.g>
              </g>

              {/* Stage 3A: Upper Left Leaf (y=83) */}
              <g transform="translate(91, 83)">
                <motion.g
                  style={
                    shouldReduceMotion
                      ? undefined
                      : {
                          scale: upperLeftLeafScale,
                          opacity: upperLeftLeafOpacity,
                          transformOrigin: '0px 0px',
                        }
                  }
                >
                  <path
                    d="M0 0 C-10 -2, -21 -11, -23 -20 C-12 -20, -4 -12, 0 0 Z"
                    fill="url(#leaf-bright-grad)"
                  />
                  <path
                    d="M-1 -1 C-8 -6, -14 -11, -19 -17"
                    fill="none"
                    stroke="#065F46"
                    strokeWidth="0.9"
                    strokeOpacity="0.4"
                    strokeLinecap="round"
                  />
                </motion.g>
              </g>

              {/* Stage 3B: Upper Right Leaf (y=72) */}
              <g transform="translate(93, 72)">
                <motion.g
                  style={
                    shouldReduceMotion
                      ? undefined
                      : {
                          scale: upperRightLeafScale,
                          opacity: upperRightLeafOpacity,
                          transformOrigin: '0px 0px',
                        }
                  }
                >
                  <path
                    d="M0 0 C9 -2, 18 -10, 20 -18 C11 -18, 3 -11, 0 0 Z"
                    fill="url(#leaf-emerald-grad)"
                  />
                  <path
                    d="M1 -1 C7 -5, 12 -10, 17 -15"
                    fill="none"
                    stroke="#065F46"
                    strokeWidth="0.9"
                    strokeOpacity="0.4"
                    strokeLinecap="round"
                  />
                </motion.g>
              </g>
            </motion.g>
          </g>

          {/* Main Stem & Apical Shoot Emerging Out Through the Erlenmeyer Mouth */}
          <motion.g
            style={
              shouldReduceMotion
                ? undefined
                : { rotate: plantSway, transformOrigin: '92px 158px' }
            }
          >
            {/* Continuous Stem Growing Upward Past the Flask Rim (y=18 -> y=2) */}
            <motion.path
              d="M92 157 C90 138, 94 118, 92 98 C90 76, 94 52, 92 28 C91 18, 92 10, 92 2"
              fill="none"
              stroke="#059669"
              strokeWidth="3.2"
              strokeLinecap="round"
              style={{ pathLength: shouldReduceMotion ? 1 : stemProgress }}
            />

            {/* Stage 4A: Emergent Leaf Pair Spreading Just Above the Rim (y=12) */}
            <g transform="translate(92, 12)">
              <motion.g
                style={
                  shouldReduceMotion
                    ? undefined
                    : {
                        scale: mouthLeafScale,
                        opacity: mouthLeafOpacity,
                        transformOrigin: '0px 0px',
                      }
                }
              >
                <path
                  d="M-1 0 C-10 -2, -19 -8, -22 -15 C-13 -16, -4 -9, -1 0 Z"
                  fill="url(#leaf-bright-grad)"
                />
                <path
                  d="M-1.5 -0.5 C-8 -4, -14 -8, -18 -13"
                  fill="none"
                  stroke="#065F46"
                  strokeWidth="0.9"
                  strokeOpacity="0.45"
                  strokeLinecap="round"
                />
                <path
                  d="M1 0 C10 -2, 19 -8, 22 -15 C13 -16, 4 -9, 1 0 Z"
                  fill="url(#leaf-emerald-grad)"
                />
                <path
                  d="M1.5 -0.5 C8 -4, 14 -8, 18 -13"
                  fill="none"
                  stroke="#065F46"
                  strokeWidth="0.9"
                  strokeOpacity="0.45"
                  strokeLinecap="round"
                />
              </motion.g>
            </g>

            {/* Stage 4B: Fresh Apical Crown Shoot Above the Erlenmeyer Mouth (y=2) */}
            <g transform="translate(92, 2)">
              <motion.g
                style={
                  shouldReduceMotion
                    ? undefined
                    : {
                        scale: crownScale,
                        opacity: crownOpacity,
                        transformOrigin: '0px 0px',
                      }
                }
              >
                {/* Central Young Leaf */}
                <path
                  d="M0 0 C-5 -8, -4 -17, 0 -22 C4 -17, 5 -8, 0 0 Z"
                  fill="#34D399"
                />
                {/* Left Crown Leaf */}
                <path
                  d="M-1 1 C-8 -3, -14 -10, -12 -16 C-6 -12, -2 -6, -1 1 Z"
                  fill="#10B981"
                />
                {/* Right Crown Leaf */}
                <path
                  d="M1 1 C8 -3, 14 -10, 12 -16 C6 -12, 2 -6, 1 1 Z"
                  fill="#6EE7B7"
                />
              </motion.g>
            </g>
          </motion.g>

          {/* Erlenmeyer Borosilicate Glass Outline */}
          <path
            d="M75.5 23 V63 L32 161 C28 171 36 183 48.5 183 H135.5 C148 183 156 171 152 161 L108.5 63 V23"
            fill="none"
            stroke="#0F172A"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Clean Transparent Open Glass Rim */}
          <path
            d="M87 18 H70 A2.5 2.5 0 0 0 70 23 H88 M96 23 H114 A2.5 2.5 0 0 0 114 18 H97"
            fill="none"
            stroke="#0F172A"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Borosilicate Specular Highlights */}
          <path
            d="M80 35 V63 L46 141"
            fill="none"
            stroke="rgba(255,255,255,0.78)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M43 150 L40 158"
            fill="none"
            stroke="rgba(255,255,255,0.65)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Volumetric Graduation Ticks (inside right wall) & Labels (clearly outside right wall) */}
          <g stroke="#475569" strokeWidth="1.2" strokeLinecap="round" opacity="0.72">
            <line x1="106" y1="80" x2="112" y2="80" />
            <line x1="115" y1="101" x2="121" y2="101" />
            <line x1="124" y1="122" x2="130.5" y2="122" />
            <line x1="133" y1="143" x2="140" y2="143" />
          </g>
          <g fill="#475569" fontSize="8" fontFamily="monospace" opacity="0.85">
            <text x="125" y="82.5" textAnchor="start">
              250 mL
            </text>
            <text x="134" y="103.5" textAnchor="start">
              150
            </text>
            <text x="144" y="124.5" textAnchor="start">
              100
            </text>
            <text x="153" y="145.5" textAnchor="start">
              50
            </text>
          </g>
        </svg>
      </motion.div>
    </div>
  );
}
