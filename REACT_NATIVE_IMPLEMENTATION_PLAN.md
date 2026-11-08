# CloudySpaceGolf (Gap Hunter) — React Native Implementation Plan

## 1. Executive Summary & Design Philosophy

**CloudySpaceGolf** (reference prototype: *Gap Hunter* in `gap1.html`) is a location-aware mobile sky game where players chase real-time openings ("gaps") in overcast skies to view and photograph celestial targets ("holes"), or lock in sensor-based orientation guesses during full overcast conditions. 

### Design Principles:
1. **Clean, Functional & Serious (Not "Too Cute")**: The visual language is inspired by nautical navigation instruments, meteorological radar interfaces, and astrophotography tools rather than cartoonish arcade graphics.
2. **True Native Mobile Capabilities**: Real hardware camera viewfinder, live high-speed IMU sensor fusion (magnetometer + accelerometer/gyroscope) driving a dynamic heads-up display (HUD), haptic feedback, GPS localization, and image capture with astronomical metadata bundling.
3. **Dual Gameplay Modes**:
   - **Gap Open (Field Chase)**: Real camera + plate-solving/star alignment verification when holes in clouds open up.
   - **Overcast Mode (Indoor / Blind Guess)**: Players orient their device blindly toward celestial coordinates through cloud cover using device sensors.
4. **Cooperative & Competitive Progression**: 24-patch celestial sky grid unlocked collectively by the crew, alongside individual weekly leaderboard rankings.

---

## 2. Architecture & Technology Stack

```
+-----------------------------------------------------------------------------------+
|                                 React Native App                                  |
+-----------------------------------------------------------------------------------+
|  UI & Navigation:  React Navigation v7 (Bottom Tabs + Native Stack)              |
|  Styling / Theme:  Restyle / Tailwind (NativeWind) with exact `gap1.html` palette  |
|  State Management: Zustand + MMKV (persisted course progress & user scores)       |
+------------------------------------+----------------------------------------------+
|            Hardware Layer          |                 Domain Engines               |
+------------------------------------+----------------------------------------------+
| * react-native-vision-camera (v4)  | * astronomy-engine (Ephemeris calculations)  |
| * react-native-sensors / CoreMotion| * Sensor Fusion Filter (Low-pass / Madgwick) |
| * expo-location (GPS coordinate)   | * Metadata Packager (EXIF + Telemetry)       |
| * expo-haptics (Shutter feedback)  | * Verification Pipeline (Sharpness & Stars)  |
+------------------------------------+----------------------------------------------+
```

### 2.1 Core Framework
- **Framework**: **Expo SDK 52+** with **Prebuild / Config Plugins** (Development Builds).
  - *Rationale*: Allows using bare-metal native modules like `react-native-vision-camera` and low-latency IMU listeners while benefiting from Expo's robust toolchain, OTA updates, and standard configurations.

### 2.2 Camera Module
- **Library**: `react-native-vision-camera` (v4.x).
  - *Rationale*: High performance, camera controls (focus lock, exposure compensation for night sky), low-light capability, fast snapshot trigger (`takePhoto`), and support for C++ / Skia frame processors if on-device star detection is added.
  - *Fallback / Alternate*: `expo-camera` if staying strictly within Expo Go during initial UI wireframing.

### 2.3 Sensor & Orientation Fusion
- **Library**: `react-native-sensors` or native `expo-sensors` (`Magnetometer`, `Accelerometer`, `DeviceMotion`).
- **Data Needed**:
  - **Heading (Azimuth)**: Compass angle ($0^\circ$ North to $359^\circ$).
  - **Tilt (Altitude / Pitch)**: Angle above horizon ($0^\circ$ flat horizontal to $90^\circ$ zenith).
  - **Roll**: Tilt alignment check.
- **Filter Pipeline**: Exponential moving average (EMA) low-pass filter running at 30–60Hz to prevent sensor jitter from shaking the reticle.

### 2.4 Astronomical Ephemeris Engine
- **Library**: `astronomy-engine` (compact, high-precision pure JS library).
- Computes the instantaneous topocentric horizontal coordinates ($\text{Azimuth}, \text{Altitude}$) for any body (Jupiter, Moon, Saturn, Mars, bright Messier objects) given:
  - User's GPS Latitude & Longitude
  - UTC Timestamp

