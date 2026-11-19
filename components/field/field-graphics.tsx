/** Decorative graphics for the field-notebook design. Pure SVG, deterministic, server-renderable. */

const STRATA = [
  { color: "var(--fd-sand)", flex: 5 },
  { color: "var(--fd-clay)", flex: 3 },
  { color: "var(--fd-silt)", flex: 4 },
  { color: "var(--fd-water)", flex: 2 },
  { color: "var(--fd-gravel)", flex: 3 },
  { color: "var(--fd-ochre)", flex: 2 },
] as const;

/** Thin multicoloured band under the masthead, read as soil layers. */
export function StrataStrip() {
  return (
    <div className="fd-strata" aria-hidden="true">
      {STRATA.map((layer, i) => (
        <span key={i} style={{ background: layer.color, flex: layer.flex }} />
      ))}
    </div>
  );
}

function contourPath(cx: number, cy: number, radius: number, phase: number): string {
  const steps = 72;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    const r =
      radius *
      (1 + 0.13 * Math.sin(3 * t + phase) + 0.07 * Math.sin(5 * t + 1.3 + phase * 0.6) + 0.04 * Math.cos(7 * t + phase));
    pts.push(`${(cx + r * Math.cos(t) * 1.35).toFixed(1)},${(cy + r * Math.sin(t)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

/** Topographic contour texture behind the home hero. */
export function ContourBackdrop({ className = "" }: { className?: string }) {
  const rings: Array<{ d: string; index: boolean }> = [];
  for (let k = 1; k <= 11; k += 1) {
    rings.push({ d: contourPath(930, 210, 26 * k, k * 0.35), index: k % 5 === 0 });
  }
  for (let k = 1; k <= 6; k += 1) {
    rings.push({ d: contourPath(240, 470, 30 * k, 2 + k * 0.4), index: k % 5 === 0 });
  }
  return (
    <svg className={className} viewBox="0 0 1200 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {rings.map((ring, i) => (
        <path key={i} d={ring.d} fill="none" stroke="currentColor" strokeWidth={ring.index ? 1.6 : 0.8} />
      ))}
    </svg>
  );
}

const LOG_LAYERS = [
  { from: 0, to: 1.2, name: "Made ground", fill: "url(#fd-made)" },
  { from: 1.2, to: 5, name: "CLAY, firm", fill: "url(#fd-clay)" },
  { from: 5, to: 9.5, name: "SAND, medium dense", fill: "url(#fd-sand)" },
  { from: 9.5, to: 12, name: "SILT, stiff", fill: "url(#fd-silt)" },
  { from: 12, to: 15, name: "GRAVEL, dense", fill: "url(#fd-gravel)" },
] as const;

const LOG_SPT: Array<[number, number]> = [
  [1.5, 6],
  [3, 8],
  [4.5, 11],
  [6, 17],
  [7.5, 21],
  [9, 26],
  [10.5, 19],
  [12, 34],
  [13.5, 42],
];

/** Small illustrative borehole log (not data from any real site). */
export function BoreholeLogIllustration({ className = "" }: { className?: string }) {
  const top = 34;
  const scale = 17;
  const y = (d: number) => top + d * scale;
  const colX = 34;
  const colW = 44;
  const plotX = 150;
  const plotW = 72;
  const nx = (n: number) => plotX + (n / 50) * plotW;
  return (
    <svg className={className} viewBox="0 0 240 310" role="img" aria-label="Illustrative borehole log with soil layers and SPT N values">
      <defs>
        <pattern id="fd-made" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#d6cfc0" />
          <path d="M0 8L8 0M-2 2L2 -2M6 10L10 6" stroke="#6e6b64" strokeWidth="0.8" />
          <path d="M0 0L8 8" stroke="#6e6b64" strokeWidth="0.8" />
        </pattern>
        <pattern id="fd-clay" width="10" height="6" patternUnits="userSpaceOnUse">
          <rect width="10" height="6" fill="#c98a67" />
          <path d="M0 3H6" stroke="#7d3a1c" strokeWidth="0.9" />
        </pattern>
        <pattern id="fd-sand" width="7" height="7" patternUnits="userSpaceOnUse">
          <rect width="7" height="7" fill="#e6cd94" />
          <circle cx="2" cy="2" r="0.8" fill="#8a6a2a" />
          <circle cx="5.5" cy="5" r="0.8" fill="#8a6a2a" />
        </pattern>
        <pattern id="fd-silt" width="10" height="6" patternUnits="userSpaceOnUse">
          <rect width="10" height="6" fill="#bdb99d" />
          <path d="M0 2H4M5 4.5H9" stroke="#5f5c45" strokeWidth="0.8" />
        </pattern>
        <pattern id="fd-gravel" width="12" height="10" patternUnits="userSpaceOnUse">
          <rect width="12" height="10" fill="#b3bcc0" />
          <ellipse cx="3.5" cy="3" rx="2.4" ry="1.7" fill="none" stroke="#3f4a50" strokeWidth="0.8" />
          <ellipse cx="9" cy="7.5" rx="2" ry="1.5" fill="none" stroke="#3f4a50" strokeWidth="0.8" />
        </pattern>
      </defs>

      <text x={colX} y={14} fontFamily="var(--fd-mono)" fontSize="9" letterSpacing="1.2" fill="var(--fd-ink)">
        BH-01
      </text>
      <text x={plotX} y={14} fontFamily="var(--fd-mono)" fontSize="9" letterSpacing="1.2" fill="var(--fd-ink)">
        SPT N
      </text>

      {/* Depth axis */}
      {[0, 3, 6, 9, 12, 15].map((d) => (
        <g key={d}>
          <line x1={colX - 5} x2={colX} y1={y(d)} y2={y(d)} stroke="var(--fd-ink)" strokeWidth="0.8" />
          <text x={colX - 8} y={y(d) + 3} textAnchor="end" fontFamily="var(--fd-mono)" fontSize="8" fill="var(--fd-muted)">
            {d}
          </text>
        </g>
      ))}

      {/* Strata column */}
      {LOG_LAYERS.map((layer) => (
        <g key={layer.name}>
          <rect x={colX} y={y(layer.from)} width={colW} height={(layer.to - layer.from) * scale} fill={layer.fill} />
          <line x1={colX} x2={colX + colW + 4} y1={y(layer.from)} y2={y(layer.from)} stroke="var(--fd-ink)" strokeWidth="0.7" />
          <text
            x={colX + colW + 6}
            y={y((layer.from + layer.to) / 2) + 3}
            fontFamily="var(--fd-mono)"
            fontSize="6.6"
            fill="var(--fd-text-2)"
          >
            {layer.name.split(",")[0]}
          </text>
        </g>
      ))}
      <rect x={colX} y={y(0)} width={colW} height={15 * scale} fill="none" stroke="var(--fd-ink)" strokeWidth="1" />

      {/* Groundwater */}
      <g>
        <path d={`M${colX - 18} ${y(2.8) - 6}h10l-5 6z`} fill="var(--fd-water)" />
        <line x1={colX - 20} x2={colX + colW} y1={y(2.8)} y2={y(2.8)} stroke="var(--fd-water)" strokeWidth="0.9" strokeDasharray="3 2" />
      </g>

      {/* SPT plot */}
      <line x1={plotX} x2={plotX} y1={y(0)} y2={y(15)} stroke="var(--fd-ink)" strokeWidth="0.8" />
      {[10, 20, 30, 40, 50].map((n) => (
        <line key={n} x1={nx(n)} x2={nx(n)} y1={y(0)} y2={y(15)} stroke="var(--fd-rule-strong)" strokeWidth="0.5" strokeDasharray="2 3" />
      ))}
      <polyline
        points={LOG_SPT.map(([d, n]) => `${nx(n).toFixed(1)},${y(d).toFixed(1)}`).join(" ")}
        fill="none"
        stroke="var(--fd-clay)"
        strokeWidth="1.2"
      />
      {LOG_SPT.map(([d, n]) => (
        <circle key={d} cx={nx(n)} cy={y(d)} r="2.4" fill="var(--fd-card)" stroke="var(--fd-clay)" strokeWidth="1.2" />
      ))}
      <text x={plotX} y={y(15) + 14} fontFamily="var(--fd-mono)" fontSize="7.5" fill="var(--fd-muted)">
        0
      </text>
      <text x={plotX + plotW} y={y(15) + 14} textAnchor="end" fontFamily="var(--fd-mono)" fontSize="7.5" fill="var(--fd-muted)">
        50
      </text>
      <text x={colX - 8} y={y(15) + 14} textAnchor="end" fontFamily="var(--fd-mono)" fontSize="7.5" fill="var(--fd-muted)">
        m
      </text>
    </svg>
  );
}
