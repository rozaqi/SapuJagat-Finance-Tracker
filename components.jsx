// components.jsx — UI building blocks
const { useState: useStateC, useEffect: useEffectC, useRef: useRefC } = React;

// ---------------- Sidebar ----------------
function Sidebar({ active, onNav }) {
  const items = [
  { key: "beranda", emoji: "🏠", label: "Beranda" },
  { key: "transaksi", emoji: "🧾", label: "Transaksi" },
  { key: "kategori", emoji: "📊", label: "Kategori" },
  { key: "budget", emoji: "🎯", label: "Limit Budget" },
  { key: "insight", emoji: "✨", label: "Insight" }];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">◐</div>
        <div className="brand-name">Sapu<span>jagat</span></div>
      </div>
      <nav className="nav">
        {items.map((it) =>
        <button key={it.key}
        className={"nav-item" + (active === it.key ? " is-active" : "")}
        onClick={() => onNav(it.key)}>
            <span className="nav-emoji">{it.emoji}</span>
            <span>{it.label}</span>
          </button>
        )}
      </nav>
      <div className="sidebar-foot">
        <div className="profile">
          <div className="avatar">RA</div>
          <div className="profile-meta">
            <div className="profile-name">Rizky A.</div>
            <div className="profile-sub">Akun Pribadi</div>
          </div>
        </div>
      </div>
    </aside>);

}

// ---------------- Hero NL input ----------------
const EXAMPLES = [
"beli kopi 25rb tadi pagi",
"bensin motor 50rb",
"gaji 8,5 juta",
"makan siang gofood 58rb kemarin",
"beli sepatu 750rb"];


function NLInput({ onCommit }) {
  const cats = useCats();
  const [text, setText] = useStateC("");
  const [justAdded, setJustAdded] = useStateC(null);
  const inputRef = useRefC(null);
  const parsed = parseEntry(text);

  function commit() {
    if (!parsed.valid) return;
    onCommit(parsed);
    setJustAdded(parsed.label);
    setText("");
    setTimeout(() => setJustAdded(null), 2200);
    inputRef.current && inputRef.current.focus();
  }

  const cat = parsed.valid ? catOf(cats, parsed.category) : null;
  const dateText = parsed.dateOffset === 0 ? "Hari ini" :
  parsed.dateOffset === 1 ? "Kemarin" :
  parsed.dateOffset === 2 ? "Kemarin lusa" :
  `${parsed.dateOffset} hari lalu`;

  return (
    <div className="nl">
      <div className={"nl-bar" + (parsed.valid ? " is-valid" : "")}>
        <span className="nl-spark">✦</span>
        <input
          ref={inputRef}
          className="nl-input"
          value={text}
          placeholder="Catat transaksi pakai bahasa biasa…  misal: beli kopi 25rb tadi pagi"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {if (e.key === "Enter") commit();}} />
        
        <button className="nl-add" disabled={!parsed.valid} onClick={commit}>
          Catat <kbd>↵</kbd>
        </button>
      </div>

      {/* Live preview */}
      {text.trim() &&
      <div className="nl-preview">
        {!parsed.valid &&
        <span className="nl-hint">Sebutkan nominalnya juga, ya — misal “25rb” atau “1,5 juta”.</span>
        }
        {parsed.valid &&
        <>
            <span className="nl-chip" style={{ "--c": cat.color }}>
              <span className="nl-chip-emoji">{cat.emoji}</span>{cat.label}
            </span>
            <span className={"nl-amt " + parsed.type}>
              {parsed.type === "income" ? "+" : "−"}{formatRp(parsed.amount)}
            </span>
            <span className="nl-chip ghost">📅 {dateText}</span>
            <span className="nl-arrow">akan dicatat</span>
          </>
        }
      </div>
      }

      {/* Examples */}
      {!text.trim() &&
      <div className="nl-examples">
          <span className="nl-examples-label">Coba:</span>
          {EXAMPLES.map((ex) =>
        <button key={ex} className="ex-chip" onClick={() => {setText(ex);inputRef.current && inputRef.current.focus();}}>
              {ex}
            </button>
        )}
        </div>
      }

      {/* toast */}
      {justAdded &&
      <div className="nl-toast">✓ Tercatat: <strong>{justAdded}</strong></div>
      }
    </div>);

}

// ---------------- Stat cards ----------------
function StatCard({ label, value, sub, tone, icon }) {
  return (
    <div className={"stat-card" + (tone ? " tone-" + tone : "")}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>);

}

// ---------------- Transaction list ----------------
function relativeDay(ts) {
  const d = new Date(ts);const now = new Date();
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((b - a) / 86400000);
  if (diff === 0) return "Hari ini";
  if (diff === 1) return "Kemarin";
  if (diff < 7) return `${diff} hari lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function TransactionRow({ t, onDelete, onEdit }) {
  const cats = useCats();
  const cat = catOf(cats, t.category);
  return (
    <div className={"tx-row" + (onEdit ? " editable" : "")} onClick={onEdit ? () => onEdit(t) : undefined}>
      <div className="tx-icon" style={{ background: cat.color + "22", color: cat.color }}>{cat.emoji}</div>
      <div className="tx-main">
        <div className="tx-label">{t.label}</div>
        <div className="tx-meta">{cat.label} · {relativeDay(t.date)}</div>
      </div>
      <div className={"tx-amt " + t.type}>
        {t.type === "income" ? "+" : "−"}{formatRp(t.amount)}
      </div>
      <div className="tx-actions">
        {onEdit && <button className="tx-edit" title="Ubah" onClick={(e) => { e.stopPropagation(); onEdit(t); }}>✎</button>}
        {onDelete && <button className="tx-del" title="Hapus" onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}>🗑️</button>}
      </div>
    </div>);

}

function TransactionList({ transactions, onDelete, onEdit, limit }) {
  const sorted = [...transactions].sort((a, b) => b.date - a.date || b.id - a.id);
  const shown = limit ? sorted.slice(0, limit) : sorted;
  return (
    <div className="tx-list">
      {shown.length === 0 && <div className="empty">Belum ada transaksi. Catat yang pertama di atas ✨</div>}
      {shown.map((t) => <TransactionRow key={t.id} t={t} onDelete={onDelete} onEdit={onEdit} />)}
    </div>);

}

// ---------------- Insight cards ----------------
function InsightCard({ emoji, title, body, tone }) {
  return (
    <div className={"insight-card" + (tone ? " tone-" + tone : "")}>
      <div className="insight-emoji">{emoji}</div>
      <div>
        <div className="insight-title">{title}</div>
        <div className="insight-body">{body}</div>
      </div>
    </div>);

}

Object.assign(window, {
  Sidebar, NLInput, StatCard, TransactionList, TransactionRow, InsightCard, relativeDay
});