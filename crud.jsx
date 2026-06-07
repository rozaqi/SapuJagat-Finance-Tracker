// crud.jsx — modals & managers for manual CRUD (transactions + categories)
const { useState: cS, useEffect: cE, useRef: cR } = React;

// ---------------- Modal shell ----------------
function Modal({ title, onClose, children, footer }) {
  cE(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Tutup">×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>);
}

// ---------------- date helpers ----------------
function tsToInput(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function inputToTs(str) {
  const [y, m, d] = str.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  return dt.getTime();
}

// ---------------- Transaction modal (add / edit) ----------------
function TxModal({ tx, categories, onSave, onClose, onDelete }) {
  const editing = !!tx;
  const [type, setType] = cS(tx ? tx.type : "expense");
  const [amount, setAmount] = cS(tx ? String(tx.amount) : "");
  const [label, setLabel] = cS(tx ? tx.label : "");
  const [category, setCategory] = cS(tx ? tx.category : "");
  const [dateStr, setDateStr] = cS(tsToInput(tx ? tx.date : Date.now()));

  const list = Object.values(categories).filter((c) => type === "income" ? c.income : !c.income);

  // keep category valid for the chosen type
  cE(() => {
    if (!list.find((c) => c.key === category)) {
      setCategory(list.length ? list[0].key : "");
    }
  }, [type]); // eslint-disable-line

  const amt = Number(String(amount).replace(/[^\d]/g, "")) || 0;
  const valid = amt > 0 && category;

  function save() {
    if (!valid) return;
    onSave({
      id: tx ? tx.id : undefined,
      label: label.trim() || (categories[category] ? categories[category].label : "Transaksi"),
      amount: amt, type, category, date: inputToTs(dateStr),
    });
  }

  return (
    <Modal title={editing ? "Ubah transaksi" : "Tambah transaksi"} onClose={onClose}
      footer={
        <>
          {editing && <button className="btn btn-danger-ghost" onClick={() => onDelete(tx.id)}>Hapus</button>}
          <div className="foot-right">
            <button className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button className="btn btn-primary" disabled={!valid} onClick={save}>{editing ? "Simpan" : "Tambah"}</button>
          </div>
        </>
      }>
      <div className="field">
        <label className="field-label">Jenis</label>
        <div className="type-toggle">
          <button className={type === "expense" ? "is-active expense" : ""} onClick={() => setType("expense")}>− Pengeluaran</button>
          <button className={type === "income" ? "is-active income" : ""} onClick={() => setType("income")}>+ Pemasukan</button>
        </div>
      </div>

      <div className="field">
        <label className="field-label">Nominal</label>
        <div className="amount-input">
          <span className="amount-prefix">Rp</span>
          <input className="input" inputMode="numeric" value={amount ? Number(String(amount).replace(/[^\d]/g, "")).toLocaleString("id-ID") : ""}
            placeholder="0" onChange={(e) => setAmount(e.target.value)} autoFocus />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Keterangan</label>
        <input className="input" value={label} placeholder="misal: Kopi pagi"
          onChange={(e) => setLabel(e.target.value)} />
      </div>

      <div className="field">
        <label className="field-label">Kategori</label>
        <div className="cat-pick">
          {list.map((c) => (
            <button key={c.key} className={"cat-pick-chip" + (category === c.key ? " is-active" : "")}
              style={{ "--c": c.color }} onClick={() => setCategory(c.key)}>
              <span>{c.emoji}</span>{c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field-label">Tanggal</label>
        <input className="input" type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
      </div>
    </Modal>
  );
}

// ---------------- Category modal (add / edit) ----------------
function CategoryModal({ cat, onSave, onClose }) {
  const editing = !!cat;
  const [label, setLabel] = cS(cat ? cat.label : "");
  const [emoji, setEmoji] = cS(cat ? cat.emoji : EMOJI_CHOICES[0]);
  const [color, setColor] = cS(cat ? cat.color : NEW_CAT_COLORS[0]);
  const [income, setIncome] = cS(cat ? !!cat.income : false);
  const valid = label.trim().length > 0;

  function save() {
    if (!valid) return;
    onSave({ key: cat ? cat.key : makeCatKey(), label: label.trim(), emoji, color, income, budget: cat ? cat.budget : 0 });
  }

  return (
    <Modal title={editing ? "Ubah kategori" : "Kategori baru"} onClose={onClose}
      footer={
        <div className="foot-right">
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" disabled={!valid} onClick={save}>{editing ? "Simpan" : "Tambah"}</button>
        </div>
      }>
      <div className="cat-preview">
        <span className="cat-preview-icon" style={{ background: color + "22", color }}>{emoji}</span>
        <span className="cat-preview-name">{label.trim() || "Nama kategori"}</span>
      </div>

      <div className="field">
        <label className="field-label">Nama</label>
        <input className="input" value={label} placeholder="misal: Donasi" onChange={(e) => setLabel(e.target.value)} autoFocus />
      </div>

      <div className="field">
        <label className="field-label">Untuk</label>
        <div className="type-toggle">
          <button className={!income ? "is-active expense" : ""} onClick={() => setIncome(false)}>Pengeluaran</button>
          <button className={income ? "is-active income" : ""} onClick={() => setIncome(true)}>Pemasukan</button>
        </div>
      </div>

      <div className="field">
        <label className="field-label">Ikon</label>
        <div className="emoji-grid">
          {EMOJI_CHOICES.map((e) => (
            <button key={e} className={"emoji-cell" + (emoji === e ? " is-active" : "")} onClick={() => setEmoji(e)}>{e}</button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field-label">Warna</label>
        <div className="color-grid">
          {NEW_CAT_COLORS.map((c) => (
            <button key={c} className={"color-cell" + (color === c ? " is-active" : "")}
              style={{ background: c }} onClick={() => setColor(c)} aria-label={c}></button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ---------------- Category manager (list inside Kategori page) ----------------
function CategoryManager({ categories, totals, onAdd, onEdit, onDelete }) {
  const list = Object.values(categories);
  const PROTECTED = { lainnya: true, pemasukan: true };
  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title">Kelola kategori <span className="count-pill">{list.length}</span></h2>
        <button className="btn btn-primary btn-sm" onClick={onAdd}>+ Kategori</button>
      </div>
      <div className="cat-manage-list">
        {list.map((c) => (
          <div className="cat-manage-row" key={c.key}>
            <span className="cat-manage-icon" style={{ background: c.color + "22", color: c.color }}>{c.emoji}</span>
            <div className="cat-manage-main">
              <div className="cat-manage-name">{c.label}</div>
              <div className="cat-manage-meta">
                {c.income ? "Pemasukan" : "Pengeluaran"}
              </div>
            </div>
            <div className="tx-actions">
              <button className="tx-edit" title="Ubah" onClick={() => onEdit(c)}>✎</button>
              {!PROTECTED[c.key] && (
                <button className="tx-del" title="Hapus" onClick={() => onDelete(c)}>🗑️</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------- Budget modal (edit limit only) ----------------
function BudgetModal({ cat, onSave, onClose }) {
  const [budget, setBudget] = cS(cat ? String(cat.budget || "") : "");
  const amt = Number(String(budget).replace(/[^\d]/g, "")) || 0;

  function save() {
    onSave({ ...cat, budget: amt });
  }

  return (
    <Modal title={`Atur Anggaran: ${cat.emoji} ${cat.label}`} onClose={onClose}
      footer={
        <div className="foot-right">
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" onClick={save}>Simpan</button>
        </div>
      }>
      <div className="field">
        <label className="field-label">Limit Anggaran Bulanan</label>
        <div className="amount-input">
          <span className="amount-prefix">Rp</span>
          <input className="input" inputMode="numeric" value={budget ? Number(String(budget).replace(/[^\d]/g, "")).toLocaleString("id-ID") : ""}
            placeholder="0 (Belum diatur)" onChange={(e) => setBudget(e.target.value)} autoFocus />
        </div>
      </div>
    </Modal>
  );
}

Object.assign(window, { Modal, TxModal, CategoryModal, CategoryManager, BudgetModal });
