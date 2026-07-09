import { Card } from "../../components/ui";

export function DepartmentSettingsPage() {
  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ marginBottom: 24 }}>Settings</h1>
      
      <Card className="premium-card" style={{ padding: 32, marginBottom: 24 }}>
        <h3 style={{ marginTop: 0, marginBottom: 24 }}>Preferences & Delegation</h3>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ fontWeight: 600, color: "var(--green-900)", marginBottom: 4 }}>Daily Email Digest</div>
            <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Receive a summary of new submissions every morning</div>
          </div>
          <label style={{ position: "relative", display: "inline-block", width: 48, height: 26, flex: "none" }}>
            <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
            <span style={{ position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0, transition: ".3s", borderRadius: 26 }} className="toggle-slider"></span>
            <style>{`
              input:checked + .toggle-slider { background-color: var(--green-900); }
              input:not(:checked) + .toggle-slider { background-color: #c2cbb8; border: 1.5px solid var(--muted-2); box-sizing: border-box; }
              .toggle-slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px; background-color: white; transition: .3s cubic-bezier(0.4, 0.0, 0.2, 1); border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
              input:not(:checked) + .toggle-slider:before { bottom: 1.5px; left: 1.5px; box-shadow: 0 1px 2px rgba(0,0,0,0.2); }
              input:checked + .toggle-slider:before { transform: translateX(22px); }
            `}</style>
          </label>
        </div>

        <div style={{ paddingTop: 24, borderTop: "1px solid rgba(0,0,0,0.1)" }}>
          <label style={{ display: "block", fontWeight: 600, color: "var(--green-900)", marginBottom: 8 }}>Delegate Supervisor</label>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 12 }}>
            Select another faculty member to review submissions while you are away.
          </p>
          <select style={{ 
            width: "100%", 
            maxWidth: 320, 
            padding: "12px 16px", 
            borderRadius: 8, 
            border: "2px solid var(--line)", 
            background: "#fff", 
            color: "var(--green-900)", 
            fontSize: "1rem",
            fontWeight: 500,
            boxShadow: "0 2px 4px rgba(0,0,0,0.04)", 
            cursor: "pointer", 
            appearance: "auto",
            outline: "none"
          }}>
            <option value="">None (I will review my own queue)</option>
            <option value="user_2">Prof. Yaw Asare</option>
            <option value="user_3">Dr. Amina Mensah</option>
            <option value="user_4">Mr. Kwesi Osei</option>
          </select>
        </div>
      </Card>

      <Card className="premium-card" style={{ padding: 32 }}>
        <h3 style={{ marginTop: 0 }}>Needs Attention Rules</h3>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
          Configure when a student should be flagged in your "Needs attention" view.
        </p>
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: "0.9rem" }}>Hours behind threshold (%)</label>
            <input type="number" defaultValue={20} style={{ padding: 8, width: 100, borderRadius: 4, border: "1px solid var(--border)", background: "rgba(255,255,255,0.05)", color: "inherit" }} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: "0.9rem" }}>Weeks remaining threshold</label>
            <input type="number" defaultValue={4} style={{ padding: 8, width: 100, borderRadius: 4, border: "1px solid var(--border)", background: "rgba(255,255,255,0.05)", color: "inherit" }} />
          </div>
        </div>
      </Card>
    </div>
  );
}
