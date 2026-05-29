import { useState, useEffect, useRef, useCallback } from "react";
import { auth, db } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, arrayUnion, deleteDoc, setDoc, getDoc, where } from "firebase/firestore";
import { BrowserMultiFormatReader } from "@zxing/library";

const ADMIN_EMAIL = "fredrik-nielsen@hotmail.com";
const AVATARS = ["🤠","🔥","❄️","💨","🌿","⚡","🎯","🏆","👑","💪","🌶️","🧊","🍃","🌲","⛰️","🌊","🏔️","🎖️","⭐","💎","🔱","⚜️","🌨️","🍀","🌑","🌙","☄️","🗡️","🛡️","🔮"];
const COUNTRY_FLAGS = { "Norge": "🇳🇴", "Sverige": "🇸🇪", "Danmark": "🇩🇰", "Finland": "🇫🇮", "Annet": "🌍" };

const INVITE_TITLES = [
  { count: 1, title: "📣 Snusmisjonær" },
  { count: 3, title: "🌟 Snusambasadør" },
  { count: 5, title: "🔥 Snussprer" },
  { count: 10, title: "💪 Snusrekrutterer" },
  { count: 20, title: "🏆 Snusgeneral" },
  { count: 50, title: "👑 Snuslegende" },
  { count: 100, title: "🐐 Snusguden" },
];

const LOGIN_STREAK_TITLES = [
  { days: 3, title: "🌱 Trofast snuser" },
  { days: 7, title: "💪 Ukentlig snuser" },
  { days: 14, title: "⚡ Dedikert snuser" },
  { days: 30, title: "🔥 Snusfanatiker" },
  { days: 60, title: "👑 Snuslegend" },
  { days: 100, title: "🐐 Snusguden" },
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

const PRIVACY_POLICY = `PERSONVERNERKLÆRING FOR SNUSRATE

Sist oppdatert: Mai 2026

1. HVEM ER VI?
SnusRate er en norsk app for rating og utforskning av snusprodukter.
Kontakt: kontakt@snusrate.no

2. HVILKE DATA SAMLER VI INN?
- E-postadresse
- Brukernavn
- Alder, kjønn, by og land (selvoppgitt)
- Vurderinger og anmeldelser du skriver
- Snusbuddies-relasjoner

3. HVORFOR SAMLER VI INN DATA?
- For å opprette og administrere din brukerkonto
- For å vise vurderinger og statistikk i appen
- For å koble deg med andre Snusbuddies

4. DELER VI DATA MED ANDRE?
Vi selger aldri persondata til tredjeparter.
Data lagres i Google Firebase i Europa (Frankfurt).

5. DINE RETTIGHETER
Du kan når som helst:
- Be om innsyn i dine data
- Be om sletting av din konto og data
- Trekke tilbake samtykke

Kontakt oss på kontakt@snusrate.no for å utøve dine rettigheter.

6. ALDERSGRENSE
SnusRate er kun for personer over 18 år.

7. COOKIES
Vi bruker kun nødvendige cookies for innlogging.`;

const BADGE_GUIDE = [
  {
    category: "⭐ Vurderinger",
    badges: [
      { title: "🌱 Nybegynner", desc: "Standard tittel" },
      { title: "👃 Snusnese", desc: "5 vurderinger" },
      { title: "🎯 Smaksdommer", desc: "15 vurderinger" },
      { title: "🏅 Snusekspert", desc: "30 vurderinger" },
      { title: "⭐ Snusmester", desc: "50 vurderinger" },
      { title: "👑 Snuskonge", desc: "100 vurderinger" },
    ]
  },
  {
    category: "📦 Produkter lagt til",
    badges: [
      { title: "📦 Bidragsyter", desc: "1 godkjent produkt" },
      { title: "🗂️ Produktjeger", desc: "3 godkjente produkter" },
      { title: "🔍 Snusjeger", desc: "5 godkjente produkter" },
      { title: "🏭 Snusleksikon", desc: "10 godkjente produkter" },
    ]
  },
  {
    category: "🔥 Rating streak",
    badges: [
      { title: "🌱 I gang", desc: "3 dager på rad med rating" },
      { title: "💪 På strekk", desc: "7 dager på rad" },
      { title: "⚡ På hugget", desc: "14 dager på rad" },
      { title: "🔥 Snuslegend", desc: "30 dager på rad" },
    ]
  },
  {
    category: "📅 Pålogging streak",
    badges: [
      { title: "🌱 Trofast snuser", desc: "3 dager pålogget på rad" },
      { title: "💪 Ukentlig snuser", desc: "7 dager pålogget på rad" },
      { title: "⚡ Dedikert snuser", desc: "14 dager på rad" },
      { title: "🔥 Snusfanatiker", desc: "30 dager på rad" },
      { title: "👑 Snuslegend", desc: "60 dager på rad" },
      { title: "🐐 Snusguden", desc: "100 dager på rad" },
    ]
  },
  {
    category: "📣 Invitasjoner",
    badges: [
      { title: "📣 Snusmisjonær", desc: "1 invitert bruker" },
      { title: "🌟 Snusambasadør", desc: "3 inviterte" },
      { title: "🔥 Snussprer", desc: "5 inviterte" },
      { title: "💪 Snusrekrutterer", desc: "10 inviterte" },
      { title: "🏆 Snusgeneral", desc: "20 inviterte" },
      { title: "👑 Snuslegende", desc: "50 inviterte" },
      { title: "🐐 Snusguden", desc: "100 inviterte" },
    ]
  },
];

const getRatingTitle = (count) => {
  if (count >= 100) return "👑 Snuskonge";
  if (count >= 50) return "⭐ Snusmester";
  if (count >= 30) return "🏅 Snusekspert";
  if (count >= 15) return "🎯 Smaksdommer";
  if (count >= 5) return "👃 Snusnese";
  return "🌱 Nybegynner";
};

const getProductTitle = (count) => {
  if (count >= 10) return "🏭 Snusleksikon";
  if (count >= 5) return "🔍 Snusjeger";
  if (count >= 3) return "🗂️ Produktjeger";
  if (count >= 1) return "📦 Bidragsyter";
  return null;
};

const getStreakTitle = (days) => {
  if (days >= 30) return "🔥 Snuslegend";
  if (days >= 14) return "⚡ På hugget";
  if (days >= 7) return "💪 På strekk";
  if (days >= 3) return "🌱 I gang";
  return null;
};

const formatDate = (iso) => {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "akkurat nå";
  if (diff < 3600) return `${Math.floor(diff/60)}m siden`;
  if (diff < 86400) return `${Math.floor(diff/3600)}t siden`;
  return `${Math.floor(diff/86400)}d siden`;
};

const formatDateFull = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString("no-NO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
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

const generateRefCode = (displayName) => {
  return displayName.toLowerCase().replace(/[^a-z0-9]/g, "") + Math.random().toString(36).slice(2, 6);
};

const daysSince = (iso) => {
  if (!iso) return null;
  const diff = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
  return Math.floor(diff);
};

function FlameStrength({ value }) {
  const levels = { "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "Normal": 3, "Sterk": 4, "Extrem": 5 };
  const count = levels[value] || 3;
  return <span style={{ fontSize: 12 }}>{[1,2,3,4,5].map(i => <span key={i} style={{ opacity: i <= count ? 1 : 0.15 }}>🔥</span>)}</span>;
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
        <button onClick={() => setShowPrivacy(false)} style={{ background: "none", border: "1px solid #333", color: "#e8b84b", borderRadius: 6, padding: "8px 16px", cursor: "pointer", marginBottom: 20 }}>← Tilbake</button>
        <div style={{ color: "#aaa", fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{PRIVACY_POLICY}</div>
      </div>
    </div>
  );

  if (showBadges) return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 300, overflowY: "auto", padding: 20 }}>
      <div style={{ maxWidth: 430, margin: "0 auto" }}>
        <button onClick={() => setShowBadges(false)} style={{ background: "none", border: "1px solid #333", color: "#e8b84b", borderRadius: 6, padding: "8px 16px", cursor: "pointer", marginBottom: 20 }}>← Tilbake</button>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#e8b84b", marginBottom: 20 }}>🏆 Badge-guide</div>
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
        <div style={st.item} onClick={() => setShowPrivacy(true)}><span>📋</span> Personvernerklæring</div>
        <div style={st.item} onClick={() => setShowBadges(true)}><span>🏆</span> Badge-guide</div>
        <div style={st.item}><span>📜</span> Vilkår for bruk</div>
        <div style={st.item}><span>ℹ️</span> Om SnusRate</div>
        <span style={st.title}>App</span>
        <div style={st.item} onClick={onInstall}><span>📱</span> Legg til på hjemskjerm</div>
        <span style={st.title}>Hjelp</span>
        <div style={st.item}><span>❓</span> FAQ</div>
        <div style={st.item}><span>📧</span> Kontakt oss</div>
        <span style={st.title}>Konto</span>
        <div style={{ ...st.item, color: "#cb7e7e" }} onClick={() => { signOut(auth); onClose(); }}><span>🚪</span> Logg ut</div>
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
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const installAndroid = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      onClose();
    }
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
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>📱 Legg til på hjemskjerm</div>
        <div style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>Installer SnusRate som en app!</div>
        {isIOS ? (
          <div style={{ background: "#111", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, color: "#aaa", lineHeight: 2 }}>
              <div>1. Åpne SnusRate i <span style={{ color: "#e8b84b" }}>Safari</span></div>
              <div>2. Trykk på <span style={{ color: "#e8b84b" }}>dele-ikonet</span> 􀈂 nederst</div>
              <div>3. Velg <span style={{ color: "#e8b84b" }}>"Legg til på hjemskjerm"</span></div>
              <div>4. Trykk <span style={{ color: "#e8b84b" }}>"Legg til"</span> øverst til høyre</div>
            </div>
          </div>
        ) : deferredPrompt ? (
          <button style={st.btn} onClick={installAndroid}>⬇️ Installer SnusRate</button>
        ) : (
          <div style={{ background: "#111", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, color: "#aaa", lineHeight: 2 }}>
              <div>1. Åpne SnusRate i <span style={{ color: "#e8b84b" }}>Chrome</span> på Android</div>
              <div>2. Trykk på <span style={{ color: "#e8b84b" }}>meny-ikonet</span> ⋮ øverst til høyre</div>
              <div>3. Velg <span style={{ color: "#e8b84b" }}>"Legg til på startskjerm"</span></div>
            </div>
          </div>
        )}
        <button style={st.btnOutline} onClick={onClose}>Lukk</button>
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
        <div style={{ fontSize: 12, color: "#e8b84b", fontWeight: 700 }}>{r.avatar || "🤠"} @{r.user} ratet <span style={{ color: "#e8e0d0" }}>{r.snusName}</span></div>
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
      <div style={{ color: "#e8b84b", fontSize: 14, marginTop: 20 }}>Hold strekkoden innenfor rammen</div>
      <button onClick={onClose} style={{ marginTop: 24, background: "none", border: "1px solid #444", color: "#888", borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontSize: 14 }}>Avbryt</button>
    </div>
  );
}

