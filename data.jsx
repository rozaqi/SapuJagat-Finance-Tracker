// data.jsx — design tokens (categories), NL parser, seed data, formatters
// Exported to window at the bottom.

// ---------- Categories ----------
const CATEGORIES = {
  makan:      { key: "makan",      label: "Makan & Minum",  emoji: "🍜", color: "#E8835A", budget: 2000000 },
  transport:  { key: "transport",  label: "Transportasi",   emoji: "🛵", color: "#E0A434", budget: 500000 },
  belanja:    { key: "belanja",    label: "Belanja",        emoji: "🛍️", color: "#D86A9C", budget: 1500000 },
  tagihan:    { key: "tagihan",    label: "Tagihan",        emoji: "🧾", color: "#2A6FDB", budget: 3000000 },
  hiburan:    { key: "hiburan",    label: "Hiburan",        emoji: "🎬", color: "#8A6BE0", budget: 800000 },
  kesehatan:  { key: "kesehatan",  label: "Kesehatan",      emoji: "💊", color: "#2FA98C", budget: 1000000 },
  pemasukan:  { key: "pemasukan",  label: "Pemasukan",      emoji: "💰", color: "#2FA46B", income: true },
  lainnya:    { key: "lainnya",    label: "Lainnya",        emoji: "📦", color: "#9A8C7E", budget: 500000 },
};

const CATEGORY_KEYWORDS = {
  makan:     ["kopi","ngopi","makan","makanan","nasi","ayam","kfc","mcd","mekdi","gofood","grabfood","jajan","snack","minum","teh","boba","starbucks","sarapan","lunch","dinner","bakso","mie","mi ","warteg","resto","restoran","cafe","kafe","sate","seblak","martabak","gorengan","es ","roti","kue","brunch","makan siang","makan malam"],
  transport: ["motor","mobil","bensin","gojek","grab","ojek","ojol","taksi","taxi","parkir","tol","kereta","krl","mrt","busway","transjakarta","pertamax","pertalite","transport","angkot","servis","montir","ban","oli","tiket kereta","tiket bus","damri"],
  belanja:   ["baju","kaos","celana","sepatu","sandal","belanja","shopee","tokopedia","tokped","lazada","tas","elektronik","hp ","handphone","laptop","charger","kabel","skincare","kosmetik","parfum","tokobagus","blibli","beli motor","beli mobil","beli hp","beli laptop"],
  tagihan:   ["listrik","pln","token listrik","pulsa","paket data","kuota","internet","wifi","indihome","biznet","air","pdam","bpjs","asuransi","cicilan","kredit","angsuran","sewa","kos","kontrakan","iuran","pajak","spp","uang kuliah"],
  hiburan:   ["nonton","bioskop","film","xxi","cgv","netflix","spotify","youtube premium","disney","game","steam","mobile legend","konser","tiket konser","liburan","hotel","wisata","staycation","karaoke","билиard","biliar"],
  kesehatan: ["dokter","obat","apotek","apotik","rumah sakit","klinik","vitamin","gym","fitness","yoga","medical","periksa","vaksin","masker"],
};

const INCOME_KEYWORDS = ["gaji","gajian","terima","diterima","dapat","bonus","thr","transfer masuk","pemasukan","jual","jualan","untung","profit","refund","cashback","komisi","fee","honor","freelance","dividen","bunga","hadiah uang"];

// ---------- Formatters ----------
function formatRp(n) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.round(Math.abs(n));
  return sign + "Rp" + abs.toLocaleString("id-ID");
}
function formatRpShort(n) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n/1_000_000_000).toFixed(abs % 1_000_000_000 === 0 ? 0 : 1).replace(".0","") + "M";
  if (abs >= 1_000_000) return (n/1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1).replace(".0","") + "jt";
  if (abs >= 1_000) return Math.round(n/1_000) + "rb";
  return String(Math.round(n));
}

