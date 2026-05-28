export const ADMIN_EMAIL = "fredrik-nielsen@hotmail.com";

export const PRIVACY_POLICY = `PERSONVERNERKLÆRING FOR SNUSRATE

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

export const getRatingTitle = (count) => {
  if (count >= 100) return "👑 Snuskonge";
  if (count >= 50) return "⭐ Snusmester";
  if (count >= 30) return "🏅 Snusekspert";
  if (count >= 15) return "🎯 Smaksdommer";
  if (count >= 5) return "👃 Snusnese";
  return "🌱 Nybegynner";
};

export const getProductTitle = (count) => {
  if (count >= 10) return "🏭 Snusleksikon";
  if (count >= 5) return "🔍 Snusjeger";
  if (count >= 3) return "🗂️ Produktjeger";
  if (count >= 1) return "📦 Bidragsyter";
  return null;
};

export const formatDate = (iso) => {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "akkurat nå";
  if (diff < 3600) return `${Math.floor(diff / 60)}m siden`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}t siden`;
  return `${Math.floor(diff / 86400)}d siden`;
};

export const formatDateFull = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString("no-NO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const FLAME_LEVELS = { "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "Normal": 3, "Sterk": 4, "Extrem": 5 };

export const STYLES = {
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
  reviewCard: { background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 8, padding: "12px 14px", marginBottom: 8 },
  pendingCard: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "12px 14px", marginBottom: 10 },
  statBox: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "14px", textAlign: "center", flex: 1, cursor: "pointer" },
  buddyCard: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" },
  badge: { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#e8b84b" },
};