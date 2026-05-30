import { useState, useEffect, useRef, useCallback } from "react";
import { auth, db } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, arrayUnion, deleteDoc, setDoc, getDoc, where } from "firebase/firestore";
import { BrowserMultiFormatReader } from "@zxing/library";

const ADMIN_EMAIL = "fredrik-nielsen@hotmail.com";
const AVATARS = ["🤠","🔥","❄️","💨","🌿","⚡","🎯","🏆","👑","💪","🌶️","🧊","🍃","🌲","⛰️","🌊","🏔️","🎖️","⭐","💎","🔱","⚜️","🌨️","🍀","🌑","🌙","☄️","🗡️","🛡️","🔮"];
const COUNTRY_FLAGS = { "USA": "🇺🇸", "Norge": "🇳🇴", "Sverige": "🇸🇪", "Danmark": "🇩🇰", "Finland": "🇫🇮", "Annet": "🌍", "Other": "🌍" };

const INVITE_TITLES = [
  { count: 1, title: "📣 Pouch Missionary" },
  { count: 3, title: "🌟 Pouch Ambassador" },
  { count: 5, title: "🔥 Pouch Spreader" },
  { count: 10, title: "💪 Pouch Recruiter" },
  { count: 20, title: "🏆 Pouch General" },
  { count: 50, title: "👑 Pouch Legend" },
  { count: 100, title: "🐐 Pouch God" },
];

const LOGIN_STREAK_TITLES = [
  { days: 3, title: "🌱 Loyal User" },
  { days: 7, title: "💪 Weekly User" },
  { days: 14, title: "⚡ Dedicated User" },
  { days: 30, title: "🔥 Pouch Fanatic" },
  { days: 60, title: "👑 Pouch Legend" },
  { days: 100, title: "🐐 Pouch God" },
];

const getInviteTitle = (count) => {
  let title = null;
  for (const t of INVITE_TITLES) { if (count >= t.count) title = t.title; }
  return title;
};

const getLoginStreakTitle = (days) => {
  let title = null;
  for (const t of LOGIN_STREAK_TITLES) { if (days >= t.days) title = t.title; }
  return title;
};

const PRIVACY_POLICY = `PRIVACY POLICY FOR SNUSRATE

Last updated: May 2026

1. WHO ARE WE?
SnusRate is an app for rating and exploring nicotine pouch products.
Contact: contact@snusrate.com

2. WHAT DATA DO WE COLLECT?
- Email address
- Username
- Age, gender, city and country (self-reported)
- Ratings and reviews you write
- Buddy relationships

3. WHY DO WE COLLECT DATA?
- To create and manage your account
- To show ratings and stats in the app
- To connect you with other Buddies

4. DO WE SHARE DATA?
We never sell personal data to third parties.
Data is stored in Google Firebase (Europe, Frankfurt).

5. YOUR RIGHTS
At any time you can:
- Request access to your data
- Request deletion of your account and data
- Withdraw consent

Contact us at contact@snusrate.com to exercise your rights.

6. AGE LIMIT
SnusRate is for adults 21+ only.

7. COOKIES
We only use necessary cookies for login.`;

const BADGE_GUIDE = [
  {
    category: "⭐ Reviews",
    badges: [
      { title: "🌱 Beginner", desc: "Default title" },
      { title: "👃 Pouch Nose", desc: "5 reviews" },
      { title: "🎯 Flavor Judge", desc: "15 reviews" },
      { title: "🏅 Pouch Expert", desc: "30 reviews" },
      { title: "⭐ Pouch Master", desc: "50 reviews" },
      { title: "👑 Pouch King", desc: "100 reviews" },
    ]
  },
  {
    category: "📦 Products added",
    badges: [
      { title: "📦 Contributor", desc: "1 approved product" },
      { title: "🗂️ Product Hunter", desc: "3 approved products" },
      { title: "🔍 Pouch Hunter", desc: "5 approved products" },
      { title: "🏭 Pouch Encyclopedia", desc: "10 approved products" },
    ]
  },
  {
    category: "🔥 Rating streak",
    badges: [
      { title: "🌱 Getting Started", desc: "3 days rating in a row" },
      { title: "💪 On a Streak", desc: "7 days in a row" },
      { title: "⚡ On Fire", desc: "14 days in a row" },
      { title: "🔥 Pouch Legend", desc: "30 days in a row" },
    ]
  },
  {
    category: "📅 Login streak",
    badges: [
      { title: "🌱 Loyal User", desc: "3 days logged in a row" },
      { title: "💪 Weekly User", desc: "7 days in a row" },
      { title: "⚡ Dedicated User", desc: "14 days in a row" },
      { title: "🔥 Pouch Fanatic", desc: "30 days in a row" },
      { title: "👑 Pouch Legend", desc: "60 days in a row" },
      { title: "🐐 Pouch God", desc: "100 days in a row" },
    ]
  },
  {
    category: "📣 Invites",
    badges: [
      { title: "📣 Pouch Missionary", desc: "1 invited user" },
      { title: "🌟 Pouch Ambassador", desc: "3 invited" },
      { title: "🔥 Pouch Spreader", desc: "5 invited" },
      { title: "💪 Pouch Recruiter", desc: "10 invited" },
      { title: "🏆 Pouch General", desc: "20 invited" },
      { title: "👑 Pouch Legend", desc: "50 invited" },
      { title: "🐐 Pouch God", desc: "100 invited" },
    ]
  },
];

const getRatingTitle = (count) => {
  if (count >= 100) return "👑 Pouch King";
  if (count >= 50) return "⭐ Pouch Master";
  if (count >= 30) return "🏅 Pouch Expert";
  if (count >= 15) return "🎯 Flavor Judge";
  if (count >= 5) return "👃 Pouch Nose";
  return "🌱 Beginner";
};

const getProductTitle = (count) => {
  if (count >= 10) return "🏭 Pouch Encyclopedia";
  if (count >= 5) return "🔍 Pouch Hunter";
  if (count >= 3) return "🗂️ Product Hunter";
  if (count >= 1) return "📦 Contributor";
  return null;
};

const getStreakTitle = (days) => {
  if (days >= 30) return "🔥 Pouch Legend";
  if (days >= 14) return "⚡ On Fire";
  if (days >= 7) return "💪 On a Streak";
  if (days >= 3) return "🌱 Getting Started";
  return null;
};

const formatDate = (iso) => {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
};

const formatDateFull = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const calculateStreak = (reviews) => {
  if (!reviews || reviews.length === 0) return 0;
  const dates = reviews.map(r => new Date(r.date).toDateString());
  const unique = [...new Set(dates)].sort((a, b) => new Date(b) - new Date(a));
  let streak = 0;
  let current = new Date();
  current.setHours(0, 0, 0, 0);
  for (let d of unique) {
    const day = new Date(d);
    const diff = Math.round((current - day) / (1000 * 60 * 60 * 24));
    if (diff <= 1) { streak++; current = day; } else break;
  }
  return streak;
};

const countLikesReceived = (reviews) => reviews.reduce((sum, r) => sum + (r.likes?.length || 0), 0);

const plural = (n, sing, plur) => `${n} ${n === 1 ? sing : plur}`;

const nicotineLabel = (mg) => {
  const n = parseFloat(mg);
  if (isNaN(n) || n <= 0) return null;
  if (n < 7) return "Weak";
  if (n < 11) return "Normal";
  if (n < 16) return "Strong";
  if (n < 21) return "Extra strong";
  return "Super strong";
};

const SNUS_TYPES = ["Nicotine Pouch", "Brun Portion", "Brun Løs", "White Portion", "White Dry", "Helhvit Portion", "Helhvit Slim", "Helhvit Mini", "Helhvit Mini Portion", "Annet"];

const SNUS_BRANDS = ["ZYN", "Rogue", "On!", "Velo", "White Fox", "Killa", "Zone", "FRE", "Swedish Match", "BAT", "Fiedler & Lundgren", "Skruf AB", "GN Tobacco", "AG Snus", "Nordic Spirit", "Loop", "Knox", "General", "Ettan", "Göteborgs Rapé", "Catch", "Kaliber", "Lyft"];

const SNUS_FLAVORS = ["Mint", "Eukalyptus", "Kaffe", "Lakris", "Bær", "Citrus", "Tobakk", "Ingefær", "Frukt", "Krydder", "Vanilje", "Pepper", "Melon", "Bringebær", "Tropisk"];

const generateRefCode = (displayName) => {
  return displayName.toLowerCase().replace(/[^a-z0-9]/g, "") + Math.random().toString(36).slice(2, 6);
};

const daysSince = (iso) => {
  if (!iso) return null;
  const diff = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
  return Math.floor(diff);
};

const similarName = (a, b) => {
  const normalize = s => s.toLowerCase().replace(/\s+/g, " ").trim();
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (na.replace(/\s/g, "") === nb.replace(/\s/g, "")) return true;
  return false;
};

function FlameStrength({ value }) {
  const levels = { "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "Normal": 3, "Sterk": 4, "Extrem": 5 };
  const count = levels[value] || 3;
  return <span style={{ fontSize: 12 }}>{[1,2,3,4,5].map(i => <span key={i} style={{ opacity: i <= count ? 1 : 0.15 }}>🔥</span>)}</span>;
}

function StrengthLine({ snus }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <FlameStrength value={snus.strength} />
      {snus.nicotine && <span style={{ fontSize: 11, color: "#888" }}>{snus.nicotine} mg</span>}
    </span>
  );
}

function StarRating({ value, onChange, size = 20 }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} onClick={() => onChange && onChange(i)} onMouseEnter={() => onChange && setHover(i)} onMouseLeave={() => onChange && setHover(0)}
          style={{ fontSize: size, cursor: onChange ? "pointer" : "default", color: i <= (hover || value) ? "#e8b84b" : "#2a2a2a", transition: "color 0.15s", userSelect: "none" }}>★</span>
      ))}
    </div>
  );
}

function StrengthSelector({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
      {[1,2,3,4,5].map(i => (
        <button key={i} onClick={() => onChange(String(i))} style={{ background: value === String(i) ? "#1e1e1e" : "none", border: value === String(i) ? "1px solid #e8b84b" : "1px solid #2a2a2a", borderRadius: 6, padding: "7px 10px", cursor: "pointer", fontSize: 13 }}>{"🔥".repeat(i)}</button>
      ))}
    </div>
  );
}

function FlavorPicker({ value, onChange }) {
  const selected = value || [];
  const toggle = (f) => onChange(selected.includes(f) ? selected.filter(x => x !== f) : [...selected, f]);
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
      {SNUS_FLAVORS.map(f => (
        <button key={f} onClick={() => toggle(f)} style={{ background: selected.includes(f) ? "#1e1e1e" : "none", border: selected.includes(f) ? "1px solid #e8b84b" : "1px solid #2a2a2a", borderRadius: 20, padding: "5px 12px", cursor: "pointer", fontSize: 11, color: selected.includes(f) ? "#e8b84b" : "#777" }}>{f}</button>
      ))}
    </div>
  );
}

function AttributeRow({ snus }) {
  const tier = nicotineLabel(snus.nicotine);
  const isPouch = (snus.type || "").toLowerCase().includes("pouch");
  const unit = isPouch ? "mg/pouch" : "mg/g";
  const lab = { fontSize: 9, letterSpacing: 1.5, color: "#e8b84b", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 };
  const val = { fontSize: 11, color: "#c9bfa6", lineHeight: 1.3 };
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 10, paddingTop: 10, borderTop: "1px solid #1a1a1a" }}>
      <div style={{ flex: 1, textAlign: "center" }}>
        <div style={lab}>Type</div>
        <div style={val}>{snus.nicotineFree ? "Nicotine-free" : (snus.type || "–")}</div>
      </div>
      <div style={{ flex: 1, textAlign: "center", borderLeft: "1px solid #1a1a1a", borderRight: "1px solid #1a1a1a" }}>
        <div style={lab}>Strength</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <FlameStrength value={snus.strength} />
          <span style={val}>{snus.nicotine ? `${snus.nicotine} ${unit}${tier ? ` · ${tier}` : ""}` : (tier || "")}</span>
        </div>
      </div>
      <div style={{ flex: 1, textAlign: "center" }}>
        <div style={lab}>Flavor</div>
        <div style={val}>{(snus.flavors && snus.flavors.length) ? snus.flavors.join(" · ") : "–"}</div>
      </div>
    </div>
  );
}

function AvatarPicker({ selected, onSelect }) {
  return (
    <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
      {AVATARS.map(av => (
        <button key={av} onClick={() => onSelect(av)} style={{ fontSize: 28, background: selected === av ? "#1e1e1e" : "none", border: selected === av ? "2px solid #e8b84b" : "2px solid transparent", borderRadius: 10, padding: "6px 8px", cursor: "pointer", lineHeight: 1 }}>{av}</button>
      ))}
    </div>
  );
}