// ---------- NL Parser ----------
// Returns { amount, type: 'expense'|'income', category, dateOffset (days ago), label, valid }
function parseEntry(raw) {
  if (!raw || !raw.trim()) return { valid: false };
  const text = " " + raw.toLowerCase().replace(/,/g, ".") + " ";

  // --- amount ---
  let amount = null;
  // pattern: number + optional unit (juta/jt, ribu/rb/k, m)
  const re = /(\d+(?:\.\d+)?)\s*(juta|jt|miliar|m|ribu|rb|rebu|k)?/g;
  let m, best = null;
  while ((m = re.exec(text)) !== null) {
    let num = parseFloat(m[1]);
    const unit = m[2];
    if (unit === "juta" || unit === "jt") num *= 1_000_000;
    else if (unit === "miliar") num *= 1_000_000_000;
    else if (unit === "m") num *= 1_000_000; // "25m" colloquial = juta
    else if (unit === "ribu" || unit === "rb" || unit === "rebu" || unit === "k") num *= 1_000;
    else if (num < 1000) num *= 1000; // bare small number assumed thousands ("kopi 25")
    if (best === null || num > best) best = num; // take the largest numeric token
  }
  amount = best;

  // --- type ---
  let type = "expense";
  for (const kw of INCOME_KEYWORDS) { if (text.includes(" " + kw)) { type = "income"; break; } }

  // --- category ---
  let category = type === "income" ? "pemasukan" : "lainnya";
  if (type === "expense") {
    let found = false;
    for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const kw of kws) { if (text.includes(kw)) { category = cat; found = true; break; } }
      if (found) break;
    }
  }

  // --- date offset ---
  let dateOffset = 0;
  if (/(kemarin\s+lusa|kemaren\s+lusa)/.test(text)) dateOffset = 2;
  else if (/(kemarin|kemaren)/.test(text)) dateOffset = 1;
  else if (/(minggu lalu|pekan lalu|seminggu lalu)/.test(text)) dateOffset = 7;
  else if (/(lusa)/.test(text)) dateOffset = 0;
  else dateOffset = 0; // tadi / hari ini / pagi / default

  // --- clean label ---
  let label = raw.trim().replace(/^\w/, c => c.toUpperCase());

  return {
    valid: amount !== null && amount > 0,
    amount: amount || 0,
    type,
    category,
    dateOffset,
    label,
  };
}

// ---------- Seed data ----------
function daysAgo(n) { const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate() - n); return d; }
let _id = 1;
function tx(label, amount, type, category, dOffset) {
  return { id: _id++, label, amount, type, category, date: daysAgo(dOffset).getTime() };
}

const STARTING_BALANCE = 4_250_000; // balance ~30 days ago

const SEED = [
  tx("Gaji bulanan", 8_500_000, "income", "pemasukan", 28),
  tx("Bayar kos bulanan", 1_800_000, "expense", "tagihan", 28),
  tx("Belanja bulanan Superindo", 620_000, "expense", "belanja", 27),
  tx("Token listrik", 200_000, "expense", "tagihan", 26),
  tx("Kopi & sarapan", 48_000, "expense", "makan", 25),
  tx("Bensin Pertamax", 100_000, "expense", "transport", 24),
  tx("Makan siang warteg", 22_000, "expense", "makan", 23),
  tx("Netflix langganan", 65_000, "expense", "hiburan", 22),
  tx("Gojek ke kantor", 35_000, "expense", "transport", 21),
  tx("Freelance desain logo", 1_500_000, "income", "pemasukan", 20),
  tx("Nonton bioskop", 100_000, "expense", "hiburan", 19),
  tx("Beli sepatu lari", 750_000, "expense", "belanja", 18),
  tx("Makan malam bareng teman", 185_000, "expense", "makan", 17),
  tx("Pulsa & paket data", 100_000, "expense", "tagihan", 16),
  tx("Servis motor rutin", 145_000, "expense", "transport", 14),
  tx("Vitamin & apotek", 88_000, "expense", "kesehatan", 13),
  tx("Ngopi sambil kerja", 42_000, "expense", "makan", 11),
  tx("Grab ke bandara", 95_000, "expense", "transport", 10),
  tx("Cashback e-wallet", 25_000, "income", "pemasukan", 9),
  tx("Belanja Tokopedia", 310_000, "expense", "belanja", 8),
  tx("Makan siang gofood", 58_000, "expense", "makan", 6),
  tx("Spotify premium", 55_000, "expense", "hiburan", 5),
  tx("Bensin motor", 50_000, "expense", "transport", 4),
  tx("Kopi pagi", 28_000, "expense", "makan", 2),
  tx("Jajan martabak", 45_000, "expense", "makan", 1),
];

// ---------- Categories: live state via Context ----------
const CatCtx = React.createContext(null);
function useCats() { return React.useContext(CatCtx) || CATEGORIES; }
function catOf(map, key) { return (map && map[key]) || map.lainnya || CATEGORIES.lainnya; }

const NEW_CAT_COLORS = ["#E8835A","#E0A434","#D86A9C","#2A6FDB","#8A6BE0","#2FA98C","#2FA46B","#E0556E","#5B8DEF","#9A8C7E"];
const EMOJI_CHOICES = ["🍜","☕","🛵","🚗","🛍️","🧾","🎬","💊","💰","🏠","✈️","🎁","📚","🐶","💡","💸","🏋️","🎮","👕","🍻"];
function makeCatKey() { return "cat_" + Math.random().toString(36).slice(2, 8); }

Object.assign(window, {
  CATEGORIES, parseEntry, formatRp, formatRpShort,
  SEED_TRANSACTIONS: SEED, STARTING_BALANCE,
  CatCtx, useCats, catOf, NEW_CAT_COLORS, EMOJI_CHOICES, makeCatKey,
});
