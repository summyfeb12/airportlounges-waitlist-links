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
| `waitlist_url` | `string` | Conditional | Working HTTPS link to a **free real-time queue** — join now, get called. | `"https://waitwhile.com/locations/..."` |
| `booking_url` | `string` | Conditional | Working HTTPS link to an **advance reservation** for a chosen date and time, on the operator's own site. | `"https://oak.book.escapelounges.com/lounges/dates/"` |
| `booking_cost` | `string` | Conditional | `"cash"`, `"credit"` or `"free"` — see below. Required whenever `booking_url` is present. | `"cash"` |
| `notes` | `string` | Conditional | Timing restrictions, entry rules, or in-app path instructions (required if `access_method` is `"app"`). | `"Join waitlist via Fly Delta App > Airport Lounge Access."` |
| `last_verified` | `string` | **Yes** | Date link was tested (`YYYY-MM-DD`) | `"2026-08-27"` |

### 💡 Access Methods & QR Codes:
- **`web` (Default)**: Any queue with a public HTTPS URL (e.g. Waitwhile, WaitWell, online reservation). If a lounge posts a QR code on a door placard that opens a web queue link in your phone's browser, extract the URL and submit it as `access_method: "web"`.
### Queue or booking — the two URL fields

A lounge may have either, both, or neither:

- **`waitlist_url`** is a free real-time queue. You join, you walk away, you get a text. This is what the project is for.
- **`booking_url`** is an advance reservation for a date and time. It usually costs something, which is why it is a separate field rather than a flavour of the same one.

Aspire San Diego has both: a WaitWell queue at the door and an Aspire booking page online. One row, two fields.

### `booking_cost` — why it is not a boolean

Booking is not simply "paid". A Priority Pass or DragonPass member pre-booking is spending a **membership credit**, and pays cash only if they are short of credits on the day. Aspire's own FAQ:

> "If you have reserved for more than one person, but do not have enough credits on your card for this on the day, you will be asked to pay the walk-up price at the lounge or you will be denied entry."

So three values:

| value | meaning |
|---|---|
| `cash` | Money to hold the slot — Escape Lounges, Plaza Premium, The Grand Lounge Elite |
| `credit` | Settled against a Priority Pass / DragonPass / Dreamfolks credit; cash only if short |
| `free` | A reservation that costs nothing |

If you cannot confirm which, leave `booking_url` out rather than guessing. Telling someone a booking is free when it is not is worse than not listing it.

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
- `Aspire`
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
4. **Validate your data locally**:
   ```bash
   npm test
   ```
   > 💡 **Note:** You only need to edit `data/lounges.json`. You do **not** need to build or commit `README.md` or PDF files — our automated CI pipeline regenerates all tables, search apps, and PDF exports automatically when your PR is merged.

   `npm test` sorts the dataset for you if your entry landed out of order, so ordering is never something you have to fix by hand — just commit the result. `npm run build` formats the data file and nothing else. If you want the README, web app and PDF locally, `npm run build:assets` generates them, but do not commit them.

5. **Commit your changes and open a Pull Request**.

---

## 🛡️ PR Validation Rules

All Pull Requests trigger an automated CI check (`.github/workflows/validate-pr.yml`). The PR check will fail if:
1. Schema validation fails on `data/lounges.json`.
2. Any `id` doesn't follow the `<iata>-<terminal>-<slug>` convention or is a duplicate.
3. Any `waitlist_url` or `booking_url` is not a valid HTTPS URL.
4. A `booking_url` is present without a `booking_cost`, or the reverse.
5. The dataset is out of sort order (sorted by `airport_code` ASC, then `id` ASC).
