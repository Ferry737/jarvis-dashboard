<div align="center">

# JARVIS Dashboard

**A voice-first AI copilot dashboard that runs 24/7 on free-tier models.**
Talk to it, watch the fleet, and keep your assistant one tap away — hosted free on GitHub Pages, proxied through a free Cloudflare Worker.

[![Live](https://img.shields.io/badge/Live-GitHub%20Pages-00d4aa?style=for-the-badge&logo=githubpages&logoColor=white)](https://ferry737.github.io/jarvis-dashboard/)
[![Models](https://img.shields.io/badge/Models-15%20%C2%B7%2012%20free%20tier-00d4aa?style=for-the-badge)](./worker/worker.js)
[![Backend](https://img.shields.io/badge/Backend-Cloudflare%20Worker-F38020?style=for-the-badge&logo=cloudflareworkers&logoColor=white)](./worker/)
[![Cost](https://img.shields.io/badge/Running%20cost-%240-brightgreen?style=for-the-badge)](#-why-free)

[**Open the dashboard →**](https://ferry737.github.io/jarvis-dashboard/) · [How it works](#-how-it-works) · [Deploy your own](#-deploy-your-own)

</div>

---

## ✨ What it does

| | |
|---|---|
| 🎙 **Voice first** | Push-to-talk and hands-free conversation in the browser — speak, listen, repeat. No app install. |
| 💬 **Multi-model chat** | One chat box, **15 models** across OpenRouter, Nous, Kilo and Inception — 12 on free tiers. Switch model mid-session. |
| 🛰 **Fleet telemetry** | Live panel of every model and provider — status, latency, and which one is answering. |
| 🧰 **12 quick tools** | Common actions (search, summarize, draft, code…) wired as one-tap prompts. |
| 🧠 **Memory** | Session memory panel so the assistant keeps context across the day. |
| 🌌 **Orbital hero** | An animated orbital core that reacts while JARVIS is listening or speaking. |

## 🧠 The free model fleet

| Provider | Models |
|---|---|
| **OpenRouter** (`:free`) | Nemotron 3 Ultra 550B · Gemma 4 31B · Nemotron 3 Nano Omni 30B · Nemotron 3.5 Super VL · Ling 3.2 Flash · LFM-3 1.7B · Flint v1.0 · ERNIE 5.5 Flash |
| **Nous** | Hunyuan 4 Flash · Solar Mini 4 · Longcat 2.5 · Step 3.7 Flash |
| **Kilo** | Kilo Auto Router (free) |
| **[Inception](https://inceptionlabs.ai)** | Mercury 3 · Mercury 2 · Mercury 2.5 *(paid tier; optional — omit the key and the rest still works)* |

The authoritative list lives in [`worker/worker.js`](./worker/worker.js) → `MODEL_PROVIDERS`.

## 🏗 How it works

```
Browser (GitHub Pages)                Cloudflare Worker (free tier)          Model providers
┌────────────────────┐   POST /api/chat  ┌─────────────────────────┐         ┌──────────────┐
│  index.html        │ ─────────────────▶ │  worker.js               │ ──────▶ │ OpenRouter   │
│  · voice (Web      │                   │  · picks provider by     │         │ Nous         │
│    Speech API)     │ ◀──────────────── │    model id              │ ◀────── │ Kilo         │
│  · chat UI         │    SSE / JSON     │  · injects API key from  │         │ Inception    │
│  · telemetry       │                   │    env (never in code)   │         └─────────────────────────────┘
└────────────────────┘                   │  · CORS + rate guard   │                                          └───────────────────────────┘
```

- **Front-end:** a single `index.html` — no build step, no framework. Syne + JetBrains Mono, dark glass theme.
- **Back-end:** one Cloudflare Worker. API keys live only as **Worker secrets**, never in the repo or the page.
- **Hosting:** GitHub Pages for the UI (free), Cloudflare Workers free tier for the proxy (free).

## 🚀 Deploy your own

**1. Fork this repo** and enable *Settings → Pages → Deploy from branch → `main` / `/`*.

**2. Deploy the Worker**

```bash
cd worker
npm install -g wrangler      # or: npx wrangler
wrangler login
wrangler secret put OPENROUTER_API_KEY
wrangler secret put NOUS_API_KEY
wrangler secret put KILOCODE_API_KEY
wrangler secret put INCEPTION_API_KEY
wrangler deploy
```

**3. Point the dashboard at your Worker** — edit `API_BASE` near the top of `index.html` to your `https://<name>.<you>.workers.dev` address.

That's it. Success looks like: open the Pages URL, tap the orb, speak, and get a spoken answer back.

## 📁 Repository layout

```
jarvis-dashboard/
├── index.html            ← the whole dashboard (UI, voice, chat, telemetry)
├── worker/
│   ├── worker.js         ← /api/chat proxy + model map
│   ├── wrangler.toml     ← Worker config (no secrets)
│   ├── package.json      ← deploy / secrets helper scripts
│   └── .env.example      ← which keys the Worker needs
└── README.md
```

## 💸 Why free

GitHub Pages and Cloudflare Workers are free at this scale, and every model in the fleet has a `:free` tier. The only variable cost is your time. If a provider drops its free tier, swap the model id in `MODEL_PROVIDERS` — nothing else changes.

---

<div align="center">
<sub>Built by <a href="https://github.com/Ferry737">Ferry</a> · part of the <a href="https://github.com/Ferry737/jarvis">JARVIS</a> family</sub><br>
<sub>⭐ if it saved you a server bill</sub>
</div>