### 2.5 State Management & Storage
- **Zustand**: Lightweight global state for current GPS location, active gap alerts, current target celestial coordinates, score, and unlocked sky tiles.
- **react-native-mmkv**: Ultra-fast synchronous storage for persisting unlocked patches and user credentials.

---

## 3. Design System & Theming (Faithful to `gap1.html`)

The application supports both system and manual **Light** and **Dark** themes matching the exact CSS variables:

| Token | Light Mode (`gap1.html`) | Dark Mode (`gap1.html`) | Purpose |
|---|---|---|---|
| `bg` | `#EAF0F5` | `#070D18` | App background |
| `panel` | `#FFFFFF` | `#122036` | Cards, modals, HUD containers |
| `ink` | `#13243A` | `#E6EEF6` | Primary high-contrast text |
| `mute` | `#5A6C82` | `#97A8BC` | Secondary text, status subtitles |
| `line` | `#D3DEE8` | `#22364F` | Subtle borders, dividers |
| `water` | `#C5DAEA` | `#0F2A44` | Radar map bodies of water |
| `land` | `#F4F7FA` | `#0E1A2C` | Radar map terrain |
| `cloud` | `#8497AD` | `#52657C` | Radar cloud covers |
| `gap` | `#0E8FA8` (Teal) | `#5ED0E6` (Cyan-Teal) | Primary action, active gap markers |
| `amber` | `#B9700E` | `#F5B65A` | Target lock, reticle highlight, player pin |
| `sky` | `#0A1424` | `#050A14` | Deep space night sky |
| `chip` | `#DCE7F0` | `#1B2E48` | Score pills, segmented background |

### Typography:
- **Display & Headings ($H_1, H_2, H_3$)**: Classical serif (`Georgia` on Android / `Iowan Old Style` or `Palatino` on iOS).
- **Body & HUD Data**: Monospaced and clean system sans-serif (`SF Pro / Roboto Mono` for compass headings, `SF Pro / Roboto` for body).

---

## 4. Screen-by-Screen Implementation Specifications

The app uses a 4-tab bottom navigation hierarchy:
1. `GapsScreen` (Gaps / Holes)
2. `CaptureScreen` (Capture / Swing)
3. `SkyMapScreen` (Our Sky / Course Progress)
4. `CrewScreen` (Crew / Leaderboard)

---

### Tab 1: Gaps / Holes (`GapsScreen`)

#### Layout & UI Elements:
1. **Header Bar**: 
   - Title: "Gap Hunter" (Serif font).
   - Points Chip: Pill badge displaying current score (e.g. `120 pts`).
2. **Context Note**: Clean subtitle note explaining the current radar window.
3. **Active Gap Alert Card**:
   - Distinctive border with 4px left highlight in `var(--gap)`.
   - Title: "A gap is open near Hamburg" (bold).
   - Subtitle: "About 25 minutes left. It is drifting east."
4. **Cloud Radar Map Viewport**:
   - Implemented via `react-native-svg` (or MapLibre with custom weather raster/vector tiles).
   - Features:
     * Coastline / lakes (Lake Erie / Lake Ontario).
     * Animated drifting cloud ellipses with Reanimated looped translations.
     * Pulsating radar rings indicating open gap zones (with animated opacity and scale).
     * Amber locator dot marking player position ("You, Buffalo").
5. **Gap Opportunities List**:
   - Card rows listing holes in cloud cover:
     * *Hamburg gap* — "Open now, closes in ~25 min" — `14 mi`
     * *Beaver Meadow* — "Forecast to open in ~50 min" — `31 mi`
6. **Action CTA Buttons**:
   - `[Chase the gap]`: Deep-links directly to **Capture** tab in `Gap Open` mode.
   - `[Fully overcast? Play from indoors]`: Deep-links to **Capture** tab in `Overcast` mode.

---

### Tab 2: Capture / Swing (`CaptureScreen`)

This is the centerpiece of the mobile experience combining camera feed, sensor telemetry, and verification.