function UnknownBarcodeModal({ barcode, snusList, onMatch, onSuggest, onClose }) {
  const [search, setSearch] = useState("");
  const [newSnus, setNewSnus] = useState({ name: "", brand: "", type: "", strength: "3" });
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
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Ukjent strekkode</div>
        <div style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>EAN: {barcode}</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button onClick={() => setMode("match")} style={{ flex: 1, padding: "10px", borderRadius: 8, border: mode === "match" ? "1px solid #e8b84b" : "1px solid #333", background: mode === "match" ? "#1e1e1e" : "none", color: mode === "match" ? "#e8b84b" : "#555", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Koble til produkt</button>
          <button onClick={() => setMode("suggest")} style={{ flex: 1, padding: "10px", borderRadius: 8, border: mode === "suggest" ? "1px solid #e8b84b" : "1px solid #333", background: mode === "suggest" ? "#1e1e1e" : "none", color: mode === "suggest" ? "#e8b84b" : "#555", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Foreslå nytt</button>
        </div>
        {mode === "match" && (
          <>
            <input style={{ ...st.input, marginTop: 0 }} placeholder="🔍 Søk produkt..." value={search} onChange={e => setSearch(e.target.value)} />
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
            <span style={st.label}>Produktnavn</span>
            <input style={st.input} placeholder="f.eks. General White" value={newSnus.name} onChange={e => setNewSnus({...newSnus, name: e.target.value})} />
            <span style={st.label}>Merke</span>
            <input style={st.input} placeholder="f.eks. Swedish Match" value={newSnus.brand} onChange={e => setNewSnus({...newSnus, brand: e.target.value})} />
            <span style={st.label}>Type</span>
            <input style={st.input} placeholder="f.eks. White Portion" value={newSnus.type} onChange={e => setNewSnus({...newSnus, type: e.target.value})} />
            <span style={st.label}>Styrke</span>
            <StrengthSelector value={newSnus.strength} onChange={v => setNewSnus({...newSnus, strength: v})} />
            <button style={st.btn} onClick={() => onSuggest({ ...newSnus, barcode })}>Send til admin</button>
          </>
        )}
        <button style={st.btnOutline} onClick={onClose}>Avbryt</button>
      </div>
    </div>
  );
}

function UserProfileModal({ username, currentUser, currentDisplayName, snusList, onClose, onOpenSnus }) {
  const [profile, setProfile] = useState(null);
  const [userReviews, setUserReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestSent, setRequestSent] = useState(false);
  const [alreadyBuddy, setAlreadyBuddy] = useState(false);

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
  const likesReceived = countLikesReceived(userReviews);
  const inviteTitle = getInviteTitle(profile?.inviteCount || 0);
  const loginStreakTitle = getLoginStreakTitle(profile?.loginStreak || 0);

  const st = {
    modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 150, display: "flex", alignItems: "flex-end" },
    box: { background: "#141414", border: "1px solid #222", borderRadius: "18px 18px 0 0", width: "100%", maxWidth: 430, margin: "0 auto", padding: "24px 20px 36px", maxHeight: "88vh", overflowY: "auto" },
    btn: { background: "#e8b84b", color: "#0a0a0a", border: "none", borderRadius: 8, padding: "13px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%", marginTop: 12 },
    btnOutline: { background: "none", color: "#e8b84b", border: "1px solid #e8b84b", borderRadius: 8, padding: "12px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%", marginTop: 8 },
    reviewCard: { background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 8, padding: "12px 14px", marginBottom: 8, cursor: "pointer" },
    card: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px", marginBottom: 10, cursor: "pointer" },
    sectionTitle: { fontSize: 10, letterSpacing: 2.5, color: "#444", textTransform: "uppercase", marginBottom: 14, fontWeight: 700 },
    badge: { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#e8b84b" },
    statBox: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "12px", textAlign: "center", flex: 1 },
  };

  return (
    <div style={st.modal} onClick={onClose}>
      <div style={st.box} onClick={e => e.stopPropagation()}>
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "#555" }}>Laster...</div>
        : !profile ? <div style={{ textAlign: "center", padding: 40, color: "#555" }}>Bruker ikke funnet</div>
        : (
          <>
            <div style={{ textAlign: "center", paddingBottom: 16 }}>
              <div style={{ fontSize: 56, marginBottom: 10 }}>{profile.avatar || "🤠"}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#e8b84b" }}>@{profile.displayName}</div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                {COUNTRY_FLAGS[profile.country] || "🌍"} {profile.city ? `${profile.city}, ` : ""}{profile.country}
                {profile.age ? ` · ${profile.age} år` : ""}{profile.gender ? ` · ${profile.gender}` : ""}
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
              <div style={st.statBox}><div style={{ fontSize: 18, fontWeight: 900, color: "#e8b84b" }}>{userReviews.length}</div><div style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: 1 }}>Vurderinger</div></div>
              <div style={st.statBox}><div style={{ fontSize: 18, fontWeight: 900, color: "#e8b84b" }}>{likesReceived}</div><div style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: 1 }}>Likes</div></div>
              <div style={st.statBox}><div style={{ fontSize: 18, fontWeight: 900, color: "#e8b84b" }}>{streak}🔥</div><div style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: 1 }}>Streak</div></div>
            </div>
            {username !== currentDisplayName && (
              alreadyBuddy ? <div style={{ textAlign: "center", color: "#e8b84b", fontSize: 13, marginBottom: 12 }}>🤠 Dere er Snusbuddies!</div>
              : requestSent ? <div style={{ textAlign: "center", color: "#e8b84b", fontSize: 13, marginBottom: 12 }}>✅ Forespørsel sendt!</div>
              : <button style={st.btn} onClick={sendRequest}>🤠 Send Snusbuddy-forespørsel</button>
            )}
            {favSnusObj && (
              <div style={{ marginTop: 16, marginBottom: 8 }}>
                <div style={st.sectionTitle}>Favorittsnuus</div>
                <div style={st.card} onClick={() => { onOpenSnus(favSnusObj); onClose(); }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{favSnusObj.name}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{favSnusObj.brand} · {favSnusObj.type}</div>
                  <FlameStrength value={favSnusObj.strength} />
                </div>
              </div>
            )}
            {userReviews.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={st.sectionTitle}>Vurderinger ({userReviews.length})</div>
                {userReviews.map((r, i) => (
                  <div key={i} style={st.reviewCard} onClick={() => { onOpenSnus(snusList.find(s => s.id === r.snusId)); onClose(); }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{r.snusName}</div>
                    <StarRating value={r.rating} size={13} />
                    {r.text && <div style={{ fontSize: 13, color: "#888", marginTop: 6 }}>{r.text}</div>}
                  </div>
                ))}
              </div>
            )}
            <button style={st.btnOutline} onClick={onClose}>Lukk</button>
          </>
        )}
      </div>
    </div>
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
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>🤠 Snusbuddies ({buddies.length})</div>
        {buddies.length === 0 && <div style={{ color: "#555", fontSize: 13, textAlign: "center", padding: 20 }}>Ingen Snusbuddies ennå</div>}
        {buddies.map((b, i) => (
          <div key={i} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "14px", marginBottom: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }} onClick={() => onSelectBuddy(b.name)}>
            <div style={{ fontSize: 28 }}>{b.avatar || "🤠"}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e8b84b" }}>@{b.name}</div>
          </div>
        ))}
        <button style={st.btnOutline} onClick={onClose}>Lukk</button>
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
  const [country, setCountry] = useState("Norge");
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
  const [newSnus, setNewSnus] = useState({ name: "", brand: "", type: "", strength: "3", description: "" });
  const [addSubmitted, setAddSubmitted] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adminNewSnus, setAdminNewSnus] = useState({ name: "", brand: "", type: "", strength: "3", description: "" });
  const [editingSnus, setEditingSnus] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStrength, setFilterStrength] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [unknownBarcode, setUnknownBarcode] = useState(null);
  const [barcodeMatched, setBarcodeMatched] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ country: "Norge", city: "", gender: "", age: "", favoriteSnus: "", avatar: "🤠" });
  const [buddySearch, setBuddySearch] = useState("");
  const [buddyResults, setBuddyResults] = useState([]);
  const [buddyRequests, setBuddyRequests] = useState([]);
  const [buddies, setBuddies] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
  const [viewingUser, setViewingUser] = useState(null);
  const [showBuddyList, setShowBuddyList] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showInstall, setShowInstall] = useState(false);

  const isAdmin = user?.email === ADMIN_EMAIL;
  const displayName = user?.displayName || user?.email;
  const myAvatar = userProfile?.avatar || "🤠";

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
  const uniqueTypes = [...new Set(snusList.map(s => s.type).filter(Boolean))].sort();
  const daysSinceLogin = daysSince(userProfile?.lastLogin);

  const filtered = snusList.filter(s => {
    const matchSearch = s.name?.toLowerCase().includes(search.toLowerCase()) || s.brand?.toLowerCase().includes(search.toLowerCase());
    const matchStrength = !filterStrength || s.strength === filterStrength;
    const matchType = !filterType || s.type?.toLowerCase().includes(filterType.toLowerCase());
    return matchSearch && matchStrength && matchType;
  });

  const topFavSnus = [...snusList].sort((a, b) => (b.favCount || 0) - (a.favCount || 0)).slice(0, 10);
  const favSnusObj = snusList.find(s => s.id === userProfile?.favoriteSnus);
  const filteredUsers = userList.filter(u =>
    u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.city?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.country?.toLowerCase().includes(userSearch.toLowerCase())
  );

  useEffect(() => {
    onAuthStateChanged(auth, async u => {
      setUser(u);
      if (u) {
        fetchUserProfile(u.uid);
        fetchBuddyRequests(u.uid);
        fetchBuddies(u.uid);
        try {
          await updateDoc(doc(db, "users", u.uid), { lastLogin: new Date().toISOString() });
        } catch(e) {}
      }
    });
    fetchSnus();
  }, []);

  useEffect(() => { if (isAdmin) { fetchPending(); fetchReported(); fetchUsers(); } }, [isAdmin]);

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
        // Beregn login streak
        const lastLogin = data.lastLogin ? new Date(data.lastLogin) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (lastLogin) {
          const lastLoginDay = new Date(lastLogin);
          lastLoginDay.setHours(0, 0, 0, 0);
          const diff = Math.round((today - lastLoginDay) / (1000 * 60 * 60 * 24));
          if (diff === 1) {
            data.loginStreak = (data.loginStreak || 0) + 1;
            await updateDoc(doc(db, "users", uid), { loginStreak: data.loginStreak });
          } else if (diff > 1) {
            data.loginStreak = 1;
            await updateDoc(doc(db, "users", uid), { loginStreak: 1 });
          }
        } else {
          data.loginStreak = 1;
          await updateDoc(doc(db, "users", uid), { loginStreak: 1 });
        }
        setUserProfile(data);
        setProfileForm(data);
      }
    } catch(e) {}
  };

  const fetchBuddyRequests = async (uid) => {
    try {
      const snap = await getDocs(query(collection(db, "buddy_requests"), where("toUid", "==", uid), where("status", "==", "pending")));
      const requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBuddyRequests(requests);
      setNotifCount(requests.length);
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

  const reportReview = async (snus, review) => {
    try {
      const existing = await getDocs(query(collection(db, "reported_reviews"), where("snusId", "==", snus.id), where("reviewUser", "==", review.user), where("reviewDate", "==", review.date)));
      if (!existing.empty) { alert("Du har allerede rapportert denne!"); return; }
      await addDoc(collection(db, "reported_reviews"), { snusId: snus.id, snusName: snus.name, reviewUser: review.user, reviewText: review.text || "", reviewRating: review.rating, reviewDate: review.date, reportedBy: displayName, reportedAt: new Date().toISOString() });
      alert("Rapportert! 🚩");
    } catch(e) {}
  };

  const deleteReview = async (snus, review) => {
    if (!window.confirm(`Slett vurdering fra @${review.user}?`)) return;
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
      if (!existing.empty) { alert("Forespørsel allerede sendt!"); return; }
      await addDoc(collection(db, "buddy_requests"), { fromUid: user.uid, fromName: displayName, fromAvatar: myAvatar, toUid: toUser.uid, toName: toUser.displayName, toAvatar: toUser.avatar || "🤠", status: "pending", createdAt: new Date().toISOString() });
      alert(`Snusbuddy-forespørsel sendt til @${toUser.displayName}! 🤠`);
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
        if (!username.trim()) { alert("Velg et brukernavn!"); return; }
        const ageNum = parseInt(age);
        if (!age || ageNum < 18) { alert("Du må være minst 18 år!"); return; }
        if (!gender) { alert("Velg kjønn!"); return; }
        if (!acceptedPrivacy) { alert("Du må godta personvernerklæringen!"); return; }
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
    if (existingReview && !editingReview) { alert("Du har allerede ratet denne snusen!"); return; }
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
    if (!newSnus.name || !newSnus.brand) return;
    await addDoc(collection(db, "snus_pending"), { ...newSnus, submittedBy: displayName, submittedByUid: user.uid, approved: false, createdAt: new Date().toISOString() });
    setAddSubmitted(true);
  };

  const adminAddSnus = async () => {
    if (!adminNewSnus.name || !adminNewSnus.brand) return;
    await addDoc(collection(db, "snus"), { ...adminNewSnus, avgRating: 0, totalRatings: 0, totalScore: 0, favCount: 0, reviews: [], createdAt: new Date().toISOString() });
    setAdminNewSnus({ name: "", brand: "", type: "", strength: "3", description: "" });
    fetchSnus(); alert("Snus lagt til!");
  };

  const adminUpdateSnus = async () => {
    if (!editingSnus) return;
    await updateDoc(doc(db, "snus", editingSnus.id), { name: editingSnus.name, brand: editingSnus.brand, type: editingSnus.type, strength: editingSnus.strength, description: editingSnus.description || "", barcode: editingSnus.barcode || "" });
    setEditingSnus(null); fetchSnus(); alert("Oppdatert!");
  };

  const approvePending = async (item) => {
    await addDoc(collection(db, "snus"), { name: item.name, brand: item.brand, type: item.type, strength: item.strength, barcode: item.barcode || "", description: item.description || "", avgRating: 0, totalRatings: 0, totalScore: 0, favCount: 0, reviews: [], createdAt: new Date().toISOString() });
    await deleteDoc(doc(db, "snus_pending", item.id));
    if (item.submittedByUid) {
      const snap = await getDoc(doc(db, "users", item.submittedByUid));
      if (snap.exists()) await updateDoc(doc(db, "users", item.submittedByUid), { approvedProducts: (snap.data().approvedProducts || 0) + 1 });
    }
    fetchPending(); fetchSnus();
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
    setUnknownBarcode(null); alert("Sendt til admin!");
  };

  const copyRefCode = () => {
    const link = `https://snusrate.vercel.app?ref=${myRefCode}`;
    navigator.clipboard.writeText(link).then(() => alert("Invitasjonslenke kopiert! 🎉"));
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
  };

  if (!user) return (
    <div style={s.app}>
      <div style={s.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={s.logo}>SnusRate</div><div style={s.logoSub}>Nordic Snus Community</div></div>
          <button onClick={() => setShowMenu(true)} style={{ background: "none", border: "none", color: "#555", fontSize: 22, cursor: "pointer" }}>☰</button>
        </div>
      </div>
      {showMenu && <HamburgerMenu onClose={() => setShowMenu(false)} onInstall={() => { setShowMenu(false); setShowInstall(true); }} />}
      {showInstall && <InstallModal onClose={() => setShowInstall(false)} />}
      <div style={s.content}>
        <div style={{ textAlign: "center", padding: "48px 0 24px", fontSize: 48 }}>🤠</div>
        <div style={{ ...s.sectionTitle, textAlign: "center", marginBottom: 20 }}>{authMode === "login" ? "Logg inn" : "Opprett konto"}</div>
        {authMode === "register" && (
          <>
            <span style={s.label}>Brukernavn</span>
            <input style={s.input} value={username} onChange={e => setUsername(e.target.value)} placeholder="f.eks. SnusKongen_Oslo" />
            <span style={s.label}>Velg avatar</span>
            <AvatarPicker selected={selectedAvatar} onSelect={setSelectedAvatar} />
            <span style={s.label}>Alder (må være 18+)</span>
            <input style={s.input} type="number" min="18" max="99" value={age} onChange={e => setAge(e.target.value)} placeholder="Din alder" />
            <span style={s.label}>Kjønn</span>
            <select style={s.select} value={gender} onChange={e => setGender(e.target.value)}>
              <option value="">Velg kjønn</option><option>Mann</option><option>Kvinne</option><option>Annet</option>
            </select>
            <span style={s.label}>Land</span>
            <select style={s.select} value={country} onChange={e => setCountry(e.target.value)}>
              <option>Norge</option><option>Sverige</option><option>Danmark</option><option>Finland</option><option>Annet</option>
            </select>
            <span style={s.label}>By</span>
            <input style={s.input} value={city} onChange={e => setCity(e.target.value)} placeholder="f.eks. Oslo" />
            <span style={s.label}>Invitasjonskode (valgfritt)</span>
            <input style={s.input} value={refCodeInput} onChange={e => setRefCodeInput(e.target.value)} placeholder="Skriv inn kode hvis du ble invitert" />
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 16 }}>
              <input type="checkbox" checked={acceptedPrivacy} onChange={e => setAcceptedPrivacy(e.target.checked)} style={{ marginTop: 2, cursor: "pointer", width: 16, height: 16 }} />
              <span style={{ fontSize: 13, color: "#888" }}>Jeg godtar{" "}<span style={{ color: "#e8b84b", cursor: "pointer", textDecoration: "underline" }} onClick={() => setShowPrivacyInReg(true)}>personvernerklæringen</span></span>
            </div>
          </>
        )}
        <span style={s.label}>E-post</span>
        <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="din@epost.no" />
        <span style={s.label}>Passord</span>
        <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
        <button style={s.btn} onClick={handleAuth}>{authMode === "login" ? "Logg inn" : "Registrer"}</button>
        <button style={s.btnOutline} onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>
          {authMode === "login" ? "Ny bruker? Registrer deg" : "Har konto? Logg inn"}
        </button>
      </div>
      {showPrivacyInReg && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 300, overflowY: "auto", padding: 20 }}>
          <div style={{ maxWidth: 430, margin: "0 auto" }}>
            <button onClick={() => setShowPrivacyInReg(false)} style={{ background: "none", border: "1px solid #333", color: "#e8b84b", borderRadius: 6, padding: "8px 16px", cursor: "pointer", marginBottom: 20 }}>← Tilbake</button>
            <div style={{ color: "#aaa", fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{PRIVACY_POLICY}</div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={s.app}>
      {showScanner && <BarcodeScanner onResult={handleScanResult} onClose={() => setShowScanner(false)} />}
      {unknownBarcode && <UnknownBarcodeModal barcode={unknownBarcode} snusList={snusList} onMatch={handleBarcodeMatch} onSuggest={handleBarcodeSuggest} onClose={() => setUnknownBarcode(null)} />}
      {barcodeMatched && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)" }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 56 }}>✅</div><div style={{ fontSize: 16, fontWeight: 700, color: "#e8b84b", marginTop: 12 }}>Strekkode koblet!</div></div>
        </div>
      )}
      {showMenu && <HamburgerMenu onClose={() => setShowMenu(false)} onInstall={() => { setShowMenu(false); setShowInstall(true); }} />}
      {showInstall && <InstallModal onClose={() => setShowInstall(false)} />}
      {viewingUser && <UserProfileModal username={viewingUser} currentUser={user} currentDisplayName={displayName} snusList={snusList} onClose={() => setViewingUser(null)} onOpenSnus={openSnus} />}
      {showBuddyList && <BuddyListModal buddies={buddies} onSelectBuddy={name => { setShowBuddyList(false); setViewingUser(name); }} onClose={() => setShowBuddyList(false)} />}

      {showInvite && (
        <div style={s.modal} onClick={() => setShowInvite(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>📣 Inviter venner</div>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>Del lenken og få titler når folk registrerer seg!</div>
            <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "16px", marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 8, letterSpacing: 2, textTransform: "uppercase" }}>Din kode</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#e8b84b", letterSpacing: 2 }}>{myRefCode}</div>
              <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>Inviterte: {userProfile?.inviteCount || 0}</div>
            </div>
            {inviteTitle && <div style={{ textAlign: "center", marginBottom: 16 }}><span style={s.badge}>{inviteTitle}</span></div>}
            <div style={{ marginBottom: 20 }}>
              <div style={s.sectionTitle}>Neste tittel</div>
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
            <button style={s.btn} onClick={copyRefCode}>📋 Kopier invitasjonslenke</button>
            <button style={s.btnOutline} onClick={() => setShowInvite(false)}>Lukk</button>
          </div>
        </div>
      )}

      <div style={s.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={s.logo}>SnusRate</div><div style={s.logoSub}>Nordic Snus Community</div></div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setShowScanner(true)} style={{ background: "none", border: "1px solid #e8b84b", color: "#e8b84b", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 16 }}>📷</button>
            {notifCount > 0 && <button onClick={() => setTab("profil")} style={{ background: "#e8b84b", color: "#0a0a0a", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>🤠 {notifCount}</button>}
            <button onClick={() => setShowMenu(true)} style={{ background: "none", border: "none", color: "#555", fontSize: 22, cursor: "pointer" }}>☰</button>
          </div>
        </div>
      </div>

      <div style={s.nav}>
        {[["hjem","Hjem"],["explore","Utforsk"],["vurderinger","Vurderinger"],["topp","Topp 10"],["favoritter","Favoritter"],["profil","Profil"], ...(isAdmin ? [["admin","Admin"]] : [])].map(([k,l]) => (
          <button key={k} style={s.navBtn(tab===k)} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <div style={s.content}>

        {tab === "hjem" && (
          <>
            <div style={{ textAlign: "center", padding: "32px 0 24px" }}>
              <div style={{ fontSize: 56, marginBottom: 8 }}>{myAvatar}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#e8b84b" }}>Velkommen tilbake</div>
              <div style={{ fontSize: 15, color: "#e8e0d0", marginTop: 4 }}>@{displayName}</div>
              {daysSinceLogin !== null && daysSinceLogin > 0 && (
                <div style={{ fontSize: 12, color: "#555", marginTop: 8 }}>
                  Du var her for <span style={{ color: "#e8b84b" }}>{daysSinceLogin} dag{daysSinceLogin !== 1 ? "er" : ""}</span> siden
                </div>
              )}
              {daysSinceLogin === 0 && (
                <div style={{ fontSize: 12, color: "#555", marginTop: 8 }}>Du var her <span style={{ color: "#e8b84b" }}>tidligere i dag</span></div>
              )}
            </div>

            {/* Badges */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20, flexWrap: "wrap" }}>
              <span style={s.badge}>{ratingTitle}</span>
              {productTitle && <span style={s.badge}>{productTitle}</span>}
              {streakTitle && <span style={s.badge}>{streakTitle}</span>}
              {loginStreakTitle && <span style={s.badge}>{loginStreakTitle}</span>}
              {inviteTitle && <span style={s.badge}>{inviteTitle}</span>}
            </div>

            {/* Login streak */}
            {(userProfile?.loginStreak || 0) > 0 && (
              <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "12px 16px", marginBottom: 16, textAlign: "center" }}>
                <div style={{ fontSize: 22 }}>📅</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#e8b84b", marginTop: 4 }}>{userProfile.loginStreak} dag{userProfile.loginStreak !== 1 ? "er" : ""} på rad</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>Pålogging streak</div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {[
                [snusList.length, "Produkter", null],
                [allReviews.length, "Vurderinger", null],
                [buddies.length, "Buddies", () => setShowBuddyList(true)],
              ].map(([val, label, onClick], i) => (
                <div key={i} style={{ ...s.statBox, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#e8b84b" }}>{val}</div>
                  <div style={{ fontSize: 9, color: "#555", marginTop: 4, letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
                </div>
              ))}
            </div>

            <button style={{ ...s.btn, marginTop: 0, marginBottom: 12, fontSize: 16, padding: "18px 20px" }} onClick={() => setShowScanner(true)}>
              📷 Skann snus
            </button>

            <button style={{ ...s.btnOutline, marginTop: 0, marginBottom: 20 }} onClick={() => setTab("explore")}>
              🔍 Utforsk alle snus
            </button>

            <div style={{ ...s.sectionTitle, marginBottom: 10 }}>Siste aktivitet</div>
            <LiveTicker allReviews={allReviews} onClickReview={r => openSnus(snusList.find(sn => sn.id === r.snusId))} />

            <button style={{ ...s.btnOutline, marginTop: 8 }} onClick={() => setShowInvite(true)}>
              📣 Inviter venner · {userProfile?.inviteCount || 0} inviterte
            </button>
          </>
        )}

        {tab === "explore" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input style={{ ...s.searchBox, marginBottom: 0, flex: 1 }} placeholder="🔍  Søk snus eller merke..." value={search} onChange={e => setSearch(e.target.value)} />
              <button onClick={() => setShowScanner(true)} style={{ background: "#141414", border: "1px solid #e8b84b", color: "#e8b84b", borderRadius: 10, padding: "0 16px", cursor: "pointer", fontSize: 20 }}>📷</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <button style={s.filterBtn(!filterStrength)} onClick={() => setFilterStrength("")}>Alle styrker</button>
              {["1","2","3","4","5"].map(v => (
                <button key={v} style={s.filterBtn(filterStrength === v)} onClick={() => setFilterStrength(filterStrength === v ? "" : v)}>{"🔥".repeat(Number(v))}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <button style={s.filterBtn(!filterType)} onClick={() => setFilterType("")}>Alle typer</button>
              {uniqueTypes.slice(0, 6).map(t => (
                <button key={t} style={s.filterBtn(filterType === t)} onClick={() => setFilterType(filterType === t ? "" : t)}>{t}</button>
              ))}
            </div>
            <div style={s.sectionTitle}>Snus ({filtered.length})</div>
            {filtered.map(sn => (
              <div key={sn.id} style={s.card} onClick={() => openSnus(sn)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{sn.name}</div>
                    <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>{sn.brand} · {sn.type}</div>
                    <FlameStrength value={sn.strength} />
                    {sn.description && <div style={{ fontSize: 12, color: "#555", marginTop: 6, fontStyle: "italic" }}>{sn.description}</div>}
                  </div>
                  <div style={{ textAlign: "right", marginLeft: 12 }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#e8b84b" }}>{(sn.avgRating || 0).toFixed(1)}</div>
                    <div style={{ fontSize: 10, color: "#555" }}>{sn.totalRatings || 0} ratings</div>
                  </div>
                </div>
              </div>
            ))}
            <button style={s.btn} onClick={() => { setShowAddForm(true); setAddSubmitted(false); }}>+ Foreslå ny snus</button>
          </>
        )}

        {tab === "vurderinger" && (
          <>
            <div style={s.sectionTitle}>Siste vurderinger ({allReviews.length})</div>
            {allReviews.length === 0 && <div style={{ color: "#444", fontSize: 13, textAlign: "center", marginTop: 40 }}>Ingen vurderinger ennå</div>}
            {allReviews.map((r, i) => (
              <div key={i} style={s.reviewCard}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 18 }}>{r.avatar || "🤠"}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#e8b84b", cursor: "pointer" }} onClick={() => r.user !== displayName && setViewingUser(r.user)}>@{r.user}</span>
                    <span style={{ fontSize: 12, color: "#555" }}> ratet </span>
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
            <div style={s.sectionTitle}>Høyest rated</div>
            {snusList.map((sn, i) => (
              <div key={sn.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px solid #1a1a1a", cursor: "pointer" }} onClick={() => openSnus(sn)}>
                <div style={{ fontSize: i < 3 ? 20 : 16, fontWeight: 900, width: 30, textAlign: "center" }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{sn.name}</div>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 3 }}>{sn.brand}</div>
                  <FlameStrength value={sn.strength} />
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#e8b84b" }}>{(sn.avgRating || 0).toFixed(1)}</div>
                  <div style={{ fontSize: 10, color: "#444" }}>{sn.totalRatings || 0} ratings</div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "favoritter" && (
          <>
            <div style={s.sectionTitle}>Mest favorittmarkert</div>
            {topFavSnus.map((sn, i) => (
              <div key={sn.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px solid #1a1a1a", cursor: "pointer" }} onClick={() => openSnus(sn)}>
                <div style={{ fontSize: i < 3 ? 20 : 16, fontWeight: 900, width: 30, textAlign: "center" }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{sn.name}</div>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 3 }}>{sn.brand}</div>
                  <FlameStrength value={sn.strength} />
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#e8b84b" }}>⭐ {sn.favCount || 0}</div>
                  <div style={{ fontSize: 10, color: "#444" }}>favoritter</div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "profil" && (
          <>
            <div style={{ textAlign: "center", padding: "32px 0 20px" }}>
              <div style={{ fontSize: 64, marginBottom: 12 }}>{myAvatar}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#e8b84b" }}>@{user.displayName || "ukjent"}</div>
              {userProfile && (
                <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                  {COUNTRY_FLAGS[userProfile.country] || "🌍"} {userProfile.city ? `${userProfile.city}, ` : ""}{userProfile.country}
                  {userProfile.age ? ` · ${userProfile.age} år` : ""}{userProfile.gender ? ` · ${userProfile.gender}` : ""}
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
              {[
                [myReviews.length, "Vurderinger", null],
                [myAvgRating, "Snitt", null],
                [myLikesReceived, "Likes", null],
                [`${myStreak}🔥`, "Streak", null],
                [buddies.length, "Buddies", () => setShowBuddyList(true)]
              ].map(([val, label, onClick], i) => (
                <div key={i} style={{ ...s.statBox, padding: "10px 6px" }} onClick={onClick}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#e8b84b" }}>{val}</div>
                  <div style={{ fontSize: 8, color: "#555", marginTop: 3, letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
                </div>
              ))}
            </div>

            <button style={{ ...s.btnOutline, marginTop: 0, marginBottom: 16 }} onClick={() => setShowInvite(true)}>
              📣 Inviter venner · {userProfile?.inviteCount || 0} inviterte
            </button>

            {favSnusObj && (
              <div style={{ marginBottom: 20 }}>
                <div style={s.sectionTitle}>Favorittsnuus</div>
                <div style={s.card} onClick={() => openSnus(favSnusObj)}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{favSnusObj.name}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{favSnusObj.brand} · {favSnusObj.type}</div>
                  <FlameStrength value={favSnusObj.strength} />
                </div>
              </div>
            )}

            {buddyRequests.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={s.sectionTitle}>🤠 Snusbuddy-forespørsler ({buddyRequests.length})</div>
                {buddyRequests.map(req => (
                  <div key={req.id} style={s.buddyCard}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 24 }}>{req.fromAvatar || "🤠"}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#e8b84b", cursor: "pointer" }} onClick={() => setViewingUser(req.fromName)}>@{req.fromName}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={s.btnGreen} onClick={() => acceptBuddy(req)}>✓ Godta</button>
                      <button style={s.btnRed} onClick={() => rejectBuddy(req)}>✗ Avvis</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <div style={s.sectionTitle}>Finn Snusbuddies</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...s.input, marginTop: 0, flex: 1 }} placeholder="Søk brukernavn..." value={buddySearch} onChange={e => setBuddySearch(e.target.value)} onKeyDown={e => e.key === "Enter" && searchBuddies()} />
                <button onClick={searchBuddies} style={{ ...s.btnSmall, padding: "0 16px" }}>Søk</button>
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
                  <button style={s.btnSmall} onClick={() => sendBuddyRequest(u)}>+ Snusbuddy</button>
                </div>
              ))}
            </div>

            {!editingProfile ? (
              <button style={s.btnOutline} onClick={() => setEditingProfile(true)}>Rediger profil</button>
            ) : (
              <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={s.sectionTitle}>Rediger profil</div>
                <span style={s.label}>Avatar</span>
                <AvatarPicker selected={profileForm.avatar || "🤠"} onSelect={v => setProfileForm({...profileForm, avatar: v})} />
                <span style={s.label}>Land</span>
                <select style={s.select} value={profileForm.country} onChange={e => setProfileForm({...profileForm, country: e.target.value})}>
                  <option>Norge</option><option>Sverige</option><option>Danmark</option><option>Finland</option><option>Annet</option>
                </select>
                <span style={s.label}>By</span>
                <input style={s.input} value={profileForm.city || ""} onChange={e => setProfileForm({...profileForm, city: e.target.value})} placeholder="f.eks. Oslo" />
                <span style={s.label}>Favorittsnuus</span>
                <select style={s.select} value={profileForm.favoriteSnus || ""} onChange={e => setProfileForm({...profileForm, favoriteSnus: e.target.value})}>
                  <option value="">Velg favorittsnuus</option>
                  {snusList.map(sn => <option key={sn.id} value={sn.id}>{sn.name}</option>)}
                </select>
                <button style={s.btn} onClick={saveProfile}>Lagre</button>
                <button style={s.btnOutline} onClick={() => setEditingProfile(false)}>Avbryt</button>
              </div>
            )}

            <div style={{ marginTop: 8 }}>
              <div style={s.sectionTitle}>Mine vurderinger</div>
              {myReviews.length === 0 && <div style={{ color: "#444", fontSize: 13, textAlign: "center" }}>Du har ikke ratet noen snus ennå</div>}
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
            <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={s.sectionTitle}>👥 Brukere ({userList.length})</div>
                <button onClick={fetchUsers} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 12 }}>↻ Oppdater</button>
              </div>
              <div style={{ display: "flex", gap: 20, marginBottom: 12 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#e8b84b" }}>{userList.length}</div>
                  <div style={{ fontSize: 9, color: "#555", textTransform: "uppercase" }}>Brukere</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#e8b84b" }}>{allReviews.length}</div>
                  <div style={{ fontSize: 9, color: "#555", textTransform: "uppercase" }}>Vurderinger</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#e8b84b" }}>{snusList.length}</div>
                  <div style={{ fontSize: 9, color: "#555", textTransform: "uppercase" }}>Produkter</div>
                </div>
              </div>
              <input style={{ ...s.input, marginTop: 0 }} placeholder="🔍 Søk brukernavn, by, land..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
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
                        <div style={{ fontSize: 12, color: "#666" }}>{reviewCount} ratings</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={s.sectionTitle}>Legg til ny snus</div>
            <span style={s.label}>Produktnavn</span>
            <input style={s.input} placeholder="f.eks. General White" value={adminNewSnus.name} onChange={e => setAdminNewSnus({...adminNewSnus, name: e.target.value})} />
            <span style={s.label}>Merke</span>
            <input style={s.input} placeholder="f.eks. Swedish Match" value={adminNewSnus.brand} onChange={e => setAdminNewSnus({...adminNewSnus, brand: e.target.value})} />
            <span style={s.label}>Type</span>
            <input style={s.input} placeholder="f.eks. White Portion" value={adminNewSnus.type} onChange={e => setAdminNewSnus({...adminNewSnus, type: e.target.value})} />
            <span style={s.label}>Styrke</span>
            <StrengthSelector value={adminNewSnus.strength} onChange={v => setAdminNewSnus({...adminNewSnus, strength: v})} />
            <span style={s.label}>Beskrivelse</span>
            <input style={s.input} placeholder="f.eks. Klassisk tobakkssmak" value={adminNewSnus.description || ""} onChange={e => setAdminNewSnus({...adminNewSnus, description: e.target.value})} />
            <span style={s.label}>Strekkode (EAN)</span>
            <input style={s.input} placeholder="f.eks. 7311250083068" value={adminNewSnus.barcode || ""} onChange={e => setAdminNewSnus({...adminNewSnus, barcode: e.target.value})} />
            <button style={{ ...s.btn, marginTop: 16 }} onClick={adminAddSnus}>+ Legg til snus</button>

            {editingSnus && (
              <div style={{ background: "#111", border: "1px solid #e8b84b", borderRadius: 10, padding: 16, marginTop: 20 }}>
                <div style={s.sectionTitle}>Rediger: {editingSnus.name}</div>
                <span style={s.label}>Produktnavn</span>
                <input style={s.input} value={editingSnus.name} onChange={e => setEditingSnus({...editingSnus, name: e.target.value})} />
                <span style={s.label}>Merke</span>
                <input style={s.input} value={editingSnus.brand} onChange={e => setEditingSnus({...editingSnus, brand: e.target.value})} />
                <span style={s.label}>Type</span>
                <input style={s.input} value={editingSnus.type} onChange={e => setEditingSnus({...editingSnus, type: e.target.value})} />
                <span style={s.label}>Styrke</span>
                <StrengthSelector value={editingSnus.strength} onChange={v => setEditingSnus({...editingSnus, strength: v})} />
                <span style={s.label}>Beskrivelse</span>
                <input style={s.input} value={editingSnus.description || ""} onChange={e => setEditingSnus({...editingSnus, description: e.target.value})} />
                <span style={s.label}>Strekkode</span>
                <input style={s.input} value={editingSnus.barcode || ""} onChange={e => setEditingSnus({...editingSnus, barcode: e.target.value})} />
                <button style={s.btn} onClick={adminUpdateSnus}>Lagre endringer</button>
                <button style={s.btnOutline} onClick={() => setEditingSnus(null)}>Avbryt</button>
              </div>
            )}

            {reportedList.length > 0 && (
              <>
                <div style={{ ...s.sectionTitle, marginTop: 32, color: "#cb7e7e" }}>🚩 Rapporterte vurderinger ({reportedList.length})</div>
                {reportedList.map(report => (
                  <div key={report.id} style={{ ...s.pendingCard, border: "1px solid #5a2d2d" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#cb7e7e" }}>@{report.reviewUser} – {report.snusName}</div>
                    <div style={{ fontSize: 12, color: "#888", margin: "4px 0" }}>{report.reviewText || "(ingen tekst)"}</div>
                    <div style={{ fontSize: 11, color: "#444", marginBottom: 8 }}>Rapportert av @{report.reportedBy}</div>
                    <button style={s.btnGreen} onClick={() => dismissReport(report.id)}>✓ Ignorer</button>
                    <button style={{ ...s.btnRed, marginLeft: 8 }} onClick={() => deleteReportedReview(report)}>🗑️ Slett vurdering</button>
                  </div>
                ))}
              </>
            )}

            <div style={{ ...s.sectionTitle, marginTop: 32 }}>Alle produkter ({snusList.length})</div>
            {snusList.map(sn => (
              <div key={sn.id} style={{ ...s.pendingCard, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><div style={{ fontSize: 14, fontWeight: 700 }}>{sn.name}</div><div style={{ fontSize: 12, color: "#555" }}>{sn.brand}</div></div>
                <button style={s.btnSmall} onClick={() => setEditingSnus({...sn})}>✏️ Rediger</button>
              </div>
            ))}

            <div style={{ ...s.sectionTitle, marginTop: 32 }}>Til godkjenning ({pendingList.length})</div>
            {pendingList.length === 0 && <div style={{ color: "#444", fontSize: 13 }}>Ingen ventende.</div>}
            {pendingList.map(item => (
              <div key={item.id} style={s.pendingCard}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>{item.brand} · {item.type}</div>
                <FlameStrength value={item.strength} />
                {item.barcode && <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>EAN: {item.barcode}</div>}
                <div style={{ fontSize: 11, color: "#444", margin: "8px 0" }}>Fra: {item.submittedBy}</div>
                <button style={s.btnGreen} onClick={() => approvePending(item)}>✓ Godkjenn</button>
                <button style={s.btnRed} onClick={() => deleteDoc(doc(db, "snus_pending", item.id)).then(fetchPending)}>✗ Avvis</button>
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
            <FlameStrength value={selectedSnus.strength} />
            {selectedSnus.description && <div style={{ fontSize: 13, color: "#666", marginTop: 8, fontStyle: "italic" }}>{selectedSnus.description}</div>}
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0", flexWrap: "wrap" }}>
              <StarRating value={Math.round(selectedSnus.avgRating || 0)} size={18} />
              <span style={{ fontSize: 22, fontWeight: 900, color: "#e8b84b" }}>{(selectedSnus.avgRating || 0).toFixed(1)}</span>
              <span style={{ fontSize: 12, color: "#444" }}>({selectedSnus.totalRatings || 0} anmeldelser)</span>
              {(selectedSnus.favCount || 0) > 0 && (
                <span style={{ fontSize: 12, color: "#555" }}>⭐ {selectedSnus.favCount} favoritt{selectedSnus.favCount !== 1 ? "er" : ""}</span>
              )}
            </div>
            {selectedSnus.reviews?.length > 0 && (
              <>
                <div style={s.sectionTitle}>Anmeldelser</div>
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
                          {isMyReview && <button onClick={() => startEditReview(selectedSnus)} style={{ background: "none", border: "1px solid #333", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "#666", fontSize: 12 }}>✏️ Rediger</button>}
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
                  <div style={s.sectionTitle}>{editingReview ? "Rediger din vurdering" : "Din anmeldelse"}</div>
                  <div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}>
                    <StarRating value={userRating} onChange={setUserRating} size={40} />
                  </div>
                  <textarea style={{ ...s.input, resize: "vertical", minHeight: 90 }} placeholder="Hva synes du?" value={reviewText} onChange={e => setReviewText(e.target.value)} />
                  <button style={s.btn} onClick={submitReview}>{editingReview ? "Lagre endringer" : "Send inn"}</button>
                  {editingReview && <button style={s.btnOutline} onClick={() => { setEditingReview(false); setUserRating(0); setReviewText(""); }}>Avbryt</button>}
                  {!editingReview && <button style={s.btnOutline} onClick={() => setSelectedSnus(null)}>Lukk</button>}
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <div style={{ fontSize: 48 }}>✅</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "#e8b84b", marginTop: 10 }}>Rating lagret!</div>
                  <button style={{ ...s.btn, marginTop: 20 }} onClick={() => setSelectedSnus(null)}>Tilbake</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddForm && (
        <div style={s.modal} onClick={() => setShowAddForm(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Foreslå ny snus</div>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>Sendes til admin for godkjenning</div>
            {!addSubmitted ? (
              <>
                <span style={s.label}>Produktnavn</span>
                <input style={s.input} placeholder="f.eks. General Onyx" value={newSnus.name} onChange={e => setNewSnus({...newSnus, name: e.target.value})} />
                <span style={s.label}>Merke</span>
                <input style={s.input} placeholder="f.eks. Swedish Match" value={newSnus.brand} onChange={e => setNewSnus({...newSnus, brand: e.target.value})} />
                <span style={s.label}>Type</span>
                <input style={s.input} placeholder="f.eks. White Dry" value={newSnus.type} onChange={e => setNewSnus({...newSnus, type: e.target.value})} />
                <span style={s.label}>Styrke</span>
                <StrengthSelector value={newSnus.strength} onChange={v => setNewSnus({...newSnus, strength: v})} />
                <span style={s.label}>Beskrivelse (valgfritt)</span>
                <input style={s.input} placeholder="f.eks. Klassisk tobakkssmak" value={newSnus.description || ""} onChange={e => setNewSnus({...newSnus, description: e.target.value})} />
                <button style={{ ...s.btn, marginTop: 16 }} onClick={submitNewSnus}>Send til admin</button>
                <button style={s.btnOutline} onClick={() => setShowAddForm(false)}>Avbryt</button>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: 48 }}>📬</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#e8b84b", marginTop: 10 }}>Sendt til admin!</div>
                <button style={{ ...s.btn, marginTop: 20 }} onClick={() => setShowAddForm(false)}>OK</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}