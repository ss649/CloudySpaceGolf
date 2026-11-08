# CloudySpaceGolf — Mobile App (Expo / React Native)

CloudySpaceGolf is an outdoor celestial navigation and overcast gap-hunting game. This React Native mobile app is scaffolded with Expo SDK 52 and matches the layout, UX flows, and styling of the reference prototype in `gap1.html`.

## Features Implemented in Milestone 1.1 & 1.2

- **Design System & Theming**: Exact palette from `gap1.html` (`--bg`, `--panel`, `--ink`, `--mute`, `--line`, `--water`, `--land`, `--cloud`, `--gap`, `--amber`, `--sky`, `--chip`) in both **Light** and **Dark** modes, with classical serif headings and clean sans-serif/monospace HUD typography.
- **4-Tab Navigation (`TabBar`)**: Direct vector SVG replicas of the 4 prototype tabs:
  1. **Gaps**: Animated cloud radar map, active gap alert box, hole distance list, and quick actions.
  2. **Capture**: Real-time HUD, reticle view with target alignment, segmented mode selector (`Gap open` vs `Overcast`), hardware sensor fusion + manual fallback sliders, step-by-step verification pipeline, and result card.
  3. **Our sky**: 24-patch celestial matrix (8 azimuth columns x 3 altitude bands) with locked fog, unlocked star clusters, progress bar, and plate-solving catalog info.
  4. **Crew**: Citizen science weather spotter reports and weekly leaderboard syncing dynamically with user points.
- **Sensor Fusion (`useDeviceOrientation`)**:
  - Magnetometer + Accelerometer/DeviceMotion listeners.
  - Exponential Moving Average (EMA) low-pass filter using unit vectors $(\cos \theta, \sin \theta)$ to eliminate jitter and smoothly handle $360^\circ \to 0^\circ$ circular wrap-around.
- **Manual Fallback Sliders (`ManualSliders`)**:
  - Live azimuth/heading slider ($60^\circ-180^\circ$) and tilt slider ($0^\circ-70^\circ$).
  - One-tap toggle between Live Hardware IMU and Manual Simulation for indoor or emulator testing.
- **Target Alignment Engine**:
  - Calculates angular distance $\Delta = \sqrt{(\text{Az}_{\text{target}} - \text{Az}_{\text{device}})^2 + (\text{Alt}_{\text{target}} - \text{Alt}_{\text{device}})^2}$.
  - Dynamically projects celestial targets (Jupiter, Mars) onto the viewfinder screen.
  - Locks reticle with glowing amber border and haptic feedback when deviation $\le 4.0^\circ$.

## Running the App

```bash
cd mobile
npm install
npx expo start
```
