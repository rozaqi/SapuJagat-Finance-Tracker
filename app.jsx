// app.jsx — state, data derivations, views, tweaks wiring
const { useState: useS, useEffect: useE, useMemo } = React;

const DAY = 86400000;
function startOfDay(ts) {const d = new Date(ts);d.setHours(0, 0, 0, 0);return d.getTime();}
function signed(t) {return t.type === "income" ? t.amount : -t.amount;}

// ----- balance series over `range` days -----
function buildBalanceSeries(transactions, range) {
  const today = startOfDay(Date.now());
  const sorted = [...transactions].sort((a, b) => a.date - b.date);
  const pts = [];
  for (let i = range - 1; i >= 0; i--) {
    const dayStart = today - i * DAY;
    const dayEnd = dayStart + DAY;
    let bal = STARTING_BALANCE;
    for (const t of sorted) {if (t.date < dayEnd) bal += signed(t);}
    const d = new Date(dayStart);
    pts.push({
      balance: bal,
      dateLabel: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
      fullDate: d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "long" })
    });
  }
  return pts;
}

// ----- income vs expense, bucketed over `range` days -----
function buildCashflow(transactions, range) {
  const today = startOfDay(Date.now());
  const start = today - (range - 1) * DAY;
  const daily = range <= 7;
  const bDays = daily ? 1 : Math.ceil(range / 6);
  const nB = Math.ceil(range / bDays);
  const buckets = [];
  for (let i = 0; i < nB; i++) {
    const s = start + i * bDays * DAY;
    const e = s + bDays * DAY;
    let income = 0, expense = 0;
    for (const t of transactions) {
      if (t.date >= s && t.date < e) {
        if (t.type === "income") income += t.amount;else expense += t.amount;
      }
    }
    const d = new Date(s);
    const label = daily ?
      d.toLocaleDateString("id-ID", { weekday: "short" }) :
      d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    buckets.push({ label, income, expense });
  }
  return buckets;
}

function sumWindow(transactions, days, type) {
  const cut = startOfDay(Date.now()) - (days - 1) * DAY;
  return transactions.filter((t) => t.date >= cut && t.type === type).
  reduce((s, t) => s + t.amount, 0);
}

function categoryTotals(transactions, days, catMap) {
  const cut = startOfDay(Date.now()) - (days - 1) * DAY;
  const map = {};
  transactions.filter((t) => t.type === "expense" && t.date >= cut).forEach((t) => {
    map[t.category] = (map[t.category] || 0) + t.amount;
  });
  return Object.entries(map).
  map(([key, value]) => ({ key, value, ...catOf(catMap, key) })).
  sort((a, b) => b.value - a.value);
}

function buildInsights(transactions, catMap) {
  const out = [];
  const cats = categoryTotals(transactions, 30, catMap);
  const exp30 = sumWindow(transactions, 30, "expense");
  if (cats.length) {
    const top = cats[0];
    out.push({ emoji: top.emoji, tone: "warm",
      title: `${top.label} pos terbesar`,
      body: `${formatRp(top.value)} dalam 30 hari — ${Math.round(top.value / (exp30 || 1) * 100)}% dari total pengeluaranmu.` });
  }
  const thisWeek = sumWindow(transactions, 7, "expense");
  const cut14 = startOfDay(Date.now()) - 13 * DAY;
  const cut7 = startOfDay(Date.now()) - 6 * DAY;
  const lastWeek = transactions.filter((t) => t.type === "expense" && t.date >= cut14 && t.date < cut7).
  reduce((s, t) => s + t.amount, 0);
  if (lastWeek > 0) {
    const diff = Math.round((thisWeek - lastWeek) / lastWeek * 100);
    out.push({ emoji: diff <= 0 ? "🎉" : "⚠️", tone: diff <= 0 ? "good" : "alert",
      title: diff <= 0 ? `Hemat ${Math.abs(diff)}% minggu ini` : `Naik ${diff}% minggu ini`,
      body: `Pengeluaran 7 hari terakhir ${formatRp(thisWeek)} vs ${formatRp(lastWeek)} minggu sebelumnya.` });
  }
  const avg = exp30 / 30;
  out.push({ emoji: "📅", tone: "cool",
    title: `Rata-rata ${formatRp(avg)}/hari`,
    body: `Kalau tren ini berlanjut, perkiraan pengeluaran sebulan sekitar ${formatRp(avg * 30)}.` });
  const expenses = transactions.filter((t) => t.type === "expense");
  if (expenses.length) {
    const big = expenses.reduce((m, t) => t.amount > m.amount ? t : m, expenses[0]);
    out.push({ emoji: catOf(catMap, big.category).emoji, tone: "neutral",
      title: `Transaksi terbesar: ${big.label}`,
      body: `${formatRp(big.amount)} · ${catOf(catMap, big.category).label} · ${relativeDay(big.date)}.` });
  }
  return out;
}

