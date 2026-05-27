# Demo Checklist

## What Works
- Signup creates a real auth session and lands on the dashboard.
- Login works and restores the authenticated UI.
- Logout clears the session and returns to guest state.
- Profile page loads after login.
- Profile edits save and persist in the demo flow.
- Pro trial starts and updates the subscription state.
- Landing page CTA buttons route to the correct places.
- Play vs Bot starts correctly from the setup page.
- Dice roll, legal move selection, turn switching, and bot responses work.
- Bot moves are visible in the board and move history.
- Friend room links are generated and open the shared room page.
- Fullscreen mode toggles correctly.
- Production build completes successfully.

## Known Limitations
- Live Supabase tables for `profiles` and `purchases` are not present in this environment, so profile and Pro writes fall back to the local demo path when needed.
- Friend rooms are shareable in-browser demo rooms, not remote multiplayer backed by a live realtime backend.
- The build emits a dynamic font download warning, but the build still passes.

## Demo Flow
1. Open the landing page.
2. Click `Sign up` or `Log in`.
3. Go to the dashboard.
4. Open `Play Now`, start `Play vs Bot`, and make a move.
5. Watch the bot reply and confirm the turn changes.
6. Open `Profile`, change a field, and save.
7. Open `Go Pro` and start the trial.
8. From the dashboard, click `Create Friend Room` and open the shared room link.
9. Open the game page and toggle fullscreen.

## Test Account
- Email: `demo-1779869128944-525@rush.gg`
- Password: `Password123!`
- Note: this account already has demo state created during QA, including profile edits and a started Pro trial.
