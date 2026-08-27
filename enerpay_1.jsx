import React, { useState, useEffect, useRef } from "react";

const SCREENS = {
  SPLASH: "splash",
  LOGIN: "login",
  FINGERPRINT: "fingerprint",
  DASHBOARD: "dashboard",
  PROFILE: "profile",
  ENERGY_SOURCES: "energy_sources",
  MARKETPLACE: "marketplace",
  QR_SCAN: "qr_scan",
  SEND_ENERGY: "send_energy",
  ENERGY_BANK: "energy_bank",
  ANALYTICS: "analytics",
  HISTORY: "history",
};

const weeklyData = [
  { day: "Mon", gen: 16.2, earn: 111 },
  { day: "Tue", gen: 18.4, earn: 126 },
  { day: "Wed", gen: 12.1, earn: 83 },
  { day: "Thu", gen: 20.3, earn: 139 },
  { day: "Fri", gen: 22.8, earn: 156 },
  { day: "Sat", gen: 15.6, earn: 107 },
  { day: "Sun", gen: 18.4, earn: 126 },
];

const priceData = [6.20, 6.45, 6.30, 6.80, 6.95, 6.85, 7.10, 6.90, 6.85];
const ENERGY_PRICE_PER_KWH = 6.56;

export default function EnerPay() {
  const [screen, setScreen] = useState(SCREENS.SPLASH);
  const [prevScreen, setPrevScreen] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem("enerpay_token"));
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [scannedRecipient, setScannedRecipient] = useState("");
  const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:4000/api" : "/api");
  const api = async (path, options = {}) => {
    const response = await fetch(`${apiBase}${path}`, { ...options, headers: { "Content-Type":"application/json", ...(token ? { Authorization:`Bearer ${token}` } : {}), ...options.headers } });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) throw new Error("The deployed API route was not found. Confirm the Vercel deployment includes the api folder, then redeploy.");
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Request failed.");
    return data;
  };
  const refresh = async () => {
    if (!token) return;
    const [me, history] = await Promise.all([api("/me"), api("/transactions")]);
    setAccount(me.user); setTransactions(history.transactions);
  };
  useEffect(() => { refresh().catch(() => { localStorage.removeItem("enerpay_token"); setToken(null); }); }, [token]);
  const authenticate = async (route, payload) => {
    const result = await api(route, { method:"POST", body:JSON.stringify(payload) });
    localStorage.setItem("enerpay_token", result.token); setToken(result.token); setAccount(result.user); navigate(SCREENS.DASHBOARD);
  };
  const signOut = () => {
    localStorage.removeItem("enerpay_token");
    setToken(null); setAccount(null); setTransactions([]); setScreen(SCREENS.LOGIN); setAnimating(false);
  };
  const userData = account ? {
    ...account, profileInitial: account.name.split(" ").map(n=>n[0]).join("").slice(0,2), energyBalance: account.balances.energyKwh,
    // Rupee value is derived from the live energy balance, not moneyInr in the database.
    moneyBalance: Number((account.balances.energyKwh * ENERGY_PRICE_PER_KWH).toFixed(2)), todayGenerated: account.solarKwh || 0, pricePerUnit: ENERGY_PRICE_PER_KWH, verificationStatus:"Verified",
    sources:[{ type:"Solar Panel", units:12, rate:3.2, daily:account.solarKwh || 0, icon:"☀️" }]
  } : null;
  const txHistory = transactions.map(tx => {
    const outgoing = String(tx.sender._id || tx.sender) === String(account?.id);
    const label = outgoing ? `Sent to ${tx.receiver.name}` : `Received from ${tx.sender.name}`;
    const sign = outgoing ? "-" : "+"; const color = outgoing ? "#ef4444" : "#22c55e";
    return { id:tx._id, type:`${tx.kind}_${outgoing ? "debit":"credit"}`, desc:tx.note || label, amount:tx.kind==="energy" ? `${sign}${tx.amount} kWh` : "", money:tx.kind==="money" ? `${sign}₹${tx.amount.toFixed(2)}` : "", time:new Date(tx.createdAt).toLocaleString(), color };
  });

  const navigate = (to) => {
    setPrevScreen(screen);
    setAnimating(true);
    setTimeout(() => {
      setScreen(to);
      setAnimating(false);
    }, 200);
  };

  useEffect(() => {
    if (screen === SCREENS.SPLASH) {
      const t = setTimeout(() => navigate(SCREENS.LOGIN), 2500);
      return () => clearTimeout(t);
    }
  }, [screen]);

  const screenProps = { navigate, userData, txHistory, weeklyData, priceData, api, authenticate, refresh, account, signOut, scannedRecipient, setScannedRecipient };

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", background: "linear-gradient(135deg,#0a0a1a 0%,#0d1b3e 50%,#0a0a1a 100%)",
      fontFamily: "'Outfit', 'Segoe UI', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 0; }
        .screen-in { animation: slideIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        @keyframes slideIn { from { opacity:0; transform: translateY(20px) scale(0.97); } to { opacity:1; transform: translateY(0) scale(1); } }
        .pulse { animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
        .spin { animation: spin 1.5s linear infinite; }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .glow { animation: glow 3s ease-in-out infinite; }
        @keyframes glow { 0%,100% { box-shadow: 0 0 20px rgba(0,102,255,0.3); } 50% { box-shadow: 0 0 40px rgba(0,102,255,0.7); } }
        .float { animation: float 3s ease-in-out infinite; }
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
        .bar-fill { animation: barFill 0.8s ease-out forwards; }
        @keyframes barFill { from { height:0; } }
        .tap { transition: transform 0.1s; cursor:pointer; }
        .tap:active { transform: scale(0.95); }
        .slide-up { animation: slideUp 0.4s ease-out forwards; }
        @keyframes slideUp { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div style={{
        width: 390, height: 844, background: "#F7F9FC",
        borderRadius: 44, overflow: "hidden", position: "relative",
        boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)",
        opacity: animating ? 0 : 1, transition: "opacity 0.2s",
      }}>
        {screen === SCREENS.SPLASH && <SplashScreen {...screenProps} />}
        {screen === SCREENS.LOGIN && <LoginScreen {...screenProps} />}
        {screen === SCREENS.FINGERPRINT && <FingerprintScreen {...screenProps} />}
        {screen === SCREENS.DASHBOARD && <DashboardScreen {...screenProps} />}
        {screen === SCREENS.PROFILE && <ProfileScreen {...screenProps} />}
        {screen === SCREENS.ENERGY_SOURCES && <EnergySourcesScreen {...screenProps} />}
        {screen === SCREENS.MARKETPLACE && <MarketplaceScreen {...screenProps} />}
        {screen === SCREENS.QR_SCAN && <QRScanScreen {...screenProps} />}
        {screen === SCREENS.SEND_ENERGY && <SendEnergyScreen {...screenProps} />}
        {screen === SCREENS.ENERGY_BANK && <EnergyBankScreen {...screenProps} />}
        {screen === SCREENS.ANALYTICS && <AnalyticsScreen {...screenProps} />}
        {screen === SCREENS.HISTORY && <HistoryScreen {...screenProps} />}
      </div>
    </div>
  );
}

// ─── SHARED COMPONENTS ───────────────────────────────────────────
function StatusBar({ dark }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"14px 28px 0", fontSize:12, fontWeight:600,
      color: dark ? "rgba(255,255,255,0.8)" : "#1a1a2e" }}>
      <span>9:41</span>
      <div style={{ display:"flex", gap:4, alignItems:"center" }}>
        <span style={{ fontSize:10 }}>●●●</span>
        <span>WiFi</span>
        <span>⚡</span>
      </div>
    </div>
  );
}

function BackBtn({ onBack, dark }) {
  return (
    <button className="tap" onClick={onBack} style={{
      background: dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.06)",
      border:"none", borderRadius:12, width:40, height:40,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:18, cursor:"pointer", color: dark ? "#fff" : "#1a1a2e",
    }}>‹</button>
  );
}