// ===== Tweaks config =====
const FONT_OPTIONS = {
  "Jakarta": { display: "'Plus Jakarta Sans'", body: "'Plus Jakarta Sans'" },
  "Sora": { display: "'Sora'", body: "'Plus Jakarta Sans'" },
  "Nunito": { display: "'Nunito'", body: "'Nunito'" },
  "Bricolage": { display: "'Bricolage Grotesque'", body: "'Plus Jakarta Sans'" }
};
const RADIUS_SCALE = { Tajam: 0.45, Sedang: 1, Bulat: 1.7 };

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "font": "Jakarta",
  "accent": "#2A6FDB",
  "rounded": "Sedang",
  "dark": false
} /*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [transactions, setTransactions] = useS(SEED_TRANSACTIONS);
  const [categories, setCategories] = useS(() => ({ ...CATEGORIES }));
  const [nav, setNav] = useS("beranda");
  const [range, setRange] = useS(30);
  const [chartMode, setChartMode] = useS("arus");
  const [filter, setFilter] = useS("semua");

  // modal state
  const [txOpen, setTxOpen] = useS(false);
  const [editingTx, setEditingTx] = useS(null);
  const [catOpen, setCatOpen] = useS(false);
  const [editingCat, setEditingCat] = useS(null);
  const [budgetOpen, setBudgetOpen] = useS(false);
  const [editingBudgetCat, setEditingBudgetCat] = useS(null);

  useE(() => {
    const root = document.documentElement;
    const f = FONT_OPTIONS[t.font] || FONT_OPTIONS["Jakarta"];
    root.style.setProperty("--font-display", f.display + ", system-ui, sans-serif");
    root.style.setProperty("--font-body", f.body + ", system-ui, sans-serif");
    root.style.setProperty("--accent", t.accent);
    root.style.setProperty("--radius-scale", RADIUS_SCALE[t.rounded] ?? 1);
    root.setAttribute("data-theme", t.dark ? "dark" : "light");
  }, [t.font, t.accent, t.rounded, t.dark]);

  const series = useMemo(() => buildBalanceSeries(transactions, range), [transactions, range]);
  const cashflow = useMemo(() => buildCashflow(transactions, range), [transactions, range]);
  const balance = STARTING_BALANCE + transactions.reduce((s, x) => s + signed(x), 0);
  const income30 = sumWindow(transactions, 30, "income");
  const expense30 = sumWindow(transactions, 30, "expense");
  const cats = useMemo(() => categoryTotals(transactions, 30, categories), [transactions, categories]);
  const totalsMap = useMemo(() => Object.fromEntries(cats.map((c) => [c.key, c.value])), [cats]);
  const insights = useMemo(() => buildInsights(transactions, categories), [transactions, categories]);

  // ----- transaction CRUD -----
  function addTx(parsed) {
    const d = new Date();d.setHours(12, 0, 0, 0);d.setDate(d.getDate() - parsed.dateOffset);
    setTransactions((prev) => [...prev, {
      id: Math.max(0, ...prev.map((p) => p.id)) + 1,
      label: parsed.label, amount: parsed.amount, type: parsed.type,
      category: parsed.category, date: d.getTime()
    }]);
  }
  function saveTx(rec) {
    setTransactions((prev) => {
      if (rec.id != null) return prev.map((x) => x.id === rec.id ? { ...x, ...rec } : x);
      const id = Math.max(0, ...prev.map((p) => p.id)) + 1;
      return [...prev, { ...rec, id }];
    });
    setTxOpen(false);
  }
  function delTx(id) {setTransactions((prev) => prev.filter((p) => p.id !== id));}
  function openAddTx() {setEditingTx(null);setTxOpen(true);}
  function openEditTx(tx) {setEditingTx(tx);setTxOpen(true);}

  // ----- category CRUD -----
  function saveCat(rec) {
    setCategories((prev) => ({ ...prev, [rec.key]: rec }));
    setCatOpen(false);
  }
  function delCat(c) {
    const fallback = c.income ? "pemasukan" : "lainnya";
    setTransactions((prev) => prev.map((x) => x.category === c.key ? { ...x, category: fallback } : x));
    setCategories((prev) => {const n = { ...prev };delete n[c.key];return n;});
  }
  function openAddCat() {setEditingCat(null);setCatOpen(true);}
  function openEditCat(c) {setEditingCat(c);setCatOpen(true);}
  function openEditBudget(c) {setEditingBudgetCat(c);setBudgetOpen(true);}
  function saveBudget(rec) {
    setCategories((prev) => ({ ...prev, [rec.key]: rec }));
    setBudgetOpen(false);
  }

  const filtered = filter === "semua" ? transactions :
  transactions.filter((x) => filter === "income" ? x.type === "income" : filter === "expense" ? x.type === "expense" : x.category === filter);

  return (
    <CatCtx.Provider value={categories}>
    <div className="app">
      <Sidebar active={nav} onNav={setNav} />
      <main className="main">
        <Header nav={nav} onAdd={openAddTx} />

        {/* Hero NL input — only present in the transaksi page */}
        {nav === "transaksi" && <NLInput onCommit={addTx} />}

        {nav === "beranda" &&
        <Beranda series={series} cashflow={cashflow} range={range} setRange={setRange}
        chartMode={chartMode} setChartMode={setChartMode}
        balance={balance} income30={income30} expense30={expense30}
        cats={cats} transactions={transactions} onDelete={delTx} onEdit={openEditTx} onAdd={openAddTx}
        insights={insights} />
        }
        {nav === "transaksi" &&
        <Transaksi transactions={filtered} filter={filter} setFilter={setFilter}
        onDelete={delTx} onEdit={openEditTx} onAdd={openAddTx} />
        }
        {nav === "kategori" &&
        <Kategori cats={cats} expense30={expense30} categories={categories} totals={totalsMap}
        onAddCat={openAddCat} onEditCat={openEditCat} onDelCat={delCat} />
        }
        {nav === "insight" &&
        <Insight insights={insights} series={series} balance={balance} cats={cats} />
        }
        {nav === "budget" &&
        <LimitBudget categories={categories} totalsMap={totalsMap} onEditBudget={openEditBudget} />
        }
      </main>

      <TweaksPanel>
        <TweakSection label="Tampilan" />
        <TweakSelect label="Font" value={t.font} options={Object.keys(FONT_OPTIONS)}
        onChange={(v) => setTweak("font", v)} />
        <TweakColor label="Aksen" value={t.accent}
        options={["#2A6FDB", "#E8835A", "#2FA46B", "#8A6BE0", "#E0556E"]}
        onChange={(v) => setTweak("accent", v)} />
        <TweakRadio label="Sudut" value={t.rounded} options={Object.keys(RADIUS_SCALE)}
        onChange={(v) => setTweak("rounded", v)} />
        <TweakToggle label="Mode gelap" value={t.dark} onChange={(v) => setTweak("dark", v)} />
      </TweaksPanel>

      {txOpen &&
      <TxModal tx={editingTx} categories={categories} onSave={saveTx}
      onClose={() => setTxOpen(false)} onDelete={(id) => {delTx(id);setTxOpen(false);}} />
      }
      {catOpen &&
      <CategoryModal cat={editingCat} onSave={saveCat} onClose={() => setCatOpen(false)} />
      }
      {budgetOpen &&
      <BudgetModal cat={editingBudgetCat} onSave={saveBudget} onClose={() => setBudgetOpen(false)} />
      }
    </div>
    </CatCtx.Provider>);

}

