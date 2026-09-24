# Typhelper

Typhelper is a privacy-first typing coach for people who want to build touch-typing habits without needing an account.

## Built for this project

- JavaScript + TypeScript frontend
- CSS UI with a deliberately simple, low-distraction layout
- Adaptive practice that weights words toward characters the learner misses
- WebNN scoring path with NPU → GPU → CPU preference and a deterministic local fallback
- WebLLM for a larger local language-model coaching pass through WebGPU
- On-device camera vision for gaze direction during check-ins
- Clerk sign-in/sign-up is optional and only used for syncing aggregate progress
- Python trainer scaffold for later compact score-head training

## 30-minute check-ins

The site tracks active interaction rather than counting background time. At 30 minutes, a check-in can be started. Camera permission is required for the check-in. The face-landmark model runs in the browser and the quiz pauses when the gaze classifier detects a downward keyboard-looking pose.

The quiz produces a 0–100 score from typing accuracy, speed, consistency, correction behavior, focus pauses, rhythm, latency, and control. It then shows concrete things to improve.

## Local AI / privacy

The language-model coaching path uses WebLLM, which runs model inference inside the browser with WebGPU instead of sending the prompt to an inference server. The first model load can be large because model weights must be downloaded and cached by the browser.

The camera path uses MediaPipe Tasks Vision. Its documentation states that input data is processed on-device and is not sent to Google servers, while also noting that API performance/utilization metrics may be sent. Typing-Pro never stores camera frames in local progress or Clerk metadata.

Without Clerk configured, progress is stored only in localStorage on the current device. With Clerk configured, only aggregate practice progress and the private character skill map are synced.

## Clerk

Set `VITE_CLERK_PUBLISHABLE_KEY` in Vercel or a local `.env` file. The save-progress flow intentionally asks three times before the fourth-stage sign-up action appears. The final yes action playfully dodges the pointer but remains keyboard focusable.

## Development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Python score-head trainer:

```bash
python scripts/train_score_head.py dataset.jsonl
```

## Deployment

The project is designed for Vercel as a Vite/React static site. Camera access requires a secure context such as HTTPS.


## Vercel deployment

The `unblockedgames` Vercel team is the intended deployment target. This repo includes a manual GitHub deployment workflow that uses `VERCEL_TOKEN` and the `unblockedgames` scope. You can also import the repository directly into that team with Vercel's Git import flow:

https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpalabok13418%2FTyping-Pro&teamSlug=unblockedgames&project-name=typing-pro

Clerk still needs `VITE_CLERK_PUBLISHABLE_KEY` configured in the Vercel project environment for sign-up/sign-in to be active.