#### Layout & Visual States:
1. **Header & Mode Switch**:
   - Target Header: "Find Jupiter" + Points pill.
   - Segmented Control: `[Gap open]` vs `[Overcast]`.
2. **Live Viewfinder Container** (Height: ~280–320dp, rounded 18dp, border):
   - **Background Layer**:
     * In *Gap open* mode: Live `Camera` preview (`react-native-vision-camera`). If simulator or permission denied: stylized deep space radial gradient with procedurally generated stars.
     * In *Overcast* mode: Translucent cloud veil gradient (`rgba(60, 73, 88, 0.93)`) obscuring the stars/camera.
   - **Celestial Target Indicators**:
     * Target dot (Jupiter: 14dp gold circle with glowing drop-shadow; Mars: 8dp peach dot nearby).
     * Position transforms dynamically in $(x, y)$ pixels based on sensor deviation:
       $$\Delta x = (\text{TargetAz} - \text{CurrentAz}) \times K_x$$
       $$\Delta y = (\text{CurrentAlt} - \text{TargetAlt}) \times K_y$$
     * When target is within lock tolerance ($\le 4^\circ$), crosshairs turn amber with an intense glow effect and trigger haptic impact (`ImpactFeedbackStyle.Medium`).
   - **Reticle Crosshair**:
     * 70dp circular reticle centered in viewfinder.
   - **Real-Time HUD Bar**:
     * Floats at bottom of viewfinder: `Heading: 118° | Tilt: 24°`.
3. **Instructional Hint**:
   - Dynamic prompt based on active target coordinates (e.g., "Jupiter is about 118° (east-southeast) and 24° above horizon right now...").
4. **Hardware Sensors / Manual Fallback Sliders**:
   - Device sensors drive heading & tilt automatically.
   - **Collapsible Manual Sliders**:
     * Heading Slider ($60^\circ - 180^\circ$ or $0^\circ - 360^\circ$).
     * Tilt Slider ($0^\circ - 70^\circ$).
     * *Purpose*: Ensures complete playability on iOS/Android emulators, indoor test benches, or uncalibrated magnetometers.
5. **The Shutter Button ("Capture")**:
   - Disabled state: `"Aim closer to capture"` (when deviation $> 4^\circ$ in gap mode).
   - Locked state: `"Capture the sky"` (in Gap mode when locked).
   - Overcast state: `"Lock in my guess"` (always active).
6. **Step-by-Step Verification Sequence** (Animated checkmarks):
   - Triggered upon pressing capture.
   - Sequential animated rows appearing at 600ms intervals:
     * *In Gap Mode*:
       1. [✓] Checking the photo is sharp
       2. [✓] Matching stars to the catalog
       3. [✓] Confirming Jupiter at your sky position
       4. [✓] Measuring clear sky: 82%
     * *In Overcast Mode*:
       1. [✓] Reading compass and tilt
       2. [✓] Computing where Jupiter is for your spot and time
7. **Result Card (Post-Capture)**:
   - Evaluates performance:
     * *Gap Mode*: "Jupiter confirmed. Mars sits just beside it. The crew now has a new patch of the east-southeast sky." → `+120 pts and 1 patch unlocked`.
     * *Overcast Mode*: "You were 2.3° off. Jupiter is behind the clouds, right where you aimed..." → `+95 pts`.
   - Secondary button: `[See our sky]` (navigates to Tab 3).

---

### Tab 3: Sky Map / Course Progress (`SkyMapScreen`)

#### Layout & Visual Elements:
1. **Header**: "Our sky" + Points pill.
2. **Catalog Description**: "Each square is a patch of sky. A photo from anyone in the crew clears the fog."
3. **Course Progress Card**:
   - Progress text: "Unlocked: 5 of 24 patches".
   - Animated progress bar (horizontal fill in `var(--gap)` color).
   - **24-Patch Celestial Matrix Grid**:
     * $8 \text{ columns} \times 3 \text{ rows} = 24 \text{ sky patches}$.
     * Columns represent 8 azimuthal compass segments (North around through East, South, West to NW).
     * Rows represent altitude tiers: Low ($0^\circ - 30^\circ$), Mid ($30^\circ - 60^\circ$), High ($60^\circ - 90^\circ$).
     * **Locked Tile**: Dashed border with subtle chip background ("Still fogged").
     * **Unlocked Tile**: Deep space dark-blue gradient (`#15305A` to `#050A14`) populated with white star specks.
     * **New Unlock Animation**: Ring expansion pop animation when a new patch is cleared.