// ---------- Header ----------
function Header({ nav, onAdd }) {
  const titles = { beranda: "Beranda", transaksi: "Transaksi", kategori: "Kategori", insight: "Insight", budget: "Limit Budget" };
  const hour = new Date().getHours();
  const greet = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 19 ? "Selamat sore" : "Selamat malam";
  return (
    <header className="header" data-screen-label={titles[nav]}>
      <div>
        <div className="header-eyebrow">{greet}, Rizky 👋</div>
        <h1 className="header-title">{titles[nav]}</h1>
      </div>
      <div className="header-right">
        {nav === "transaksi" && <button className="btn btn-premium" onClick={onAdd}>✨ Tambah Transaksi</button>}
      </div>
    </header>);

}

// ---------- Beranda ----------
function Beranda(p) {
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#2A6FDB';
  return (
    <div className="grid-2">
      <div className="col-main">
        <section className="card balance-card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">{p.chartMode === "saldo" ? "Saldo saat ini" : `Arus kas · ${p.range} hari`}</div>
              <div className="big-balance">{formatRp(p.balance)}</div>
            </div>
            <div className="toggle-stack">
              <div className="seg sm">
                <button className={p.chartMode === "saldo" ? "is-active" : ""} onClick={() => p.setChartMode("saldo")}>Saldo</button>
                <button className={p.chartMode === "arus" ? "is-active" : ""} onClick={() => p.setChartMode("arus")}>Arus kas</button>
              </div>
              <div className="range-toggle">
                {[7, 30].map((r) =>
                <button key={r} className={p.range === r ? "is-active" : ""} onClick={() => p.setRange(r)}>{r}h</button>
                )}
              </div>
            </div>
          </div>
          <div className="cf-legend">
            {p.chartMode === "saldo" ? (
              <span className="cf-legend-item">
                <span className="cf-dot" style={{ background: accent }}></span>
                Tren Saldo
              </span>
            ) : (
              <>
                <span className="cf-legend-item"><span className="cf-dot good"></span>Pemasukan</span>
                <span className="cf-legend-item"><span className="cf-dot warm"></span>Pengeluaran</span>
              </>
            )}
          </div>
          <div className="chart-area">
            {p.chartMode === "saldo" ?
            <BalanceChart points={p.series} accent={accent} /> :
            <CashflowChart buckets={p.cashflow} />}
          </div>
        </section>

        <div className="mini-stats">
          <StatCard label="Pemasukan · 30h" value={formatRp(p.income30)} tone="good" icon="↘" />
          <StatCard label="Pengeluaran · 30h" value={formatRp(p.expense30)} tone="warm" icon="↗" />
          <StatCard label="Selisih · 30h" value={formatRp(p.income30 - p.expense30)} tone="cool" icon="≈" />
        </div>

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Transaksi terbaru</h2>
          </div>
          <TransactionList transactions={p.transactions} limit={6} />
        </section>
      </div>

      <div className="col-side">
        <section className="card">
          <div className="card-head"><h2 className="card-title">Pengeluaran per kategori</h2></div>
          <div className="donut-section">
            <DonutChart data={p.cats} />
            <div className="legend">
              {p.cats.slice(0, 6).map((c) =>
              <div className="legend-row" key={c.key}>
                  <span className="legend-dot" style={{ background: c.color }}></span>
                  <span className="legend-label">{c.emoji} {c.label}</span>
                  <span className="legend-val">{formatRp(c.value)}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="card insights-card">
          <div className="card-head"><h2 className="card-title">✨ Insight buat kamu</h2></div>
          <div className="insights-list">
            {p.insights.slice(0, 3).map((it, i) => <InsightCard key={i} {...it} />)}
          </div>
        </section>
      </div>
    </div>);

}

// ---------- Transaksi ----------
function Transaksi({ transactions, filter, setFilter, onDelete, onEdit, onAdd }) {
  const filters = [
  { k: "semua", l: "Semua" }, { k: "expense", l: "Pengeluaran" }, { k: "income", l: "Pemasukan" }];

  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title">Semua transaksi <span className="count-pill">{transactions.length}</span></h2>
        <div className="head-tools">
          <div className="seg">
            {filters.map((f) =>
            <button key={f.k} className={filter === f.k ? "is-active" : ""} onClick={() => setFilter(f.k)}>{f.l}</button>
            )}
          </div>
        </div>
      </div>
      <TransactionList transactions={transactions} onDelete={onDelete} onEdit={onEdit} />
    </section>);

}

// ---------- Kategori ----------
function Kategori({ cats, expense30, categories, totals, onAddCat, onEditCat, onDelCat }) {
  const max = cats.length ? cats[0].value : 1;
  return (
    <div className="grid-2">
      <div className="col-main">
        <section className="card">
          <div className="card-head"><h2 className="card-title">Rincian per kategori · 30 hari</h2></div>
          <div className="cat-bars">
            {cats.length === 0 && <div className="empty">Belum ada pengeluaran 30 hari terakhir.</div>}
            {cats.map((c) =>
            <div className="cat-bar-row" key={c.key}>
                <div className="cat-bar-head">
                  <span className="cat-bar-name">{c.emoji} {c.label}</span>
                  <span className="cat-bar-val">{formatRp(c.value)} <em>· {Math.round(c.value / (expense30 || 1) * 100)}%</em></span>
                </div>
                <div className="cat-bar-track">
                  <div className="cat-bar-fill" style={{ width: `${c.value / max * 100}%`, background: c.color }}></div>
                </div>
              </div>
            )}
          </div>
        </section>
        <CategoryManager categories={categories} totals={totals}
        onAdd={onAddCat} onEdit={onEditCat} onDelete={onDelCat} />
      </div>
      <div className="col-side">
        <section className="card">
          <div className="card-head"><h2 className="card-title">Komposisi</h2></div>
          <div className="donut-section">
            <DonutChart data={cats} />
          </div>
        </section>
      </div>
    </div>);

}

// ---------- Insight ----------
function Insight({ insights, series, balance, cats }) {
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#2A6FDB';
  return (
    <div className="grid-2">
      <div className="col-main">
        <section className="card">
          <div className="card-head"><h2 className="card-title">Tren saldo · 30 hari</h2></div>
          <div className="chart-area">
            <BalanceChart points={series} accent={accent} />
          </div>
        </section>
        <div className="insights-grid">
          {insights.map((it, i) => <InsightCard key={i} {...it} />)}
        </div>
      </div>
      <div className="col-side">
        <section className="card insights-card">
          <div className="card-head"><h2 className="card-title">Ringkasan</h2></div>
          <div className="summary">
            <div className="summary-row"><span>Saldo</span><strong>{formatRp(balance)}</strong></div>
            <div className="summary-row"><span>Kategori teratas</span><strong>{cats[0] ? `${cats[0].emoji} ${cats[0].label}` : "—"}</strong></div>
            <div className="summary-row"><span>Jumlah kategori aktif</span><strong>{cats.length}</strong></div>
          </div>
        </section>
      </div>
    </div>);

}

// ---------- Limit Budget ----------
function LimitBudget({ categories, totalsMap, onEditBudget }) {
  const expenseCategories = Object.values(categories).filter(c => !c.income);
  
  return (
    <div className="grid-2">
      <div className="col-main">
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">🎯 Limit Anggaran Bulanan</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            {expenseCategories.map(c => {
              const spent = totalsMap[c.key] || 0;
              const limit = c.budget || 0;
              const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
              const isOver = limit > 0 && spent > limit;
              
              return (
                <div key={c.key} className="insight-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="tx-icon" style={{ background: c.color + "22", color: c.color, width: '40px', height: '40px', fontSize: '18px' }}>{c.emoji}</span>
                      <div>
                        <strong style={{ fontSize: '15.5px', fontWeight: '700' }}>{c.label}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                          Terpakai 30 hari terakhir
                        </div>
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => onEditBudget(c)}>
                      ⚙️ Atur Limit
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '14px', fontWeight: '600' }}>
                    <span className="tnum" style={{ fontSize: '18px', fontWeight: '800' }}>{formatRp(spent)}</span>
                    <span style={{ color: 'var(--muted)' }}>
                      dari <strong className="tnum" style={{ color: 'var(--ink)' }}>{limit > 0 ? formatRp(limit) : 'Belum diatur'}</strong>
                    </span>
                  </div>
                  
                  <div>
                    <div className="cat-bar-track" style={{ height: '10px', background: 'var(--track)' }}>
                      <div className="cat-bar-fill" style={{ 
                        width: `${limit > 0 ? pct : 0}%`, 
                        background: isOver ? 'var(--alert)' : c.color,
                        boxShadow: isOver ? '0 0 8px rgba(224, 85, 110, 0.4)' : 'none'
                      }}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px', fontWeight: '700' }}>
                      <span style={{ color: isOver ? 'var(--alert)' : 'var(--muted)' }}>
                        {limit > 0 ? `${Math.round(pct)}% terpakai` : 'Anggaran belum dibatasi'}
                      </span>
                      {isOver && (
                        <span style={{ color: 'var(--alert)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          ⚠️ Over Budget {formatRp(spent - limit)}!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
      
      <div className="col-side">
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">💡 Info Anggaran</h2>
          </div>
          <div className="insights-list">
            <div className="insight-card tone-cool">
              <div className="insight-emoji">📊</div>
              <div>
                <div className="insight-title">Disiplin Keuangan</div>
                <div className="insight-body">Menetapkan limit membantu mengontrol pengeluaran impulsif sebelum batas bulanan terlampaui.</div>
              </div>
            </div>
            <div className="insight-card tone-warm">
              <div className="insight-emoji">⚠️</div>
              <div>
                <div className="insight-title">Notifikasi Over Budget</div>
                <div className="insight-body">Kategori yang melebihi limit anggaran akan otomatis berubah warna menjadi merah menyala sebagai pengingat.</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