function BottomNav({ navigate, active }) {
  const items = [
    { icon:"⚡", label:"Home", screen: SCREENS.DASHBOARD },
    { icon:"📊", label:"Analytics", screen: SCREENS.ANALYTICS },
    { icon:"🏦", label:"Bank", screen: SCREENS.ENERGY_BANK },
    { icon:"🕐", label:"History", screen: SCREENS.HISTORY },
    { icon:"👤", label:"Profile", screen: SCREENS.PROFILE },
  ];
  return (
    <div style={{
      position:"absolute", bottom:0, left:0, right:0, height:80,
      background:"#fff", borderTop:"1px solid #eef0f4",
      display:"flex", alignItems:"center", justifyContent:"space-around",
      padding:"0 8px 16px", boxShadow:"0 -4px 20px rgba(0,0,0,0.06)",
    }}>
      {items.map(it => (
        <button key={it.screen} className="tap" onClick={() => navigate(it.screen)} style={{
          display:"flex", flexDirection:"column", alignItems:"center", gap:3,
          background:"none", border:"none", cursor:"pointer",
          color: active === it.screen ? "#0066FF" : "#94a3b8",
          fontFamily:"inherit", padding:"6px 10px", borderRadius:12,
          transition:"color 0.2s",
        }}>
          <div style={{ fontSize: active === it.screen ? 22 : 20,
            transform: active === it.screen ? "scale(1.1)" : "scale(1)",
            transition:"transform 0.2s" }}>{it.icon}</div>
          <span style={{ fontSize:10, fontWeight: active === it.screen ? 700 : 500 }}>{it.label}</span>
          {active === it.screen && <div style={{ width:4, height:4, borderRadius:2, background:"#0066FF" }} />}
        </button>
      ))}
    </div>
  );
}

