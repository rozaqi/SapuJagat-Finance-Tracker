// charts.jsx — hand-built SVG charts: BalanceChart (area) + DonutChart
const { useState, useRef } = React;

// ---------------- Balance area chart ----------------
function BalanceChart({ points, accent }) {
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);
  const W = 760,H = 240;
  const padL = 8,padR = 8,padT = 18,padB = 28;

  if (!points || points.length < 2) return null;

  const vals = points.map((p) => p.balance);
  let min = Math.min(...vals),max = Math.max(...vals);
  const span = max - min || 1;
  min -= span * 0.18;max += span * 0.12;

  const x = (i) => padL + i / (points.length - 1) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.balance).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${x(points.length - 1).toFixed(1)},${H - padB} L${x(0).toFixed(1)},${H - padB} Z`;

  function onMove(e) {
    const rect = wrapRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width * W;
    let idx = Math.round((px - padL) / (W - padL - padR) * (points.length - 1));
    idx = Math.max(0, Math.min(points.length - 1, idx));
    setHover(idx);
  }

  // sparse x labels
  const labelIdx = [0, Math.floor((points.length - 1) / 2), points.length - 1];

  return (
    <div className="balance-wrap" ref={wrapRef} style={{ position: "relative", width: "100%", height: "100%" }}
         onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="balance-chart" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
        <defs>
          <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#balFill)" />
        <path d={linePath} fill="none" stroke={accent} strokeWidth="2.5"
        strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {/* x labels */}
        {labelIdx.map((i) =>
        <text key={i} x={Math.max(padL + 14, Math.min(W - padR - 14, x(i)))} y={H - 8}
        className="chart-axis-label" textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}>
            {points[i].dateLabel}
          </text>
        )}
        {/* hover */}
        {hover !== null &&
        <g>
            <line x1={x(hover)} y1={padT} x2={x(hover)} y2={H - padB} className="chart-hover-line" />
            <circle cx={x(hover)} cy={y(points[hover].balance)} r="5" fill={accent} stroke="var(--card)" strokeWidth="2.5" />
          </g>
        }
        {/* end dot */}
        {hover === null &&
        <circle cx={x(points.length - 1)} cy={y(points[points.length - 1].balance)} r="5"
        fill={accent} stroke="var(--card)" strokeWidth="2.5" />
        }
      </svg>
      {hover !== null && (
        <div className="cf-tip" style={{ left: `${(padL + (W - padL - padR) * (hover / (points.length - 1))) / W * 100}%` }}>
          <div className="cf-tip-label">{points[hover].fullDate}</div>
          <div className="cf-tip-row">
            <span className="cf-dot" style={{ background: accent }}></span>
            Saldo: <strong>{formatRp(points[hover].balance)}</strong>
          </div>
        </div>
      )}
    </div>);

}

function BalanceTooltip({ points, hover }) {
  if (hover === null || !points[hover]) return null;
  const p = points[hover];
  const left = hover / (points.length - 1) * 100;
  return (
    <div className="bal-tip" style={{ left: `${left}%` }}>
      <div className="bal-tip-date">{p.fullDate}</div>
      <div className="bal-tip-val">{formatRp(p.balance)}</div>
    </div>);

}

// ---------------- Cashflow chart (income vs expense bars) ----------------
function CashflowChart({ buckets }) {
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);
  const W = 760, H = 240, padL = 8, padR = 8, padT = 22, padB = 30;
  if (!buckets || !buckets.length) return null;

  const maxVal = Math.max(1, ...buckets.flatMap((b) => [b.income, b.expense]));
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const n = buckets.length;
  const groupW = innerW / n;
  const barW = Math.min(26, groupW * 0.30);
  const gap = barW * 0.34;
  const scale = (v) => v / maxVal * innerH;
  const baseY = H - padB;

  function onMove(e) {
    const rect = wrapRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width * W;
    let idx = Math.floor((px - padL) / groupW);
    idx = Math.max(0, Math.min(n - 1, idx));
    setHover(idx);
  }

  return (
    <div className="cashflow-wrap" ref={wrapRef}>
      <svg viewBox={`0 0 ${W} ${H}`} className="cashflow-chart" preserveAspectRatio="none"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <line x1={padL} y1={baseY} x2={W - padR} y2={baseY} className="chart-baseline" />
        {buckets.map((b, i) => {
          const cx = padL + groupW * i + groupW / 2;
          const incX = cx - gap / 2 - barW;
          const expX = cx + gap / 2;
          const rx = Math.min(6, barW / 2);
          return (
            <g key={i} opacity={hover === null || hover === i ? 1 : 0.5} style={{ transition: "opacity .15s" }}>
              <rect x={incX} y={baseY - scale(b.income)} width={barW} height={Math.max(1, scale(b.income))}
                rx={rx} fill="var(--good)" />
              <rect x={expX} y={baseY - scale(b.expense)} width={barW} height={Math.max(1, scale(b.expense))}
                rx={rx} fill="var(--warm)" />
              <text x={cx} y={H - 9} className="chart-axis-label" textAnchor="middle">{b.label}</text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="cf-tip" style={{ left: `${(padL + groupW * hover + groupW / 2) / W * 100}%` }}>
          <div className="cf-tip-label">{buckets[hover].label}</div>
          <div className="cf-tip-row"><span className="cf-dot good"></span>Masuk <strong>{formatRp(buckets[hover].income)}</strong></div>
          <div className="cf-tip-row"><span className="cf-dot warm"></span>Keluar <strong>{formatRp(buckets[hover].expense)}</strong></div>
        </div>
      )}
    </div>
  );
}

// ---------------- Donut chart ----------------
function DonutChart({ data, size = 200, stroke = 22 }) {
  const [active, setActive] = useState(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  let offset = 0;
  const cx = size / 2,cy = size / 2;

  return (
    <div className="donut-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} className="donut" style={{ width: size, height: size }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * C;
          const seg =
          <circle key={d.key} cx={cx} cy={cy} r={r} fill="none"
          stroke={d.color} strokeWidth={active === null || active === i ? stroke : stroke - 6}
          strokeDasharray={`${dash} ${C - dash}`}
          strokeDashoffset={-offset}
          strokeLinecap="butt"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-width .2s", opacity: active === null || active === i ? 1 : 0.45 }}
          onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} />;

          offset += dash;
          return seg;
        })}
      </svg>
      <div className="donut-center">
        {active === null ?
        <>
            <div className="donut-center-label">Total keluar</div>
            <div className="donut-center-val">{formatRp(total)}</div>
          </> :

        <>
            <div className="donut-center-label">{data[active].emoji} {data[active].label}</div>
            <div className="donut-center-val">{formatRp(data[active].value)}</div>
            <div className="donut-center-pct">{Math.round(data[active].value / total * 100)}%</div>
          </>
        }
      </div>
    </div>);

}

Object.assign(window, { BalanceChart, BalanceTooltip, DonutChart, CashflowChart });