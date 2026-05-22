import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "pomodoro_history";

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const { date, sessions } = JSON.parse(raw);
    if (date === getTodayKey()) return sessions;
    return [];
  } catch {
    return [];
  }
}

function saveHistory(sessions) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ date: getTodayKey(), sessions })
  );
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatClock(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function playDing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  } catch {}
}

export default function PomodoroTimer() {
  const [focusMins, setFocusMins] = useState(25);
  const [breakMins, setBreakMins] = useState(5);
  const [phase, setPhase] = useState("focus"); // "focus" | "break"
  const [status, setStatus] = useState("idle"); // "idle" | "running" | "paused"
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [history, setHistory] = useState(loadHistory);
  const [completedFlash, setCompletedFlash] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const intervalRef = useRef(null);
  const sessionStartRef = useRef(null);

  const totalSeconds = (phase === "focus" ? focusMins : breakMins) * 60;
  const progress = 1 - secondsLeft / totalSeconds;

  useEffect(() => {
    if (status !== "running") return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          handleCycleEnd();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [status, phase]);

  const handleCycleEnd = useCallback(() => {
    playDing();
    setCompletedFlash(true);
    setTimeout(() => setCompletedFlash(false), 1200);

    if (phase === "focus") {
      const session = {
        id: Date.now(),
        duration: formatTime(focusMins * 60),
        completedAt: formatClock(new Date()),
        focusMins,
      };
      setHistory((prev) => {
        const updated = [session, ...prev];
        saveHistory(updated);
        return updated;
      });
      setPhase("break");
      setSecondsLeft(breakMins * 60);
    } else {
      setPhase("focus");
      setSecondsLeft(focusMins * 60);
    }
    setStatus("idle");
  }, [phase, focusMins, breakMins]);

  function handleStart() {
    if (status === "idle") {
      sessionStartRef.current = Date.now();
    }
    setStatus("running");
  }

  function handlePause() {
    setStatus("paused");
  }

  function handleReset() {
    clearInterval(intervalRef.current);
    setStatus("idle");
    setPhase("focus");
    setSecondsLeft(focusMins * 60);
  }

  function applySettings(fm, bm) {
    setFocusMins(fm);
    setBreakMins(bm);
    setStatus("idle");
    setPhase("focus");
    setSecondsLeft(fm * 60);
    setSettingsOpen(false);
  }

  const size = 260;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * progress;

  const isFocus = phase === "focus";
  const isRunning = status === "running";
  const isPaused = status === "paused";
  const isIdle = status === "idle";

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.appTitle}>POMODORO</span>
          <button
            style={styles.iconBtn}
            onClick={() => setSettingsOpen((o) => !o)}
            aria-label="Settings"
          >
            ⚙
          </button>
        </div>

        {/* Settings panel */}
        {settingsOpen && (
          <SettingsPanel
            focusMins={focusMins}
            breakMins={breakMins}
            onApply={applySettings}
            onClose={() => setSettingsOpen(false)}
          />
        )}

        {/* Phase badge */}
        <div style={{ ...styles.phaseBadge, ...(isFocus ? styles.badgeFocus : styles.badgeBreak) }}>
          {isFocus ? "● FOCUS" : "◎ BREAK"}
        </div>

        {/* SVG ring timer */}
        <div style={{ ...styles.ringWrap, ...(completedFlash ? styles.flash : {}) }}>
          <svg width={size} height={size} style={styles.svg}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={isFocus ? "#2C2C2A22" : "#04342C22"}
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={isFocus ? "#533AB7" : "#0F6E56"}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: "stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)" }}
            />
          </svg>
          <div style={styles.timerInner}>
            <span style={styles.countdown}>{formatTime(secondsLeft)}</span>
            <span style={styles.statusLabel}>
              {isRunning ? "running" : isPaused ? "paused" : "ready"}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div style={styles.controls}>
          {(isIdle || isPaused) && (
            <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleStart}>
              {isPaused ? "Resume" : "Start"}
            </button>
          )}
          {isRunning && (
            <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={handlePause}>
              Pause
            </button>
          )}
          <button style={{ ...styles.btn, ...styles.btnGhost }} onClick={handleReset}>
            Reset
          </button>
        </div>

        {/* History */}
        <div style={styles.historySection}>
          <div style={styles.historyHeader}>
            <span style={styles.historyTitle}>Today's Sessions</span>
            <span style={styles.historyCount}>{history.length}</span>
          </div>
          {history.length === 0 ? (
            <p style={styles.emptyMsg}>No sessions yet — start your first Pomodoro!</p>
          ) : (
            <ul style={styles.historyList}>
              {history.map((s) => (
                <li key={s.id} style={styles.historyItem}>
                  <span style={styles.checkmark}>✓</span>
                  <span style={styles.sessionDur}>{s.duration} focus</span>
                  <span style={styles.sessionTime}>— {s.completedAt}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ focusMins, breakMins, onApply, onClose }) {
  const [fm, setFm] = useState(focusMins);
  const [bm, setBm] = useState(breakMins);
  return (
    <div style={styles.settingsPanel}>
      <p style={styles.settingsLabel}>Focus duration (min)</p>
      <div style={styles.settingsRow}>
        <input
          type="range" min={5} max={60} step={5} value={fm}
          onChange={(e) => setFm(+e.target.value)}
          style={styles.slider}
        />
        <span style={styles.settingsVal}>{fm}</span>
      </div>
      <p style={styles.settingsLabel}>Break duration (min)</p>
      <div style={styles.settingsRow}>
        <input
          type="range" min={1} max={30} step={1} value={bm}
          onChange={(e) => setBm(+e.target.value)}
          style={styles.slider}
        />
        <span style={styles.settingsVal}>{bm}</span>
      </div>
      <div style={styles.settingsBtns}>
        <button style={{ ...styles.btn, ...styles.btnPrimary, flex: 1 }} onClick={() => onApply(fm, bm)}>Apply</button>
        <button style={{ ...styles.btn, ...styles.btnGhost, flex: 1 }} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#F1EFE8",
    fontFamily: "'DM Mono', 'Courier New', monospace",
    padding: "24px 16px",
    boxSizing: "border-box",
  },
  card: {
    background: "#fff",
    borderRadius: 24,
    padding: "32px 28px 28px",
    width: "100%",
    maxWidth: 380,
    boxShadow: "0 4px 40px rgba(44,44,42,0.10)",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  appTitle: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.18em",
    color: "#2C2C2A",
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 20,
    color: "#888780",
    padding: "4px 6px",
    borderRadius: 8,
    lineHeight: 1,
  },
  phaseBadge: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.14em",
    padding: "5px 14px",
    borderRadius: 100,
    marginBottom: 24,
  },
  badgeFocus: {
    background: "#EEEDFE",
    color: "#3C3489",
  },
  badgeBreak: {
    background: "#E1F5EE",
    color: "#0F6E56",
  },
  ringWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 28px",
    width: 260,
    height: 260,
    borderRadius: "50%",
    transition: "background 0.4s",
  },
  flash: {
    background: "#EEEDFE55",
  },
  svg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  timerInner: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    zIndex: 1,
  },
  countdown: {
    fontSize: 58,
    fontWeight: 700,
    letterSpacing: "-2px",
    color: "#2C2C2A",
    lineHeight: 1,
  },
  statusLabel: {
    fontSize: 11,
    letterSpacing: "0.14em",
    color: "#888780",
    textTransform: "uppercase",
  },
  controls: {
    display: "flex",
    gap: 10,
    marginBottom: 28,
    justifyContent: "center",
  },
  btn: {
    padding: "10px 24px",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    letterSpacing: "0.04em",
    fontFamily: "inherit",
    transition: "opacity 0.15s, transform 0.1s",
  },
  btnPrimary: {
    background: "#533AB7",
    color: "#fff",
  },
  btnSecondary: {
    background: "#0F6E56",
    color: "#fff",
  },
  btnGhost: {
    background: "#F1EFE8",
    color: "#5F5E5A",
  },
  historySection: {
    borderTop: "1px solid #E8E6E0",
    paddingTop: 20,
  },
  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "#444441",
    textTransform: "uppercase",
  },
  historyCount: {
    fontSize: 12,
    background: "#EEEDFE",
    color: "#3C3489",
    fontWeight: 700,
    padding: "2px 9px",
    borderRadius: 100,
  },
  emptyMsg: {
    color: "#888780",
    fontSize: 13,
    margin: 0,
    textAlign: "center",
    padding: "12px 0",
  },
  historyList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxHeight: 200,
    overflowY: "auto",
  },
  historyItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#2C2C2A",
  },
  checkmark: {
    color: "#0F6E56",
    fontWeight: 700,
    fontSize: 14,
  },
  sessionDur: {
    fontWeight: 600,
    color: "#3C3489",
  },
  sessionTime: {
    color: "#888780",
  },
  settingsPanel: {
    background: "#F7F6F2",
    borderRadius: 16,
    padding: "18px 20px",
    marginBottom: 20,
  },
  settingsLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "#5F5E5A",
    textTransform: "uppercase",
    margin: "0 0 8px",
  },
  settingsRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  slider: {
    flex: 1,
    accentColor: "#533AB7",
  },
  settingsVal: {
    fontSize: 16,
    fontWeight: 700,
    color: "#2C2C2A",
    minWidth: 28,
    textAlign: "right",
  },
  settingsBtns: {
    display: "flex",
    gap: 10,
    marginTop: 4,
  },
};
