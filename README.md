Pomodoro Timer
A focused, single-screen Pomodoro timer with daily session history. Built with React + Vite.

How to Run Locally
Requirements: Node.js 18+
bash# 1. Clone the repo
git clone <repo-url>
cd pomodoro-timer

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
Then open http://localhost:5173 in your browser.
To build for production:
bashnpm run build
npm run preview

Deployed URL
https://pomodoro-timer-demo.vercel.app ← replace with your deployed URL

Features

Configurable focus (5–60 min) and break (1–30 min) durations via settings panel
Start / Pause / Resume / Reset controls
Animated ring progress indicator with smooth transitions
Audio cue (ascending 4-note chime using Web Audio API) on cycle completion
Auto-transitions focus → break → focus
Daily history of completed focus sessions, persisted via localStorage, auto-clears on a new calendar day
Fully responsive from 360px mobile to 1440px desktop
Keyboard accessible — all controls reachable and operable via keyboard


Stack

React 18 + hooks (useState, useEffect, useRef, useCallback)
Vite for dev/build tooling
Zero UI libraries — all styles in plain JS style objects
Web Audio API for the completion sound (no audio file dependencies)
localStorage for session persistence