// ─── SPLASH SCREEN ────────────────────────────────────────────────
function SplashScreen() {
  return (
    <div style={{
      width:"100%", height:"100%",
      background:"linear-gradient(160deg,#001a4d 0%,#0033a0 40%,#0052cc 70%,#003399 100%)",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:0,
      position:"relative", overflow:"hidden",
    }}>
      {/* Decorative orbs */}
      {[["-60px","-60px","180px","rgba(255,193,7,0.15)"],["280px","600px","200px","rgba(0,102,255,0.2)"],["160px","100px","120px","rgba(0,200,150,0.1)"]].map(([l,t,s,c],i) => (
        <div key={i} style={{ position:"absolute", left:l, top:t, width:s, height:s, borderRadius:"50%", background:c, filter:"blur(40px)" }} />
      ))}
      
      <div className="float" style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20 }}>
        {/* Logo */}
        <div className="glow" style={{
          width:100, height:100, borderRadius:28, background:"linear-gradient(135deg,#FFC107,#FF8C00)",
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:48,
          boxShadow:"0 20px 60px rgba(255,193,7,0.4)",
        }}>⚡</div>
        
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:40, fontWeight:900, color:"#fff", letterSpacing:"-1px", lineHeight:1 }}>EnerPay</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.7)", fontWeight:400, marginTop:6, letterSpacing:2 }}>UNIFIED ENERGY INTERFACE</div>
        </div>
      </div>
      
      <div style={{ position:"absolute", bottom:60, display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
        <div className="spin" style={{ width:32, height:32, border:"3px solid rgba(255,255,255,0.2)", borderTopColor:"#FFC107", borderRadius:"50%" }} />
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", letterSpacing:1 }}>LOADING…</div>
      </div>
    </div>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────
function LoginScreen({ authenticate }) {
  const [tab, setTab] = useState("login");
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => { setError(""); setBusy(true); try { await authenticate(tab === "login" ? "/auth/login" : "/auth/register", tab === "login" ? { phone, password } : { name, phone, password }); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  return (
    <div style={{ width:"100%", height:"100%", background:"#fff", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{
        background:"linear-gradient(160deg,#001a4d 0%,#0052cc 100%)",
        padding:"56px 28px 40px", position:"relative", overflow:"hidden",
      }}>
        <div style={{ position:"absolute", right:-40, top:-40, width:200, height:200, borderRadius:"50%", background:"rgba(255,193,7,0.12)" }} />
        <div style={{ position:"absolute", right:20, bottom:-60, width:140, height:140, borderRadius:"50%", background:"rgba(0,100,255,0.2)" }} />
        <div style={{ fontSize:32, fontWeight:900, color:"#fff", letterSpacing:"-0.5px" }}>Welcome back ⚡</div>
        <div style={{ fontSize:14, color:"rgba(255,255,255,0.65)", marginTop:6 }}>Sign in to your EnerPay account</div>
      </div>

      <div style={{ padding:"28px 28px 0", flex:1, overflowY:"auto" }}>
        {/* Tabs */}
        <div style={{ display:"flex", background:"#f1f5f9", borderRadius:14, padding:4, marginBottom:28 }}>
          {["login","register"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex:1, padding:"10px 0", borderRadius:10, border:"none", cursor:"pointer",
              fontFamily:"inherit", fontWeight:600, fontSize:14, transition:"all 0.2s",
              background: tab===t ? "#fff" : "transparent",
              color: tab===t ? "#0066FF" : "#64748b",
              boxShadow: tab===t ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
            }}>{t==="login" ? "🔑 Sign in" : "✨ Register"}</button>
          ))}
        </div>

        <div className="slide-up" style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {tab === "register" && <InputField icon="👤" label="Full name" placeholder="Your name" value={name} onChange={setName} />}
          <InputField icon="📱" label="Phone Number" placeholder="+919876543210" type="tel" value={phone} onChange={setPhone} />
          <InputField icon="🔒" label="Password" placeholder="Minimum 6 characters" type="password" value={password} onChange={setPassword} />
          {error && <div style={{ color:"#dc2626", fontSize:12 }}>{error}</div>}
        </div>

        <div style={{ marginTop:24 }}>
          <PrimaryBtn label={busy ? "Please wait…" : tab === "login" ? "Sign In" : "Create Account"} onClick={submit} />
        </div>

        <div style={{ textAlign:"center", marginTop:20 }}>
          <span style={{ fontSize:13, color:"#64748b" }}>{tab === "login" ? "No account? " : "Already registered? "}</span>
          <span onClick={() => setTab(tab === "login" ? "register" : "login")} style={{ fontSize:13, color:"#0066FF", fontWeight:700, cursor:"pointer" }}>{tab === "login" ? "Register Now" : "Sign in"}</span>
        </div>

        <div style={{ marginTop:20, display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ flex:1, height:1, background:"#e2e8f0" }} />
          <span style={{ fontSize:12, color:"#94a3b8" }}>OR</span>
          <div style={{ flex:1, height:1, background:"#e2e8f0" }} />
        </div>

        <div style={{
          marginTop:20, display:"flex", alignItems:"center", justifyContent:"center", gap:10,
          padding:"14px", borderRadius:14, border:"2px solid #e2e8f0", cursor:"pointer",
        }}>
          <span style={{ fontSize:14, fontWeight:600, color:"#1a1a2e" }}>Your credentials are securely verified against EnerPay.</span>
        </div>
      </div>
    </div>
  );
}

// ─── FINGERPRINT SCREEN ───────────────────────────────────────────
function FingerprintScreen({ navigate }) {
  const [state, setState] = useState("idle");
  useEffect(() => {
    const t1 = setTimeout(() => setState("scanning"), 800);
    const t2 = setTimeout(() => setState("success"), 2200);
    const t3 = setTimeout(() => navigate(SCREENS.DASHBOARD), 3000);
    return () => [t1,t2,t3].forEach(clearTimeout);
  }, []);

  return (
    <div style={{
      width:"100%", height:"100%",
      background:"linear-gradient(160deg,#001a4d 0%,#002b80 50%,#001f5e 100%)",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:0,
    }}>
      <StatusBar dark />
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:40 }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:28, fontWeight:800, color:"#fff" }}>Biometric Login</div>
          <div style={{ fontSize:14, color:"rgba(255,255,255,0.6)", marginTop:8 }}>Place your finger on the sensor</div>
        </div>

        <div style={{ position:"relative" }}>
          {state==="scanning" && (
            <div style={{
              position:"absolute", inset:-20, borderRadius:"50%",
              border:"2px solid rgba(0,102,255,0.5)", animation:"ping 1s ease-in-out infinite",
            }} />
          )}
          <div style={{
            width:140, height:140, borderRadius:"50%",
            background: state==="success" ? "linear-gradient(135deg,#22c55e,#16a34a)" :
              state==="scanning" ? "linear-gradient(135deg,#0066FF,#003399)" :
              "rgba(255,255,255,0.1)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:60,
            boxShadow: state==="success" ? "0 20px 60px rgba(34,197,94,0.4)" :
              state==="scanning" ? "0 20px 60px rgba(0,102,255,0.4)" : "none",
            transition:"all 0.4s",
          }}>
            {state==="success" ? "✓" : "👆"}
          </div>
        </div>

        <div style={{ height:32, display:"flex", alignItems:"center" }}>
          {state==="idle" && <div className="pulse" style={{ fontSize:14, color:"rgba(255,255,255,0.5)" }}>Waiting for fingerprint…</div>}
          {state==="scanning" && <div style={{ fontSize:14, color:"#60a5fa" }}>🔵 Scanning…</div>}
          {state==="success" && <div style={{ fontSize:14, color:"#4ade80", fontWeight:700 }}>✅ Identity Verified!</div>}
        </div>
      </div>

      <div style={{ paddingBottom:48, textAlign:"center" }}>
        <span onClick={() => navigate(SCREENS.DASHBOARD)} style={{ fontSize:13, color:"rgba(255,255,255,0.5)", cursor:"pointer" }}>
          Use PIN instead →
        </span>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────
function DashboardScreen({ navigate, userData, txHistory, weeklyData }) {
  const [tab, setTab] = useState("energy");
  return (
    <div style={{ width:"100%", height:"100%", background:"#f0f4ff", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* Header */}
      <div style={{
        background:"linear-gradient(160deg,#001a4d 0%,#0052cc 100%)",
        padding:"44px 24px 0", borderRadius:"0 0 32px 32px",
        boxShadow:"0 8px 32px rgba(0,102,255,0.2)",
      }}>
        <StatusBar dark />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
          <div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.65)" }}>Good morning ☀️</div>
            <div style={{ fontSize:22, fontWeight:800, color:"#fff", marginTop:2 }}>{userData.name}</div>
          </div>
          <div className="tap" onClick={() => navigate(SCREENS.PROFILE)} style={{
            width:46, height:46, borderRadius:16, background:"linear-gradient(135deg,#FFC107,#FF8C00)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:800, color:"#fff",
            boxShadow:"0 4px 12px rgba(255,193,7,0.4)",
          }}>{userData.profileInitial}</div>
        </div>

        {/* Balance cards */}
        <div style={{ display:"flex", gap:12, marginTop:20, paddingBottom:24 }}>
          {/* Energy */}
          <div style={{
            flex:1, background:"rgba(255,255,255,0.12)", borderRadius:20, padding:"16px 18px",
            border:"1px solid rgba(255,255,255,0.2)", backdropFilter:"blur(10px)",
          }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)", fontWeight:600, letterSpacing:0.5 }}>ENERGY BALANCE</div>
            <div style={{ fontSize:28, fontWeight:900, color:"#fff", marginTop:4, letterSpacing:"-0.5px" }}>
              {userData.energyBalance}<span style={{ fontSize:13, fontWeight:500, marginLeft:3 }}>kWh</span>
            </div>
            <div style={{ fontSize:11, color:"#4ade80", marginTop:4, fontWeight:600 }}>↑ +{userData.todayGenerated} today</div>
          </div>
          {/* Money */}
          <div style={{
            flex:1, background:"rgba(255,193,7,0.15)", borderRadius:20, padding:"16px 18px",
            border:"1px solid rgba(255,193,7,0.3)", backdropFilter:"blur(10px)",
          }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)", fontWeight:600, letterSpacing:0.5 }}>ENERGY VALUE</div>
            <div style={{ fontSize:28, fontWeight:900, color:"#fff", marginTop:4, letterSpacing:"-0.5px" }}>
              ₹{userData.moneyBalance.toLocaleString()}
            </div>
            <div style={{ fontSize:11, color:"#FFC107", marginTop:4, fontWeight:600 }}>
              ₹{userData.pricePerUnit}/unit now
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"20px 20px 0" }}>
        {/* Price ticker */}
        <div style={{
          background:"#fff", borderRadius:16, padding:"12px 16px",
          display:"flex", justifyContent:"space-between", alignItems:"center",
          boxShadow:"0 2px 12px rgba(0,0,0,0.06)", marginBottom:16,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ fontSize:18 }}>⚡</div>
            <div>
              <div style={{ fontSize:11, color:"#64748b", fontWeight:500 }}>Current Energy Price</div>
              <div style={{ fontSize:18, fontWeight:800, color:"#0066FF" }}>₹{userData.pricePerUnit}/kWh</div>
            </div>
          </div>
          <div style={{
            background:"#dcfce7", padding:"4px 10px", borderRadius:20,
            fontSize:12, fontWeight:700, color:"#16a34a",
          }}>▲ +2.4%</div>
        </div>

        {/* Quick actions */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#1e293b", marginBottom:12 }}>Quick Actions</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
            {[
              { icon:"📤", label:"Send", screen: SCREENS.SEND_ENERGY },
              { icon:"💱", label:"Convert", screen: SCREENS.MARKETPLACE },
              { icon:"📷", label:"Scan QR", screen: SCREENS.QR_SCAN },
              { icon:"🏦", label:"Bank", screen: SCREENS.ENERGY_BANK },
              { icon:"🏪", label:"Market", screen: SCREENS.MARKETPLACE },
              { icon:"📊", label:"Analytics", screen: SCREENS.ANALYTICS },
              { icon:"🕐", label:"History", screen: SCREENS.HISTORY },
            ].map(a => (
              <div key={a.label} className="tap" onClick={() => navigate(a.screen)} style={{
                background:"#fff", borderRadius:16, padding:"14px 8px", textAlign:"center",
                cursor:"pointer", boxShadow:"0 2px 10px rgba(0,0,0,0.05)",
                border:"1px solid #f1f5f9",
              }}>
                <div style={{ fontSize:22 }}>{a.icon}</div>
                <div style={{ fontSize:10, fontWeight:600, color:"#475569", marginTop:4 }}>{a.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Mini chart */}
        <div style={{ background:"#fff", borderRadius:20, padding:16, marginBottom:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#1e293b" }}>Weekly Generation</div>
            <span className="tap" onClick={() => navigate(SCREENS.ANALYTICS)} style={{ fontSize:12, color:"#0066FF", fontWeight:600, cursor:"pointer" }}>View all →</span>
          </div>
          <MiniBarChart data={weeklyData} />
        </div>

        {/* Recent tx */}
        <div style={{ background:"#fff", borderRadius:20, padding:16, marginBottom:90, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#1e293b" }}>Recent Activity</div>
            <span className="tap" onClick={() => navigate(SCREENS.HISTORY)} style={{ fontSize:12, color:"#0066FF", fontWeight:600, cursor:"pointer" }}>See all →</span>
          </div>
          {txHistory.slice(0,3).map(tx => <TxItem key={tx.id} tx={tx} />)}
        </div>
      </div>
      <BottomNav navigate={navigate} active={SCREENS.DASHBOARD} />
    </div>
  );
}

// ─── PROFILE SCREEN ───────────────────────────────────────────────
function ProfileScreen({ navigate, userData, signOut }) {
  return (
    <div style={{ width:"100%", height:"100%", background:"#f0f4ff", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{
        background:"linear-gradient(160deg,#001a4d 0%,#0052cc 100%)",
        padding:"44px 24px 32px", borderRadius:"0 0 32px 32px",
      }}>
        <StatusBar dark />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12 }}>
          <BackBtn onBack={() => navigate(SCREENS.DASHBOARD)} dark />
          <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>My Profile</div>
          <div style={{ width:40 }} />
        </div>

        {/* Avatar */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginTop:20, gap:10 }}>
          <div style={{ position:"relative" }}>
            <div style={{
              width:80, height:80, borderRadius:24, background:"linear-gradient(135deg,#FFC107,#FF8C00)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, fontWeight:800, color:"#fff",
              boxShadow:"0 8px 24px rgba(255,193,7,0.5)",
            }}>{userData.profileInitial}</div>
            <div style={{
              position:"absolute", bottom:-4, right:-4, width:24, height:24,
              borderRadius:8, background:"#22c55e", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12,
              border:"2px solid #fff",
            }}>✓</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:800, color:"#fff" }}>{userData.name}</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.65)", marginTop:2 }}>{userData.phone}</div>
            <div style={{
              display:"inline-flex", alignItems:"center", gap:4, marginTop:6,
              background:"rgba(34,197,94,0.2)", border:"1px solid rgba(34,197,94,0.4)",
              padding:"3px 10px", borderRadius:20,
            }}>
              <span style={{ fontSize:10 }}>✓</span>
              <span style={{ fontSize:11, color:"#4ade80", fontWeight:700 }}>KYC Verified</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"20px 20px 90px" }}>
        {/* Stats */}
        <div style={{ display:"flex", gap:12, marginBottom:20 }}>
          {[
            { label:"Energy Balance", value:`${userData.energyBalance} kWh`, color:"#0066FF" },
            { label:"Energy Value", value:`₹${userData.moneyBalance.toLocaleString()}`, color:"#f59e0b" },
          ].map(s => (
            <div key={s.label} style={{ flex:1, background:"#fff", borderRadius:16, padding:14, textAlign:"center", boxShadow:"0 2px 10px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize:11, color:"#64748b", fontWeight:500 }}>{s.label}</div>
              <div style={{ fontSize:18, fontWeight:800, color:s.color, marginTop:4 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Info card */}
        <div style={{ background:"#fff", borderRadius:20, padding:20, marginBottom:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#64748b", marginBottom:12, letterSpacing:0.5 }}>ACCOUNT INFO</div>
          {[
            { icon:"🪪", label:"Aadhaar", value:"••••  ••••  7823", verified:true },
            { icon:"📱", label:"Phone", value:userData.phone, verified:true },
            { icon:"📧", label:"Email", value:"arjun.m@gmail.com", verified:false },
            { icon:"🏙️", label:"Location", value:"Bengaluru, Karnataka", verified:false },
          ].map(f => (
            <div key={f.label} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:"1px solid #f1f5f9" }}>
              <span style={{ fontSize:20 }}>{f.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:"#94a3b8", fontWeight:500 }}>{f.label}</div>
                <div style={{ fontSize:14, fontWeight:600, color:"#1e293b" }}>{f.value}</div>
              </div>
              {f.verified && <div style={{ fontSize:11, color:"#16a34a", fontWeight:700, background:"#dcfce7", padding:"2px 8px", borderRadius:8 }}>✓</div>}
            </div>
          ))}
        </div>

        {/* Menu */}
        <div style={{ background:"#fff", borderRadius:20, padding:8, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
          {[
            { icon:"⚡", label:"Energy Sources", screen: SCREENS.ENERGY_SOURCES },
            { icon:"🔒", label:"Security & Privacy" },
            { icon:"🔔", label:"Notifications" },
            { icon:"❓", label:"Help & Support" },
            { icon:"🚪", label:"Sign Out", danger:true },
          ].map(item => (
            <div key={item.label} className="tap" onClick={() => item.danger ? signOut() : item.screen && navigate(item.screen)} style={{
              display:"flex", alignItems:"center", gap:12, padding:"14px 12px",
              borderRadius:12, cursor:"pointer",
            }}>
              <div style={{ width:38, height:38, borderRadius:12, background: item.danger ? "#fee2e2" : "#f0f4ff",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{item.icon}</div>
              <span style={{ flex:1, fontSize:14, fontWeight:600, color: item.danger ? "#ef4444" : "#1e293b" }}>{item.label}</span>
              <span style={{ color:"#94a3b8", fontSize:18 }}>›</span>
            </div>
          ))}
        </div>
      </div>
      <BottomNav navigate={navigate} active={SCREENS.PROFILE} />
    </div>
  );
}

// ─── ENERGY SOURCES ───────────────────────────────────────────────
function EnergySourcesScreen({ navigate, userData }) {
  return (
    <div style={{ width:"100%", height:"100%", background:"#f0f4ff", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ background:"linear-gradient(160deg,#001a4d,#0052cc)", padding:"44px 24px 24px", borderRadius:"0 0 32px 32px" }}>
        <StatusBar dark />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12 }}>
          <BackBtn onBack={() => navigate(SCREENS.PROFILE)} dark />
          <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>Energy Sources</div>
          <div style={{ width:40, height:40, borderRadius:12, background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, cursor:"pointer" }}>+</div>
        </div>
        <div style={{ marginTop:16, display:"flex", gap:16 }}>
          <Stat label="Total Sources" value="3" />
          <Stat label="Total Daily" value="22.6 kWh" />
          <Stat label="Monthly Est." value="₹4,653" />
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"20px 20px 20px" }}>
        {userData.sources.map((src, i) => (
          <div key={i} style={{ background:"#fff", borderRadius:20, padding:20, marginBottom:14, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                <div style={{ width:48, height:48, borderRadius:16, background: i===0?"#fff9e6":i===1?"#e6f0ff":"#e6ffe6",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>{src.icon}</div>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:"#1e293b" }}>{src.type}</div>
                  <div style={{ fontSize:12, color:"#64748b" }}>{src.units} units • {src.rate} kW/hr</div>
                </div>
              </div>
              <div style={{ background:"#dcfce7", padding:"3px 10px", borderRadius:12, fontSize:11, fontWeight:700, color:"#16a34a" }}>Active</div>
            </div>
            <div style={{ marginTop:14, display:"flex", gap:12 }}>
              <div style={{ flex:1, background:"#f8fafc", borderRadius:12, padding:"10px 12px" }}>
                <div style={{ fontSize:10, color:"#94a3b8", fontWeight:500 }}>Today's Output</div>
                <div style={{ fontSize:16, fontWeight:800, color:"#0066FF" }}>{src.daily} kWh</div>
              </div>
              <div style={{ flex:1, background:"#f8fafc", borderRadius:12, padding:"10px 12px" }}>
                <div style={{ fontSize:10, color:"#94a3b8", fontWeight:500 }}>Est. Earnings</div>
                <div style={{ fontSize:16, fontWeight:800, color:"#f59e0b" }}>₹{(src.daily*ENERGY_PRICE_PER_KWH).toFixed(0)}</div>
              </div>
            </div>
            {/* Mini bar */}
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:10, color:"#94a3b8", marginBottom:6 }}>Today's generation</div>
              <div style={{ background:"#f1f5f9", borderRadius:8, height:8, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${Math.min(100,src.daily/25*100)}%`, borderRadius:8,
                  background:"linear-gradient(90deg,#0066FF,#FFC107)", transition:"width 1s" }} />
              </div>
            </div>
          </div>
        ))}

        <div className="tap" style={{
          border:"2px dashed #cbd5e1", borderRadius:20, padding:20,
          display:"flex", flexDirection:"column", alignItems:"center", gap:8, cursor:"pointer",
        }}>
          <div style={{ width:48, height:48, borderRadius:16, background:"#f0f4ff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>+</div>
          <div style={{ fontSize:14, fontWeight:600, color:"#0066FF" }}>Add Energy Source</div>
          <div style={{ fontSize:12, color:"#94a3b8" }}>Solar, Wind, Hydro & more</div>
        </div>
      </div>
    </div>
  );
}

// ─── MARKETPLACE ──────────────────────────────────────────────────
function MarketplaceScreen({ navigate }) {
  const [tab, setTab] = useState("sell");
  return (
    <div style={{ width:"100%", height:"100%", background:"#f0f4ff", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ background:"linear-gradient(160deg,#001a4d,#0052cc)", padding:"44px 24px 24px", borderRadius:"0 0 32px 32px" }}>
        <StatusBar dark />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12 }}>
          <BackBtn onBack={() => navigate(SCREENS.DASHBOARD)} dark />
          <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>Energy Market</div>
          <div style={{ width:40 }} />
        </div>
        <div style={{ marginTop:16, background:"rgba(255,255,255,0.1)", borderRadius:16, padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)" }}>Live Price</div>
              <div style={{ fontSize:24, fontWeight:900, color:"#FFC107" }}>₹6.85/kWh</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)" }}>24h Change</div>
              <div style={{ fontSize:16, fontWeight:700, color:"#4ade80" }}>▲ +₹0.16</div>
            </div>
          </div>
          <MiniLineChart />
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"16px 20px 90px" }}>
        <div style={{ display:"flex", background:"#fff", borderRadius:14, padding:4, marginBottom:16, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
          {[["sell","Sell Energy"],["buy","Buy Energy"],["exchange","Exchange"]].map(([t,l]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex:1, padding:"9px 0", borderRadius:10, border:"none", cursor:"pointer",
              fontFamily:"inherit", fontSize:12, fontWeight:600, transition:"all 0.2s",
              background: tab===t ? "#0066FF" : "transparent",
              color: tab===t ? "#fff" : "#64748b",
            }}>{l}</button>
          ))}
        </div>

        {tab==="sell" && (
          <div className="slide-up" style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <EnergyInputCard title="You Sell" unit="kWh" value="10" color="#0066FF" />
            <div style={{ display:"flex", justifyContent:"center" }}><div style={{ fontSize:24 }}>↕️</div></div>
            <EnergyInputCard title="You Receive" unit="₹" value="68.50" color="#f59e0b" readOnly />
            <MarketOffer icon="⚡" name="Priya S." dist="1.2 km" rate="₹6.90" demand="Need: 15 kWh" />
            <MarketOffer icon="☀️" name="Ravi K." dist="2.8 km" rate="₹6.75" demand="Need: 8 kWh" />
            <MarketOffer icon="🏭" name="GreenGrid Co." dist="4.1 km" rate="₹6.85" demand="Need: 50 kWh" />
            <PrimaryBtn label="List Energy for Sale" />
          </div>
        )}
        {tab==="buy" && (
          <div className="slide-up" style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <EnergyInputCard title="You Pay" unit="₹" value="200" color="#f59e0b" />
            <div style={{ display:"flex", justifyContent:"center" }}><div style={{ fontSize:24 }}>↕️</div></div>
            <EnergyInputCard title="You Get" unit="kWh" value="29.2" color="#0066FF" readOnly />
            <PrimaryBtn label="Buy Energy Now" />
          </div>
        )}
        {tab==="exchange" && (
          <div className="slide-up" style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {[
              { icon:"🛒", name:"BigBasket Credits", rate:"1 kWh = ₹7.20", badge:"Best Rate" },
              { icon:"⛽", name:"BPCL Fuel Points", rate:"1 kWh = ₹7.10", badge:"Popular" },
              { icon:"✈️", name:"AirIndia Miles", rate:"1 kWh = 6.5 miles", badge:"" },
            ].map(e => (
              <div key={e.name} style={{ background:"#fff", borderRadius:16, padding:16, display:"flex", gap:12, alignItems:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ width:46, height:46, borderRadius:14, background:"#f0f4ff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>{e.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"#1e293b" }}>{e.name}</div>
                  <div style={{ fontSize:12, color:"#64748b" }}>{e.rate}</div>
                </div>
                {e.badge && <div style={{ background:"#dcfce7", padding:"2px 8px", borderRadius:8, fontSize:10, fontWeight:700, color:"#16a34a" }}>{e.badge}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav navigate={navigate} active={SCREENS.MARKETPLACE} />
    </div>
  );
}

// ─── QR SCAN ─────────────────────────────────────────────────────
function QRScanScreen({ navigate, userData, setScannedRecipient }) {
  const [mode, setMode] = useState("scan");
  const [cameraError, setCameraError] = useState("");
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);

  const stopCamera = () => {
    if (scanTimerRef.current) window.clearInterval(scanTimerRef.current);
    scanTimerRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  };

  const useScannedCode = rawValue => {
    const match = String(rawValue).trim().match(/^enerpay:\/\/pay\/(.+)$/i);
    const recipient = match ? match[1] : String(rawValue).trim();
    if (!recipient) return;
    stopCamera();
    setScannedRecipient(recipient);
    navigate(SCREENS.SEND_ENERGY);
  };

  const startCamera = async () => {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("This browser does not support camera access. Use a current mobile browser over HTTPS.");
      return;
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      if (!window.BarcodeDetector) {
        setCameraError("Camera is active. QR decoding needs Chrome or another browser that supports BarcodeDetector.");
        return;
      }
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      scanTimerRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes[0]?.rawValue) useScannedCode(codes[0].rawValue);
        } catch { /* Ignore a frame that cannot be decoded. */ }
      }, 350);
    } catch (error) {
      setCameraError(error.name === "NotAllowedError" ? "Camera permission was denied. Allow camera access and try again." : "Unable to start the device camera.");
      stopCamera();
    }
  };

  useEffect(() => {
    if (mode === "scan") startCamera();
    else stopCamera();
    return stopCamera;
  }, [mode]);

  return (
    <div style={{ width:"100%", height:"100%", background:"#0a0a1a", display:"flex", flexDirection:"column" }}>
      <StatusBar dark />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 24px" }}>
        <BackBtn onBack={() => { stopCamera(); navigate(SCREENS.DASHBOARD); }} dark />
        <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>QR Payment</div>
        <div style={{ width:40 }} />
      </div>

      <div style={{ display:"flex", background:"rgba(255,255,255,0.08)", borderRadius:14, padding:4, margin:"0 24px 16px" }}>
        {[["scan","📷 Scan"],["my_qr","🆔 My QR"]].map(([t,l]) => (
          <button key={t} onClick={() => setMode(t)} style={{
            flex:1, padding:"9px 0", borderRadius:10, border:"none", cursor:"pointer",
            fontFamily:"inherit", fontSize:13, fontWeight:600, transition:"all 0.2s",
            background: mode===t ? "#0066FF" : "transparent",
            color: "#fff",
          }}>{l}</button>
        ))}
      </div>

      {mode==="scan" ? (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ position:"relative", width:260, height:260, overflow:"hidden", borderRadius:24, background:"#111827" }}>
            <video ref={videoRef} muted playsInline style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            {/* Scanner frame */}
            <div style={{ position:"absolute", inset:0, border:"2px solid rgba(255,255,255,0.1)", borderRadius:24 }} />
            {["0%,0%","auto,0%","0%,auto","auto,auto"].map((pos,i) => {
              const [r,b] = pos.split(",");
              return (
                <div key={i} style={{
                  position:"absolute", right:r, bottom:b, left:r==="0%"?0:"auto", top:b==="0%"?0:"auto",
                  width:32, height:32,
                  borderTop: b==="0%" ? "3px solid #0066FF" : "none",
                  borderBottom: b!=="0%" ? "3px solid #0066FF" : "none",
                  borderLeft: r==="0%" ? "3px solid #0066FF" : "none",
                  borderRight: r!=="0%" ? "3px solid #0066FF" : "none",
                  borderRadius: b==="0%"&&r==="0%"?"8px 0 0 0":b==="0%"&&r!=="0%"?"0 8px 0 0":b!=="0%"&&r==="0%"?"0 0 0 8px":"0 0 8px 0",
                }} />
              );
            })}
            {/* Scan line */}
            <div style={{
              position:"absolute", left:10, right:10, height:2, top:"50%",
              background:"linear-gradient(90deg,transparent,#0066FF,transparent)",
              animation:"scanLine 2s ease-in-out infinite",
            }} />
            <style>{`@keyframes scanLine { 0%,100%{top:10%} 50%{top:85%} }`}</style>
          </div>
          <div style={{ marginTop:20, textAlign:"center" }}>
            <div style={{ fontSize:14, color:"rgba(255,255,255,0.7)" }}>{scanning ? "Point camera at QR code" : "Starting camera…"}</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:4 }}>Supports EnerPay QR payment codes</div>
          </div>
          {cameraError && <div style={{ marginTop:12, textAlign:"center", color:"#fbbf24", fontSize:12, lineHeight:1.4 }}>{cameraError}</div>}
          <button onClick={startCamera} style={{ marginTop:16, border:"1px solid rgba(255,255,255,0.35)", borderRadius:10, background:"transparent", color:"#fff", padding:"8px 14px", fontFamily:"inherit", cursor:"pointer" }}>Restart camera</button>
          <div style={{ marginTop:32, display:"flex", gap:12 }}>
            <SecondaryBtn label="Enter UPI ID" />
            <SecondaryBtn label="Phone No." />
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{
            background:"#fff", borderRadius:24, padding:20,
            boxShadow:"0 20px 60px rgba(0,102,255,0.3)",
          }}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=svg&data=${encodeURIComponent(userData?.qrPayload || "")}`}
              alt={`EnerPay QR code for ${userData?.paymentId || "your account"}`}
              width="200"
              height="200"
              style={{ display:"block" }}
            />
          </div>
          <div style={{ marginTop:16, textAlign:"center" }}>
            <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>{userData?.name}</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", marginTop:2 }}>{userData?.paymentId} · scan to pay</div>
          </div>
          <div style={{ marginTop:20, display:"flex", gap:12 }}>
            <SecondaryBtn label="Share QR" />
            <SecondaryBtn label="Save QR" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SEND ENERGY ──────────────────────────────────────────────────
function SendEnergyScreen({ navigate, api, refresh, scannedRecipient, setScannedRecipient }) {
  const [sendType, setSendType] = useState("energy");
  const [amount, setAmount] = useState("10");
  const [recipient, setRecipient] = useState(""); const [note, setNote] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (scannedRecipient) {
      setRecipient(scannedRecipient);
      setScannedRecipient("");
    }
  }, [scannedRecipient, setScannedRecipient]);
  const pay = async () => { setError(""); setBusy(true); try { await api("/payments", { method:"POST", body:JSON.stringify({ recipient, kind:sendType, amount, note }) }); await refresh(); navigate(SCREENS.HISTORY); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  return (
    <div style={{ width:"100%", height:"100%", background:"#f0f4ff", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ background:"linear-gradient(160deg,#001a4d,#0052cc)", padding:"44px 24px 24px", borderRadius:"0 0 32px 32px" }}>
        <StatusBar dark />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12 }}>
          <BackBtn onBack={() => navigate(SCREENS.DASHBOARD)} dark />
          <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>Send</div>
          <div style={{ width:40 }} />
        </div>
        <div style={{ marginTop:16, display:"flex", background:"rgba(255,255,255,0.1)", borderRadius:14, padding:4 }}>
          {[["energy","⚡ Energy"],["money","₹ Money"]].map(([t,l]) => (
            <button key={t} onClick={() => setSendType(t)} style={{
              flex:1, padding:"9px 0", borderRadius:10, border:"none", cursor:"pointer",
              fontFamily:"inherit", fontSize:13, fontWeight:700, transition:"all 0.2s",
              background: sendType===t ? "#fff" : "transparent",
              color: sendType===t ? "#0066FF" : "rgba(255,255,255,0.7)",
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"20px 20px" }}>
        {/* Contacts */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#64748b", marginBottom:10 }}>RECENT</div>
          <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:4 }}>
            {["ep@priyasharma","ep@rahulkumar","ep@meerajoshi","ep@sureshpatel"].map((name,i) => (
              <div key={name} onClick={() => setRecipient(name)} className="tap" style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, minWidth:56 }}>
                <div style={{
                  width:52, height:52, borderRadius:16, fontSize:16, fontWeight:800, color:"#fff",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background: ["#0066FF","#22c55e","#f59e0b","#8b5cf6"][i],
                }}>{name.slice(3,5).toUpperCase()}</div>
                <div style={{ fontSize:10, color:"#475569", fontWeight:600 }}>{name.slice(3,8)}</div>
              </div>
            ))}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, minWidth:56 }}>
              <div style={{ width:52, height:52, borderRadius:16, background:"#e2e8f0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>+</div>
              <div style={{ fontSize:10, color:"#475569", fontWeight:600 }}>New</div>
            </div>
          </div>
        </div>

        {/* Recipient */}
        <div style={{ background:"#fff", borderRadius:20, padding:16, marginBottom:12, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:13, fontWeight:600, color:"#64748b", marginBottom:8 }}>Recipient</div>
          <div style={{ display:"flex", gap:8 }}>
            <input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="EnerPay ID or phone" style={{
              flex:1, padding:"12px 14px", borderRadius:12, border:"1.5px solid #e2e8f0",
              fontSize:14, fontWeight:600, color:"#1e293b", outline:"none", fontFamily:"inherit",
            }} />
            <div className="tap" onClick={() => navigate(SCREENS.QR_SCAN)} style={{
              width:46, height:46, borderRadius:12, background:"#0066FF",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, cursor:"pointer",
            }}>📷</div>
          </div>
        </div>

        {/* Amount */}
        <div style={{ background:"#fff", borderRadius:20, padding:16, marginBottom:12, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:13, fontWeight:600, color:"#64748b", marginBottom:8 }}>
            Amount ({sendType==="energy" ? "kWh" : "₹"})
          </div>
          <div style={{ position:"relative" }}>
            <div style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:22, fontWeight:900, color:"#0066FF" }}>
              {sendType==="energy" ? "⚡" : "₹"}
            </div>
            <input value={amount} onChange={e=>setAmount(e.target.value)} style={{
              width:"100%", padding:"14px 14px 14px 48px", borderRadius:14,
              border:"2px solid #0066FF", fontSize:28, fontWeight:900, color:"#1e293b",
              outline:"none", fontFamily:"inherit",
            }} />
          </div>
          {sendType==="energy" && (
            <div style={{ fontSize:12, color:"#64748b", marginTop:6 }}>
              Value: ₹{(Math.max(0, Number(amount) || 0) * ENERGY_PRICE_PER_KWH).toFixed(2)} at ₹{ENERGY_PRICE_PER_KWH}/kWh — your money balance will not be debited
            </div>
          )}
          <div style={{ display:"flex", gap:8, marginTop:10 }}>
            {["5","10","20","50"].map(v => (
              <button key={v} onClick={() => setAmount(v)} style={{
                flex:1, padding:"7px 0", borderRadius:10, border:"1.5px solid",
                borderColor: amount===v ? "#0066FF" : "#e2e8f0",
                background: amount===v ? "#f0f4ff" : "#fff",
                color: amount===v ? "#0066FF" : "#64748b",
                fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit",
              }}>{v}</button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div style={{ background:"#fff", borderRadius:16, padding:14, marginBottom:20, boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
          <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note (optional)" style={{
            width:"100%", border:"none", fontSize:13, color:"#475569", outline:"none", fontFamily:"inherit",
          }} />
        </div>

        {error && <div style={{ color:"#dc2626", fontSize:12, marginBottom:10 }}>{error}</div>}
        <PrimaryBtn label={busy ? "Processing…" : `Send ${sendType==="energy" ? `${amount} kWh ⚡` : `₹${amount}`}`} onClick={pay} />
        <div style={{ textAlign:"center", marginTop:10, fontSize:12, color:"#94a3b8" }}>
          Transaction PIN will be required to confirm
        </div>
      </div>
    </div>
  );
}

// ─── ENERGY BANK ─────────────────────────────────────────────────
function EnergyBankScreen({ navigate }) {
  return (
    <div style={{ width:"100%", height:"100%", background:"#f0f4ff", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ background:"linear-gradient(160deg,#001a4d,#0052cc)", padding:"44px 24px 28px", borderRadius:"0 0 32px 32px" }}>
        <StatusBar dark />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12 }}>
          <BackBtn onBack={() => navigate(SCREENS.DASHBOARD)} dark />
          <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>Energy Bank</div>
          <div style={{ width:40 }} />
        </div>
        {/* Bank card */}
        <div style={{
          marginTop:20, background:"linear-gradient(135deg,rgba(255,193,7,0.2),rgba(0,102,255,0.3))",
          borderRadius:20, padding:20, border:"1px solid rgba(255,255,255,0.15)",
          backdropFilter:"blur(10px)",
        }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)", letterSpacing:1 }}>ENERGY SAVINGS ACCOUNT</div>
          <div style={{ fontSize:36, fontWeight:900, color:"#fff", marginTop:6 }}>
            84.2 <span style={{ fontSize:16, fontWeight:500 }}>kWh</span>
          </div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.65)", marginTop:2 }}>≈ ₹576.77 current value</div>
          <div style={{ marginTop:16, display:"flex", gap:8 }}>
            <div style={{ flex:1, display:"flex", gap:6, alignItems:"center" }}>
              <div style={{ width:8, height:8, borderRadius:4, background:"#4ade80" }} />
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.7)" }}>Earns 1.5% monthly</span>
            </div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)" }}>UEI-BANK-7823</div>
          </div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"20px 20px 90px" }}>
        {/* Actions */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
          {[
            { icon:"⬇️", label:"Deposit Energy", sub:"Store excess kWh", color:"#0066FF" },
            { icon:"⬆️", label:"Withdraw Energy", sub:"Get your kWh back", color:"#22c55e" },
            { icon:"💱", label:"Convert to ₹", sub:"Cash out your energy", color:"#f59e0b" },
            { icon:"📈", label:"Auto-Invest", sub:"Earn energy rewards", color:"#8b5cf6" },
          ].map(a => (
            <div key={a.label} className="tap" style={{
              background:"#fff", borderRadius:18, padding:16, cursor:"pointer",
              boxShadow:"0 2px 12px rgba(0,0,0,0.06)",
            }}>
              <div style={{ fontSize:28, marginBottom:8 }}>{a.icon}</div>
              <div style={{ fontSize:13, fontWeight:700, color:"#1e293b" }}>{a.label}</div>
              <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{a.sub}</div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={{ background:"#fff", borderRadius:20, padding:16, marginBottom:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#1e293b", marginBottom:12 }}>Bank Statistics</div>
          {[
            { label:"Total Deposited", value:"320.4 kWh", color:"#0066FF" },
            { label:"Total Withdrawn", value:"236.2 kWh", color:"#ef4444" },
            { label:"Interest Earned", value:"1.8 kWh", color:"#22c55e" },
            { label:"Current Balance", value:"84.2 kWh", color:"#f59e0b" },
          ].map(s => (
            <div key={s.label} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #f1f5f9" }}>
              <span style={{ fontSize:13, color:"#475569" }}>{s.label}</span>
              <span style={{ fontSize:13, fontWeight:700, color:s.color }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Rates */}
        <div style={{ background:"linear-gradient(135deg,#f0f4ff,#fff)", borderRadius:20, padding:16, border:"1px solid #e0e7ff" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#0066FF", marginBottom:8 }}>🏦 Bank Benefits</div>
          {["Earn 1.5% energy interest/month","Instant withdrawal anytime","Auto-convert at peak price","Fraud protection guaranteed"].map(b => (
            <div key={b} style={{ fontSize:12, color:"#475569", padding:"4px 0" }}>✓ {b}</div>
          ))}
        </div>
      </div>
      <BottomNav navigate={navigate} active={SCREENS.ENERGY_BANK} />
    </div>
  );
}

// ─── ANALYTICS ────────────────────────────────────────────────────
function AnalyticsScreen({ navigate, weeklyData, priceData }) {
  const [period, setPeriod] = useState("weekly");
  const [dailyInterval, setDailyInterval] = useState(4);
  const rawHourlyData = Array.from({ length:24 }, (_, hour) => Math.round((6 + Math.sin(hour / 3) * 5 + (hour > 7 && hour < 18 ? 8 : 0)) * 10) / 10);
  const dailyData = Array.from({ length:24 / dailyInterval }, (_, index) => {
    const start = index * dailyInterval;
    const gen = rawHourlyData.slice(start, start + dailyInterval).reduce((sum, value) => sum + value, 0);
    return { day:`${String(start).padStart(2,"0")}:00–${String(start + dailyInterval).padStart(2,"0")}:00`, gen:Math.round(gen * 10) / 10 };
  });
  const monthlyData = ["Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"].map((day, i) => ({ day, gen:Math.round((340 + Math.sin(i / 2) * 90) * 10) / 10 }));
  const chartData = period === "daily" ? dailyData : period === "weekly" ? weeklyData : monthlyData;
  const maxGen = Math.max(...chartData.map(d=>d.gen));
  return (
    <div style={{ width:"100%", height:"100%", background:"#f0f4ff", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ background:"linear-gradient(160deg,#001a4d,#0052cc)", padding:"44px 24px 24px", borderRadius:"0 0 32px 32px" }}>
        <StatusBar dark />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12 }}>
          <BackBtn onBack={() => navigate(SCREENS.DASHBOARD)} dark />
          <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>Analytics</div>
          <div style={{ width:40 }} />
        </div>
        <div style={{ marginTop:16, display:"flex", gap:10 }}>
          <Stat label="This Week" value="124.8 kWh" />
          <Stat label="Earnings" value="₹854.88" />
          <Stat label="Efficiency" value="96.4%" />
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"20px 20px 90px" }}>
        {/* Period selector */}
        <div style={{ display:"flex", background:"#fff", borderRadius:14, padding:4, marginBottom:16, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
          {[["daily","Daily"],["weekly","Weekly"],["monthly","Monthly"]].map(([t,l]) => (
            <button key={t} onClick={() => setPeriod(t)} style={{
              flex:1, padding:"8px 0", borderRadius:10, border:"none", cursor:"pointer",
              fontFamily:"inherit", fontSize:12, fontWeight:600, transition:"all 0.2s",
              background: period===t ? "#0066FF" : "transparent",
              color: period===t ? "#fff" : "#64748b",
            }}>{l}</button>
          ))}
        </div>

        {period === "daily" && <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
          <span style={{ fontSize:12, color:"#64748b", fontWeight:700 }}>TIME BLOCK</span>
          {[1,2,3,4].map(hours => <button key={hours} onClick={() => setDailyInterval(hours)} style={{ flex:1, padding:"8px 0", borderRadius:10, border:"1px solid #e2e8f0", background:dailyInterval===hours ? "#e0ecff" : "#fff", color:dailyInterval===hours ? "#0066FF" : "#64748b", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>{hours}h</button>)}
        </div>}

        {/* Bar chart - Generation */}
        <div style={{ background:"#fff", borderRadius:20, padding:16, marginBottom:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#1e293b", marginBottom:16 }}>Energy Generation (kWh){period === "daily" ? ` · ${dailyInterval}-hour blocks` : ""}</div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:120 }}>
            {chartData.map((d,i) => (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{ fontSize:9, color:"#0066FF", fontWeight:700 }}>{d.gen}</div>
                <div style={{ width:"100%", borderRadius:"4px 4px 0 0", height:`${(d.gen/maxGen)*90}px`,
                  background:`linear-gradient(180deg,#0066FF,#003399)`,
                  opacity: i===chartData.length-1 ? 1 : 0.7,
                  transition:"height 0.5s",
                }} />
                <div style={{ fontSize:9, color:"#94a3b8", fontWeight:600 }}>{d.day}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Line chart - Price */}
        <div style={{ background:"#fff", borderRadius:20, padding:16, marginBottom:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#1e293b", marginBottom:4 }}>Energy Price (₹/kWh)</div>
          <div style={{ fontSize:12, color:"#64748b", marginBottom:12 }}>Current: ₹6.85 · Peak: ₹7.10</div>
          <svg width="100%" height="80" viewBox="0 0 300 80">
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFC107" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#FFC107" stopOpacity="0"/>
              </linearGradient>
            </defs>
            {(() => {
              const mn=Math.min(...priceData), mx=Math.max(...priceData);
              const pts=priceData.map((v,i)=>`${i*(300/8)},${70-((v-mn)/(mx-mn))*60}`).join(" L ");
              const area=`M 0,70 L ${pts} L ${(priceData.length-1)*(300/8)},70 Z`;
              return <>
                <path d={`M ${pts}`} fill="none" stroke="#FFC107" strokeWidth="2.5" strokeLinecap="round"/>
                <path d={area} fill="url(#priceGrad)"/>
                {priceData.map((v,i)=>(<circle key={i} cx={i*(300/8)} cy={70-((v-mn)/(mx-mn))*60} r="3" fill="#FFC107"/>))}
              </>;
            })()}
          </svg>
        </div>

        {/* Earnings breakdown */}
        <div style={{ background:"#fff", borderRadius:20, padding:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#1e293b", marginBottom:12 }}>Earnings Breakdown</div>
          {[{ label:"Solar Generation", value:"₹854.88", pct:100, color:"#FFC107" }].map(e => (
            <div key={e.label} style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:12, color:"#475569", fontWeight:500 }}>{e.label}</span>
                <span style={{ fontSize:12, fontWeight:700, color:"#1e293b" }}>{e.value}</span>
              </div>
              <div style={{ background:"#f1f5f9", borderRadius:6, height:6, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${e.pct}%`, borderRadius:6, background:e.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav navigate={navigate} active={SCREENS.ANALYTICS} />
    </div>
  );
}

// ─── HISTORY ──────────────────────────────────────────────────────
function HistoryScreen({ navigate, txHistory }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter==="all" ? txHistory :
    filter==="energy" ? txHistory.filter(t=>t.type.includes("energy")) :
    txHistory.filter(t=>t.type.includes("money"));

  return (
    <div style={{ width:"100%", height:"100%", background:"#f0f4ff", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ background:"linear-gradient(160deg,#001a4d,#0052cc)", padding:"44px 24px 24px", borderRadius:"0 0 32px 32px" }}>
        <StatusBar dark />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12 }}>
          <BackBtn onBack={() => navigate(SCREENS.DASHBOARD)} dark />
          <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>Transaction History</div>
          <div style={{ width:40 }} />
        </div>
        <div style={{ marginTop:16, display:"flex", gap:10 }}>
          <Stat label="Total Credited" value="₹1,240" />
          <Stat label="Total Debited" value="₹342" />
          <Stat label="Net" value="+₹898" />
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"16px 20px 90px" }}>
        {/* Filter */}
        <div style={{ display:"flex", background:"#fff", borderRadius:14, padding:4, marginBottom:16, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
          {[["all","All"],["energy","⚡ Energy"],["money","₹ Money"]].map(([t,l]) => (
            <button key={t} onClick={() => setFilter(t)} style={{
              flex:1, padding:"8px 0", borderRadius:10, border:"none", cursor:"pointer",
              fontFamily:"inherit", fontSize:12, fontWeight:600, transition:"all 0.2s",
              background: filter===t ? "#0066FF" : "transparent",
              color: filter===t ? "#fff" : "#64748b",
            }}>{l}</button>
          ))}
        </div>

        {filtered.map(tx => (
          <div key={tx.id} style={{ background:"#fff", borderRadius:16, padding:14, marginBottom:10,
            display:"flex", alignItems:"center", gap:12, boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ width:44, height:44, borderRadius:14, background:`${tx.color}18`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
              {tx.type.includes("energy") ? "⚡" : "₹"}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#1e293b" }}>{tx.desc}</div>
              <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{tx.time}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              {tx.amount && <div style={{ fontSize:14, fontWeight:800, color:tx.color }}>{tx.amount}</div>}
              {tx.money && <div style={{ fontSize:14, fontWeight:800, color:tx.color }}>{tx.money}</div>}
            </div>
          </div>
        ))}
      </div>
      <BottomNav navigate={navigate} active={SCREENS.HISTORY} />
    </div>
  );
}

// ─── SMALL UTILITY COMPONENTS ─────────────────────────────────────
function InputField({ icon, label, placeholder, type="text", value, onChange }) {
  return (
    <div>
      <div style={{ fontSize:12, fontWeight:600, color:"#64748b", marginBottom:6 }}>{label}</div>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"13px 14px",
        borderRadius:14, border:"1.5px solid #e2e8f0", background:"#f8fafc" }}>
        <span style={{ fontSize:18 }}>{icon}</span>
        <input placeholder={placeholder} type={type} value={value} onChange={e => onChange?.(e.target.value)} style={{
          flex:1, border:"none", background:"transparent", fontSize:14,
          color:"#1e293b", outline:"none", fontFamily:"inherit",
        }} />
      </div>
    </div>
  );
}

function PrimaryBtn({ label, onClick }) {
  return (
    <button className="tap" onClick={onClick} style={{
      width:"100%", padding:"16px 0", borderRadius:16,
      background:"linear-gradient(135deg,#0066FF,#003399)",
      border:"none", color:"#fff", fontSize:15, fontWeight:700,
      cursor:"pointer", fontFamily:"inherit",
      boxShadow:"0 8px 24px rgba(0,102,255,0.35)",
    }}>{label}</button>
  );
}

function SecondaryBtn({ label, onClick }) {
  return (
    <button className="tap" onClick={onClick} style={{
      padding:"12px 20px", borderRadius:12,
      background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.2)",
      color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
    }}>{label}</button>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ flex:1, background:"rgba(255,255,255,0.1)", borderRadius:14, padding:"10px 12px", backdropFilter:"blur(8px)" }}>
      <div style={{ fontSize:10, color:"rgba(255,255,255,0.65)", fontWeight:500 }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:800, color:"#fff", marginTop:2 }}>{value}</div>
    </div>
  );
}

function TxItem({ tx }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:"1px solid #f1f5f9" }}>
      <div style={{ width:38, height:38, borderRadius:12, background:`${tx.color}15`,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
        {tx.type.includes("energy") ? "⚡" : "₹"}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:600, color:"#1e293b" }}>{tx.desc}</div>
        <div style={{ fontSize:11, color:"#94a3b8" }}>{tx.time}</div>
      </div>
      <div style={{ fontSize:13, fontWeight:800, color:tx.color }}>
        {tx.amount || tx.money}
      </div>
    </div>
  );
}

function MiniBarChart({ data }) {
  const max = Math.max(...data.map(d=>d.gen));
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:80 }}>
      {data.map((d,i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <div style={{ width:"100%", borderRadius:"4px 4px 0 0",
            height:`${(d.gen/max)*70}px`,
            background: i===data.length-1 ? "linear-gradient(180deg,#FFC107,#ff8c00)" : "linear-gradient(180deg,#0066FF,#003399)",
            opacity: i===data.length-1 ? 1 : 0.6,
          }} />
          <div style={{ fontSize:9, color:"#94a3b8" }}>{d.day}</div>
        </div>
      ))}
    </div>
  );
}

function MiniLineChart() {
  const pts = [6.20,6.45,6.30,6.80,6.95,6.85,7.10,6.90,6.85];
  const mn=Math.min(...pts), mx=Math.max(...pts);
  const path = pts.map((v,i)=>`${i===0?"M":"L"} ${i*(260/8)},${40-((v-mn)/(mx-mn))*30}`).join(" ");
  return (
    <svg width="100%" height="44" viewBox="0 0 260 44" style={{ marginTop:8 }}>
      <path d={path} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round"/>
      {pts.map((v,i)=><circle key={i} cx={i*(260/8)} cy={40-((v-mn)/(mx-mn))*30} r="2.5" fill="#FFC107"/>)}
    </svg>
  );
}

function EnergyInputCard({ title, unit, value, color, readOnly }) {
  return (
    <div style={{ background:"#fff", borderRadius:18, padding:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize:12, color:"#64748b", fontWeight:600, marginBottom:8 }}>{title}</div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:`${color}15`,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800, color }}>
          {unit==="kWh" ? "⚡" : "₹"}
        </div>
        <div>
          <div style={{ fontSize:28, fontWeight:900, color:"#1e293b" }}>{value}</div>
          <div style={{ fontSize:11, color:"#94a3b8" }}>{unit}</div>
        </div>
      </div>
    </div>
  );
}

function MarketOffer({ icon, name, dist, rate, demand }) {
  return (
    <div style={{ background:"#fff", borderRadius:16, padding:"12px 14px", display:"flex", alignItems:"center", gap:10, boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
      <div style={{ width:40, height:40, borderRadius:12, background:"#f0f4ff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{icon}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#1e293b" }}>{name}</div>
        <div style={{ fontSize:11, color:"#64748b" }}>{dist} · {demand}</div>
      </div>
      <div>
        <div style={{ fontSize:13, fontWeight:800, color:"#0066FF" }}>{rate}</div>
        <button style={{ fontSize:11, padding:"4px 10px", borderRadius:8, background:"#0066FF", border:"none", color:"#fff", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Sell</button>
      </div>
    </div>
  );
}
