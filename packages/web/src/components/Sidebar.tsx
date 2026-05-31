import { NavLink, Link } from "react-router-dom";
import { LayoutDashboard, Activity, Database, Settings } from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard, end: true },
  { to: "/activity",  label: "Activity",  Icon: Activity,         end: false },
  { to: "/sources",   label: "Sources",   Icon: Database,         end: false },
  { to: "/settings",  label: "Settings",  Icon: Settings,         end: false },
];

function LogoMark() {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 11,
        background: "linear-gradient(135deg, rgba(124,109,255,0.22) 0%, rgba(255,84,112,0.13) 100%)",
        border: "1px solid rgba(124,109,255,0.28)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0 24px rgba(124,109,255,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
        flexShrink: 0,
      }}
    >
      <img src="/logo.png" alt="Blast Radius" style={{ width: 22, height: 22, objectFit: "contain" }} />
    </div>
  );
}

export function Sidebar() {
  return (
    <aside
      style={{
        position: "sticky",
        top: 0,
        height: "100vh",
        width: "240px",
        background: "linear-gradient(180deg, rgba(11,11,20,0.98) 0%, rgba(8,8,14,0.99) 100%)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
        backdropFilter: "blur(24px)",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ padding: "26px 20px 22px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
          <LogoMark />
          <div>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#f0f0fa", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              Blast Radius
            </div>
            <div style={{ fontSize: "0.68rem", color: "#4a4a7a", letterSpacing: "0.07em", textTransform: "uppercase", marginTop: 2 }}>
              Incident Analyst
            </div>
          </div>
        </Link>
      </div>

      {/* Section label */}
      <div style={{ padding: "16px 20px 8px", fontSize: "0.65rem", fontWeight: 700, color: "#2a2a4a", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Navigation
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0 12px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
        {navItems.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: 9,
              fontSize: "0.875rem",
              fontWeight: isActive ? 600 : 500,
              textDecoration: "none",
              transition: "all 0.15s ease",
              background: isActive
                ? "linear-gradient(135deg, rgba(124,109,255,0.16) 0%, rgba(124,109,255,0.08) 100%)"
                : "transparent",
              color: isActive ? "#b0a8ff" : "#5a5a8a",
              border: isActive ? "1px solid rgba(124,109,255,0.22)" : "1px solid transparent",
              boxShadow: isActive ? "0 2px 12px rgba(124,109,255,0.12), inset 0 1px 0 rgba(255,255,255,0.05)" : "none",
              position: "relative" as const,
            })}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 3,
                      height: "60%",
                      background: "#7c6dff",
                      borderRadius: "0 3px 3px 0",
                      boxShadow: "0 0 8px rgba(124,109,255,0.6)",
                    }}
                  />
                )}
                <Icon
                  size={16}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  style={{ marginLeft: isActive ? 4 : 0, flexShrink: 0 }}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "0 20px" }} />

      {/* Footer status */}
      <div style={{ padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#2ecc8a",
              boxShadow: "0 0 8px rgba(46,204,138,0.6)",
              flexShrink: 0,
            }}
            className="animate-pulse-dot"
          />
          <span style={{ fontSize: "0.7rem", color: "#3a5a4a", letterSpacing: "0.05em", fontWeight: 700 }}>
            CORAL CONNECTED
          </span>
        </div>
        <div style={{ fontSize: "0.67rem", color: "#2a2a4a", paddingLeft: 15 }}>
          All 3 sources online
        </div>
      </div>
    </aside>
  );
}
