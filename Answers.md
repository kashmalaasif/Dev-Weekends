1. How to Run

Requirements: Node.js 18+
bashgit clone <repo-url>
cd pomodoro-timer
npm install
npm run dev
Open http://localhost:5173.
Deployed URL: https://pomodoro-timer-demo.vercel.app ← replace with your actual URL
Nothing exotic is required — standard Node.js and npm. The project uses Vite, so the dev server starts in under 2 seconds on any modern machine.

2. Stack & Design Choices

Why React + Vite?
React's useState / useEffect model maps directly to a timer's lifecycle — running, paused, idle states all live as first-class values, not DOM mutations. Vite gives instant HMR during development without any config overhead. No routing, no state library, no UI component kit — everything in this app fits cleanly in a single component file, so I kept it that way.
Visual decision 1 — The ring takes up ~65% of the card width, centered.
The timer's ring is 260px in a 380px card. I chose this proportion deliberately: the countdown is what you glance at, not read in detail, so it had to be large enough to register in your peripheral vision when you're deep in a focus session. A smaller ring would make you lean in to check the time, which defeats the purpose of a Pomodoro timer. The ring also doubles as progress feedback — you see time drain away without reading a number.
Visual decision 2 — Focus and break phases use different accent colors (purple vs. green), not just different labels.
The phase badge, the ring's progress stroke, and the primary button all change color together when switching phases. Purple for focus, green for break. This was a deliberate choice so that phase state is ambient — you can tell where you are in a cycle by color alone, from across the room, without reading a single word. This matters most on the break-to-focus transition, when you need a clear signal that it's time to work again.

3. Responsive & Accessibility

Responsive behavior:
On a 360px phone, the card fills the screen width with 16px horizontal padding. The ring scales to roughly 240px (set via maxWidth: 380 on the card with width: 100%) so the countdown remains large and readable. The controls stack naturally — they were already flexbox. The history list gets a maxHeight: 200px with overflow scroll so it doesn't push the controls off screen on a phone with many sessions.
On a 1440px laptop the card sits centered at 380px max width with the tan background filling the rest, giving it a focused, intentional look rather than stretching to fill the full viewport.
Accessibility consideration handled — keyboard navigation:
All interactive elements (Start/Pause/Resume/Reset, Settings toggle, Apply/Cancel, sliders) are native HTML <button> and <input type="range"> elements, so they receive focus and are operable by keyboard out of the box. The settings gear button has an explicit aria-label="Settings" since it's an emoji character with no text. Tab order follows the visual reading order.
Accessibility consideration skipped — screen reader announcement of timer ticks:
The countdown updates every second via state, but there is no aria-live region broadcasting each tick to screen readers. Announcing every second would be overwhelming and unusable. The right solution would be an aria-live="polite" region that only announces on phase transitions ("Focus session complete. Break starting.") and perhaps on major milestones (5 minutes remaining). I skipped this because implementing it correctly — debounced, meaningful announcements only — would take meaningful design thought and testing with actual screen reader software that I didn't have time to do properly. A half-baked aria-live region that spams every second would be worse than none.


4. AI Usage

I used Claude (claude.ai) during development in two places:
A — Initial component scaffold:
I asked Claude to generate a React Pomodoro timer with useState/useEffect-based countdown logic, localStorage persistence keyed by date, and SVG ring progress. It gave me a working scaffold with a setInterval inside useEffect and a basic circular SVG.
What I changed: Claude's initial setInterval was set up inside the same useEffect that depended on secondsLeft, which caused the interval to be torn down and recreated every second — creating a subtle drift issue over long sessions. I refactored it: the interval now only reads and decrements state via a functional update (setSecondsLeft(s => s - 1)) and the effect's dependency array only contains status and phase. This way the interval is stable across seconds and only resets when the user actually changes state. Claude's version worked in testing but would have drifted noticeably over a 25-minute session.
B — Web Audio API chime:
I asked Claude to generate a Web Audio API implementation for a pleasant completion sound. It gave me a single sine wave beep. I changed this to an ascending 4-note chord sequence (C5 → E5 → G5 → C6, spaced 180ms apart) because a single beep felt jarring and cheap — easy to miss or mistake for a notification. The ascending sequence feels satisfying and conclusive, which matters for the "session done" moment the assessment specifically called out. I also reduced gain from 0.5 to 0.35 to avoid being startling in quiet environments.

5. Honest Gap

The settings UX is not polished enough.
Right now, changing the focus or break duration in the settings panel immediately resets the active timer when you hit Apply — even mid-session. There's no warning, no confirmation, no graceful handling of "I'm 18 minutes into a focus session and accidentally opened settings." A user who fat-fingers the settings gear would lose their current session silently.
With another day I'd fix this two ways: (1) if a session is in progress, show a small warning inside the settings panel ("Applying will reset your current session") before the Apply button, and (2) add an option to apply the new durations starting from the next cycle rather than immediately. This would require tracking whether the settings change was initiated mid-session and storing "pending" config separately from "active" config — maybe 30–40 lines of additional state logic, but meaningfully better UX for real daily use.