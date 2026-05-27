import React, { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, arrayUnion, deleteDoc } from "firebase/firestore";

const ADMIN_EMAIL = "fredrik-nielsen@hotmail.com";

function ChiliStrength({ value }) {
  const levels = { "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "Normal": 3, "Sterk": 4, "Extrem": 5 };
  const count = levels[value] || 3;
  return (
    <span style={{ fontSize: 12 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ opacity: i <= count ? 1 : 0.2 }}>🌶️</span>
      ))}
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
            color: i <= (hover || value) ? "#e8b84b" : "#3a3a3a", transition: "color 0.1s", userSelect: "none" }}>★</span>
      ))}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("explore");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    onAuthStateChanged(auth, u => setUser(u));
    fetchSnus();
  }, []);

  useEffect(() => {
    if (isAdmin) fetchPending();
  }, [isAdmin]);

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

  const handleAuth = async () => {
    try {
      if (authMode === "register") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e) { alert(e.message); }
  };

  const submitReview = async () => {
    if (!userRating || !selectedSnus) return;
    const snusRef = doc(db, "snus", selectedSnus.id);
    await updateDoc(snusRef, {
      reviews: arrayUnion({ user: user.email, rating: userRating, text: reviewText, date: new Date().toISOString() }),
      totalRatings: (selectedSnus.totalRatings || 0) + 1,
      totalScore: (selectedSnus.totalScore || 0) + userRating,
      avgRating: ((selectedSnus.totalScore || 0) + userRating) / ((selectedSnus.totalRatings || 0) + 1),
    });
    setSubmitted(true);
    fetchSnus();
  };

  const submitNewSnus = async () => {
    if (!newSnus.name || !newSnus.brand) return;
    await addDoc(collection(db, "snus_pending"), { ...newSnus, submittedBy: user.email, approved: false, createdAt: new Date().toISOString() });
    setAddSubmitted(true);
  };

  const adminAddSnus = async () => {
    if (!adminNewSnus.name || !adminNewSnus.brand) return;
    await addDoc(collection(db, "snus"), {
      ...adminNewSnus,
      avgRating: 0, totalRatings: 0, totalScore: 0, reviews: [],
      createdAt: new Date().toISOString()
    });
    setAdminNewSnus({ name: "", brand: "", type: "", strength: "3" });
    fetchSnus();
    alert("Snus lagt til!");
  };

  const approvePending = async (item) => {
    await addDoc(collection(db, "snus"), {
      name: item.name, brand: item.brand, type: item.type, strength: item.strength,
      avgRating: 0, totalRatings: 0, totalScore: 0, reviews: [],
      createdAt: new Date().toISOString()
    });
    await deleteDoc(doc(db, "snus_pending", item.id));
    fetchPending();
    fetchSnus();
  };

  const rejectPending = async (id) => {
    await deleteDoc(doc(db, "snus_pending", id));
    fetchPending();
  };

  const s = {
    app: { fontFamily: "'Georgia', serif", background: "#0f0f0f", minHeight: "100vh", color: "#e8e0d0", maxWidth: 420, margin: "0 auto" },
    header: { background: "#161616", borderBottom: "1px solid #2a2a2a", padding: "16px 20px 12px", position: "sticky", top: 0, zIndex: 10 },
    logo: { fontSize: 22, fontWeight: 700, color: "#e8b84b" },
    logoSub: { fontSize: 10, letterSpacing: 3, color: "#666", textTransform: "uppercase" },
    nav: { display: "flex", borderBottom: "1px solid #1e1e1e", background: "#111", overflowX: "auto" },
    navBtn: (a) => ({ flex: 1, padding: "12px 4px", background: "none", border: "none", color: a ? "#e8b84b" : "#555", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", borderBottom: a ? "2px solid #e8b84b" : "2px solid transparent", whiteSpace: "nowrap" }),
    content: { padding: 16 },
    card: { background: "#161616", border: "1px solid #222", borderRadius: 8, padding: "14px 16px", marginBottom: 10, cursor: "pointer" },
    btn: { background: "#e8b84b", color: "#0f0f0f", border: "none", borderRadius: 6, padding: "11px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer", width: "100%", marginTop: 12 },
    btnOutline: { background: "none", color: "#e8b84b", border: "1px solid #e8b84b", borderRadius: 6, padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer", width: "100%", marginTop: 8 },
    btnGreen: { background: "#4a7c59", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer", marginRight: 8 },
    btnRed: { background: "#b03a3a", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer" },
    input: { width: "100%", background: "#0f0f0f", border: "1px solid #2a2a2a", borderRadius: 6, padding: "10px 12px", color: "#e8e0d0", fontSize: 13, marginTop: 8, boxSizing: "border-box", fontFamily: "inherit" },
    modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "flex-end" },
    modalBox: { background: "#161616", border: "1px solid #2a2a2a", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 420, margin: "0 auto", padding: "24px 20px 32px", maxHeight: "85vh", overflowY: "auto" },
    label: { fontSize: 11, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", marginTop: 14, display: "block" },
    sectionTitle: { fontSize: 11, letterSpacing: 2, color: "#555", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 },
    pendingCard: { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, padding: "12px 14px", marginBottom: 10 },
  };

  const StrengthSelector = ({ value, onChange }) => (
    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
      {[1,2,3,4,5].map(i => (
        <button key={i} onClick={() => onChange(String(i))} style={{
          background: value === String(i) ? "#2a2a2a" : "none",
          border: value === String(i) ? "1px solid #e8b84b" : "1px solid #333",
          borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 14
        }}>
          {"🌶️".repeat(i)}
        </button>
      ))}
    </div>
  );

  if (!user) return (
    <div style={s.app}>
      <div style={s.header}><div style={s.logo}>SnusRate</div><div style={s.logoSub}>Nordic Snus Community</div></div>
      <div style={s.content}>
        <div style={{ textAlign: "center", padding: "40px 0 20px", fontSize: 40 }}>🤠</div>
        <div style={{ ...s.sectionTitle, textAlign: "center" }}>{authMode === "login" ? "Logg inn" : "Registrer deg"}</div>
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
      <div style={s.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={s.logo}>SnusRate</div><div style={s.logoSub}>Nordic Snus Community</div></div>
          <button onClick={() => signOut(auth)} style={{ background: "none", border: "1px solid #333", color: "#666", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 11 }}>Logg ut</button>
        </div>
      </div>
      <div style={s.nav}>
        {[["explore","Utforsk"],["topp","Topp 10"],["profil","Profil"], ...(isAdmin ? [["admin","Admin"]] : [])].map(([k,l]) => (
          <button key={k} style={s.navBtn(tab===k)} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      <div style={s.content}>

        {tab === "explore" && (
          <>
            <div style={s.sectionTitle}>Alle snus ({snusList.length})</div>
            {snusList.length === 0 && <div style={{ color: "#555", fontSize: 13 }}>Ingen snus lagt til ennå.</div>}
            {snusList.map(snus => (
              <div key={snus.id} style={s.card} onClick={() => { setSelectedSnus(snus); setUserRating(0); setReviewText(""); setSubmitted(false); }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{snus.name}</div>
                <div style={{ fontSize: 12, color: "#777", marginBottom: 4 }}>{snus.brand} · {snus.type}</div>
                <ChiliStrength value={snus.strength} />
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <StarRating value={Math.round(snus.avgRating || 0)} size={13} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#e8b84b" }}>{(snus.avgRating || 0).toFixed(1)}</span>
                  <span style={{ fontSize: 11, color: "#555" }}>({snus.totalRatings || 0} ratings)</span>
                </div>
              </div>
            ))}
            <button style={s.btn} onClick={() => { setShowAddForm(true); setAddSubmitted(false); }}>+ Foreslå ny snus</button>
          </>
        )}

        {tab === "topp" && (
          <>
            <div style={s.sectionTitle}>Høyest rated</div>
            {snusList.map((snus, i) => (
              <div key={snus.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #1e1e1e" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: i < 3 ? "#e8b84b" : "#333", width: 28, textAlign: "center" }}>{i+1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{snus.name}</div>
                  <div style={{ fontSize: 11, color: "#666", marginBottom: 2 }}>{snus.brand}</div>
                  <ChiliStrength value={snus.strength} />
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#e8b84b" }}>{(snus.avgRating || 0).toFixed(1)}</div>
                  <div style={{ fontSize: 10, color: "#555" }}>{snus.totalRatings || 0} ratings</div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "profil" && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🤠</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e8b84b" }}>{user.email}</div>
            {isAdmin && <div style={{ fontSize: 11, color: "#e8b84b", marginTop: 4, letterSpacing: 2 }}>ADMIN</div>}
          </div>
        )}

        {tab === "admin" && isAdmin && (
          <>
            <div style={s.sectionTitle}>Legg til ny snus direkte</div>
            <span style={s.label}>Produktnavn</span>
            <input style={s.input} placeholder="f.eks. General White" value={adminNewSnus.name} onChange={e => setAdminNewSnus({...adminNewSnus, name: e.target.value})} />
            <span style={s.label}>Merke</span>
            <input style={s.input} placeholder="f.eks. Swedish Match" value={adminNewSnus.brand} onChange={e => setAdminNewSnus({...adminNewSnus, brand: e.target.value})} />
            <span style={s.label}>Type</span>
            <input style={s.input} placeholder="f.eks. White Portion" value={adminNewSnus.type} onChange={e => setAdminNewSnus({...adminNewSnus, type: e.target.value})} />
            <span style={s.label}>Styrke</span>
            <StrengthSelector value={adminNewSnus.strength} onChange={v => setAdminNewSnus({...adminNewSnus, strength: v})} />
            <button style={{ ...s.btn, marginTop: 16 }} onClick={adminAddSnus}>+ Legg til snus</button>

            <div style={{ ...s.sectionTitle, marginTop: 28 }}>Til godkjenning ({pendingList.length})</div>
            {pendingList.length === 0 && <div style={{ color: "#555", fontSize: 13 }}>Ingen ventende forslag.</div>}
            {pendingList.map(item => (
              <div key={item.id} style={s.pendingCard}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>{item.brand} · {item.type}</div>
                <ChiliStrength value={item.strength} />
                <div style={{ fontSize: 11, color: "#555", margin: "8px 0" }}>Fra: {item.submittedBy}</div>
                <div>
                  <button style={s.btnGreen} onClick={() => approvePending(item)}>✓ Godkjenn</button>
                  <button style={s.btnRed} onClick={() => rejectPending(item.id)}>✗ Avvis</button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {selectedSnus && (
        <div style={s.modal} onClick={() => setSelectedSnus(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>{selectedSnus.name}</div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>{selectedSnus.brand} · {selectedSnus.type}</div>
            <ChiliStrength value={selectedSnus.strength} />
            <div style={{ marginTop: 16 }}>
              {!submitted ? (
                <>
                  <span style={s.label}>Din rating</span>
                  <div style={{ display: "flex", justifyContent: "center", margin: "12px 0" }}>
                    <StarRating value={userRating} onChange={setUserRating} size={36} />
                  </div>
                  <span style={s.label}>Anmeldelse</span>
                  <textarea style={{ ...s.input, resize: "vertical", minHeight: 80 }} placeholder="Hva synes du?" value={reviewText} onChange={e => setReviewText(e.target.value)} />
                  <button style={s.btn} onClick={submitReview}>Send inn</button>
                  <button style={s.btnOutline} onClick={() => setSelectedSnus(null)}>Lukk</button>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 40 }}>✅</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#e8b84b", marginTop: 8 }}>Rating lagret!</div>
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
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Foreslå ny snus</div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>Sendes til admin for godkjenning</div>
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
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 40 }}>📬</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#e8b84b", marginTop: 8 }}>Sendt!</div>
                <button style={{ ...s.btn, marginTop: 20 }} onClick={() => setShowAddForm(false)}>OK</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}