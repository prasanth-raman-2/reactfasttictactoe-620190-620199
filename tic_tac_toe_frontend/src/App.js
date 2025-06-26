import React, { useState, useEffect } from "react";
import "./App.css";

// Backend API base URL - adjust if needed; assuming backend is at port 3001
const API_BASE = "http://localhost:3001";

// Color palette from requirements
const COLORS = {
  primary: "#1e90ff",
  secondary: "#f4f4f4",
  accent: "#ff4500",
};

// Utility to fetch with error handling
const apiFetch = async (endpoint, opts = {}) => {
  const url = `${API_BASE}${endpoint}`;
  const isGet = (opts.method || "GET").toUpperCase() === "GET";
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  const options = {
    ...opts,
    headers,
  };
  try {
    const resp = await fetch(url, options);
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.detail || "API error");
    }
    return data;
  } catch (e) {
    throw new Error(e?.message || "Network/API error");
  }
};

// PUBLIC_INTERFACE
function App() {
  const [board, setBoard] = useState([
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ]);
  const [playerTurn, setPlayerTurn] = useState("X");
  const [status, setStatus] = useState("ongoing");
  const [winner, setWinner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState("light");

  // ----- Backend integration -----
  // Load initial game state (auto start if empty)
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    // On mount, check status, or start a new game if needed
    const init = async () => {
      setLoading(true);
      setError("");
      try {
        // Check current status
        const game = await apiFetch("/status");
        setBoard(game.board);
        setPlayerTurn(game.player_turn);
        setStatus(game.status);
        setWinner(game.winner);
      } catch {
        // If backend is not up or status fails, try start
        try {
          const started = await apiFetch("/start", { method: "POST" });
          setBoard(started.board);
          setPlayerTurn(started.player_turn);
          setStatus(started.status);
          setWinner(started.winner);
        } catch (err) {
          setError("Could not connect to backend: " + (err.message || ""));
        }
      }
      setLoading(false);
    };
    init();
  }, [theme]);

  // PUBLIC_INTERFACE
  const handleCellClick = async (rowIdx, colIdx) => {
    if (submitting || status !== "ongoing") return;
    if (board[rowIdx][colIdx]) return; // Ignore already filled
    setSubmitting(true);
    setError("");
    try {
      const moveRes = await apiFetch("/move", {
        method: "POST",
        body: JSON.stringify({ row: rowIdx, col: colIdx }),
      });
      setBoard(moveRes.board);
      setPlayerTurn(moveRes.player_turn);
      setStatus(moveRes.status);
      setWinner(moveRes.winner);
    } catch (err) {
      setError(err.message);
    }
    setSubmitting(false);
  };

  // PUBLIC_INTERFACE
  const handleReset = async () => {
    setSubmitting(true);
    setError("");
    try {
      const reset = await apiFetch("/reset", { method: "POST" });
      setBoard(reset.board);
      setPlayerTurn(reset.player_turn);
      setStatus(reset.status);
      setWinner(reset.winner);
    } catch (err) {
      setError("Unable to reset the game: " + err.message);
    }
    setSubmitting(false);
  };

  // PUBLIC_INTERFACE
  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  // UI helpers
  const statusDisplay = () => {
    if (status === "win" && winner) return `Player ${winner} wins!`;
    if (status === "draw") return "It's a draw!";
    if (status === "ongoing") return `Turn: Player ${playerTurn}`;
    return "Game over";
  };

  // Modern style game board
  return (
    <div className="App" style={{ background: COLORS.secondary }}>
      <header className="App-header">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
        <h1
          style={{
            fontWeight: 900,
            letterSpacing: "3px",
            color: COLORS.primary,
            marginBottom: "1rem",
            textShadow: `0 1px 0 #fff6`,
          }}
        >
          Tic Tac Toe
        </h1>
        <div
          className="tictactoe-board-container"
          style={{
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0px 4px 24px #0002",
            padding: "2rem 1.2rem 1.5rem 1.2rem",
            margin: "0 auto",
            maxWidth: 350,
            minWidth: 260,
          }}
        >
          {loading ? (
            <div className="ttt-loader">Loading...</div>
          ) : (
            <GameBoard
              board={board}
              disabled={submitting || status !== "ongoing"}
              onCellClick={handleCellClick}
              colors={COLORS}
            />
          )}
          <div
            style={{
              marginTop: "1.3rem",
              minHeight: 30,
              fontWeight: 600,
              color:
                status === "win"
                  ? COLORS.accent
                  : status === "draw"
                  ? COLORS.primary
                  : COLORS.primary,
              fontSize: 20,
              transition: "color 0.2s",
            }}
            data-testid="game-status"
          >
            {statusDisplay()}
          </div>
          {error && (
            <div style={{ color: COLORS.accent, margin: "0.6rem 0", fontWeight: 500 }} role="alert">
              {error}
            </div>
          )}
        </div>
        <ControlBar
          onReset={handleReset}
          disabled={submitting}
          isOngoing={status === "ongoing"}
        />
        <footer
          style={{
            marginTop: "45px",
            color: "#888",
            fontSize: 14,
            letterSpacing: 1,
            opacity: 0.8,
          }}
        >
          <span>
            Modern Tic Tac Toe (React + FastAPI) — By Kavia AI
          </span>
        </footer>
      </header>
    </div>
  );
}