function HamburgerMenu({ onClose, onInstall }) {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const st = {
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200 },
    menu: { position: "fixed", top: 0, right: 0, width: 280, height: "100vh", background: "#141414", borderLeft: "1px solid #222", padding: "60px 20px 20px", zIndex: 201, overflowY: "auto" },
    item: { display: "flex", alignItems: "center", gap: 12, padding: "16px 0", borderBottom: "1px solid #1a1a1a", cursor: "pointer", fontSize: 15, color: "#e8e0d0" },
    close: { position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#555", fontSize: 24, cursor: "pointer" },
    title: { fontSize: 11, letterSpacing: 2, color: "#444", textTransform: "uppercase", marginBottom: 8, marginTop: 20, fontWeight: 700, display: "block" },
  };

  if (showPrivacy) return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 300, overflowY: "auto", padding: 20 }}>
      <div style={{ maxWidth: 430, margin: "0 auto" }}>
        <button onClick={() => setShowPrivacy(false)} style={{ background: "none", border: "1px solid #333", color: "#e8b84b", borderRadius: 6, padding: "8px 16px", cursor: "pointer", marginBottom: 20 }}>← Back</button>
        <div style={{ color: "#aaa", fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{PRIVACY_POLICY}</div>
      </div>
    </div>
  );

  if (showBadges) return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 300, overflowY: "auto", padding: 20 }}>
      <div style={{ maxWidth: 430, margin: "0 auto" }}>
        <button onClick={() => setShowBadges(false)} style={{ background: "none", border: "1px solid #333", color: "#e8b84b", borderRadius: 6, padding: "8px 16px", cursor: "pointer", marginBottom: 20 }}>← Back</button>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#e8b84b", marginBottom: 20 }}>🏆 Badge guide</div>
        {BADGE_GUIDE.map((cat, i) => (
          <div key={i} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e8b84b", marginBottom: 10 }}>{cat.category}</div>
            {cat.badges.map((b, j) => (
              <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1a1a1a" }}>
                <span style={{ fontSize: 13, color: "#e8e0d0" }}>{b.title}</span>
                <span style={{ fontSize: 11, color: "#555" }}>{b.desc}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div style={st.overlay} onClick={onClose} />
      <div style={st.menu}>
        <button style={st.close} onClick={onClose}>✕</button>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#e8b84b", marginBottom: 24 }}>SnusRate</div>
        <span style={st.title}>Info</span>
        <div style={st.item} onClick={() => setShowPrivacy(true)}><span>📋</span> Privacy policy</div>
        <div style={st.item} onClick={() => setShowBadges(true)}><span>🏆</span> Badge guide</div>
        <div style={st.item}><span>📜</span> Terms of use</div>
        <div style={st.item}><span>ℹ️</span> About SnusRate</div>
        <span style={st.title}>App</span>
        <div style={st.item} onClick={onInstall}><span>📱</span> Add to home screen</div>
        <span style={st.title}>Help</span>
        <div style={st.item}><span>❓</span> FAQ</div>
        <div style={st.item}><span>📧</span> Contact us</div>
        <span style={st.title}>Account</span>
        <div style={{ ...st.item, color: "#cb7e7e" }} onClick={() => { signOut(auth); onClose(); }}><span>🚪</span> Log out</div>
        <div style={{ marginTop: 40, fontSize: 11, color: "#333", textAlign: "center" }}>SnusRate v1.0 · © 2026 SnusRate</div>
      </div>
    </>
  );
}

function InstallModal({ onClose }) {
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  useEffect(() => {
    setIsIOS(/iPhone|iPad|iPod/.test(navigator.userAgent));
    window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); setDeferredPrompt(e); });
  }, []);
  const installAndroid = async () => {
    if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; onClose(); }
  };
  const st = {
    modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 150, display: "flex", alignItems: "flex-end" },
    box: { background: "#141414", border: "1px solid #222", borderRadius: "18px 18px 0 0", width: "100%", maxWidth: 430, margin: "0 auto", padding: "24px 20px 36px" },
    btn: { background: "#e8b84b", color: "#0a0a0a", border: "none", borderRadius: 8, padding: "13px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%", marginTop: 12 },
    btnOutline: { background: "none", color: "#e8b84b", border: "1px solid #e8b84b", borderRadius: 8, padding: "12px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%", marginTop: 8 },
  };
  return (
    <div style={st.modal} onClick={onClose}>
      <div style={st.box} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>📱 Add to home screen</div>
        <div style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>Install SnusRate as an app!</div>
        {isIOS ? (
          <div style={{ background: "#111", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, color: "#aaa", lineHeight: 2 }}>
              <div>1. Open SnusRate in <span style={{ color: "#e8b84b" }}>Safari</span></div>
              <div>2. Tap the <span style={{ color: "#e8b84b" }}>share icon</span> 􀈂 at the bottom</div>
              <div>3. Choose <span style={{ color: "#e8b84b" }}>"Add to Home Screen"</span></div>
              <div>4. Tap <span style={{ color: "#e8b84b" }}>"Add"</span> in the top right</div>
            </div>
          </div>
        ) : deferredPrompt ? (
          <button style={st.btn} onClick={installAndroid}>⬇️ Install SnusRate</button>
        ) : (
          <div style={{ background: "#111", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, color: "#aaa", lineHeight: 2 }}>
              <div>1. Open SnusRate in <span style={{ color: "#e8b84b" }}>Chrome</span> on Android</div>
              <div>2. Tap the <span style={{ color: "#e8b84b" }}>menu icon</span> ⋮ in the top right</div>
              <div>3. Choose <span style={{ color: "#e8b84b" }}>"Add to Home screen"</span></div>
            </div>
          </div>
        )}
        <button style={st.btnOutline} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function LiveTicker({ allReviews, onClickReview }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (allReviews.length === 0) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIndex(i => (i + 1) % allReviews.length); setVisible(true); }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, [allReviews.length]);
  if (allReviews.length === 0) return null;
  const r = allReviews[index];
  return (
    <div onClick={() => onClickReview(r)} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "10px 14px", marginBottom: 14, cursor: "pointer", opacity: visible ? 1 : 0, transition: "opacity 0.3s", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ fontSize: 18 }}>🔴</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "#e8b84b", fontWeight: 700 }}>{r.avatar || "🤠"} @{r.user} rated <span style={{ color: "#e8e0d0" }}>{r.snusName}</span></div>
        <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{"★".repeat(r.rating)}{"☆".repeat(5-r.rating)} · {formatDate(r.date)}{r.text && <span style={{ color: "#666" }}> · "{r.text.slice(0,30)}{r.text.length > 30 ? "..." : ""}"</span>}</div>
      </div>
    </div>
  );
}

function BarcodeScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const hasScanned = useRef(false);
  const handleResult = useCallback((result) => {
    if (result && !hasScanned.current) { hasScanned.current = true; onResult(result.getText()); }
  }, [onResult]);
  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader();
    readerRef.current.decodeFromVideoDevice(null, videoRef.current, handleResult);
    return () => { if (readerRef.current) readerRef.current.reset(); };
  }, [handleResult]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: "100%", maxWidth: 430 }}>
        <video ref={videoRef} style={{ width: "100%", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, border: "2px solid #e8b84b", boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)", borderRadius: 12, margin: "20%" }} />
      </div>
      <div style={{ color: "#e8b84b", fontSize: 14, marginTop: 20 }}>Hold the barcode within the frame</div>
      <button onClick={onClose} style={{ marginTop: 24, background: "none", border: "1px solid #444", color: "#888", borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontSize: 14 }}>Cancel</button>
    </div>
  );
}

