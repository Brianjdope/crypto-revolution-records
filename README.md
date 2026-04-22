# Crypto Revolution Records

> The first tokenized AI-creator music record label on the blockchain.
> Founded by **OZ The Crypto Goat**.

A single-page, scroll-driven brand site in the style of igloo.inc — heavy 3D, smooth scroll, gold-on-black luxury palette. Zero build step.

## What's in the box

| Section | What it does |
|---|---|
| Hero | 3D golden goat (procedural Three.js + UnrealBloom) with a scroll-driven camera |
| Press strip | "As covered by" feature logos |
| Manifesto | Three pillars of the label |
| Live market | Live crypto prices via the public CoinGecko API + auto-refresh, with offline fallback |
| $OZ tokenomics | Animated Canvas 2D donut chart |
| Roster | Procedural NFT cards with hover-tilt parallax |
| Listen | Web Audio synth player + circular visualizer (no audio files needed) |
| Roadmap | Phased timeline |
| Buy | Wallet connect (EIP-1193) + Stripe / Apple Pay placeholder, with live quoting |
| FAQ | Accordion |
| Newsletter | Inline subscribe with validation |
| Cookie banner | Dismissable, persists in localStorage |

## Stack

- Vanilla JavaScript (ES modules) — no framework, no build step
- [Three.js](https://threejs.org/) (CDN via importmap) for the 3D scene + post-processing
- [Lenis](https://github.com/darkroomengineering/lenis) for smooth scroll
- Web Audio API for the procedural music
- Canvas 2D for tokenomics donut + visualizer + NFT cards
- CoinGecko free API for live crypto prices

All third-party JS is loaded from `unpkg.com` via an import map — no `npm install`, no bundler.

## Run it

```bash
# any static server works
python3 -m http.server 5180
# then open http://localhost:5180
```

Or use the included Claude Code preview config in `.claude/launch.json`.

## File map

```
index.html         # entry, importmap, page structure
styles.css         # design system + all section styles
src/main.js        # orchestrator, smooth scroll, reveal observers
src/scene.js       # Three.js: goat, particles, rings, bloom, scroll-driven camera
src/crypto.js      # live CoinGecko ticker + market grid
src/tokenomics.js  # animated $OZ donut chart
src/roster.js      # procedural NFT cards + hover-tilt
src/music.js       # Web Audio synth player + circular visualizer
src/roadmap.js     # phased timeline
src/buy.js         # wallet connect + Stripe / Apple Pay placeholder
src/extras.js      # press strip, FAQ, newsletter, socials, cookie banner
```

## Notes

This is a brand / marketing demo. The "buy" flow does not execute real transactions and `$OZ` is illustrative — it would need a real Stripe + WalletConnect integration to ship.