// PUBLIC_INTERFACE
function GameBoard({ board, disabled, onCellClick, colors }) {
  // Responsive/Modern 3x3 grid
  return (
    <div
      className="ttt-board"
      style={{
        display: "grid",
        gridTemplateRows: "repeat(3, 1fr)",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "10px",
        aspectRatio: "1 / 1",
        background: colors.secondary,
        border: `2.5px solid ${colors.primary}`,
        borderRadius: 14,
        minWidth: 250,
        maxWidth: 350,
        margin: "auto",
        boxShadow: "0 2px 16px #eee4",
      }}
      data-testid="game-board"
    >
      {board.map((row, rIdx) =>
        row.map((val, cIdx) => (
          <button
            key={`${rIdx}_${cIdx}`}
            onClick={() => onCellClick(rIdx, cIdx)}
            disabled={disabled || val}
            aria-label={`Cell (${rIdx + 1},${cIdx + 1})`}
            className="ttt-cell"
            style={{
              background: "#fff",
              border: `2px solid ${colors.primary}`,
              outline: "none",
              fontSize: "2.5rem",
              fontWeight: 900,
              color:
                val === "X"
                  ? colors.primary
                  : val === "O"
                  ? colors.accent
                  : "#bbb",
              borderRadius: 12,
              height: 60,
              minWidth: 60,
              aspectRatio: "1/1",
              cursor: !val && !disabled ? "pointer" : "default",
              boxShadow: val
                ? "0 1px 6px #0004"
                : "0 1px 1px rgba(0,0,0,.05)",
              transition: "background 0.15s, color 0.16s, box-shadow 0.16s",
              userSelect: "none",
              margin: 0,
              padding: 0,
              // mobile adjustment
            }}
            data-testid={`cell-${rIdx}-${cIdx}`}
          >
            {val ? val : ""}
          </button>
        ))
      )}
    </div>
  );
}

// PUBLIC_INTERFACE
function ControlBar({ onReset, disabled, isOngoing }) {
  // Controls for reset/new game
  return (
    <div
      className="ttt-controls"
      style={{
        margin: "1.4rem 0 0 0",
        display: "flex",
        justifyContent: "center",
        gap: 18,
      }}
    >
      <button
        className="ttt-btn"
        style={{
          background: "#ff4500",
          color: "#fff",
          border: "none",
          borderRadius: 9,
          padding: "0.63rem 1.46rem",
          fontSize: 17,
          fontWeight: 700,
          boxShadow: "0 2px 4px #ff450038",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.65 : 1,
          transition: "opacity 0.12s",
        }}
        onClick={onReset}
        disabled={disabled}
        tabIndex={0}
        aria-label={isOngoing ? "Restart" : "New Game"}
        data-testid="reset-btn"
      >
        {isOngoing ? "Restart" : "New Game"}
      </button>
    </div>
  );
}

export default App;