function UnknownBarcodeModal({ barcode, snusList, onMatch, onSuggest, onClose }) {
  const [search, setSearch] = useState("");
  const [newSnus, setNewSnus] = useState({ name: "", brand: "", type: "", strength: "3", description: "", nicotine: "", flavors: [], nicotineFree: false });
  const [mode, setMode] = useState("match");
  const filtered = snusList.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.brand?.toLowerCase().includes(search.toLowerCase()));
  const st = {
    modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 150, display: "flex", alignItems: "flex-end" },
    box: { background: "#141414", border: "1px solid #222", borderRadius: "18px 18px 0 0", width: "100%", maxWidth: 430, margin: "0 auto", padding: "24px 20px 36px", maxHeight: "88vh", overflowY: "auto" },
    input: { width: "100%", background: "#111", border: "1px solid #222", borderRadius: 8, padding: "12px 14px", color: "#e8e0d0", fontSize: 14, marginTop: 8, boxSizing: "border-box", fontFamily: "inherit", outline: "none" },
    btn: { background: "#e8b84b", color: "#0a0a0a", border: "none", borderRadius: 8, padding: "13px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%", marginTop: 12 },
    btnOutline: { background: "none", color: "#e8b84b", border: "1px solid #e8b84b", borderRadius: 8, padding: "12px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%", marginTop: 8 },
    label: { fontSize: 10, letterSpacing: 2, color: "#555", textTransform: "uppercase", marginTop: 16, display: "block", fontWeight: 700 },
  };
  return (
    <div style={st.modal} onClick={onClose}>
      <div style={st.box} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Unknown barcode</div>
        <div style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>EAN: {barcode}</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button onClick={() => setMode("match")} style={{ flex: 1, padding: "10px", borderRadius: 8, border: mode === "match" ? "1px solid #e8b84b" : "1px solid #333", background: mode === "match" ? "#1e1e1e" : "none", color: mode === "match" ? "#e8b84b" : "#555", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Link to product</button>
          <button onClick={() => setMode("suggest")} style={{ flex: 1, padding: "10px", borderRadius: 8, border: mode === "suggest" ? "1px solid #e8b84b" : "1px solid #333", background: mode === "suggest" ? "#1e1e1e" : "none", color: mode === "suggest" ? "#e8b84b" : "#555", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Suggest new</button>
        </div>
        {mode === "match" && (
          <>
            <input style={{ ...st.input, marginTop: 0 }} placeholder="🔍 Search product..." value={search} onChange={e => setSearch(e.target.value)} />
            <div style={{ marginTop: 10, maxHeight: 300, overflowY: "auto" }}>
              {filtered.map(snus => (
                <div key={snus.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "12px 14px", marginBottom: 8, cursor: "pointer" }} onClick={() => onMatch(snus, barcode)}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{snus.name}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{snus.brand} · {snus.type}</div>
                </div>
              ))}
            </div>
          </>
        )}
        {mode === "suggest" && (
          <>
            <span style={st.label}>Product name</span>
            <input style={st.input} placeholder="e.g. ZYN Cool Mint" value={newSnus.name} onChange={e => setNewSnus({...newSnus, name: e.target.value})} />
            <span style={st.label}>Brand</span>
            <input style={st.input} list="snus-brands" placeholder="e.g. ZYN" value={newSnus.brand} onChange={e => setNewSnus({...newSnus, brand: e.target.value})} />
            <span style={st.label}>Type</span>
            <select style={st.input} value={newSnus.type} onChange={e => setNewSnus({...newSnus, type: e.target.value})}>
              <option value="">Select type</option>
              {SNUS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              {newSnus.type && !SNUS_TYPES.includes(newSnus.type) && <option value={newSnus.type}>{newSnus.type}</option>}
            </select>
            <span style={st.label}>Strength</span>
            <StrengthSelector value={newSnus.strength} onChange={v => setNewSnus({...newSnus, strength: v})} />
            <span style={st.label}>Nicotine (mg)</span>
            <input style={st.input} type="number" inputMode="decimal" placeholder="e.g. 6" value={newSnus.nicotine || ""} onChange={e => setNewSnus({...newSnus, nicotine: e.target.value})} />
            <button onClick={() => setNewSnus({...newSnus, nicotineFree: !newSnus.nicotineFree})} style={{ marginTop: 10, width: "100%", textAlign: "left", background: newSnus.nicotineFree ? "#1e1e1e" : "none", border: newSnus.nicotineFree ? "1px solid #e8b84b" : "1px solid #2a2a2a", borderRadius: 8, padding: "11px 14px", color: newSnus.nicotineFree ? "#e8b84b" : "#777", cursor: "pointer", fontSize: 13 }}>{newSnus.nicotineFree ? "☑" : "☐"} Nicotine-free</button>
            <span style={st.label}>Flavor profile</span>
            <FlavorPicker value={newSnus.flavors} onChange={fl => setNewSnus({...newSnus, flavors: fl})} />
            <span style={st.label}>Description</span>
            <input style={st.input} placeholder="e.g. Classic tobacco taste" value={newSnus.description || ""} onChange={e => setNewSnus({...newSnus, description: e.target.value})} />
            <button style={st.btn} onClick={() => onSuggest({ ...newSnus, barcode })}>Send to admin</button>
          </>
        )}
        <button style={st.btnOutline} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function CompareModal({ myDisplayName, myReviews, theirProfile, theirReviews, snusList, onClose }) {
  const myAvg = myReviews.length > 0 ? (myReviews.reduce((s, r) => s + r.rating, 0) / myReviews.length).toFixed(1) : "–";
  const theirAvg = theirReviews.length > 0 ? (theirReviews.reduce((s, r) => s + r.rating, 0) / theirReviews.length).toFixed(1) : "–";
  const myStreak = calculateStreak(myReviews);
  const theirStreak = calculateStreak(theirReviews);
  const myLikes = countLikesReceived(myReviews);
  const theirLikes = countLikesReceived(theirReviews);

  const myRatedIds = new Set(myReviews.map(r => r.snusId));
  const theirRatedIds = new Set(theirReviews.map(r => r.snusId));
  const commonIds = [...myRatedIds].filter(id => theirRatedIds.has(id));

  const commonSnus = commonIds.map(id => {
    const snus = snusList.find(s => s.id === id);
    const myR = myReviews.find(r => r.snusId === id);
    const theirR = theirReviews.find(r => r.snusId === id);
    const diff = Math.abs((myR?.rating || 0) - (theirR?.rating || 0));
    const agree = diff <= 1;
    return { snus, myRating: myR?.rating, theirRating: theirR?.rating, agree };
  }).filter(x => x.snus);

  const sectionTitle = { fontSize: 10, letterSpacing: 2.5, color: "#444", textTransform: "uppercase", marginBottom: 14, fontWeight: 700 };

  const st = {
    modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 200, display: "flex", alignItems: "flex-end" },
    box: { background: "#141414", border: "1px solid #222", borderRadius: "18px 18px 0 0", width: "100%", maxWidth: 430, margin: "0 auto", padding: "24px 20px 36px", maxHeight: "92vh", overflowY: "auto" },
    btnOutline: { background: "none", color: "#e8b84b", border: "1px solid #e8b84b", borderRadius: 8, padding: "12px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%", marginTop: 16 },
    statRow: { display: "flex", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #1a1a1a" },
  };

  const StatRow = ({ label, myVal, theirVal }) => {
    const myNum = parseFloat(myVal);
    const theirNum = parseFloat(theirVal);
    const myWins = !isNaN(myNum) && !isNaN(theirNum) && myNum > theirNum;
    const theirWins = !isNaN(myNum) && !isNaN(theirNum) && theirNum > myNum;
    return (
      <div style={st.statRow}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: myWins ? "#e8b84b" : "#666" }}>{myVal}</div>
          {myWins && <div style={{ fontSize: 9, color: "#e8b84b", letterSpacing: 1 }}>WINNER</div>}
        </div>
        <div style={{ flex: 1, textAlign: "center", fontSize: 11, color: "#444", letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: theirWins ? "#e8b84b" : "#666" }}>{theirVal}</div>
          {theirWins && <div style={{ fontSize: 9, color: "#e8b84b", letterSpacing: 1 }}>WINNER</div>}
        </div>
      </div>
    );
  };

  return (
    <div style={st.modal} onClick={onClose}>
      <div style={st.box} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 32 }}>🤠</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e8b84b", marginTop: 4 }}>@{myDisplayName}</div>
            <div style={{ fontSize: 10, color: "#555" }}>You</div>
          </div>
          <div style={{ fontSize: 20, color: "#333" }}>⚔️</div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 32 }}>{theirProfile?.avatar || "🤠"}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e8b84b", marginTop: 4 }}>@{theirProfile?.displayName}</div>
            <div style={{ fontSize: 10, color: "#555" }}>Them</div>
          </div>
        </div>
        <div style={sectionTitle}>📊 Stats</div>
        <StatRow label="Reviews" myVal={myReviews.length} theirVal={theirReviews.length} />
        <StatRow label="Average" myVal={myAvg} theirVal={theirAvg} />
        <StatRow label="Streak" myVal={`${myStreak}🔥`} theirVal={`${theirStreak}🔥`} />
        <StatRow label="Likes" myVal={myLikes} theirVal={theirLikes} />
        {commonSnus.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ ...sectionTitle, marginBottom: 4 }}>🤝 Pouches in common ({commonSnus.length})</div>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 12 }}>Products you both rated</div>
            {commonSnus.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{item.snus.name}</div>
                  <div style={{ fontSize: 11, color: "#555" }}>{item.agree ? "✅ Agree" : "❌ Disagree"}</div>
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#e8b84b" }}>{"★".repeat(item.myRating)}</div>
                  <div style={{ fontSize: 11, color: "#333" }}>vs</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#e8b84b" }}>{"★".repeat(item.theirRating)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {commonSnus.length === 0 && (
          <div style={{ textAlign: "center", padding: "20px 0", color: "#555", fontSize: 13 }}>No pouches rated in common yet</div>
        )}
        <button style={st.btnOutline} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function UserProfileModal({ username, currentUser, currentDisplayName, currentUserReviews, snusList, onClose, onOpenSnus }) {
  const [profile, setProfile] = useState(null);
  const [userReviews, setUserReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestSent, setRequestSent] = useState(false);
  const [alreadyBuddy, setAlreadyBuddy] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(collection(db, "users"), where("displayNameLower", "==", username.toLowerCase()));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = { uid: snap.docs[0].id, ...snap.docs[0].data() };
          setProfile(data);
          const b1 = await getDocs(query(collection(db, "buddy_requests"), where("fromUid", "==", currentUser.uid), where("toUid", "==", data.uid)));
          const b2 = await getDocs(query(collection(db, "buddy_requests"), where("fromUid", "==", data.uid), where("toUid", "==", currentUser.uid)));
          if (!b1.empty || !b2.empty) setAlreadyBuddy(true);
          const reviews = snusList.flatMap(s => (s.reviews || []).filter(r => r.user === username).map(r => ({ ...r, snusId: s.id, snusName: s.name }))).sort((a, b) => new Date(b.date) - new Date(a.date));
          setUserReviews(reviews);
        }
      } catch(e) {}
      setLoading(false);
    };
    load();
  }, [username, currentUser.uid, snusList]);

  const sendRequest = async () => {
    if (!profile) return;
    try {
      await addDoc(collection(db, "buddy_requests"), { fromUid: currentUser.uid, fromName: currentDisplayName, toUid: profile.uid, toName: profile.displayName, status: "pending", createdAt: new Date().toISOString() });
      setRequestSent(true);
    } catch(e) {}
  };

  const favSnusObj = snusList.find(s => s.id === profile?.favoriteSnus);
  const streak = calculateStreak(userReviews);
  const inviteTitle = getInviteTitle(profile?.inviteCount || 0);
  const loginStreakTitle = getLoginStreakTitle(profile?.loginStreak || 0);

  const st = {
    modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 150, display: "flex", alignItems: "flex-end" },
    box: { background: "#141414", border: "1px solid #222", borderRadius: "18px 18px 0 0", width: "100%", maxWidth: 430, margin: "0 auto", padding: "24px 20px 36px", maxHeight: "88vh", overflowY: "auto" },
    btn: { background: "#e8b84b", color: "#0a0a0a", border: "none", borderRadius: 8, padding: "13px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%", marginTop: 12 },
    btnOutline: { background: "none", color: "#e8b84b", border: "1px solid #e8b84b", borderRadius: 8, padding: "12px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%", marginTop: 8 },
    btnSecondary: { background: "none", color: "#888", border: "1px solid #333", borderRadius: 8, padding: "12px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%", marginTop: 8 },
    reviewCard: { background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 8, padding: "12px 14px", marginBottom: 8, cursor: "pointer" },
    card: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px", marginBottom: 10, cursor: "pointer" },
    sectionTitle: { fontSize: 10, letterSpacing: 2.5, color: "#444", textTransform: "uppercase", marginBottom: 14, fontWeight: 700 },
    badge: { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#e8b84b" },
    statBox: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "12px", textAlign: "center", flex: 1 },
  };

  return (
    <>
      {showCompare && profile && (
        <CompareModal myDisplayName={currentDisplayName} myReviews={currentUserReviews} theirProfile={profile} theirReviews={userReviews} snusList={snusList} onClose={() => setShowCompare(false)} />
      )}
      <div style={st.modal} onClick={onClose}>
        <div style={st.box} onClick={e => e.stopPropagation()}>
          {loading ? <div style={{ textAlign: "center", padding: 40, color: "#555" }}>Loading...</div>
          : !profile ? <div style={{ textAlign: "center", padding: 40, color: "#555" }}>User not found</div>
          : (
            <>
              <div style={{ textAlign: "center", paddingBottom: 16 }}>
                <div style={{ fontSize: 56, marginBottom: 10 }}>{profile.avatar || "🤠"}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#e8b84b" }}>@{profile.displayName}</div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                  {COUNTRY_FLAGS[profile.country] || "🌍"} {profile.city ? `${profile.city}, ` : ""}{profile.country}
                  {profile.age ? ` · ${profile.age} yrs` : ""}{profile.gender ? ` · ${profile.gender}` : ""}
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10, flexWrap: "wrap" }}>
                  <span style={st.badge}>{getRatingTitle(userReviews.length)}</span>
                  {getProductTitle(profile.approvedProducts || 0) && <span style={st.badge}>{getProductTitle(profile.approvedProducts || 0)}</span>}
                  {getStreakTitle(streak) && <span style={st.badge}>{getStreakTitle(streak)}</span>}
                  {loginStreakTitle && <span style={st.badge}>{loginStreakTitle}</span>}
                  {inviteTitle && <span style={st.badge}>{inviteTitle}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <div style={st.statBox}><div style={{ fontSize: 18, fontWeight: 900, color: "#e8b84b" }}>{userReviews.length}</div><div style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: 1 }}>Reviews</div></div>
                <div style={st.statBox}><div style={{ fontSize: 18, fontWeight: 900, color: "#e8b84b" }}>{countLikesReceived(userReviews)}</div><div style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: 1 }}>Likes</div></div>
                <div style={st.statBox}><div style={{ fontSize: 18, fontWeight: 900, color: "#e8b84b" }}>{streak}🔥</div><div style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: 1 }}>Streak</div></div>
              </div>
              {username !== currentDisplayName && (
                <>
                  {alreadyBuddy ? <div style={{ textAlign: "center", color: "#e8b84b", fontSize: 13, marginBottom: 12 }}>🤠 You are Buddies!</div>
                  : requestSent ? <div style={{ textAlign: "center", color: "#e8b84b", fontSize: 13, marginBottom: 12 }}>✅ Request sent!</div>
                  : <button style={st.btn} onClick={sendRequest}>🤠 Send Buddy request</button>}
                  <button style={st.btnSecondary} onClick={() => setShowCompare(true)}>⚔️ Compare with me</button>
                </>
              )}
              {favSnusObj && (
                <div style={{ marginTop: 16, marginBottom: 8 }}>
                  <div style={st.sectionTitle}>Favorite pouch</div>
                  <div style={st.card} onClick={() => { onOpenSnus(favSnusObj); onClose(); }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{favSnusObj.name}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>{favSnusObj.brand} · {favSnusObj.type}</div>
                    <FlameStrength value={favSnusObj.strength} />
                  </div>
                </div>
              )}
              {userReviews.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={st.sectionTitle}>Reviews ({userReviews.length})</div>
                  {userReviews.map((r, i) => (
                    <div key={i} style={st.reviewCard} onClick={() => { onOpenSnus(snusList.find(s => s.id === r.snusId)); onClose(); }}>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{r.snusName}</div>
                      <StarRating value={r.rating} size={13} />
                      {r.text && <div style={{ fontSize: 13, color: "#888", marginTop: 6 }}>{r.text}</div>}
                    </div>
                  ))}
                </div>
              )}
              <button style={st.btnOutline} onClick={onClose}>Close</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function BuddyListModal({ buddies, onSelectBuddy, onClose }) {
  const st = {
    modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 150, display: "flex", alignItems: "flex-end" },
    box: { background: "#141414", border: "1px solid #222", borderRadius: "18px 18px 0 0", width: "100%", maxWidth: 430, margin: "0 auto", padding: "24px 20px 36px", maxHeight: "88vh", overflowY: "auto" },
    btnOutline: { background: "none", color: "#e8b84b", border: "1px solid #e8b84b", borderRadius: 8, padding: "12px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%", marginTop: 8 },
  };
  return (
    <div style={st.modal} onClick={onClose}>
      <div style={st.box} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>🤠 Buddies ({buddies.length})</div>
        {buddies.length === 0 && <div style={{ color: "#555", fontSize: 13, textAlign: "center", padding: 20 }}>No Buddies yet</div>}
        {buddies.map((b, i) => (
          <div key={i} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "14px", marginBottom: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }} onClick={() => onSelectBuddy(b.name)}>
            <div style={{ fontSize: 28 }}>{b.avatar || "🤠"}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e8b84b" }}>@{b.name}</div>
          </div>
        ))}
        <button style={st.btnOutline} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("hjem");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("USA");
  const [city, setCity] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("🤠");
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [showPrivacyInReg, setShowPrivacyInReg] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [refCodeInput, setRefCodeInput] = useState("");
  const [snusList, setSnusList] = useState([]);
  const [pendingList, setPendingList] = useState([]);
  const [reportedList, setReportedList] = useState([]);
  const [userList, setUserList] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedSnus, setSelectedSnus] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [editingReview, setEditingReview] = useState(false);
  const [newSnus, setNewSnus] = useState({ name: "", brand: "", type: "", strength: "3", description: "", nicotine: "", flavors: [], nicotineFree: false });
  const [addSubmitted, setAddSubmitted] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adminNewSnus, setAdminNewSnus] = useState({ name: "", brand: "", type: "", strength: "3", description: "", nicotine: "", flavors: [], nicotineFree: false });
  const [editingSnus, setEditingSnus] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStrength, setFilterStrength] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterFlavor, setFilterFlavor] = useState("");
  const [filterNicFree, setFilterNicFree] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [unknownBarcode, setUnknownBarcode] = useState(null);
  const [barcodeMatched, setBarcodeMatched] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ country: "USA", city: "", gender: "", age: "", favoriteSnus: "", avatar: "🤠" });
  const [buddySearch, setBuddySearch] = useState("");
  const [buddyResults, setBuddyResults] = useState([]);
  const [buddyRequests, setBuddyRequests] = useState([]);
  const [buddies, setBuddies] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [viewingUser, setViewingUser] = useState(null);
  const [showBuddyList, setShowBuddyList] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [rankingCategory, setRankingCategory] = useState("vurderinger");
  const [mergingWith, setMergingWith] = useState(null);
  const [duplicates, setDuplicates] = useState([]);

  const isAdmin = user?.email === ADMIN_EMAIL;
  const displayName = user?.displayName || user?.email;
  const myAvatar = userProfile?.avatar || "🤠";
  const unreadNotifs = notifications.filter(n => !n.read).length;

  const myReviews = snusList.flatMap(s => (s.reviews || []).filter(r => r.user === displayName).map(r => ({ ...r, snusId: s.id, snusName: s.name })));
  const allReviews = snusList.flatMap(s => (s.reviews || []).map(r => ({ ...r, snusId: s.id, snusName: s.name }))).sort((a, b) => new Date(b.date) - new Date(a.date));
  const myAvgRating = myReviews.length > 0 ? (myReviews.reduce((sum, r) => sum + r.rating, 0) / myReviews.length).toFixed(1) : "–";
  const myStreak = calculateStreak(myReviews);
  const myLikesReceived = countLikesReceived(myReviews);
  const ratingTitle = getRatingTitle(myReviews.length);
  const productTitle = getProductTitle(userProfile?.approvedProducts || 0);
  const streakTitle = getStreakTitle(myStreak);
  const inviteTitle = getInviteTitle(userProfile?.inviteCount || 0);
  const loginStreakTitle = getLoginStreakTitle(userProfile?.loginStreak || 0);
  const myRefCode = userProfile?.refCode || "";
  const uniqueTypes = Object.values(snusList.reduce((acc, s) => {
    const t = (s.type || "").trim();
    if (t && !acc[t.toLowerCase()]) acc[t.toLowerCase()] = t;
    return acc;
  }, {})).sort();
  const uniqueFlavors = [...new Set(snusList.flatMap(s => s.flavors || []))].sort();
  const daysSinceLogin = daysSince(userProfile?.lastLogin);
  const topFavSnus = [...snusList].sort((a, b) => (b.favCount || 0) - (a.favCount || 0)).slice(0, 10);
  const favSnusObj = snusList.find(s => s.id === userProfile?.favoriteSnus);
  const filteredUsers = userList.filter(u =>
    u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.city?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.country?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filtered = snusList.filter(s => {
    const matchSearch = s.name?.toLowerCase().includes(search.toLowerCase()) || s.brand?.toLowerCase().includes(search.toLowerCase());
    const matchStrength = !filterStrength || s.strength === filterStrength;
    const matchType = !filterType || s.type?.toLowerCase().includes(filterType.toLowerCase());
    const matchFlavor = !filterFlavor || (s.flavors || []).includes(filterFlavor);
    const matchNicFree = !filterNicFree || s.nicotineFree;
    return matchSearch && matchStrength && matchType && matchFlavor && matchNicFree;
  });

  const rankingData = userList.map(u => {
    const reviews = snusList.flatMap(s => (s.reviews || []).filter(r => r.user === u.displayName));
    const likes = countLikesReceived(reviews);
    const streak = calculateStreak(reviews);
    return { ...u, reviewCount: reviews.length, likesReceived: likes, ratingStreak: streak };
  });

  const getRanking = () => {
    if (rankingCategory === "vurderinger") return [...rankingData].sort((a, b) => b.reviewCount - a.reviewCount);
    if (rankingCategory === "streak") return [...rankingData].sort((a, b) => (b.loginStreak || 0) - (a.loginStreak || 0));
    if (rankingCategory === "likes") return [...rankingData].sort((a, b) => b.likesReceived - a.likesReceived);
    if (rankingCategory === "invitasjoner") return [...rankingData].sort((a, b) => (b.inviteCount || 0) - (a.inviteCount || 0));
    return rankingData;
  };

  const getRankingValue = (u) => {
    if (rankingCategory === "vurderinger") return plural(u.reviewCount, "review", "reviews");
    if (rankingCategory === "streak") return plural(u.loginStreak || 0, "day", "days");
    if (rankingCategory === "likes") return plural(u.likesReceived, "like", "likes");
    if (rankingCategory === "invitasjoner") return plural(u.inviteCount || 0, "invite", "invites");
    return "";
  };

  const rankedList = getRanking();
  const myRank = rankedList.findIndex(u => u.displayName === displayName) + 1;
  const myRankData = rankedList.find(u => u.displayName === displayName);

  useEffect(() => {
    onAuthStateChanged(auth, async u => {
      setUser(u);
      if (u) {
        fetchUserProfile(u.uid);
        fetchBuddyRequests(u.uid);
        fetchBuddies(u.uid);
        fetchNotifications(u.uid);
      }
    });
    fetchSnus();
  }, []);

  useEffect(() => { if (isAdmin) { fetchPending(); fetchReported(); } }, [isAdmin]);
  useEffect(() => { if (user) fetchUsers(); }, [user]);
  useEffect(() => {
  if (snusList.length > 0) {
    const groups = [];
    const used = new Set();
    for (let i = 0; i < snusList.length; i++) {
      if (used.has(snusList[i].id)) continue;
      const group = [snusList[i]];
      for (let j = i + 1; j < snusList.length; j++) {
        if (used.has(snusList[j].id)) continue;
        if (similarName(snusList[i].name, snusList[j].name)) {
          group.push(snusList[j]);
          used.add(snusList[j].id);
        }
      }
      if (group.length > 1) { used.add(snusList[i].id); groups.push(group); }
    }
    setDuplicates(groups);
  }
}, [snusList]);

  const fetchSnus = async () => {
    try {
      const snap = await getDocs(query(collection(db, "snus"), orderBy("avgRating", "desc")));
      setSnusList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(e) {}
  };

  const fetchPending = async () => {
    const snap = await getDocs(collection(db, "snus_pending"));
    setPendingList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const fetchReported = async () => {
    const snap = await getDocs(collection(db, "reported_reviews"));
    setReportedList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      setUserList(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    } catch(e) {}
  };

  const fetchUserProfile = async (uid) => {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        const data = snap.data();
        if (!data.refCode) {
          const refCode = generateRefCode(data.displayName || uid);
          await updateDoc(doc(db, "users", uid), { refCode });
          data.refCode = refCode;
        }
        const lastLogin = data.lastLogin ? new Date(data.lastLogin) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let newStreak = data.loginStreak || 0;
        if (lastLogin) {
          const lastLoginDay = new Date(lastLogin);
          lastLoginDay.setHours(0, 0, 0, 0);
          const diff = Math.round((today - lastLoginDay) / (1000 * 60 * 60 * 24));
          if (diff === 0) newStreak = Math.max(newStreak, 1);
          else if (diff === 1) newStreak = newStreak + 1;
          else newStreak = 1;
        } else {
          newStreak = 1;
        }
        data.loginStreak = newStreak;
        await updateDoc(doc(db, "users", uid), { loginStreak: newStreak, lastLogin: new Date().toISOString() });
        setUserProfile(data); setProfileForm(data);
      }
    } catch(e) {}
  };

  const fetchBuddyRequests = async (uid) => {
    try {
      const snap = await getDocs(query(collection(db, "buddy_requests"), where("toUid", "==", uid), where("status", "==", "pending")));
      const requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBuddyRequests(requests); setNotifCount(requests.length);
    } catch(e) {}
  };

  const fetchBuddies = async (uid) => {
    try {
      const [snap1, snap2] = await Promise.all([
        getDocs(query(collection(db, "buddy_requests"), where("fromUid", "==", uid), where("status", "==", "accepted"))),
        getDocs(query(collection(db, "buddy_requests"), where("toUid", "==", uid), where("status", "==", "accepted")))
      ]);
      const all = [...snap1.docs.map(d => d.data()), ...snap2.docs.map(d => d.data())];
      setBuddies(all.map(b => b.fromUid === uid ? { name: b.toName, uid: b.toUid, avatar: b.toAvatar } : { name: b.fromName, uid: b.fromUid, avatar: b.fromAvatar }));
    } catch(e) {}
  };

  const fetchNotifications = async (uid) => {
    try {
      const snap = await getDocs(query(collection(db, "notifications"), where("toUid", "==", uid)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifications(list);
    } catch(e) {}
  };

  const markNotifRead = async (notif) => {
    try { await updateDoc(doc(db, "notifications", notif.id), { read: true }); } catch(e) {}
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
  };

  const mergeProducts = async (keepSnus, deleteSnus) => {
    if (!window.confirm(`Merge "${deleteSnus.name}" into "${keepSnus.name}"? This cannot be undone!`)) return;
    try {
      const existingUsers = new Set((keepSnus.reviews || []).map(r => r.user));
      const newReviews = [...(keepSnus.reviews || [])];
      for (const r of (deleteSnus.reviews || [])) {
        if (!existingUsers.has(r.user)) {
          newReviews.push(r);
          existingUsers.add(r.user);
        }
      }
      const totalScore = newReviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = newReviews.length > 0 ? totalScore / newReviews.length : 0;
      const newFavCount = (keepSnus.favCount || 0) + (deleteSnus.favCount || 0);
      const newBarcode = keepSnus.barcode || deleteSnus.barcode || "";

      await updateDoc(doc(db, "snus", keepSnus.id), {
        reviews: newReviews,
        totalRatings: newReviews.length,
        totalScore,
        avgRating,
        favCount: newFavCount,
        barcode: newBarcode,
      });

      const usersWithFav = await getDocs(query(collection(db, "users"), where("favoriteSnus", "==", deleteSnus.id)));
      for (const u of usersWithFav.docs) {
        await updateDoc(doc(db, "users", u.id), { favoriteSnus: keepSnus.id });
      }

      await deleteDoc(doc(db, "snus", deleteSnus.id));
      setMergingWith(null);
      fetchSnus();
      alert(`✅ Merged! "${deleteSnus.name}" is now part of "${keepSnus.name}"`);
    } catch(e) {
      alert("Something went wrong: " + e.message);
    }
  };

  const reportReview = async (snus, review) => {
    try {
      const existing = await getDocs(query(collection(db, "reported_reviews"), where("snusId", "==", snus.id), where("reviewUser", "==", review.user), where("reviewDate", "==", review.date)));
      if (!existing.empty) { alert("You already reported this!"); return; }
      await addDoc(collection(db, "reported_reviews"), { snusId: snus.id, snusName: snus.name, reviewUser: review.user, reviewText: review.text || "", reviewRating: review.rating, reviewDate: review.date, reportedBy: displayName, reportedAt: new Date().toISOString() });
      alert("Reported! 🚩");
    } catch(e) {}
  };

  const deleteReview = async (snus, review) => {
    if (!window.confirm(`Delete review from @${review.user}?`)) return;
    const newReviews = snus.reviews.filter(r => !(r.user === review.user && r.date === review.date));
    const totalScore = newReviews.reduce((sum, r) => sum + r.rating, 0);
    await updateDoc(doc(db, "snus", snus.id), { reviews: newReviews, totalRatings: newReviews.length, totalScore, avgRating: newReviews.length > 0 ? totalScore / newReviews.length : 0 });
    setSelectedSnus(prev => prev ? { ...prev, reviews: newReviews } : null);
    fetchSnus();
  };

  const dismissReport = async (reportId) => { await deleteDoc(doc(db, "reported_reviews", reportId)); fetchReported(); };

  const deleteReportedReview = async (report) => {
    const snusDoc = snusList.find(s => s.id === report.snusId);
    if (!snusDoc) return;
    const newReviews = snusDoc.reviews.filter(r => !(r.user === report.reviewUser && r.date === report.reviewDate));
    const totalScore = newReviews.reduce((sum, r) => sum + r.rating, 0);
    await updateDoc(doc(db, "snus", report.snusId), { reviews: newReviews, totalRatings: newReviews.length, totalScore, avgRating: newReviews.length > 0 ? totalScore / newReviews.length : 0 });
    await deleteDoc(doc(db, "reported_reviews", report.id));
    fetchReported(); fetchSnus();
  };

  const searchBuddies = async () => {
    if (!buddySearch.trim()) return;
    try {
      const sl = buddySearch.toLowerCase();
      const snap = await getDocs(query(collection(db, "users"), where("displayNameLower", ">=", sl), where("displayNameLower", "<=", sl + "\uf8ff")));
      setBuddyResults(snap.docs.map(d => ({ uid: d.id, ...d.data() })).filter(u => u.uid !== user.uid));
    } catch(e) {}
  };

  const sendBuddyRequest = async (toUser) => {
    try {
      const existing = await getDocs(query(collection(db, "buddy_requests"), where("fromUid", "==", user.uid), where("toUid", "==", toUser.uid)));
      if (!existing.empty) { alert("Request already sent!"); return; }
      await addDoc(collection(db, "buddy_requests"), { fromUid: user.uid, fromName: displayName, fromAvatar: myAvatar, toUid: toUser.uid, toName: toUser.displayName, toAvatar: toUser.avatar || "🤠", status: "pending", createdAt: new Date().toISOString() });
      alert(`Buddy request sent to @${toUser.displayName}! 🤠`);
    } catch(e) {}
  };

  const acceptBuddy = async (request) => {
    await updateDoc(doc(db, "buddy_requests", request.id), { status: "accepted" });
    fetchBuddyRequests(user.uid); fetchBuddies(user.uid);
    setNotifCount(n => Math.max(0, n - 1));
  };

  const rejectBuddy = async (request) => {
    await deleteDoc(doc(db, "buddy_requests", request.id));
    fetchBuddyRequests(user.uid);
    setNotifCount(n => Math.max(0, n - 1));
  };

  const saveProfile = async () => {
    const oldFav = userProfile?.favoriteSnus || "";
    const newFav = profileForm.favoriteSnus || "";
    if (oldFav !== newFav) {
      if (oldFav) {
        const oldRef = doc(db, "snus", oldFav);
        const oldSnap = await getDoc(oldRef);
        if (oldSnap.exists()) await updateDoc(oldRef, { favCount: Math.max(0, (oldSnap.data().favCount || 0) - 1) });
      }
      if (newFav) {
        const newRef = doc(db, "snus", newFav);
        const newSnap = await getDoc(newRef);
        if (newSnap.exists()) await updateDoc(newRef, { favCount: (newSnap.data().favCount || 0) + 1 });
      }
    }
    await setDoc(doc(db, "users", user.uid), { ...profileForm, displayName, displayNameLower: displayName.toLowerCase() }, { merge: true });
    setUserProfile({ ...profileForm, displayName });
    setEditingProfile(false);
    fetchSnus();
  };

  const handleAuth = async () => {
    try {
      if (authMode === "register") {
        if (!username.trim()) { alert("Choose a username!"); return; }
        const ageNum = parseInt(age);
        if (!age || ageNum < 21) { alert("You must be at least 21!"); return; }
        if (!gender) { alert("Choose your gender!"); return; }
        if (!acceptedPrivacy) { alert("You must accept the privacy policy!"); return; }
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: username.trim() });
        const refCode = generateRefCode(username.trim());
        await setDoc(doc(db, "users", result.user.uid), { displayName: username.trim(), displayNameLower: username.trim().toLowerCase(), age: ageNum, gender, country, city, avatar: selectedAvatar, favoriteSnus: "", approvedProducts: 0, refCode, inviteCount: 0, invitedBy: refCodeInput || null, lastLogin: new Date().toISOString(), loginStreak: 1 });
        if (refCodeInput.trim()) {
          const refSnap = await getDocs(query(collection(db, "users"), where("refCode", "==", refCodeInput.trim())));
          if (!refSnap.empty) {
            const inviterUid = refSnap.docs[0].id;
            const inviterData = refSnap.docs[0].data();
            await updateDoc(doc(db, "users", inviterUid), { inviteCount: (inviterData.inviteCount || 0) + 1 });
          }
        }
        setUser({ ...result.user, displayName: username.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch(e) { alert(e.message); }
  };

  const openSnus = (sn) => {
    if (sn) { setSelectedSnus(sn); setUserRating(0); setReviewText(""); setSubmitted(false); setEditingReview(false); }
  };

  const submitReview = async () => {
    if (!userRating || !selectedSnus) return;
    const existingReview = selectedSnus.reviews?.find(r => r.user === displayName);
    if (existingReview && !editingReview) { alert("You already rated this!"); return; }
    const snusRef = doc(db, "snus", selectedSnus.id);
    if (editingReview && existingReview) {
      const newReviews = selectedSnus.reviews.map(r => r.user === displayName ? { ...r, rating: userRating, text: reviewText, edited: true } : r);
      const totalScore = newReviews.reduce((sum, r) => sum + r.rating, 0);
      await updateDoc(snusRef, { reviews: newReviews, totalScore, avgRating: totalScore / newReviews.length });
    } else {
      await updateDoc(snusRef, {
        reviews: arrayUnion({ user: displayName, avatar: myAvatar, rating: userRating, text: reviewText, date: new Date().toISOString(), likes: [] }),
        totalRatings: (selectedSnus.totalRatings || 0) + 1,
        totalScore: (selectedSnus.totalScore || 0) + userRating,
        avgRating: ((selectedSnus.totalScore || 0) + userRating) / ((selectedSnus.totalRatings || 0) + 1),
      });
    }
    setSubmitted(true); setEditingReview(false); fetchSnus();
  };

  const likeReview = async (snus, review) => {
    const likes = review.likes || [];
    const hasLiked = likes.includes(displayName);
    const newReviews = snus.reviews.map(r => r.user === review.user && r.date === review.date ? { ...r, likes: hasLiked ? likes.filter(l => l !== displayName) : [...likes, displayName] } : r);
    await updateDoc(doc(db, "snus", snus.id), { reviews: newReviews });
    fetchSnus();
    setSelectedSnus(prev => prev ? { ...prev, reviews: newReviews } : null);
  };

  const startEditReview = (snus) => {
    const myReview = snus.reviews?.find(r => r.user === displayName);
    if (myReview) { setUserRating(myReview.rating); setReviewText(myReview.text || ""); setEditingReview(true); setSubmitted(false); }
  };

  const submitNewSnus = async () => {
    if (!newSnus.name.trim() || !newSnus.brand.trim()) { alert("Product name and brand are required!"); return; }
    const dup = snusList.find(s => similarName(s.name, newSnus.name));
    if (dup) { alert(`"${dup.name}" already exists! Check if it's the same product.`); return; }
    const pendingSnap = await getDocs(collection(db, "snus_pending"));
    const pendingDup = pendingSnap.docs.map(d => d.data()).find(p => similarName(p.name, newSnus.name));
    if (pendingDup) { alert(`"${pendingDup.name}" is already waiting for admin approval.`); return; }
    await addDoc(collection(db, "snus_pending"), { ...newSnus, submittedBy: displayName, submittedByUid: user.uid, approved: false, createdAt: new Date().toISOString() });
    setNewSnus({ name: "", brand: "", type: "", strength: "3", description: "", nicotine: "", flavors: [], nicotineFree: false });
    setAddSubmitted(true);
  };

  const adminAddSnus = async () => {
    if (!adminNewSnus.name.trim() || !adminNewSnus.brand.trim()) { alert("Product name and brand are required!"); return; }
    const dup = snusList.find(s => similarName(s.name, adminNewSnus.name));
    if (dup && !window.confirm(`"${dup.name}" already exists. Add anyway?`)) return;
    await addDoc(collection(db, "snus"), { ...adminNewSnus, avgRating: 0, totalRatings: 0, totalScore: 0, favCount: 0, reviews: [], createdAt: new Date().toISOString() });
    setAdminNewSnus({ name: "", brand: "", type: "", strength: "3", description: "", nicotine: "", flavors: [], nicotineFree: false });
    fetchSnus(); alert("Product added!");
  };

  const adminUpdateSnus = async () => {
    if (!editingSnus) return;
    await updateDoc(doc(db, "snus", editingSnus.id), { name: editingSnus.name, brand: editingSnus.brand, type: editingSnus.type, strength: editingSnus.strength, description: editingSnus.description || "", barcode: editingSnus.barcode || "", nicotine: editingSnus.nicotine || "", flavors: editingSnus.flavors || [], nicotineFree: editingSnus.nicotineFree || false });
    setEditingSnus(null); fetchSnus(); alert("Updated!");
  };

  const approvePending = async (item) => {
    const dup = snusList.find(s => similarName(s.name, item.name));
    if (dup && !window.confirm(`"${dup.name}" already exists. Approve anyway?`)) return;
    await addDoc(collection(db, "snus"), { name: item.name, brand: item.brand, type: item.type, strength: item.strength, barcode: item.barcode || "", description: item.description || "", nicotine: item.nicotine || "", flavors: item.flavors || [], nicotineFree: item.nicotineFree || false, avgRating: 0, totalRatings: 0, totalScore: 0, favCount: 0, reviews: [], createdAt: new Date().toISOString() });
    await deleteDoc(doc(db, "snus_pending", item.id));
    if (item.submittedByUid) {
      const snap = await getDoc(doc(db, "users", item.submittedByUid));
      if (snap.exists()) await updateDoc(doc(db, "users", item.submittedByUid), { approvedProducts: (snap.data().approvedProducts || 0) + 1 });
      await addDoc(collection(db, "notifications"), { toUid: item.submittedByUid, text: `✅ Your suggestion "${item.name}" was approved and is now in the catalog!`, read: false, createdAt: new Date().toISOString() });
    }
    fetchPending(); fetchSnus();
  };

  const rejectPending = async (item) => {
    await deleteDoc(doc(db, "snus_pending", item.id));
    if (item.submittedByUid) {
      await addDoc(collection(db, "notifications"), { toUid: item.submittedByUid, text: `❌ Your suggestion "${item.name}" was not approved this time.`, read: false, createdAt: new Date().toISOString() });
    }
    fetchPending();
  };

  const handleScanResult = (barcode) => {
    setShowScanner(false);
    const found = snusList.find(s => s.barcode === barcode);
    if (found) openSnus(found); else setUnknownBarcode(barcode);
  };

  const handleBarcodeMatch = async (snus, barcode) => {
    await updateDoc(doc(db, "snus", snus.id), { barcode });
    setUnknownBarcode(null); setBarcodeMatched(true); fetchSnus();
    setTimeout(() => { setBarcodeMatched(false); openSnus({ ...snus, barcode }); }, 1500);
  };

  const handleBarcodeSuggest = async (snusData) => {
    await addDoc(collection(db, "snus_pending"), { ...snusData, submittedBy: displayName, submittedByUid: user.uid, approved: false, createdAt: new Date().toISOString() });
    setUnknownBarcode(null); alert("Sent to admin!");
  };

  const copyRefCode = () => {
    const link = `https://snusrate.vercel.app?ref=${myRefCode}`;
    navigator.clipboard.writeText(link).then(() => alert("Invite link copied! 🎉"));
  };

  const s = {
    app: { fontFamily: "'Georgia', serif", background: "#0a0a0a", minHeight: "100vh", color: "#e8e0d0", maxWidth: 430, margin: "0 auto" },
    header: { background: "#111", borderBottom: "1px solid #1e1e1e", padding: "14px 20px", position: "sticky", top: 0, zIndex: 10 },
    logo: { fontSize: 24, fontWeight: 700, color: "#e8b84b", letterSpacing: -0.5 },
    logoSub: { fontSize: 9, letterSpacing: 3.5, color: "#555", textTransform: "uppercase", marginTop: 1 },
    nav: { display: "flex", borderBottom: "1px solid #1a1a1a", background: "#0f0f0f", overflowX: "auto" },
    navBtn: (a) => ({ flex: 1, padding: "16px 6px", background: a ? "#111" : "none", border: "none", color: a ? "#e8b84b" : "#666", fontSize: 12, fontWeight: 700, cursor: "pointer", borderBottom: a ? "3px solid #e8b84b" : "3px solid transparent", whiteSpace: "nowrap" }),
    content: { padding: "16px 16px 80px" },
    card: { background: "#141414", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px", marginBottom: 10, cursor: "pointer" },
    btn: { background: "#e8b84b", color: "#0a0a0a", border: "none", borderRadius: 8, padding: "13px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%", marginTop: 12 },
    btnOutline: { background: "none", color: "#e8b84b", border: "1px solid #e8b84b", borderRadius: 8, padding: "12px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%", marginTop: 8 },
    btnSmall: { background: "#e8b84b", color: "#0a0a0a", border: "none", borderRadius: 6, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" },
    btnGreen: { background: "#2d5a3d", color: "#7ecb96", border: "none", borderRadius: 6, padding: "8px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer", marginRight: 8 },
    btnRed: { background: "#5a2d2d", color: "#cb7e7e", border: "none", borderRadius: 6, padding: "8px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer" },
    input: { width: "100%", background: "#111", border: "1px solid #222", borderRadius: 8, padding: "12px 14px", color: "#e8e0d0", fontSize: 14, marginTop: 8, boxSizing: "border-box", fontFamily: "inherit", outline: "none" },
    select: { width: "100%", background: "#111", border: "1px solid #222", borderRadius: 8, padding: "12px 14px", color: "#e8e0d0", fontSize: 14, marginTop: 8, boxSizing: "border-box", fontFamily: "inherit", outline: "none" },
    searchBox: { width: "100%", background: "#141414", border: "1px solid #222", borderRadius: 10, padding: "12px 16px", color: "#e8e0d0", fontSize: 14, marginBottom: 14, boxSizing: "border-box", fontFamily: "inherit", outline: "none" },
    modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 100, display: "flex", alignItems: "flex-end" },
    modalBox: { background: "#141414", border: "1px solid #222", borderRadius: "18px 18px 0 0", width: "100%", maxWidth: 430, margin: "0 auto", padding: "24px 20px 36px", maxHeight: "88vh", overflowY: "auto" },
    label: { fontSize: 10, letterSpacing: 2, color: "#555", textTransform: "uppercase", marginTop: 16, display: "block", fontWeight: 700 },
    sectionTitle: { fontSize: 10, letterSpacing: 2.5, color: "#444", textTransform: "uppercase", marginBottom: 14, fontWeight: 700 },
    pendingCard: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "12px 14px", marginBottom: 10 },
    reviewCard: { background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 8, padding: "12px 14px", marginBottom: 8 },
    statBox: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "14px", textAlign: "center", flex: 1, cursor: "pointer" },
    buddyCard: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" },
    badge: { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#e8b84b" },
    filterBtn: (active) => ({ background: active ? "#1e1e1e" : "none", border: active ? "1px solid #e8b84b" : "1px solid #333", borderRadius: 20, padding: "5px 12px", color: active ? "#e8b84b" : "#555", cursor: "pointer", fontSize: 11, fontWeight: 700 }),
    rankBtn: (active) => ({ flex: 1, padding: "10px 4px", background: active ? "#1e1e1e" : "none", border: "none", borderBottom: active ? "2px solid #e8b84b" : "2px solid transparent", color: active ? "#e8b84b" : "#555", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }),
  };

  if (!user) return (
    <div style={s.app}>
      <div style={s.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={s.logo}>SnusRate</div><div style={s.logoSub}>Nicotine Pouch Community</div></div>
          <button onClick={() => setShowMenu(true)} style={{ background: "none", border: "none", color: "#555", fontSize: 22, cursor: "pointer" }}>☰</button>
        </div>
      </div>
      {showMenu && <HamburgerMenu onClose={() => setShowMenu(false)} onInstall={() => { setShowMenu(false); setShowInstall(true); }} />}
      {showInstall && <InstallModal onClose={() => setShowInstall(false)} />}
      <div style={s.content}>
        <div style={{ textAlign: "center", padding: "60px 0 32px" }}>
          <div style={{ fontSize: 52, fontWeight: 900, color: "#e8b84b", letterSpacing: -1, marginBottom: 6 }}>SnusRate</div>
          <div style={{ fontSize: 11, letterSpacing: 4, color: "#555", textTransform: "uppercase", marginBottom: 20 }}>Nicotine Pouch Community</div>
          <div style={{ fontSize: 16, color: "#888", fontStyle: "italic", maxWidth: 280, margin: "0 auto", lineHeight: 1.6 }}>Rate, explore and share your pouch experience</div>
        </div>
        <div style={{ ...s.sectionTitle, textAlign: "center", marginBottom: 20 }}>{authMode === "login" ? "Log in" : "Create account"}</div>
        {authMode === "register" && (
          <>
            <span style={s.label}>Username</span>
            <input style={s.input} value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. PouchKing_NYC" />
            <span style={s.label}>Choose avatar</span>
            <AvatarPicker selected={selectedAvatar} onSelect={setSelectedAvatar} />
            <span style={s.label}>Age (must be 21+)</span>
            <input style={s.input} type="number" min="21" max="99" value={age} onChange={e => setAge(e.target.value)} placeholder="Your age" />
            <span style={s.label}>Gender</span>
            <select style={s.select} value={gender} onChange={e => setGender(e.target.value)}>
              <option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option>
            </select>
            <span style={s.label}>Country</span>
            <select style={s.select} value={country} onChange={e => setCountry(e.target.value)}>
              <option>USA</option><option>Norge</option><option>Sverige</option><option>Danmark</option><option>Finland</option><option>Other</option>
            </select>
            <span style={s.label}>City</span>
            <input style={s.input} value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. New York" />
            <span style={s.label}>Invite code (optional)</span>
            <input style={s.input} value={refCodeInput} onChange={e => setRefCodeInput(e.target.value)} placeholder="Enter code if you were invited" />
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 16 }}>
              <input type="checkbox" checked={acceptedPrivacy} onChange={e => setAcceptedPrivacy(e.target.checked)} style={{ marginTop: 2, cursor: "pointer", width: 16, height: 16 }} />
              <span style={{ fontSize: 13, color: "#888" }}>I accept the{" "}<span style={{ color: "#e8b84b", cursor: "pointer", textDecoration: "underline" }} onClick={() => setShowPrivacyInReg(true)}>privacy policy</span></span>
            </div>
          </>
        )}
        <span style={s.label}>Email</span>
        <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
        <span style={s.label}>Password</span>
        <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
        <button style={s.btn} onClick={handleAuth}>{authMode === "login" ? "Log in" : "Register"}</button>
        <button style={s.btnOutline} onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>
          {authMode === "login" ? "New here? Sign up" : "Have an account? Log in"}
        </button>
      </div>
      {showPrivacyInReg && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 300, overflowY: "auto", padding: 20 }}>
          <div style={{ maxWidth: 430, margin: "0 auto" }}>
            <button onClick={() => setShowPrivacyInReg(false)} style={{ background: "none", border: "1px solid #333", color: "#e8b84b", borderRadius: 6, padding: "8px 16px", cursor: "pointer", marginBottom: 20 }}>← Back</button>
            <div style={{ color: "#aaa", fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{PRIVACY_POLICY}</div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={s.app}>
      <datalist id="snus-brands">{SNUS_BRANDS.map(b => <option key={b} value={b} />)}</datalist>
      {showScanner && <BarcodeScanner onResult={handleScanResult} onClose={() => setShowScanner(false)} />}
      {unknownBarcode && <UnknownBarcodeModal barcode={unknownBarcode} snusList={snusList} onMatch={handleBarcodeMatch} onSuggest={handleBarcodeSuggest} onClose={() => setUnknownBarcode(null)} />}
      {barcodeMatched && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)" }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 56 }}>✅</div><div style={{ fontSize: 16, fontWeight: 700, color: "#e8b84b", marginTop: 12 }}>Barcode linked!</div></div>
        </div>
      )}
      {showMenu && <HamburgerMenu onClose={() => setShowMenu(false)} onInstall={() => { setShowMenu(false); setShowInstall(true); }} />}
      {showInstall && <InstallModal onClose={() => setShowInstall(false)} />}
      {viewingUser && (
        <UserProfileModal username={viewingUser} currentUser={user} currentDisplayName={displayName} currentUserReviews={myReviews} snusList={snusList} onClose={() => setViewingUser(null)} onOpenSnus={openSnus} />
      )}
      {showBuddyList && <BuddyListModal buddies={buddies} onSelectBuddy={name => { setShowBuddyList(false); setViewingUser(name); }} onClose={() => setShowBuddyList(false)} />}

      {mergingWith && (
        <div style={s.modal} onClick={() => setMergingWith(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, color: "#e8b84b" }}>🔀 Merge duplicate</div>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>Pick which one is CORRECT – the other is deleted and its reviews moved over.</div>
            <div style={{ fontSize: 11, color: "#cb7e7e", marginBottom: 16 }}>⚠️ This cannot be undone!</div>
            {mergingWith.map((sn, i) => (
              <div key={sn.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "14px", marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{sn.name}</div>
                <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>{sn.brand} · {sn.type} · {sn.totalRatings || 0} reviews</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {mergingWith.filter(x => x.id !== sn.id).map(other => (
                    <button key={other.id} style={s.btnGreen} onClick={() => mergeProducts(sn, other)}>
                      ✓ Keep this, delete "{other.name.slice(0, 20)}"
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button style={s.btnOutline} onClick={() => setMergingWith(null)}>Cancel</button>
          </div>
        </div>
      )}

      {showInvite && (
        <div style={s.modal} onClick={() => setShowInvite(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>📣 Invite friends</div>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>Share the link and earn titles when people sign up!</div>
            <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "16px", marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 8, letterSpacing: 2, textTransform: "uppercase" }}>Your code</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#e8b84b", letterSpacing: 2 }}>{myRefCode}</div>
              <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>Invited: {userProfile?.inviteCount || 0}</div>
            </div>
            {inviteTitle && <div style={{ textAlign: "center", marginBottom: 16 }}><span style={s.badge}>{inviteTitle}</span></div>}
            <div style={{ marginBottom: 20 }}>
              <div style={s.sectionTitle}>Next title</div>
              {INVITE_TITLES.map(t => {
                const count = userProfile?.inviteCount || 0;
                const done = count >= t.count;
                return (
                  <div key={t.count} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1a1a1a" }}>
                    <span style={{ fontSize: 13, color: done ? "#e8b84b" : "#444" }}>{t.title}</span>
                    <span style={{ fontSize: 11, color: done ? "#e8b84b" : "#333" }}>{done ? "✅" : `${count}/${t.count}`}</span>
                  </div>
                );
              })}
            </div>
            <button style={s.btn} onClick={copyRefCode}>📋 Copy invite link</button>
            <button style={s.btnOutline} onClick={() => setShowInvite(false)}>Close</button>
          </div>
        </div>
      )}

      <div style={s.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={s.logo}>SnusRate</div><div style={s.logoSub}>Nicotine Pouch Community</div></div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setShowScanner(true)} style={{ background: "none", border: "1px solid #e8b84b", color: "#e8b84b", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 16 }}>📷</button>
            {(notifCount + unreadNotifs) > 0 && <button onClick={() => setTab("profil")} style={{ background: "#e8b84b", color: "#0a0a0a", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>🔔 {notifCount + unreadNotifs}</button>}
            <button onClick={() => setShowMenu(true)} style={{ background: "none", border: "none", color: "#555", fontSize: 22, cursor: "pointer" }}>☰</button>
          </div>
        </div>
      </div>

      <div style={s.nav}>
        {[["hjem","Home"],["explore","Explore"],["vurderinger","Reviews"],["topp","Top 10"],["ranking","Ranking"],["profil","Profile"], ...(isAdmin ? [["admin","Admin"]] : [])].map(([k,l]) => (
          <button key={k} style={s.navBtn(tab===k)} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <div style={s.content}>

        {tab === "hjem" && (
          <>
            <div style={{ textAlign: "center", padding: "32px 0 24px" }}>
              <div style={{ fontSize: 56, marginBottom: 8 }}>{myAvatar}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#e8b84b" }}>Welcome back</div>
              <div style={{ fontSize: 15, color: "#e8e0d0", marginTop: 4 }}>@{displayName}</div>
              {daysSinceLogin !== null && daysSinceLogin > 0 && (
                <div style={{ fontSize: 12, color: "#555", marginTop: 8 }}>You were here <span style={{ color: "#e8b84b" }}>{daysSinceLogin} day{daysSinceLogin !== 1 ? "s" : ""}</span> ago</div>
              )}
              {daysSinceLogin === 0 && (
                <div style={{ fontSize: 12, color: "#555", marginTop: 8 }}>You were here <span style={{ color: "#e8b84b" }}>earlier today</span></div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20, flexWrap: "wrap" }}>
              <span style={s.badge}>{ratingTitle}</span>
              {productTitle && <span style={s.badge}>{productTitle}</span>}
              {streakTitle && <span style={s.badge}>{streakTitle}</span>}
              {loginStreakTitle && <span style={s.badge}>{loginStreakTitle}</span>}
              {inviteTitle && <span style={s.badge}>{inviteTitle}</span>}
            </div>
            {(userProfile?.loginStreak || 0) > 0 && (
              <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "12px 16px", marginBottom: 16, textAlign: "center" }}>
                <div style={{ fontSize: 22 }}>📅</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#e8b84b", marginTop: 4 }}>{userProfile.loginStreak} day{userProfile.loginStreak !== 1 ? "s" : ""} in a row</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>Login streak</div>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {[[snusList.length, "Products", null],[myReviews.length, "Reviews", null],[buddies.length, "Buddies", () => setShowBuddyList(true)]].map(([val, label, onClick], i) => (
                <div key={i} style={{ ...s.statBox, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#e8b84b" }}>{val}</div>
                  <div style={{ fontSize: 9, color: "#555", marginTop: 4, letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
                </div>
              ))}
            </div>
            <button style={{ ...s.btn, marginTop: 0, marginBottom: 12, fontSize: 16, padding: "18px 20px" }} onClick={() => setShowScanner(true)}>📷 Scan pouch</button>
            <button style={{ ...s.btnOutline, marginTop: 0, marginBottom: 20 }} onClick={() => setTab("explore")}>🔍 Explore all pouches</button>
            <div style={{ ...s.sectionTitle, marginBottom: 10 }}>Latest activity</div>
            <LiveTicker allReviews={allReviews} onClickReview={r => openSnus(snusList.find(sn => sn.id === r.snusId))} />
            <button style={{ ...s.btnOutline, marginTop: 8 }} onClick={() => setShowInvite(true)}>📣 Invite friends · {userProfile?.inviteCount || 0} invited</button>
          </>
        )}

        {tab === "explore" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input style={{ ...s.searchBox, marginBottom: 0, flex: 1 }} placeholder="🔍  Search pouch or brand..." value={search} onChange={e => setSearch(e.target.value)} />
              <button onClick={() => setShowScanner(true)} style={{ background: "#141414", border: "1px solid #e8b84b", color: "#e8b84b", borderRadius: 10, padding: "0 16px", cursor: "pointer", fontSize: 20 }}>📷</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <button style={s.filterBtn(!filterStrength)} onClick={() => setFilterStrength("")}>All strengths</button>
              {["1","2","3","4","5"].map(v => (
                <button key={v} style={s.filterBtn(filterStrength === v)} onClick={() => setFilterStrength(filterStrength === v ? "" : v)}>{"🔥".repeat(Number(v))}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <button style={s.filterBtn(!filterType)} onClick={() => setFilterType("")}>All types</button>
              {uniqueTypes.slice(0, 6).map(t => (
                <button key={t} style={s.filterBtn(filterType === t)} onClick={() => setFilterType(filterType === t ? "" : t)}>{t}</button>
              ))}
            </div>
            {(uniqueFlavors.length > 0 || snusList.some(sn => sn.nicotineFree)) && (
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                <button style={s.filterBtn(!filterFlavor)} onClick={() => setFilterFlavor("")}>All flavors</button>
                {uniqueFlavors.map(f => (
                  <button key={f} style={s.filterBtn(filterFlavor === f)} onClick={() => setFilterFlavor(filterFlavor === f ? "" : f)}>{f}</button>
                ))}
                <button style={s.filterBtn(filterNicFree)} onClick={() => setFilterNicFree(!filterNicFree)}>Nicotine-free</button>
              </div>
            )}
            <button style={{ ...s.btn, marginTop: 0, marginBottom: 14 }} onClick={() => { setShowAddForm(true); setAddSubmitted(false); }}>+ Suggest new pouch</button>
            <div style={s.sectionTitle}>Pouches ({filtered.length})</div>
            {filtered.map(sn => (
              <div key={sn.id} style={s.card} onClick={() => openSnus(sn)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{sn.name}</div>
                    <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>{sn.brand} · {sn.type}</div>
                    <AttributeRow snus={sn} />
                    {sn.description && <div style={{ fontSize: 12, color: "#555", marginTop: 6, fontStyle: "italic" }}>{sn.description}</div>}
                  </div>
                  <div style={{ textAlign: "right", marginLeft: 12 }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#e8b84b" }}>{(sn.avgRating || 0).toFixed(1)}</div>
                    <div style={{ fontSize: 10, color: "#555" }}>{plural(sn.totalRatings || 0, "review", "reviews")}</div>
                  </div>
                </div>
              </div>
            ))}
            <div style={{ ...s.sectionTitle, marginTop: 24 }}>⭐ Most favorited</div>
            {topFavSnus.filter(sn => (sn.favCount || 0) > 0).map((sn, i) => (
              <div key={sn.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: "1px solid #1a1a1a", cursor: "pointer" }} onClick={() => openSnus(sn)}>
                <div style={{ fontSize: i < 3 ? 18 : 14, fontWeight: 900, width: 28, textAlign: "center" }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{sn.name}</div>
                  <div style={{ fontSize: 11, color: "#555" }}>{sn.brand}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e8b84b" }}>⭐ {sn.favCount}</div>
              </div>
            ))}
          </>
        )}

        {tab === "vurderinger" && (
          <>
            <div style={s.sectionTitle}>Latest reviews ({allReviews.length})</div>
            {allReviews.length === 0 && <div style={{ color: "#444", fontSize: 13, textAlign: "center", marginTop: 40 }}>No reviews yet</div>}
            {allReviews.map((r, i) => (
              <div key={i} style={s.reviewCard}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 18 }}>{r.avatar || "🤠"}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#e8b84b", cursor: "pointer" }} onClick={() => r.user !== displayName && setViewingUser(r.user)}>@{r.user}</span>
                    <span style={{ fontSize: 12, color: "#555" }}> rated </span>
                    <span style={{ fontSize: 13, fontWeight: 700, cursor: "pointer" }} onClick={() => openSnus(snusList.find(sn => sn.id === r.snusId))}>{r.snusName}</span>
                  </div>
                  <span style={{ fontSize: 10, color: "#333" }}>{formatDate(r.date)}</span>
                </div>
                <StarRating value={r.rating} size={13} />
                {r.text && <div style={{ fontSize: 13, color: "#888", marginTop: 6 }}>{r.text}</div>}
              </div>
            ))}
          </>
        )}

        {tab === "topp" && (
          <>
            <div style={s.sectionTitle}>Highest rated</div>
            {(() => {
              const ranked = [...snusList].filter(sn => (sn.totalRatings || 0) > 0).sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0)).slice(0, 10);
              if (ranked.length === 0) return <div style={{ color: "#444", fontSize: 13, textAlign: "center", marginTop: 40 }}>No rated products yet</div>;
              return ranked.map((sn, i) => (
              <div key={sn.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px solid #1a1a1a", cursor: "pointer" }} onClick={() => openSnus(sn)}>
                <div style={{ fontSize: i < 3 ? 20 : 16, fontWeight: 900, width: 30, textAlign: "center" }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{sn.name}</div>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 3 }}>{sn.brand}</div>
                  <StrengthLine snus={sn} />
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#e8b84b" }}>{(sn.avgRating || 0).toFixed(1)}</div>
                  <div style={{ fontSize: 10, color: "#444" }}>{plural(sn.totalRatings || 0, "review", "reviews")}</div>
                </div>
              </div>
              ));
            })()}
          </>
        )}

        {tab === "ranking" && (
          <>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#e8b84b", marginBottom: 16 }}>🏆 Ranking</div>
            <div style={{ display: "flex", borderBottom: "1px solid #1a1a1a", marginBottom: 20 }}>
              {[["vurderinger","⭐ Reviews"],["streak","🔥 Streak"],["likes","👍 Likes"],["invitasjoner","📣 Invited"]].map(([k,l]) => (
                <button key={k} style={s.rankBtn(rankingCategory === k)} onClick={() => setRankingCategory(k)}>{l}</button>
              ))}
            </div>
            {rankedList.slice(0, 10).map((u, i) => {
              const isMe = u.displayName === displayName;
              const rankVal = parseInt(getRankingValue(u)) || 0;
              const medaled = i < 3 && rankVal > 0;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: isMe ? "12px 8px" : "12px 0", borderBottom: "1px solid #1a1a1a", cursor: "pointer", background: isMe ? "rgba(232,184,75,0.05)" : "none", borderRadius: isMe ? 8 : 0 }} onClick={() => setViewingUser(u.displayName)}>
                  <div style={{ fontSize: medaled ? 22 : 15, fontWeight: 900, width: 32, textAlign: "center", color: medaled ? (i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : "#CD7F32") : "#555" }}>
                    {medaled ? (i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉") : i + 1}
                  </div>
                  <div style={{ fontSize: 28 }}>{u.avatar || "🤠"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: isMe ? "#e8b84b" : "#e8e0d0" }}>@{u.displayName}{isMe ? " (you)" : ""}</div>
                    <div style={{ fontSize: 11, color: "#555" }}>{COUNTRY_FLAGS[u.country] || "🌍"} {u.city ? `${u.city}, ` : ""}{u.country}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "#e8b84b" }}>{getRankingValue(u).split(" ")[0]}</div>
                    <div style={{ fontSize: 10, color: "#444" }}>{getRankingValue(u).split(" ").slice(1).join(" ")}</div>
                  </div>
                </div>
              );
            })}
            {myRank > 10 && myRankData && (
              <div style={{ marginTop: 16, borderTop: "1px dashed #2a2a2a", paddingTop: 16 }}>
                <div style={{ fontSize: 10, color: "#444", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Your position</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 8px", background: "rgba(232,184,75,0.05)", borderRadius: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, width: 32, textAlign: "center", color: "#555" }}>{myRank}</div>
                  <div style={{ fontSize: 28 }}>{myAvatar}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: "#e8b84b" }}>@{displayName}</div></div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "#e8b84b" }}>{getRankingValue(myRankData).split(" ")[0]}</div>
                    <div style={{ fontSize: 10, color: "#444" }}>{getRankingValue(myRankData).split(" ").slice(1).join(" ")}</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {tab === "profil" && (
          <>
            <div style={{ textAlign: "center", padding: "32px 0 20px" }}>
              <div style={{ fontSize: 64, marginBottom: 12 }}>{myAvatar}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#e8b84b" }}>@{user.displayName || "unknown"}</div>
              {userProfile && (
                <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                  {COUNTRY_FLAGS[userProfile.country] || "🌍"} {userProfile.city ? `${userProfile.city}, ` : ""}{userProfile.country}
                  {userProfile.age ? ` · ${userProfile.age} yrs` : ""}{userProfile.gender ? ` · ${userProfile.gender}` : ""}
                </div>
              )}
              {isAdmin && <div style={{ fontSize: 10, color: "#e8b84b", marginTop: 6, letterSpacing: 2.5, fontWeight: 700 }}>⚡ ADMIN</div>}
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
                <span style={s.badge}>{ratingTitle}</span>
                {productTitle && <span style={s.badge}>{productTitle}</span>}
                {streakTitle && <span style={s.badge}>{streakTitle}</span>}
                {loginStreakTitle && <span style={s.badge}>{loginStreakTitle}</span>}
                {inviteTitle && <span style={s.badge}>{inviteTitle}</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {[[myReviews.length,"Reviews",null],[myAvgRating,"Average",null],[myLikesReceived,"Likes",null],[`${userProfile?.loginStreak || 0}🔥`,"Streak",null],[buddies.length,"Buddies",() => setShowBuddyList(true)]].map(([val, label, onClick], i) => (
                <div key={i} style={{ ...s.statBox, padding: "10px 6px" }} onClick={onClick}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#e8b84b" }}>{val}</div>
                  <div style={{ fontSize: 8, color: "#555", marginTop: 3, letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
                </div>
              ))}
            </div>
            <button style={{ ...s.btnOutline, marginTop: 0, marginBottom: 16 }} onClick={() => setShowInvite(true)}>📣 Invite friends · {userProfile?.inviteCount || 0} invited</button>
            {notifications.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={s.sectionTitle}>🔔 Notifications</div>
                {notifications.map(n => (
                  <div key={n.id} style={{ ...s.reviewCard, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, opacity: n.read ? 0.5 : 1, border: n.read ? "1px solid #1a1a1a" : "1px solid #e8b84b" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: "#e8e0d0" }}>{n.text}</div>
                      <div style={{ fontSize: 10, color: "#444", marginTop: 4 }}>{formatDate(n.createdAt)}</div>
                    </div>
                    {!n.read && <button onClick={() => markNotifRead(n)} style={{ background: "none", border: "1px solid #333", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "#888", fontSize: 12 }}>✓</button>}
                  </div>
                ))}
              </div>
            )}
            {favSnusObj && (
              <div style={{ marginBottom: 20 }}>
                <div style={s.sectionTitle}>Favorite pouch</div>
                <div style={s.card} onClick={() => openSnus(favSnusObj)}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{favSnusObj.name}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{favSnusObj.brand} · {favSnusObj.type}</div>
                  <AttributeRow snus={favSnusObj} />
                </div>
              </div>
            )}
            {buddyRequests.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={s.sectionTitle}>🤠 Buddy requests ({buddyRequests.length})</div>
                {buddyRequests.map(req => (
                  <div key={req.id} style={s.buddyCard}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 24 }}>{req.fromAvatar || "🤠"}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#e8b84b", cursor: "pointer" }} onClick={() => setViewingUser(req.fromName)}>@{req.fromName}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={s.btnGreen} onClick={() => acceptBuddy(req)}>✓ Accept</button>
                      <button style={s.btnRed} onClick={() => rejectBuddy(req)}>✗ Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginBottom: 20 }}>
              <div style={s.sectionTitle}>Find Buddies</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...s.input, marginTop: 0, flex: 1 }} placeholder="Search username..." value={buddySearch} onChange={e => setBuddySearch(e.target.value)} onKeyDown={e => e.key === "Enter" && searchBuddies()} />
                <button onClick={searchBuddies} style={{ ...s.btnSmall, padding: "0 16px" }}>Search</button>
              </div>
              {buddyResults.map((u, i) => (
                <div key={i} style={{ ...s.buddyCard, marginTop: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setViewingUser(u.displayName)}>
                    <span style={{ fontSize: 24 }}>{u.avatar || "🤠"}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#e8b84b" }}>@{u.displayName}</div>
                      <div style={{ fontSize: 11, color: "#555" }}>{COUNTRY_FLAGS[u.country] || "🌍"} {u.city ? `${u.city}, ` : ""}{u.country}</div>
                    </div>
                  </div>
                  <button style={s.btnSmall} onClick={() => sendBuddyRequest(u)}>+ Buddy</button>
                </div>
              ))}
            </div>
            {!editingProfile ? (
              <button style={s.btnOutline} onClick={() => setEditingProfile(true)}>Edit profile</button>
            ) : (
              <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={s.sectionTitle}>Edit profile</div>
                <span style={s.label}>Avatar</span>
                <AvatarPicker selected={profileForm.avatar || "🤠"} onSelect={v => setProfileForm({...profileForm, avatar: v})} />
                <span style={s.label}>Country</span>
                <select style={s.select} value={profileForm.country} onChange={e => setProfileForm({...profileForm, country: e.target.value})}>
                  <option>USA</option><option>Norge</option><option>Sverige</option><option>Danmark</option><option>Finland</option><option>Other</option>
                </select>
                <span style={s.label}>City</span>
                <input style={s.input} value={profileForm.city || ""} onChange={e => setProfileForm({...profileForm, city: e.target.value})} placeholder="e.g. New York" />
                <span style={s.label}>Favorite pouch</span>
                <select style={s.select} value={profileForm.favoriteSnus || ""} onChange={e => setProfileForm({...profileForm, favoriteSnus: e.target.value})}>
                  <option value="">Select favorite</option>
                  {snusList.map(sn => <option key={sn.id} value={sn.id}>{sn.name}</option>)}
                </select>
                <button style={s.btn} onClick={saveProfile}>Save</button>
                <button style={s.btnOutline} onClick={() => setEditingProfile(false)}>Cancel</button>
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              <div style={s.sectionTitle}>My reviews</div>
              {myReviews.length === 0 && <div style={{ color: "#444", fontSize: 13, textAlign: "center" }}>You haven't rated any pouches yet</div>}
              {myReviews.map((r, i) => (
                <div key={i} style={{ ...s.reviewCard, cursor: "pointer" }} onClick={() => openSnus(snusList.find(sn => sn.id === r.snusId))}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{r.snusName}</div>
                  <StarRating value={r.rating} size={13} />
                  {r.text && <div style={{ fontSize: 13, color: "#888", marginTop: 6 }}>{r.text}</div>}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "admin" && isAdmin && (
          <>
            {duplicates.length > 0 && (
              <div style={{ background: "#1a1000", border: "1px solid #5a4000", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e8b84b", marginBottom: 12 }}>⚠️ Possible duplicates ({duplicates.length} groups)</div>
                {duplicates.map((group, i) => (
                  <div key={i} style={{ background: "#111", borderRadius: 8, padding: "12px", marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>
                      {group.map(s => s.name).join(" / ")}
                    </div>
                    <button style={s.btnSmall} onClick={() => setMergingWith(group)}>🔀 Merge</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={s.sectionTitle}>👥 Users ({userList.length})</div>
                <button onClick={fetchUsers} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 12 }}>↻ Refresh</button>
              </div>
              <div style={{ display: "flex", gap: 20, marginBottom: 12 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#e8b84b" }}>{userList.length}</div>
                  <div style={{ fontSize: 9, color: "#555", textTransform: "uppercase" }}>Users</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#e8b84b" }}>{allReviews.length}</div>
                  <div style={{ fontSize: 9, color: "#555", textTransform: "uppercase" }}>Reviews</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#e8b84b" }}>{snusList.length}</div>
                  <div style={{ fontSize: 9, color: "#555", textTransform: "uppercase" }}>Products</div>
                </div>
              </div>
              <input style={{ ...s.input, marginTop: 0 }} placeholder="🔍 Search username, city, country..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              <div style={{ marginTop: 10, maxHeight: 300, overflowY: "auto" }}>
                {filteredUsers.map((u, i) => {
                  const reviewCount = snusList.flatMap(sn => sn.reviews || []).filter(r => r.user === u.displayName).length;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #1a1a1a", cursor: "pointer" }} onClick={() => setViewingUser(u.displayName)}>
                      <div style={{ fontSize: 24 }}>{u.avatar || "🤠"}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#e8b84b" }}>@{u.displayName}</div>
                        <div style={{ fontSize: 11, color: "#555" }}>{COUNTRY_FLAGS[u.country] || "🌍"} {u.city ? `${u.city}, ` : ""}{u.country}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 12, color: "#666" }}>{plural(reviewCount, "review", "reviews")}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={s.sectionTitle}>Add new pouch</div>
            <span style={s.label}>Product name</span>
            <input style={s.input} placeholder="e.g. ZYN Cool Mint" value={adminNewSnus.name} onChange={e => setAdminNewSnus({...adminNewSnus, name: e.target.value})} />
            <span style={s.label}>Brand</span>
            <input style={s.input} list="snus-brands" placeholder="e.g. ZYN" value={adminNewSnus.brand} onChange={e => setAdminNewSnus({...adminNewSnus, brand: e.target.value})} />
            <span style={s.label}>Type</span>
            <select style={s.input} value={adminNewSnus.type} onChange={e => setAdminNewSnus({...adminNewSnus, type: e.target.value})}>
              <option value="">Select type</option>
              {SNUS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              {adminNewSnus.type && !SNUS_TYPES.includes(adminNewSnus.type) && <option value={adminNewSnus.type}>{adminNewSnus.type}</option>}
            </select>
            <span style={s.label}>Strength</span>
            <StrengthSelector value={adminNewSnus.strength} onChange={v => setAdminNewSnus({...adminNewSnus, strength: v})} />
            <span style={s.label}>Nicotine (mg)</span>
            <input style={s.input} type="number" inputMode="decimal" placeholder="e.g. 6" value={adminNewSnus.nicotine || ""} onChange={e => setAdminNewSnus({...adminNewSnus, nicotine: e.target.value})} />
            <button onClick={() => setAdminNewSnus({...adminNewSnus, nicotineFree: !adminNewSnus.nicotineFree})} style={{ marginTop: 10, width: "100%", textAlign: "left", background: adminNewSnus.nicotineFree ? "#1e1e1e" : "none", border: adminNewSnus.nicotineFree ? "1px solid #e8b84b" : "1px solid #2a2a2a", borderRadius: 8, padding: "11px 14px", color: adminNewSnus.nicotineFree ? "#e8b84b" : "#777", cursor: "pointer", fontSize: 13 }}>{adminNewSnus.nicotineFree ? "☑" : "☐"} Nicotine-free</button>
            <span style={s.label}>Flavor profile</span>
            <FlavorPicker value={adminNewSnus.flavors} onChange={fl => setAdminNewSnus({...adminNewSnus, flavors: fl})} />
            <span style={s.label}>Description</span>
            <input style={s.input} placeholder="e.g. Classic tobacco taste" value={adminNewSnus.description || ""} onChange={e => setAdminNewSnus({...adminNewSnus, description: e.target.value})} />
            <span style={s.label}>Barcode (EAN)</span>
            <input style={s.input} placeholder="e.g. 7311250083068" value={adminNewSnus.barcode || ""} onChange={e => setAdminNewSnus({...adminNewSnus, barcode: e.target.value})} />
            <button style={{ ...s.btn, marginTop: 16 }} onClick={adminAddSnus}>+ Add pouch</button>

            {editingSnus && (
              <div style={{ background: "#111", border: "1px solid #e8b84b", borderRadius: 10, padding: 16, marginTop: 20 }}>
                <div style={s.sectionTitle}>Edit: {editingSnus.name}</div>
                <span style={s.label}>Product name</span>
                <input style={s.input} value={editingSnus.name} onChange={e => setEditingSnus({...editingSnus, name: e.target.value})} />
                <span style={s.label}>Brand</span>
                <input style={s.input} list="snus-brands" value={editingSnus.brand} onChange={e => setEditingSnus({...editingSnus, brand: e.target.value})} />
                <span style={s.label}>Type</span>
                <select style={s.input} value={editingSnus.type} onChange={e => setEditingSnus({...editingSnus, type: e.target.value})}>
                  <option value="">Select type</option>
                  {SNUS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  {editingSnus.type && !SNUS_TYPES.includes(editingSnus.type) && <option value={editingSnus.type}>{editingSnus.type}</option>}
                </select>
                <span style={s.label}>Strength</span>
                <StrengthSelector value={editingSnus.strength} onChange={v => setEditingSnus({...editingSnus, strength: v})} />
                <span style={s.label}>Nicotine (mg)</span>
                <input style={s.input} type="number" inputMode="decimal" placeholder="e.g. 6" value={editingSnus.nicotine || ""} onChange={e => setEditingSnus({...editingSnus, nicotine: e.target.value})} />
                <button onClick={() => setEditingSnus({...editingSnus, nicotineFree: !editingSnus.nicotineFree})} style={{ marginTop: 10, width: "100%", textAlign: "left", background: editingSnus.nicotineFree ? "#1e1e1e" : "none", border: editingSnus.nicotineFree ? "1px solid #e8b84b" : "1px solid #2a2a2a", borderRadius: 8, padding: "11px 14px", color: editingSnus.nicotineFree ? "#e8b84b" : "#777", cursor: "pointer", fontSize: 13 }}>{editingSnus.nicotineFree ? "☑" : "☐"} Nicotine-free</button>
                <span style={s.label}>Flavor profile</span>
                <FlavorPicker value={editingSnus.flavors || []} onChange={fl => setEditingSnus({...editingSnus, flavors: fl})} />
                <span style={s.label}>Description</span>
                <input style={s.input} value={editingSnus.description || ""} onChange={e => setEditingSnus({...editingSnus, description: e.target.value})} />
                <span style={s.label}>Barcode</span>
                <input style={s.input} value={editingSnus.barcode || ""} onChange={e => setEditingSnus({...editingSnus, barcode: e.target.value})} />
                <button style={s.btn} onClick={adminUpdateSnus}>Save changes</button>
                <button style={s.btnOutline} onClick={() => setEditingSnus(null)}>Cancel</button>
              </div>
            )}

            {reportedList.length > 0 && (
              <>
                <div style={{ ...s.sectionTitle, marginTop: 32, color: "#cb7e7e" }}>🚩 Reported reviews ({reportedList.length})</div>
                {reportedList.map(report => (
                  <div key={report.id} style={{ ...s.pendingCard, border: "1px solid #5a2d2d" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#cb7e7e" }}>@{report.reviewUser} – {report.snusName}</div>
                    <div style={{ fontSize: 12, color: "#888", margin: "4px 0" }}>{report.reviewText || "(no text)"}</div>
                    <div style={{ fontSize: 11, color: "#444", marginBottom: 8 }}>Reported by @{report.reportedBy}</div>
                    <button style={s.btnGreen} onClick={() => dismissReport(report.id)}>✓ Dismiss</button>
                    <button style={{ ...s.btnRed, marginLeft: 8 }} onClick={() => deleteReportedReview(report)}>🗑️ Delete review</button>
                  </div>
                ))}
              </>
            )}

            <div style={{ ...s.sectionTitle, marginTop: 32 }}>All products ({snusList.length})</div>
            {snusList.map(sn => (
              <div key={sn.id} style={{ ...s.pendingCard, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><div style={{ fontSize: 14, fontWeight: 700 }}>{sn.name}</div><div style={{ fontSize: 12, color: "#555" }}>{sn.brand}</div></div>
                <button style={s.btnSmall} onClick={() => setEditingSnus({...sn})}>✏️ Edit</button>
              </div>
            ))}

            <div style={{ ...s.sectionTitle, marginTop: 32 }}>Pending approval ({pendingList.length})</div>
            {pendingList.length === 0 && <div style={{ color: "#444", fontSize: 13 }}>Nothing pending.</div>}
            {pendingList.map(item => (
              <div key={item.id} style={s.pendingCard}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: "#555" }}>{item.brand}</div>
                <AttributeRow snus={item} />
                {item.description && <div style={{ fontSize: 12, color: "#555", marginTop: 6, fontStyle: "italic" }}>{item.description}</div>}
                {item.barcode && <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>EAN: {item.barcode}</div>}
                <div style={{ fontSize: 11, color: "#444", margin: "8px 0" }}>From: {item.submittedBy}</div>
                <button style={s.btnGreen} onClick={() => approvePending(item)}>✓ Approve</button>
                <button style={s.btnRed} onClick={() => rejectPending(item)}>✗ Reject</button>
              </div>
            ))}
          </>
        )}
      </div>

      {selectedSnus && (
        <div style={s.modal} onClick={() => setSelectedSnus(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 2 }}>{selectedSnus.name}</div>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>{selectedSnus.brand} · {selectedSnus.type}</div>
            <AttributeRow snus={selectedSnus} />
            {selectedSnus.description && <div style={{ fontSize: 13, color: "#666", marginTop: 8, fontStyle: "italic" }}>{selectedSnus.description}</div>}
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0", flexWrap: "wrap" }}>
              <StarRating value={Math.round(selectedSnus.avgRating || 0)} size={18} />
              <span style={{ fontSize: 22, fontWeight: 900, color: "#e8b84b" }}>{(selectedSnus.avgRating || 0).toFixed(1)}</span>
              <span style={{ fontSize: 12, color: "#444" }}>({selectedSnus.totalRatings || 0} reviews)</span>
              {(selectedSnus.favCount || 0) > 0 && (
                <span style={{ fontSize: 12, color: "#555" }}>⭐ {selectedSnus.favCount} favorite{selectedSnus.favCount !== 1 ? "s" : ""}</span>
              )}
            </div>
            {selectedSnus.reviews?.length > 0 && (
              <>
                <div style={s.sectionTitle}>Reviews</div>
                {[...selectedSnus.reviews].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0)).map((r, i) => {
                  const likes = r.likes || [];
                  const hasLiked = likes.includes(displayName);
                  const isMyReview = r.user === displayName;
                  return (
                    <div key={i} style={s.reviewCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 18 }}>{r.avatar || "🤠"}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#e8b84b", cursor: isMyReview ? "default" : "pointer" }} onClick={() => !isMyReview && setViewingUser(r.user)}>@{r.user}</span>
                        </div>
                        <span style={{ fontSize: 10, color: "#333" }}>{formatDateFull(r.date)}</span>
                      </div>
                      <StarRating value={r.rating} size={13} />
                      {r.text && <div style={{ fontSize: 13, color: "#aaa", marginTop: 8, lineHeight: 1.5 }}>{r.text}</div>}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => !isMyReview && likeReview(selectedSnus, r)} style={{ background: hasLiked ? "#1e1e1e" : "none", border: hasLiked ? "1px solid #e8b84b" : "1px solid #333", borderRadius: 6, padding: "4px 10px", cursor: isMyReview ? "default" : "pointer", color: hasLiked ? "#e8b84b" : "#555", fontSize: 12 }}>
                            👍 {likes.length > 0 ? likes.length : ""}
                          </button>
                          {!isMyReview && <button onClick={() => reportReview(selectedSnus, r)} style={{ background: "none", border: "1px solid #333", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "#555", fontSize: 12 }}>🚩</button>}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          {isMyReview && <button onClick={() => startEditReview(selectedSnus)} style={{ background: "none", border: "1px solid #333", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "#666", fontSize: 12 }}>✏️ Edit</button>}
                          {isAdmin && <button onClick={() => deleteReview(selectedSnus, r)} style={{ background: "none", border: "1px solid #5a2d2d", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "#cb7e7e", fontSize: 12 }}>🗑️</button>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            <div style={{ borderTop: "1px solid #1e1e1e", marginTop: 20, paddingTop: 20 }}>
              {!submitted ? (
                <>
                  <div style={s.sectionTitle}>{editingReview ? "Edit your review" : "Your review"}</div>
                  <div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}>
                    <StarRating value={userRating} onChange={setUserRating} size={40} />
                  </div>
                  <textarea style={{ ...s.input, resize: "vertical", minHeight: 90 }} placeholder="What do you think?" value={reviewText} onChange={e => setReviewText(e.target.value)} />
                  <button style={s.btn} onClick={submitReview}>{editingReview ? "Save changes" : "Submit"}</button>
                  {editingReview && <button style={s.btnOutline} onClick={() => { setEditingReview(false); setUserRating(0); setReviewText(""); }}>Cancel</button>}
                  {!editingReview && <button style={s.btnOutline} onClick={() => setSelectedSnus(null)}>Close</button>}
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <div style={{ fontSize: 48 }}>✅</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "#e8b84b", marginTop: 10 }}>Rating saved!</div>
                  <button style={{ ...s.btn, marginTop: 20 }} onClick={() => setSelectedSnus(null)}>Back</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddForm && (
        <div style={s.modal} onClick={() => setShowAddForm(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Suggest new pouch</div>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>Sent to admin for approval</div>
            {!addSubmitted ? (
              <>
                <span style={s.label}>Product name</span>
                <input style={s.input} placeholder="e.g. ZYN Citrus" value={newSnus.name} onChange={e => setNewSnus({...newSnus, name: e.target.value})} />
                <span style={s.label}>Brand</span>
                <input style={s.input} list="snus-brands" placeholder="e.g. ZYN" value={newSnus.brand} onChange={e => setNewSnus({...newSnus, brand: e.target.value})} />
                <span style={s.label}>Type</span>
                <select style={s.input} value={newSnus.type} onChange={e => setNewSnus({...newSnus, type: e.target.value})}>
                  <option value="">Select type</option>
                  {SNUS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  {newSnus.type && !SNUS_TYPES.includes(newSnus.type) && <option value={newSnus.type}>{newSnus.type}</option>}
                </select>
                <span style={s.label}>Strength</span>
                <StrengthSelector value={newSnus.strength} onChange={v => setNewSnus({...newSnus, strength: v})} />
                <span style={s.label}>Nicotine (mg)</span>
                <input style={s.input} type="number" inputMode="decimal" placeholder="e.g. 6" value={newSnus.nicotine || ""} onChange={e => setNewSnus({...newSnus, nicotine: e.target.value})} />
                <button onClick={() => setNewSnus({...newSnus, nicotineFree: !newSnus.nicotineFree})} style={{ marginTop: 10, width: "100%", textAlign: "left", background: newSnus.nicotineFree ? "#1e1e1e" : "none", border: newSnus.nicotineFree ? "1px solid #e8b84b" : "1px solid #2a2a2a", borderRadius: 8, padding: "11px 14px", color: newSnus.nicotineFree ? "#e8b84b" : "#777", cursor: "pointer", fontSize: 13 }}>{newSnus.nicotineFree ? "☑" : "☐"} Nicotine-free</button>
                <span style={s.label}>Flavor profile</span>
                <FlavorPicker value={newSnus.flavors} onChange={fl => setNewSnus({...newSnus, flavors: fl})} />
                <span style={s.label}>Description (optional)</span>
                <input style={s.input} placeholder="e.g. Classic tobacco taste" value={newSnus.description || ""} onChange={e => setNewSnus({...newSnus, description: e.target.value})} />
                <button style={{ ...s.btn, marginTop: 16 }} onClick={submitNewSnus}>Send to admin</button>
                <button style={s.btnOutline} onClick={() => setShowAddForm(false)}>Cancel</button>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: 48 }}>📬</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#e8b84b", marginTop: 10 }}>Sent to admin!</div>
                <button style={{ ...s.btn, marginTop: 20 }} onClick={() => setShowAddForm(false)}>OK</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}