4. **Educational Plate-Solving Card**:
   - "How photos get placed": Explains astrometric catalog matching from real stars rather than solely relying on phone magnetometers.

---

### Tab 4: Crew / Leaderboard (`CrewScreen`)

#### Layout & Visual Elements:
1. **Header**: "Crew" + Points pill.
2. **Citizen Science Field Reports**:
   - Live report cards from fellow community members:
     * Avatar circle (initials: `M`, `D`, `T`).
     * Reporter name + location (e.g. "Maya in Orchard Park").
     * Sky condition: "Clear to the south, about 20% cloud".
     * Relative timestamp: "4 min ago".
3. **Weekly Leaderboard**:
   - Ranked list showing rank number (circle pill), username, and points.
   - User's row dynamically highlights and reflects accumulated score from captures.

---

## 5. Sensor & Camera Fusion Data Flow

### 5.1 Telemetry Pipeline Architecture

```
[Device Magnetometer]  \
                         --> [Sensor Fusion / Low-Pass Filter] --> [Relative Screen Offset (dx, dy)]
[Device Accelerometer] /                                                    |
                                                                            v
[GPS Location] + [Timestamp] --> [astronomy-engine] --> [Target Az & Alt] -> [Reticle Lock Detector]
                                                                            |
                                                                            v (User presses Capture)
[Camera Viewport] -------------> [takePhoto() Snapshot] -----------------> [Bundled Shot Payload]
```

### 5.2 Mathematical Projection (Target to Screen Coordinates)

Let:
- $\theta_{\text{target}}, \phi_{\text{target}}$: Target Azimuth and Altitude.
- $\theta_{\text{device}}, \phi_{\text{device}}$: Device Current Heading and Tilt.
- $S_x, S_y$: Screen scale factors (pixels per degree, approx. $3.2\text{ px}/^\circ$).

$$\Delta \theta = (\theta_{\text{target}} - \theta_{\text{device}})$$
$$\Delta \phi = (\phi_{\text{device}} - \phi_{\text{target}})$$
$$x_{\text{target}} = \text{Center}_X + (\Delta \theta \times S_x)$$
$$y_{\text{target}} = \text{Center}_Y + (\Delta \phi \times S_y)$$

Angular offset magnitude:
$$\delta_{\text{offset}} = \sqrt{(\Delta \theta)^2 + (\Delta \phi)^2}$$

Lock condition:
$$\text{IsLocked} = (\delta_{\text{offset}} \le 4.0^\circ) \land (\text{Mode} == \text{"gap"})$$

### 5.3 Capture Payload Data Schema

When the user presses the shutter button, the app generates a structured package:

```typescript
export interface CapturePayload {
  captureId: string;              // UUID v4
  timestamp: string;              // ISO 8601 UTC
  mode: 'gap' | 'overcast';
  target: {
    name: string;                 // e.g. "Jupiter"
    catalogId: string;            // e.g. "PLANET_JUPITER"
    azimuth: number;              // Target theoretical azimuth
    altitude: number;             // Target theoretical altitude
  };
  telemetry: {
    heading: number;              // Device azimuth at shutter instant
    tilt: number;                 // Device altitude at shutter instant
    roll: number;                 // Device roll
    angularDeviation: number;     // Total angular offset in degrees
    sensorAccuracy: number;       // Sensor calibration status
  };
  location: {
    latitude: number;
    longitude: number;
    altitudeMeters: number;
    accuracyMeters: number;
  };
  photo: {
    localUri: string;             // File URI on device (file:///...)
    width: number;
    height: number;
    fileSizeBytes: number;
    exif: Record<string, any>;
  };
}
```

---

## 6. Directory Structure & Code Organization

