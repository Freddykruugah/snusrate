import React, { useState, useEffect, useRef, useCallback } from "react";
import { auth, db } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, arrayUnion, deleteDoc, setDoc, getDoc, where } from "firebase/firestore";
import { BrowserMultiFormatReader } from "@zxing/library";

const ADMIN_EMAIL = "fredrik-nielsen@hotmail.com";

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

function FlameStrength({ value }) {
  const levels = { "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "Normal": 3, "Sterk": 4, "Extrem": 5 };
  const count = levels[value] || 3;
  return (
    <span style={{ fontSize: 12 }}>
      {[1,2,3,4,5].map(i => <span key={i} style={{ opacity: i <= count ? 1 : 0.15 }}>🔥</span>)}
    </span>
  );
}

function StarRating({ value, onChange, size = 20 }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} onClick={() => onChange && onChange(i)}
          onMouseEnter={() => onChange && setHover(i)}
          onMouseLeave={() => onChange && setHover(0)}
          style={{ fontSize: size, cursor: onChange ? "pointer" : "default",
            color: i <= (hover || value) ? "#e8b84b" : "#2a2a2a", transition: "color 0.15s", userSelect: "none" }}>★</span>
      ))}
    </div>
  );
}

function StrengthSelector({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
      {[1,2,3,4,5].map(i => (
        <button key={i} onClick={() => onChange(String(i))} style={{
          background: value === String(i) ? "#1e1e1e" : "none",
          border: value === String(i) ? "1px solid #e8b84b" : "1px solid #2a2a2a",
          borderRadius: 6, padding: "7px 10px", cursor: "pointer", fontSize: 13
        }}>{"🔥".repeat(i)}</button>
      ))}
    </div>
  );
}

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
    <div onClick={() => onClickReview(r)} style={{
      background: "#111", border: "1px solid #1e1e1e", borderRadius: 8,
      padding: "10px 14px", marginBottom: 14, cursor: "pointer",
      opacity: visible ? 1 : 0, transition: "opacity 0.3s",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <div style={{ fontSize: 18 }}>🔴</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "#e8b84b", fontWeight: 700 }}>
          @{r.user} ratet <span style={{ color: "#e8e0d0" }}>{r.snusName}</span>
        </div>
        <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
          {"★".repeat(r.rating)}{"☆".repeat(5-r.rating)} · {formatDate(r.date)}
          {r.text && <span style={{ color: "#666" }}> · "{r.text.slice(0,30)}{r.text.length > 30 ? "..." : ""}"</span>}
        </div>
      </div>
    </div>
  );
}

function BarcodeScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const hasScanned = useRef(false);

  const handleResult = useCallback((result) => {
    if (result && !hasScanned.current) {
      hasScanned.current = true;
      onResult(result.getText());
    }
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

  const filtered = snusList.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.brand?.toLowerCase().includes(search.toLowerCase())
  );

  const st = {
    modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 150, display: "flex", alignItems: "flex-end" },
    box: { background: "#141414", border: "1px solid #222", borderRadius: "18px 18px 0 0", width: "100%", maxWidth: 430, margin: "0 auto", padding: "24px 20px 36px", maxHeight: "88vh", overflowY: "auto" },
    input: { width: "100%", background: "#111", border: "1px solid #222", borderRadius: 8, padding: "12px 14px", color: "#e8e0d0", fontSize: 14, marginTop: 8, boxSizing: "border-box", fontFamily: "inherit", outline: "none" },
    btn: { background: "#e8b84b", color: "#0a0a0a", border: "none", borderRadius: 8, padding: "13px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%", marginTop: 12 },
    btnOutline: { background: "none", color: "#e8b84b", border: "1px solid #e8b84b", borderRadius: 8, padding: "12px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%", marginTop: 8 },
    label: { fontSize: 10, letterSpacing: 2, color: "#555", textTransform: "uppercase", marginTop: 16, display: "block", fontWeight: 700 },
    card: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "12px 14px", marginBottom: 8, cursor: "pointer" },
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
                <div key={snus.id} style={st.card} onClick={() => onMatch(snus, barcode)}>
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

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("explore");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("Norge");
  const [city, setCity] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [snusList, setSnusList] = useState([]);
  const [pendingList, setPendingList] = useState([]);
  const [selectedSnus, setSelectedSnus] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [newSnus, setNewSnus] = useState({ name: "", brand: "", type: "", strength: "3" });
  const [addSubmitted, setAddSubmitted] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adminNewSnus, setAdminNewSnus] = useState({ name: "", brand: "", type: "", strength: "3" });
  const [search, setSearch] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [unknownBarcode, setUnknownBarcode] = useState(null);
  const [barcodeMatched, setBarcodeMatched] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ country: "Norge", city: "", gender: "", age: "", favoriteSnus: "" });
  const [buddySearch, setBuddySearch] = useState("");
  const [buddyResults, setBuddyResults] = useState([]);
  const [buddyRequests, setBuddyRequests] = useState([]);
  const [buddies, setBuddies] = useState([]);
  const [notifCount, setNotifCount] = useState(0);

  const isAdmin = user?.email === ADMIN_EMAIL;
  const displayName = user?.displayName || user?.email;

  const myReviews = snusList.flatMap(s =>
    (s.reviews || []).filter(r => r.user === displayName).map(r => ({ ...r, snusId: s.id, snusName: s.name }))
  );

  const allReviews = snusList.flatMap(s =>
    (s.reviews || []).map(r => ({ ...r, snusId: s.id, snusName: s.name }))
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  const myAvgRating = myReviews.length > 0
    ? (myReviews.reduce((sum, r) => sum + r.rating, 0) / myReviews.length).toFixed(1)
    : "–";

  const approvedCount = userProfile?.approvedProducts || 0;
  const ratingTitle = getRatingTitle(myReviews.length);
  const productTitle = getProductTitle(approvedCount);

  useEffect(() => {
    onAuthStateChanged(auth, u => {
      setUser(u);
      if (u) { fetchUserProfile(u.uid); fetchBuddyRequests(u.uid); fetchBuddies(u.uid); }
    });
    fetchSnus();
  }, []);

  useEffect(() => { if (isAdmin) fetchPending(); }, [isAdmin]);

  const fetchSnus = async () => {
    try {
      const q = query(collection(db, "snus"), orderBy("avgRating", "desc"));
      const snap = await getDocs(q);
      setSnusList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(e) {}
  };

  const fetchPending = async () => {
    const snap = await getDocs(collection(db, "snus_pending"));
    setPendingList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const fetchUserProfile = async (uid) => {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) { setUserProfile(snap.data()); setProfileForm(snap.data()); }
    } catch(e) {}
  };

  const fetchBuddyRequests = async (uid) => {
    try {
      const q = query(collection(db, "buddy_requests"), where("toUid", "==", uid), where("status", "==", "pending"));
      const snap = await getDocs(q);
      const requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBuddyRequests(requests);
      setNotifCount(requests.length);
    } catch(e) {}
  };

  const fetchBuddies = async (uid) => {
    try {
      const q1 = query(collection(db, "buddy_requests"), where("fromUid", "==", uid), where("status", "==", "accepted"));
      const q2 = query(collection(db, "buddy_requests"), where("toUid", "==", uid), where("status", "==", "accepted"));
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const all = [...snap1.docs.map(d => d.data()), ...snap2.docs.map(d => d.data())];
      setBuddies(all.map(b => b.fromUid === uid ? { name: b.toName, uid: b.toUid } : { name: b.fromName, uid: b.fromUid }));
    } catch(e) {}
  };

  const searchBuddies = async () => {
    if (!buddySearch.trim()) return;
    try {
      const q = query(collection(db, "users"), where("displayName", ">=", buddySearch), where("displayName", "<=", buddySearch + "\uf8ff"));
      const snap = await getDocs(q);
      setBuddyResults(snap.docs.map(d => ({ uid: d.id, ...d.data() })).filter(u => u.uid !== user.uid));
    } catch(e) {}
  };

  const sendBuddyRequest = async (toUser) => {
    try {
      const existing = await getDocs(query(collection(db, "buddy_requests"), where("fromUid", "==", user.uid), where("toUid", "==", toUser.uid)));
      if (!existing.empty) { alert("Forespørsel allerede sendt!"); return; }
      await addDoc(collection(db, "buddy_requests"), {
        fromUid: user.uid, fromName: displayName,
        toUid: toUser.uid, toName: toUser.displayName,
        status: "pending", createdAt: new Date().toISOString()
      });
      alert(`Snusbuddy-forespørsel sendt til @${toUser.displayName}! 🤠`);
    } catch(e) {}
  };

  const acceptBuddy = async (request) => {
    await updateDoc(doc(db, "buddy_requests", request.id), { status: "accepted" });
    fetchBuddyRequests(user.uid);
    fetchBuddies(user.uid);
    setNotifCount(n => Math.max(0, n - 1));
  };

  const rejectBuddy = async (request) => {
    await deleteDoc(doc(db, "buddy_requests", request.id));
    fetchBuddyRequests(user.uid);
    setNotifCount(n => Math.max(0, n - 1));
  };

  const saveProfile = async () => {
    if (!user) return;
    await setDoc(doc(db, "users", user.uid), { ...profileForm, displayName }, { merge: true });
    setUserProfile({ ...profileForm, displayName });
    setEditingProfile(false);
  };

  const handleAuth = async () => {
    try {
      if (authMode === "register") {
        if (!username.trim()) { alert("Velg et brukernavn!"); return; }
        const ageNum = parseInt(age);
        if (!age || ageNum < 18) { alert("Du må være minst 18 år!"); return; }
        if (!gender) { alert("Velg kjønn!"); return; }
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: username.trim() });
        await setDoc(doc(db, "users", result.user.uid), { displayName: username.trim(), age: ageNum, gender, country, city, favoriteSnus: "", approvedProducts: 0 });
        setUser({ ...result.user, displayName: username.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch(e) { alert(e.message); }
  };

  const submitReview = async () => {
    if (!userRating || !selectedSnus) return;
    const alreadyRated = selectedSnus.reviews?.some(r => r.user === displayName);
    if (alreadyRated) { alert("Du har allerede ratet denne snusen!"); return; }
    await updateDoc(doc(db, "snus", selectedSnus.id), {
      reviews: arrayUnion({ user: displayName, rating: userRating, text: reviewText, date: new Date().toISOString() }),
      totalRatings: (selectedSnus.totalRatings || 0) + 1,
      totalScore: (selectedSnus.totalScore || 0) + userRating,
      avgRating: ((selectedSnus.totalScore || 0) + userRating) / ((selectedSnus.totalRatings || 0) + 1),
    });
    setSubmitted(true);
    fetchSnus();
  };

  const submitNewSnus = async () => {
    if (!newSnus.name || !newSnus.brand) return;
    await addDoc(collection(db, "snus_pending"), { ...newSnus, submittedBy: displayName, submittedByUid: user.uid, approved: false, createdAt: new Date().toISOString() });
    setAddSubmitted(true);
  };

  const adminAddSnus = async () => {
    if (!adminNewSnus.name || !adminNewSnus.brand) return;
    await addDoc(collection(db, "snus"), { ...adminNewSnus, avgRating: 0, totalRatings: 0, totalScore: 0, reviews: [], createdAt: new Date().toISOString() });
    setAdminNewSnus({ name: "", brand: "", type: "", strength: "3" });
    fetchSnus(); alert("Snus lagt til!");
  };

  const approvePending = async (item) => {
    await addDoc(collection(db, "snus"), { name: item.name, brand: item.brand, type: item.type, strength: item.strength, barcode: item.barcode || "", avgRating: 0, totalRatings: 0, totalScore: 0, reviews: [], createdAt: new Date().toISOString() });
    await deleteDoc(doc(db, "snus_pending", item.id));
    if (item.submittedByUid) {
      const userSnap = await getDoc(doc(db, "users", item.submittedByUid));
      if (userSnap.exists()) await updateDoc(doc(db, "users", item.submittedByUid), { approvedProducts: (userSnap.data().approvedProducts || 0) + 1 });
    }
    fetchPending(); fetchSnus();
  };

  const rejectPending = async (id) => { await deleteDoc(doc(db, "snus_pending", id)); fetchPending(); };

  const openSnusFromReview = (review) => {
    const snus = snusList.find(s => s.id === review.snusId);
    if (snus) { setSelectedSnus(snus); setUserRating(0); setReviewText(""); setSubmitted(false); }
  };

  const handleScanResult = (barcode) => {
    setShowScanner(false);
    const found = snusList.find(s => s.barcode === barcode);
    if (found) { setSelectedSnus(found); setUserRating(0); setReviewText(""); setSubmitted(false); }
    else setUnknownBarcode(barcode);
  };

  const handleBarcodeMatch = async (snus, barcode) => {
    await updateDoc(doc(db, "snus", snus.id), { barcode });
    setUnknownBarcode(null); setBarcodeMatched(true); fetchSnus();
    setTimeout(() => { setBarcodeMatched(false); setSelectedSnus({ ...snus, barcode }); setUserRating(0); setReviewText(""); setSubmitted(false); }, 1500);
  };

  const handleBarcodeSuggest = async (snusData) => {
    await addDoc(collection(db, "snus_pending"), { ...snusData, submittedBy: displayName, submittedByUid: user.uid, approved: false, createdAt: new Date().toISOString() });
    setUnknownBarcode(null); alert("Sendt til admin!");
  };

  const filtered = snusList.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.brand?.toLowerCase().includes(search.toLowerCase())
  );

  const favSnusObj = snusList.find(s => s.id === userProfile?.favoriteSnus);

  const s = {
    app: { fontFamily: "'Georgia', serif", background: "#0a0a0a", minHeight: "100vh", color: "#e8e0d0", maxWidth: 430, margin: "0 auto" },
    header: { background: "#111", borderBottom: "1px solid #1e1e1e", padding: "14px 20px", position: "sticky", top: 0, zIndex: 10 },
    logo: { fontSize: 24, fontWeight: 700, color: "#e8b84b", letterSpacing: -0.5 },
    logoSub: { fontSize: 9, letterSpacing: 3.5, color: "#555", textTransform: "uppercase", marginTop: 1 },
    nav: { display: "flex", borderBottom: "1px solid #1a1a1a", background: "#0f0f0f", overflowX: "auto" },
    navBtn: (a) => ({ flex: 1, padding: "12px 2px", background: "none", border: "none", color: a ? "#e8b84b" : "#444", fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", borderBottom: a ? "2px solid #e8b84b" : "2px solid transparent", whiteSpace: "nowrap" }),
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
    statBox: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "14px", textAlign: "center", flex: 1 },
    buddyCard: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" },
  };

  if (!user) return (
    <div style={s.app}>
      <div style={s.header}>
        <div style={s.logo}>SnusRate</div>
        <div style={s.logoSub}>Nordic Snus Community</div>
      </div>
      <div style={s.content}>
        <div style={{ textAlign: "center", padding: "48px 0 24px", fontSize: 48 }}>🤠</div>
        <div style={{ ...s.sectionTitle, textAlign: "center", marginBottom: 20 }}>{authMode === "login" ? "Logg inn" : "Opprett konto"}</div>
        {authMode === "register" && (
          <>
            <span style={s.label}>Brukernavn</span>
            <input style={s.input} value={username} onChange={e => setUsername(e.target.value)} placeholder="f.eks. SnusKongen_Oslo" />
            <span style={s.label}>Alder (må være 18+)</span>
            <input style={s.input} type="number" min="18" max="99" value={age} onChange={e => setAge(e.target.value)} placeholder="Din alder" />
            <span style={s.label}>Kjønn</span>
            <select style={s.select} value={gender} onChange={e => setGender(e.target.value)}>
              <option value="">Velg kjønn</option>
              <option>Mann</option><option>Kvinne</option><option>Annet</option>
            </select>
            <span style={s.label}>Land</span>
            <select style={s.select} value={country} onChange={e => setCountry(e.target.value)}>
              <option>Norge</option><option>Sverige</option><option>Danmark</option><option>Finland</option><option>Annet</option>
            </select>
            <span style={s.label}>By</span>
            <input style={s.input} value={city} onChange={e => setCity(e.target.value)} placeholder="f.eks. Oslo" />
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
    </div>
  );

  return (
    <div style={s.app}>
      {showScanner && <BarcodeScanner onResult={handleScanResult} onClose={() => setShowScanner(false)} />}
      {unknownBarcode && <UnknownBarcodeModal barcode={unknownBarcode} snusList={snusList} onMatch={handleBarcodeMatch} onSuggest={handleBarcodeSuggest} onClose={() => setUnknownBarcode(null)} />}
      {barcodeMatched && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e8b84b", marginTop: 12 }}>Strekkode koblet!</div>
          </div>
        </div>
      )}

      <div style={s.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={s.logo}>SnusRate</div><div style={s.logoSub}>Nordic Snus Community</div></div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setShowScanner(true)} style={{ background: "none", border: "1px solid #e8b84b", color: "#e8b84b", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 16 }}>📷</button>
            {notifCount > 0 && (
              <button onClick={() => setTab("profil")} style={{ background: "#e8b84b", color: "#0a0a0a", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                🤠 {notifCount}
              </button>
            )}
            <button onClick={() => signOut(auth)} style={{ background: "none", border: "1px solid #222", color: "#555", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 11 }}>Logg ut</button>
          </div>
        </div>
      </div>

      <div style={s.nav}>
        {[["explore","Utforsk"],["vurderinger","Vurderinger"],["topp","Topp 10"],["profil","Profil"], ...(isAdmin ? [["admin","Admin"]] : [])].map(([k,l]) => (
          <button key={k} style={s.navBtn(tab===k)} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <div style={s.content}>
        {tab === "explore" && (
          <>
            <LiveTicker allReviews={allReviews} onClickReview={openSnusFromReview} />
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input style={{ ...s.searchBox, marginBottom: 0, flex: 1 }} placeholder="🔍  Søk snus eller merke..." value={search} onChange={e => setSearch(e.target.value)} />
              <button onClick={() => setShowScanner(true)} style={{ background: "#141414", border: "1px solid #e8b84b", color: "#e8b84b", borderRadius: 10, padding: "0 16px", cursor: "pointer", fontSize: 20 }}>📷</button>
            </div>
            <div style={s.sectionTitle}>Alle snus ({filtered.length})</div>
            {filtered.map(snus => (
              <div key={snus.id} style={s.card} onClick={() => { setSelectedSnus(snus); setUserRating(0); setReviewText(""); setSubmitted(false); }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{snus.name}</div>
                    <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>{snus.brand} · {snus.type}</div>
                    <FlameStrength value={snus.strength} />
                  </div>
                  <div style={{ textAlign: "right", marginLeft: 12 }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#e8b84b" }}>{(snus.avgRating || 0).toFixed(1)}</div>
                    <div style={{ fontSize: 10, color: "#555" }}>{snus.totalRatings || 0} ratings</div>
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
              <div key={i} style={{ ...s.reviewCard, cursor: "pointer" }} onClick={() => openSnusFromReview(r)}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#e8b84b" }}>@{r.user}</span>
                    <span style={{ fontSize: 12, color: "#555" }}> ratet </span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{r.snusName}</span>
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
            {snusList.map((snus, i) => (
              <div key={snus.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px solid #1a1a1a" }}>
                <div style={{ fontSize: i < 3 ? 20 : 16, fontWeight: 900, width: 30, textAlign: "center" }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{snus.name}</div>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 3 }}>{snus.brand}</div>
                  <FlameStrength value={snus.strength} />
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#e8b84b" }}>{(snus.avgRating || 0).toFixed(1)}</div>
                  <div style={{ fontSize: 10, color: "#444" }}>{snus.totalRatings || 0} ratings</div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "profil" && (
          <>
            <div style={{ textAlign: "center", padding: "32px 0 20px" }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>🤠</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#e8b84b" }}>@{user.displayName || "ukjent"}</div>
              {userProfile && (
                <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                  {userProfile.city && userProfile.country ? `${userProfile.city}, ${userProfile.country}` : userProfile.country || ""}
                  {userProfile.age ? ` · ${userProfile.age} år` : ""}
                  {userProfile.gender ? ` · ${userProfile.gender}` : ""}
                </div>
              )}
              {isAdmin && <div style={{ fontSize: 10, color: "#e8b84b", marginTop: 6, letterSpacing: 2.5, fontWeight: 700 }}>⚡ ADMIN</div>}
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
                <span style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#e8b84b" }}>{ratingTitle}</span>
                {productTitle && <span style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#e8b84b" }}>{productTitle}</span>}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <div style={s.statBox}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#e8b84b" }}>{myReviews.length}</div>
                <div style={{ fontSize: 10, color: "#555", marginTop: 4, letterSpacing: 1, textTransform: "uppercase" }}>Vurderinger</div>
              </div>
              <div style={s.statBox}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#e8b84b" }}>{myAvgRating}</div>
                <div style={{ fontSize: 10, color: "#555", marginTop: 4, letterSpacing: 1, textTransform: "uppercase" }}>Snitt gitt</div>
              </div>
              <div style={s.statBox}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#e8b84b" }}>{buddies.length}</div>
                <div style={{ fontSize: 10, color: "#555", marginTop: 4, letterSpacing: 1, textTransform: "uppercase" }}>Buddies</div>
              </div>
            </div>

            {favSnusObj && (
              <div style={{ marginBottom: 20 }}>
                <div style={s.sectionTitle}>Favorittsnuus</div>
                <div style={s.card} onClick={() => { setSelectedSnus(favSnusObj); setUserRating(0); setReviewText(""); setSubmitted(false); }}>
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
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#e8b84b" }}>@{req.fromName}</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={s.btnGreen} onClick={() => acceptBuddy(req)}>✓ Godta</button>
                      <button style={s.btnRed} onClick={() => rejectBuddy(req)}>✗ Avvis</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <div style={s.sectionTitle}>Snusbuddies ({buddies.length})</div>
              {buddies.length === 0 && <div style={{ color: "#444", fontSize: 13, marginBottom: 12 }}>Ingen Snusbuddies ennå</div>}
              {buddies.map((b, i) => (
                <div key={i} style={s.buddyCard}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#e8b84b" }}>🤠 @{b.name}</span>
                </div>
              ))}
              <div style={{ ...s.sectionTitle, marginTop: 16 }}>Finn Snusbuddies</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...s.input, marginTop: 0, flex: 1 }} placeholder="Søk brukernavn..." value={buddySearch} onChange={e => setBuddySearch(e.target.value)} onKeyDown={e => e.key === "Enter" && searchBuddies()} />
                <button onClick={searchBuddies} style={{ ...s.btnSmall, padding: "0 16px" }}>Søk</button>
              </div>
              {buddyResults.map((u, i) => (
                <div key={i} style={{ ...s.buddyCard, marginTop: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#e8b84b" }}>@{u.displayName}</div>
                    <div style={{ fontSize: 11, color: "#555" }}>{u.city ? `${u.city}, ` : ""}{u.country}</div>
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
                <div key={i} style={{ ...s.reviewCard, cursor: "pointer" }} onClick={() => openSnusFromReview(r)}>
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
            <div style={s.sectionTitle}>Legg til ny snus</div>
            <span style={s.label}>Produktnavn</span>
            <input style={s.input} placeholder="f.eks. General White" value={adminNewSnus.name} onChange={e => setAdminNewSnus({...adminNewSnus, name: e.target.value})} />
            <span style={s.label}>Merke / Produsent</span>
            <input style={s.input} placeholder="f.eks. Swedish Match" value={adminNewSnus.brand} onChange={e => setAdminNewSnus({...adminNewSnus, brand: e.target.value})} />
            <span style={s.label}>Type</span>
            <input style={s.input} placeholder="f.eks. White Portion" value={adminNewSnus.type} onChange={e => setAdminNewSnus({...adminNewSnus, type: e.target.value})} />
            <span style={s.label}>Styrke</span>
            <StrengthSelector value={adminNewSnus.strength} onChange={v => setAdminNewSnus({...adminNewSnus, strength: v})} />
            <span style={s.label}>Strekkode (EAN)</span>
            <input style={s.input} placeholder="f.eks. 7311250083068" value={adminNewSnus.barcode || ""} onChange={e => setAdminNewSnus({...adminNewSnus, barcode: e.target.value})} />
            <button style={{ ...s.btn, marginTop: 16 }} onClick={adminAddSnus}>+ Legg til snus</button>
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
                <button style={s.btnRed} onClick={() => rejectPending(item.id)}>✗ Avvis</button>
              </div>
            ))}
          </>
        )}
      </div>

      {selectedSnus && (
        <div style={s.modal} onClick={() => setSelectedSnus(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 2 }}>{selectedSnus.name}</div>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>{selectedSnus.brand} · {selectedSnus.type}</div>
            <FlameStrength value={selectedSnus.strength} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0" }}>
              <StarRating value={Math.round(selectedSnus.avgRating || 0)} size={18} />
              <span style={{ fontSize: 22, fontWeight: 900, color: "#e8b84b" }}>{(selectedSnus.avgRating || 0).toFixed(1)}</span>
              <span style={{ fontSize: 12, color: "#444" }}>({selectedSnus.totalRatings || 0} anmeldelser)</span>
            </div>
            {selectedSnus.reviews?.length > 0 && (
              <>
                <div style={{ ...s.sectionTitle, marginTop: 8 }}>Anmeldelser</div>
                {[...selectedSnus.reviews].reverse().map((r, i) => (
                  <div key={i} style={s.reviewCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#e8b84b" }}>@{r.user}</span>
                      <span style={{ fontSize: 10, color: "#333" }}>{formatDateFull(r.date)}</span>
                    </div>
                    <StarRating value={r.rating} size={13} />
                    {r.text && <div style={{ fontSize: 13, color: "#aaa", marginTop: 8, lineHeight: 1.5 }}>{r.text}</div>}
                  </div>
                ))}
              </>
            )}
            <div style={{ borderTop: "1px solid #1e1e1e", marginTop: 20, paddingTop: 20 }}>
              {!submitted ? (
                <>
                  <div style={s.sectionTitle}>Din anmeldelse</div>
                  <div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}>
                    <StarRating value={userRating} onChange={setUserRating} size={40} />
                  </div>
                  <textarea style={{ ...s.input, resize: "vertical", minHeight: 90 }} placeholder="Hva synes du?" value={reviewText} onChange={e => setReviewText(e.target.value)} />
                  <button style={s.btn} onClick={submitReview}>Send inn</button>
                  <button style={s.btnOutline} onClick={() => setSelectedSnus(null)}>Lukk</button>
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