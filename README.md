# Avijit Goswami — Creative Developer Portfolio

An award-winning, motion-graphics-driven portfolio website designed to showcase creative development, extreme attention to motion fidelity, and a robust scalable backend. 

Live at: **[avijitgoswami.in](https://avijitgoswami.in)**

![Portfolio Preview](https://kqfazxygftmujpjerlce.supabase.co/storage/v1/object/public/assets/avijit-photo.webp)

## ✨ Key Features

### 🎨 Motion & Interaction Design
- **High-Fidelity Animations**: Smooth, hardware-accelerated scroll choreography and micro-interactions.
- **Dynamic "Open to Work" Badge**: Features a rotating conic-gradient border, glassmorphism, radar-pulse rings, and an auto-shimmer effect for a premium, award-winning aesthetic.
- **Custom Mouse Follower**: Interactive cursor that reacts to hover states and clickable elements.
- **Morphing Text**: Dynamic text scrambling and decoding effect in the hero section.
- **Performant Rendering**: Uses `requestAnimationFrame`, `will-change`, and efficient CSS transforms to maintain 60FPS.

### ⚙️ Scalable Backend (Supabase)
- **Headless Content Management**: Text content is dynamically loaded from a `site_content` table, allowing instant updates without code redeployment.
- **Secure Contact Form**: Spam-protected (honeypot), rate-limited contact form backed by Supabase row-level security (RLS).
- **Visitor Tracking**: Passive analytics powered by anonymous browser fingerprinting (`localStorage` UUIDs) tracking unique visitors and page views without heavy external scripts.
- **Storage CDN**: Assets and images are served directly from Supabase Storage for fast, global delivery.

### 🔔 Automated Discord Integrations (Edge Functions)
- **Instant Notifications**: Form submissions trigger a PostgreSQL database trigger (`on_contact_insert`), which securely calls a Deno Edge Function (`notify-discord`) to send a rich embed to a Discord channel.
- **Daily Analytics Digest**: A `pg_cron` scheduled job runs daily at 12:00 PM IST to trigger the `daily-stats` Edge Function, summarizing unique visitors, total page views, and top pages in Discord.
- **Secure Vault integration**: Webhook URLs are securely stored in the Supabase Vault and accessed via an exclusive `SECURITY DEFINER` RPC function by Edge Functions.

### 🚀 CI/CD & Deployment
- **GitHub Actions**: Automated continuous integration triggers a deployment pipeline on every push to the `main` branch.
- **Vercel Edge Network**: Deployed securely on Vercel with custom domain mapping (`avijitgoswami.in`).

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3 (Vanilla, CSS Variables, Glassmorphism), Vanilla JavaScript (ES6+).
- **Backend & Database**: Supabase (PostgreSQL, Row Level Security, Vault, `pg_cron`, Triggers).
- **Serverless Compute**: Deno Edge Functions.
- **Deployment & Hosting**: GitHub Actions, Vercel.

## 📁 Project Structure

```text
├── index.html           # Main structure, semantic tags, and content placeholders
├── style.css            # Custom CSS variables, animations, and responsive layout
├── script.js            # Supabase initialization, scroll logic, GSAP-like custom animations
├── .github/workflows/   # CI/CD deployment pipeline to Vercel
└── supabase/
    └── functions/       # Deno Edge Functions (notify-discord, daily-stats, upload-assets)
```

## 🔒 Security

- **Row Level Security (RLS)**: Enforced on all Supabase tables (`page_visits`, `contact_submissions`, `site_content`) restricting public operations to `INSERT` or strictly controlled `SELECT`.
- **Honeypot Strategy**: Invisible honeypot fields to trap bots on the contact form.
- **Secret Management**: Third-party credentials (like Discord Webhooks) never touch the client side or environment variables; they are encrypted in the Supabase Vault.

## 📄 License & Usage

Designed and built by **Avijit Goswami**. All rights reserved. Do not clone or copy the design without explicit permission.