```
CloudySpaceGolf/
├── app.json
├── package.json
├── tsconfig.json
├── src/
│   ├── api/
│   │   ├── weatherService.ts         # Cloud cover & gap forecasts
│   │   └── leaderboardService.ts     # Crew submissions and ranking
│   ├── assets/
│   │   └── icons/                    # Tab & status SVGs
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.tsx            # Serif title + score pill
│   │   │   ├── Card.tsx              # Bordered container
│   │   │   └── SegmentedControl.tsx  # Gap vs Overcast switch
│   │   ├── gaps/
│   │   │   ├── RadarMap.tsx          # Drifting clouds & gap pulses (SVG)
│   │   │   └── GapItem.tsx           # Distance and ETA item
│   │   ├── capture/
│   │   │   ├── CameraViewfinder.tsx  # VisionCamera + Star fallback
│   │   │   ├── CrosshairReticle.tsx  # HUD crosshair & glow effects
│   │   │   ├── ManualSliders.tsx     # Fallback test controls
│   │   │   └── VerificationList.tsx  # Step-by-step pipeline animation
│   │   └── sky/
│   │       ├── PatchGrid.tsx         # 24-patch celestial matrix
│   │       └── ProgressBar.tsx       # Smooth fill indicator
│   ├── hooks/
│   │   ├── useDeviceOrientation.ts   # Filtered Heading & Tilt stream
│   │   ├── useCelestialTarget.ts     # Ephemeris calculations for targets
│   │   └── useCameraCapture.ts       # VisionCamera snap & metadata bundling
│   ├── navigation/
│   │   └── AppNavigator.tsx          # 4-tab bottom navigation
│   ├── screens/
│   │   ├── GapsScreen.tsx            # Tab 1: Gaps & radar
│   │   ├── CaptureScreen.tsx         # Tab 2: Camera & swing
│   │   ├── SkyMapScreen.tsx          # Tab 3: Celestial grid
│   │   └── CrewScreen.tsx            # Tab 4: Crew feed & leaderboard
│   ├── store/
│   │   ├── gameStore.ts              # Score, unlocked patches, current hole
│   │   └── settingsStore.ts          # Light/Dark theme, manual slider toggles
│   └── theme/
│       ├── colors.ts                 # Direct port of CSS variables
│       └── typography.ts             # Serif & sans definitions
```

---

## 7. Implementation Roadmap & Milestones

### Phase 1: Foundation, Navigation & Theme Tokens
- Initialize Expo project with TypeScript and React Navigation.
- Set up theme tokens matching `gap1.html` light and dark schemes.
- Implement bottom tab bar with SVG icons (Gaps, Capture, Our Sky, Crew).
- Build reusable UI primitives: `Header`, `ScoreChip`, `Card`, `Button`.

### Phase 2: Sensor & Ephemeris Engine
- Integrate `react-native-sensors` / `expo-sensors`.
- Implement `useDeviceOrientation` with a low-pass filter to generate smooth Heading and Tilt values.
- Integrate `astronomy-engine` to compute target Azimuth/Altitude dynamically.
- Implement manual fallback sliders for indoor simulation and headless verification.

### Phase 3: Capture Screen & Camera Viewfinder
- Integrate `react-native-vision-camera` for live camera stream and photo snapshotting.
- Overlay SVG crosshairs and dynamic celestial target indicator (locked / unlocked state).
- Implement the "Overcast" cloud veil mode.
- Build the step-by-step verification pipeline animation with sequential checkmarks.
- Implement post-capture Result Card and score incrementing.

### Phase 4: Radar Map & 24-Patch Sky Matrix
- Port radar map from `gap1.html` using `react-native-svg` and `react-native-reanimated` (animated drifting clouds, pulsating gap circles).
- Build 24-patch celestial grid with unlock animations and persistence in `MMKV`.
- Build Crew feed and dynamic leaderboard.

### Phase 5: Verification, Polish & Device Testing
- Test end-to-end capture on real physical device (camera permission, gyroscope/magnetometer calibration).
- Validate low-light camera settings and EXIF bundling.
- Ensure light/dark mode parity and accessibility.
