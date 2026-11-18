## Inspiration

Every empty room asks the same question: *will it fit?* We answer it with a tape measure, a flat screen and a guess. We measure an alcove, scroll a catalogue, try to picture a 228 cm sofa against a 212 cm wall, and find out on delivery day. Photos can't show scale. Phone AR is a small window held at arm's length, with fingers covering the view.

A headset can do better: the furniture can stand in your actual room, at its true size, while you sit on your couch and move it around with your hands. We had already built ReRoom, a web studio where every piece of furniture is generated with Aholo's 3D AI, at real size, with doors and drawers that really open. Meta Quest's hand tracking and passthrough were the missing piece.

## What it does

ReRoom MR is a hands-first, seated mixed reality app for Meta Quest that runs in the Quest Browser. Open the link, tap **Enter mixed reality**, and a small tray of real furniture floats at your lap.

- **Pinch a card**: that piece appears on your real floor through passthrough, about 2 m in front of you, at its true dimensions.
- **Pinch a piece** to select it, then **pinch and drag**: it slides across your floor, following your hand ray.
- **Pinch ⟲ / ⟳** to turn it, for example so the sofa faces the TV.
- **Pinch Open**: wardrobe doors swing and drawers slide on real joints, so you can check the door clears the bed.
- **Pinch a style** (Japandi, Industrial, Cyberpunk): every piece in the room is re-finished at once.
- **Pinch Remove or Clear** to start over.

No headset room ready? **Enter VR** puts you inside a real living room generated with Aholo World, where you can furnish an empty apartment the same way.

Everything works with bare hands. You never stand up, and you never pick up a controller. Starting takes one tap: no install, no account, no tutorial.

## How we built it

- **WebXR on Quest:** `immersive-ar` with passthrough and `hand-tracking`, built with React Three Fiber and `@react-three/xr` (pmndrs). Hands get ray, touch and grab pointers, so a pinch on any 3D object becomes an ordinary pointer event.
- **Real 3D furniture:** every model was generated with **Aholo Lux3D** (text-to-3D, then optimised to compressed GLB). Each one is scaled to its catalogue dimensions, so what you see is the size you'd buy.
- **Real joints:** Lux3D's articulation step finds doors and drawers and writes them as URDF. We rebuild each revolute and prismatic joint as a pivot in three.js and animate it.
- **One-pinch styles:** material variants pre-baked with Lux3D material transfer, so restyling is instant and never waits on an AI call in the headset.
- **A real room for VR:** a 360° interior from **Aholo World**, ground-projected so its floor sits at y = 0 and furniture stands on it convincingly.
- **Testing without a headset:** Meta's **Immersive Web Emulation Runtime (IWER)** emulates a Quest 3 with hand tracking and a synthetic living room. We wrote a Playwright script that drives the emulated right hand from a seated rest pose: it aims at named targets, pinches, and checks every step (placed, dragged, rotated, opened, restyled, removed).
- **Hosting:** Next.js 16 on Cloudflare Workers via OpenNext. All assets come from the same origin, so the cold start is one page load.

## Challenges we ran into

- **Pinches that didn't register.** Buttons acted on "click", which needs the pinch to press and release on the same object. A real hand drifts as it lets go, so clicks were silently lost. We moved every action to **pinch-down**.
- **Dragging blocked by the thing being dragged.** Our first drag used an invisible floor, but the hand ray hit the furniture first and never reached it. We switched to **pointer capture** and intersect the ray with the floor plane ourselves.
- **Controls hiding behind the tray.** From a seated pose, a ray aimed at a piece's floating controls passed straight through the tray and placed extra furniture. We raised the controls above the tray's line of sight.
- **Getting the emulator to run headless.** Chromium exposes a WebXR object it can't actually start, so IWER refused to install. The emulator's dev UI also owns the hand poses and overwrites them every frame, so our script drives its own transform handles.
- **Two copies of three.js.** The emulator's synthetic environment pulled in an older three, which crashed materials (`material.onBuild is not a function`). A single pinned version fixed it.
- **Designing for sitting.** Tray height, tilt, reach and where furniture lands were all tuned so nothing needs you to stand, lean or turn around.

## Accomplishments that we're proud of

- The whole experience is **fully usable with hands, end to end**, and verified step by step in Meta's emulator by an automated test.
- Furniture that is **real**: true dimensions, real joints, materials that change in one pinch. Every model, every style and the VR living room were generated with Aholo.
- **Zero-friction start:** a URL in the Quest Browser. No store, no install, no sign-in.
- Furnishing an empty apartment piece by piece (rug, then sofa against the wall facing the TV, then coffee table, armchair by the window, plant in the corner) feels like real planning, not a toy.

## What we learned

- Hand input needs different rules from a mouse: act on pinch-down, be forgiving about ray drift, and keep targets out of each other's line of fire.
- Seated XR is a layout problem first. Lap-height UI and furniture placed ahead of you change how comfortable the whole thing feels.
- Pre-generating with AI makes it usable in the headset. The generative power goes into the assets, not into wait times on the device.
- IWER is good enough to build and test a full hand-tracked experience before putting on a headset, as long as you drive its hands programmatically.

## What's next for ReRoom MR

- Tune on a physical Quest 3: tray height, pinch thresholds, passthrough lighting.
- Snap furniture to the real floor and walls with WebXR plane detection and hit-test.
- Scan your room with a phone in the ReRoom web studio, then walk that scanned room on Quest.
- Generate a new piece in the headset from a spoken description or a product photo.
- Share a furnished room as a link anyone can open on their own Quest, so a couple can plan a room together.
- A retailer mode, where a store's catalogue drops straight into a customer's living room at true size.
