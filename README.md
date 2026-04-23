# Crypto Revolution Records

> The first tokenized AI-creator music record label on the blockchain.
> Founded by **OZ The Crypto Goat**.

A single-page, scroll-driven brand site — heavy 3D, smooth scroll, gold-on-black luxury palette.

## What's in the box

| Section | What it does |
|---|---|
| Hero | Procedural Gadsden-style Bitcoin B coiled by a rattlesnake (Three.js + UnrealBloom), scroll-driven camera |
| Press strip | "As covered by" feature logos |
| Manifesto | The Crypto Revolution statement + contact card |
| Live market | Live crypto prices via the public CoinGecko API + auto-refresh, with offline fallback |
| $CR tokenomics | Animated Canvas 2D donut chart + supply stats (burn / lock / stake) |
| Roster | Procedural NFT cards with hover-tilt parallax |
| Listen | Web Audio synth player + circular visualizer (no audio files needed) |
| Roadmap | Phased timeline |
| Buy | Wallet connect (EIP-1193) + real Stripe credit-card checkout, live quoting |
| FAQ | Accordion |
| Newsletter | Inline subscribe with validation |
| Cookie banner | Dismissable, persists in localStorage |

## Stack

- Vanilla JavaScript (ES modules) — no framework, no build step
- [Three.js](https://threejs.org/) (CDN via importmap) for the 3D scene + post-processing
- [Lenis](https://github.com/darkroomengineering/lenis) for smooth scroll
- [Stripe.js](https://stripe.com/docs/js) + a tiny Node server for real card checkout
- Web Audio API for the procedural music
- Canvas 2D for tokenomics donut + visualizer + NFT cards
- CoinGecko free API for live crypto prices

## Run it

```bash
npm install
cp .env.example .env   # fill in your Stripe keys
npm run dev
# then open http://localhost:5180
```

The checkout requires `STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY` in `.env`. Without them `/api/buy/easy` returns 503.

## File map

```
index.html         # entry, importmap, page structure
styles.css         # design system + all section styles
dev-server.mjs     # Node static server + Stripe endpoints
src/main.js        # orchestrator, smooth scroll, reveal observers
src/scene.js       # Three.js: Bitcoin+snake emblem, particles, rings, bloom, scroll camera
src/crypto.js      # live CoinGecko ticker + market grid (Yahoo Finance links)
src/tokenomics.js  # animated $CR donut chart + supply count-ups
src/roster.js      # procedural NFT cards + hover-tilt
src/music.js       # Web Audio synth player + circular visualizer
src/roadmap.js     # phased timeline
src/buy.js         # wallet connect + Stripe Payment Element (card)
src/extras.js      # press strip, FAQ, newsletter, socials, cookie banner
```
