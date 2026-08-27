# Contributing to Airport Lounges Waitlist Links ✈️

Thank you for contributing! This repository helps travelers skip waiting in physical airport queues by crowdsourcing direct digital waitlist, check-in, and reservation URLs.

---

## 📋 Table of Contents
- [Lounge ID Naming Standard](#-lounge-id-naming-standard)
- [Data Fields & Schema](#-data-fields--schema)
- [Step-by-Step Contribution Guide](#-step-by-step-contribution-guide)
- [PR Validation Rules](#-pr-validation-rules)
- [Local Development & Testing](#-local-development--testing)

---

## 🏷️ Lounge ID Naming Standard

To ensure consistency and prevent collisions, every entry in `data/lounges.json` **MUST** follow our standardized kebab-case identifier format:

```text
<iata-code-lower>-<terminal-or-concourse-lower>-<lounge-slug-lower>
```

### 📐 Rules for `id`:
1. **Lowercase alphanumeric only**: Use only `a-z`, `0-9`, and hyphens (`-`). No uppercase, underscores, or spaces (`/`, `&`, etc.).
2. **Airport Code Prefix**: Must strictly match the lowercase 3-letter IATA code (e.g. `jfk-`, `ord-`, `sfo-`).
3. **Terminal / Concourse Slug**: Use short, recognizable identifiers:
   - Terminal 4 $\rightarrow$ `t4`
   - Terminal B $\rightarrow$ `tb`
   - Concourse C $\rightarrow$ `tc`
   - Main Terminal $\rightarrow$ `tm`
   - Tom Bradley International Terminal $\rightarrow$ `tb`
4. **Lounge Slug**: Concise name of the network or lounge:
   - Delta Sky Club $\rightarrow$ `delta-sky-club`
   - American Express Centurion Lounge $\rightarrow$ `amex-centurion`
   - Chase Sapphire Lounge by The Club $\rightarrow$ `chase-sapphire-lounge`
   - Capital One Lounge $\rightarrow$ `capital-one`
   - Swissport Lounge $\rightarrow$ `swissport`

### ✅ Valid Examples:
| Airport | Terminal | Lounge | Valid `id` |
|---|---|---|---|
| JFK | Terminal 4 | Delta Sky Club | `jfk-t4-delta-sky-club` |
| SFO | Terminal 1 | The Centurion Lounge | `sfo-t1-amex-centurion` |
| LGA | Terminal B | Chase Sapphire Lounge | `lga-tb-chase-sapphire-lounge` |
| DFW | Terminal D | Capital One Lounge | `dfw-td-capital-one` |
| ORD | Terminal 5 | Swissport Lounge | `ord-t5-swissport` |

---

## 🗂️ Data Fields & Schema

Entries in [`data/lounges.json`](data/lounges.json) must include the following attributes:

| Field | Type | Required | Description | Example |
|---|---|---|---|---|
| `id` | `string` | **Yes** | Standardized kebab-case ID (see rules above) | `"jfk-t4-delta-sky-club"` |
| `airport_code` | `string` | **Yes** | 3-letter uppercase IATA code | `"JFK"` |
| `airport_name` | `string` | **Yes** | Official airport name | `"John F. Kennedy International Airport"` |
| `city` | `string` | **Yes** | City location | `"New York"` |
| `country` | `string` | **Yes** | 2-letter uppercase ISO country code | `"US"` |
| `terminal` | `string` | **Yes** | Terminal, concourse, or gate location | `"Terminal 4, Concourse B, near Gate B32"` |
| `lounge_name` | `string` | **Yes** | Full lounge title | `"Delta Sky Club"` |
| `network` | `string` | **Yes** | One of the supported networks (see below) | `"Delta Sky Club"` |
| `access_method` | `string` | No | `"web"` (default, for all public URLs & QR placard links) or `"app"` (native mobile app only) | `"web"` |
| `waitlist_url` | `string` | Conditional | Working HTTPS queue or booking link. Required when `access_method` is `"web"`; optional when `"app"`. | `"https://..."` |
| `link_type` | `string` | No | `"queue"` (default, real-time waitlist) or `"reservation"` (advance booking form) | `"queue"` |
| `notes` | `string` | Conditional | Timing restrictions, entry rules, or in-app path instructions (required if `access_method` is `"app"`). | `"Join waitlist via Fly Delta App > Airport Lounge Access."` |
| `last_verified` | `string` | **Yes** | Date link was tested (`YYYY-MM-DD`) | `"2026-08-27"` |

### 💡 Access Methods & QR Codes:
- **`web` (Default)**: Any queue with a public HTTPS URL (e.g. Waitwhile, WaitWell, online reservation). If a lounge posts a QR code on a door placard that opens a web queue link in your phone's browser, extract the URL and submit it as `access_method: "web"`.
- **`app`**: Cardmember/airline queues that exist strictly inside a closed mobile application (e.g. Amex Centurion in the Amex App, Delta Sky Club in the Fly Delta App). For these, set `access_method: "app"`, leave `waitlist_url` optional, and describe the exact in-app tap steps in `notes`.

### Supported `network` values:
- `American Express Centurion`
- `Chase Sapphire Lounge`
- `Capital One Lounge`
- `Delta Sky Club`
- `United Club`
- `American Airlines Admirals Club`
- `Priority Pass`
- `Plaza Premium`
- `Escape Lounges`
- `The Club`
- `Air France / KLM Lounge`
- `British Airways Galleries`
- `Independent`

---

## 🚀 Step-by-Step Contribution Guide

1. **Fork the repository** to your GitHub account.
2. **Clone your fork**:
   ```bash
   git clone https://github.com/<your-username>/airportlounges-waitlist-links.git
   cd airportlounges-waitlist-links
   npm install
   ```
3. **Add or update entries** in [`data/lounges.json`](data/lounges.json).
4. **Run build & validation**:
   ```bash
   # Rebuilds README table, Web Search App, and PDF
   npm run build

   # Validates schema, ID rules, URLs, and sorting
   npm run validate
   ```
5. **Commit your changes and open a Pull Request**.

---

## 🛡️ PR Validation Rules

All Pull Requests trigger an automated CI check (`.github/workflows/validate-pr.yml`). The PR check will fail if:
1. Schema validation fails on `data/lounges.json`.
2. Any `id` doesn't follow the `<iata>-<terminal>-<slug>` convention or is a duplicate.
3. Any `waitlist_url` is not a valid HTTPS URL.
4. The dataset is out of sort order (run `npm run build` to fix).
5. The `README.md` table is out of sync with `data/lounges.json`.
