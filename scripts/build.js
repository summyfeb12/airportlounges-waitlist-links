const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const dataPath = path.join(__dirname, '..', 'data', 'lounges.json');
const readmePath = path.join(__dirname, '..', 'README.md');

// Booking cost label helper: explicitly notes if there may be a charge/cost or if free
function formatBookingCell(l) {
  if (!l.booking_url) return '—';
  
  let costLabel = '';
  if (l.booking_cost === 'free') {
    costLabel = '<br><sub>(Free)</sub>';
  } else if (l.booking_cost === 'credit') {
    costLabel = '<br><sub>(Uses membership credit)</sub>';
  } else if (l.booking_cost === 'cash') {
    costLabel = '<br><sub>(Fee / Paid booking)</sub>';
  } else {
    costLabel = '<br><sub>(May have fees)</sub>';
  }

  return `<a href="${l.booking_url}" target="_blank" rel="noopener noreferrer"><b>Reserve</b> ↗</a>${costLabel}`;
}

function formatWaitlistCell(l) {
  if (l.access_method === 'app') {
    if (l.waitlist_url) {
      return `<a href="${l.waitlist_url}" target="_blank" rel="noopener noreferrer"><b>📱 In-App Info</b> ↗</a>`;
    }
    return `<span>📱 In-App Only</span>`;
  }
  if (l.waitlist_url) {
    return `<a href="${l.waitlist_url}" target="_blank" rel="noopener noreferrer"><b>Join Waitlist</b> ↗</a>`;
  }
  return '—';
}

const distDir = path.join(__dirname, '..', 'dist');
const assetsDir = path.join(__dirname, '..', 'assets');

// Ensure output directories
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

function sortLounges(lounges) {
  return [...lounges].sort((a, b) => {
    const codeDiff = a.airport_code.localeCompare(b.airport_code);
    if (codeDiff !== 0) return codeDiff;
    return a.id.localeCompare(b.id);
  });
}

function formatNotesCell(notes) {
  if (!notes || notes.trim() === '' || notes.trim() === '-') return '—';
  const cleanNotes = notes.replace(/\|/g, '\\|').trim();
  return `<details><summary><b>View Notes</b></summary>${cleanNotes}</details>`;
}

function getCountryFlag(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

function generateMarkdownTable(lounges) {
  let md = '';

  // 1. Quick Jump Navigation Bar by Country/Airport & Network
  const countriesMap = {};
  lounges.forEach((l) => {
    const cc = l.country.toUpperCase();
    if (!countriesMap[cc]) {
      let name = cc;
      try {
        name = regionNames.of(cc) || cc;
      } catch {
        name = cc;
      }
      countriesMap[cc] = {
        code: cc,
        name,
        flag: getCountryFlag(cc),
        airports: new Set(),
      };
    }
    countriesMap[cc].airports.add(l.airport_code);
  });

  const sortedCountries = Object.values(countriesMap).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const uniqueNetworks = [...new Set(lounges.map((l) => l.network))].sort();

  md += `### ⚡ Quick Navigation / Jump Filter\n\n`;
  md += `**By Country & Airport:**\n`;
  sortedCountries.forEach((c) => {
    const airportLinks = [...c.airports]
      .sort()
      .map((code) => `[\`${code}\`](#${code.toLowerCase()})`)
      .join(' · ');
    md += `- ${c.flag} **${c.name}** (\`${c.code}\`): ${airportLinks}\n`;
  });
  md += `\n`;
  md += `**By Network:**\n`;
  md += uniqueNetworks
    .map(
      (net) =>
        `[\`${net}\`](#${net.toLowerCase().replace(/[^a-z0-9]+/g, '-')})`
    )
    .join(' · ');
  md += `\n\n---\n\n`;

  // 2. Main Lounges Table (Grouped by Airport)
  md += `### 🛫 Lounges Directory (Sorted by Airport)\n\n`;
  md += `| Airport | Lounge & Network | Terminal / Location | Digital Waitlist | Advance Booking | Notes | Verified |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- | :---: |\n`;

  let currentAirport = '';
  lounges.forEach((l) => {
    const waitlistDisplay = formatWaitlistCell(l);
    const bookingDisplay = formatBookingCell(l);
    const notesDisplay = formatNotesCell(l.notes);
    const verifiedDisplay = `\`${l.last_verified}\``;

    // Anchor on first lounge of each airport; always show code and city consistently
    let airportDisplay = `**${l.airport_code}**<br>_${l.city}_`;
    if (l.airport_code !== currentAirport) {
      airportDisplay = `<a id="${l.airport_code.toLowerCase()}"></a>${airportDisplay}`;
      currentAirport = l.airport_code;
    }

    const loungeAndNetwork = `**${l.lounge_name.replace(/\|/g, '\\|')}**<br><sub>\`${l.network}\`</sub>`;

    md += `| ${airportDisplay} | ${loungeAndNetwork} | ${l.terminal.replace(/\|/g, '\\|')} | ${waitlistDisplay} | ${bookingDisplay} | ${notesDisplay} | ${verifiedDisplay} |\n`;
  });

  md += `\n---\n\n`;

  // 3. Network-Grouped View
  md += `### 🌐 Lounges by Network\n\n`;
  uniqueNetworks.forEach((net) => {
    const netSlug = net.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const netLounges = lounges.filter((l) => l.network === net);
    md += `<details id="${netSlug}">\n`;
    md += `<summary><b>${net} (${netLounges.length})</b></summary>\n\n`;
    md += `| Airport | Lounge | Terminal | Digital Waitlist | Advance Booking | Notes |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    netLounges.forEach((l) => {
      const waitlistDisplay = formatWaitlistCell(l);
      const bookingDisplay = formatBookingCell(l);
      const notesDisplay = formatNotesCell(l.notes);
      md += `| **${l.airport_code}** | **${l.lounge_name.replace(/\|/g, '\\|')}** | ${l.terminal.replace(/\|/g, '\\|')} | ${waitlistDisplay} | ${bookingDisplay} | ${notesDisplay} |\n`;
    });
    md += `\n</details>\n\n`;
  });

  return md;
}

function updateReadme(tableContent, totalCount) {
  let readme = fs.readFileSync(readmePath, 'utf8');

  // Insert or update badges / counters
  const startMarker = '<!-- TABLE_START -->';
  const endMarker = '<!-- TABLE_END -->';

  if (!readme.includes(startMarker) || !readme.includes(endMarker)) {
    // If template doesn't exist yet, we inject standard layout
    readme = `# ✈️ Airport Lounges Waitlist Links

[![Lounges Count](https://img.shields.io/badge/Lounges_Tracked-${totalCount}-blue.svg?style=for-the-badge&logo=aer-lingus)](data/lounges.json)
[![Download PDF](https://img.shields.io/badge/Download-PDF_Directory-red.svg?style=for-the-badge&logo=adobe-acrobat-reader)](assets/lounges.pdf)
[![Live Interactive Search](https://img.shields.io/badge/Search_%26_Filter-Live_Web_App-brightgreen.svg?style=for-the-badge&logo=safari)](https://summyfeb12.github.io/airportlounges-waitlist-links/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-orange.svg?style=for-the-badge)](CONTRIBUTING.md)
[![License: Unlicense](https://img.shields.io/badge/License-Unlicense-blue.svg?style=for-the-badge)](LICENSE)

> **Crowd-sourced repository of digital waitlist links and check-in URLs for airport lounges worldwide.**
> Skip standing in long physical queues by accessing the direct queueing links right from your phone before arriving at the gate.

---

### 📥 Export & Quick Access Options
- 📄 <a href="assets/lounges.pdf" target="_blank" rel="noopener noreferrer"><b>Download PDF Quick-Sheet</b></a> (Printable / Offline access)
- 🔍 <a href="https://summyfeb12.github.io/airportlounges-waitlist-links/" target="_blank" rel="noopener noreferrer"><b>Interactive Search & Filter Web App</b></a> (Instant mobile search by airport, terminal, or network)
- 💾 <a href="data/lounges.json" target="_blank" rel="noopener noreferrer"><b>Raw JSON Dataset</b></a>

---

${startMarker}
${tableContent}
${endMarker}

---

## 🤝 Contributing

Found a new lounge waitlist link or notice an expired queue URL? We'd love your contribution!

1. Check our **[ID Naming & Contributing Guidelines](CONTRIBUTING.md)**.
2. Edit [\`data/lounges.json\`](data/lounges.json) directly or submit a PR.
3. Test locally with \`npm test\`.

## ⚠️ Disclaimer

This repository and project are an independent, community-driven, crowd-sourced effort. It is **not affiliated with, endorsed by, or sponsored by** any airport, airline, lounge operator, financial institution, or credit card network (including but not limited to American Express, Chase, Capital One, Delta Air Lines, United Airlines, American Airlines, Priority Pass, Plaza Premium, or others). All trademarks, logos, and brand names are the property of their respective owners. Waitlist availability, queue times, entry eligibility, and rules are subject to change at the discretion of the individual lounge operators.

## 📜 License
This project is dedicated to the public domain under [The Unlicense](LICENSE).
`;
  } else {
    const startIndex = readme.indexOf(startMarker) + startMarker.length;
    const endIndex = readme.indexOf(endMarker);
    readme =
      readme.substring(0, startIndex) +
      '\n' +
      tableContent +
      '\n' +
      readme.substring(endIndex);
    
    // Update badge count if present
    readme = readme.replace(
      /Lounges_Tracked-\d+-blue/,
      `Lounges_Tracked-${totalCount}-blue`
    );
  }

  fs.writeFileSync(readmePath, readme, 'utf8');
  console.log('✅ README.md table successfully updated.');
}

function generateWebSearchApp(lounges) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Airport Lounges Waitlist Directory & Search</title>
  <meta name="description" content="Instant search and filtering for airport lounge digital waitlist links and mobile check-in queues.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: rgba(22, 30, 49, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --primary-gradient: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
      --accent: #10b981;
      --tag-bg: rgba(56, 189, 248, 0.12);
      --tag-text: #7dd3fc;
      --font-main: 'Plus Jakarta Sans', -apple-system, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      background-image: radial-gradient(circle at top right, rgba(56, 189, 248, 0.12), transparent 40%),
                        radial-gradient(circle at bottom left, rgba(129, 140, 248, 0.1), transparent 50%);
      color: var(--text);
      font-family: var(--font-main);
      min-height: 100vh;
      padding: 2rem 1rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    header {
      text-align: center;
      margin-bottom: 2.5rem;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      background: var(--tag-bg);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: var(--tag-text);
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: clamp(2rem, 4vw, 3rem);
      font-weight: 800;
      background: var(--primary-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.75rem;
      letter-spacing: -0.02em;
    }
    p.subtitle {
      color: var(--text-muted);
      font-size: 1.1rem;
      max-width: 650px;
      margin: 0 auto 1.5rem;
    }
    .actions-bar {
      display: flex;
      justify-content: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-bottom: 2rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1.25rem;
      border-radius: 12px;
      font-weight: 600;
      font-size: 0.95rem;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .btn-primary {
      background: var(--primary-gradient);
      color: #0f172a;
      border: none;
      box-shadow: 0 4px 20px rgba(56, 189, 248, 0.3);
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(56, 189, 248, 0.45);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text);
      border: 1px solid var(--card-border);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    .controls {
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 1.25rem;
      margin-bottom: 2rem;
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 1rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }
    @media (max-width: 768px) {
      .controls { grid-template-columns: 1fr; }
    }
    .input-field {
      width: 100%;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 0.75rem 1rem;
      color: var(--text);
      font-size: 0.95rem;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
    }
    .input-field:focus {
      border-color: var(--primary);
    }
    .stats-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      color: var(--text-muted);
      font-size: 0.9rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.25rem;
    }
    .card {
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .card:hover {
      transform: translateY(-4px);
      border-color: rgba(56, 189, 248, 0.4);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }
    .airport-code {
      font-family: var(--font-mono);
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--primary);
    }
    .network-badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.08);
      color: #cbd5e1;
    }
    .lounge-title {
      font-size: 1.15rem;
      font-weight: 700;
      margin-bottom: 0.35rem;
      color: #fff;
    }
    .terminal-info {
      font-size: 0.9rem;
      color: #cbd5e1;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .notes-box {
      font-size: 0.85rem;
      color: var(--text-muted);
      background: rgba(0, 0, 0, 0.25);
      border-radius: 8px;
      padding: 0.6rem 0.8rem;
      margin-bottom: 1.25rem;
      line-height: 1.4;
    }
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    .verified-text {
      font-size: 0.75rem;
      color: #64748b;
      font-family: var(--font-mono);
    }
    .link-btn {
      background: var(--primary-gradient);
      color: #0f172a;
      text-decoration: none;
      font-weight: 700;
      font-size: 0.85rem;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      transition: opacity 0.2s;
    }
    .link-btn:hover {
      opacity: 0.9;
    }
    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 4rem 1rem;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="badge">✈️ Open Source Community Directory</div>
      <h1>Airport Lounges Waitlist Directory</h1>
      <p class="subtitle">Search, filter, and access official digital waitlist & mobile check-in links before arriving at the lounge.</p>
      <div class="actions-bar">
        <a href="https://github.com/summyfeb12/airportlounges-waitlist-links" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">⭐ GitHub Repository</a>
        <a href="lounges.pdf" target="_blank" rel="noopener noreferrer" class="btn btn-primary">📄 Download PDF Directory</a>
      </div>
    </header>

    <div class="controls">
      <input type="text" id="searchInput" class="input-field" placeholder="🔍 Search airport code (JFK), city, terminal, or lounge...">
      <select id="networkSelect" class="input-field">
        <option value="">All Networks</option>
      </select>
      <select id="accessSelect" class="input-field">
        <option value="">All Access Types</option>
        <option value="web">Web Waitlist / Links</option>
        <option value="app">Mobile App Only</option>
      </select>
      <select id="sortSelect" class="input-field">
        <option value="airport_asc">Airport Code (A-Z)</option>
        <option value="airport_desc">Airport Code (Z-A)</option>
        <option value="name_asc">Lounge Name (A-Z)</option>
      </select>
    </div>

    <div class="stats-bar">
      <span id="resultsCount">Loading lounges...</span>
      <span>Community Verified Links</span>
    </div>

    <div id="loungesGrid" class="grid"></div>
  </div>

  <script>
    const lounges = ${JSON.stringify(lounges, null, 2)};
    const grid = document.getElementById('loungesGrid');
    const searchInput = document.getElementById('searchInput');
    const networkSelect = document.getElementById('networkSelect');
    const accessSelect = document.getElementById('accessSelect');
    const sortSelect = document.getElementById('sortSelect');
    const resultsCount = document.getElementById('resultsCount');

    // Populate network options
    const networks = [...new Set(lounges.map(l => l.network))].sort();
    networks.forEach(net => {
      const opt = document.createElement('option');
      opt.value = net;
      opt.textContent = net;
      networkSelect.appendChild(opt);
    });

    function render() {
      const q = searchInput.value.toLowerCase().trim();
      const selectedNet = networkSelect.value;
      const selectedAccess = accessSelect.value;
      const sortBy = sortSelect.value;

      let filtered = lounges.filter(l => {
        const matchesQuery = 
          l.airport_code.toLowerCase().includes(q) ||
          l.airport_name.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.lounge_name.toLowerCase().includes(q) ||
          l.terminal.toLowerCase().includes(q) ||
          (l.notes && l.notes.toLowerCase().includes(q));
        const matchesNet = !selectedNet || l.network === selectedNet;
        const matchesAccess = !selectedAccess || (l.access_method || 'web') === selectedAccess;
        return matchesQuery && matchesNet && matchesAccess;
      });

      // Sort
      filtered.sort((a, b) => {
        if (sortBy === 'airport_asc') return a.airport_code.localeCompare(b.airport_code) || a.id.localeCompare(b.id);
        if (sortBy === 'airport_desc') return b.airport_code.localeCompare(a.airport_code) || a.id.localeCompare(b.id);
        if (sortBy === 'name_asc') return a.lounge_name.localeCompare(b.lounge_name);
        return 0;
      });

      resultsCount.textContent = \`Showing \${filtered.length} of \${lounges.length} lounges\`;

      if (filtered.length === 0) {
        grid.innerHTML = \`<div class="empty-state">
          <h3>No lounges found matching "\${q}"</h3>
          <p style="margin-top: 0.5rem;">Try clearing your filters or search terms.</p>
        </div>\`;
        return;
      }

      grid.innerHTML = filtered.map(l => {
        const isApp = l.access_method === 'app';
        let actionButtons = [];
        
        if (isApp) {
          if (l.waitlist_url) {
            actionButtons.push(\`<a href="\${l.waitlist_url}" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="font-size: 0.8rem; padding: 0.4rem 0.75rem; border-radius: 8px;">📱 In-App Info ↗</a>\`);
          } else {
            actionButtons.push(\`<span class="network-badge" style="background: rgba(129, 140, 248, 0.2); color: #c7d2fe; font-size: 0.8rem; padding: 0.4rem 0.75rem;">📱 In-App Only</span>\`);
          }
        } else if (l.waitlist_url) {
          actionButtons.push(\`<a href="\${l.waitlist_url}" target="_blank" rel="noopener noreferrer" class="link-btn" style="font-size: 0.8rem; padding: 0.4rem 0.75rem;">Join Waitlist ↗</a>\`);
        }

        if (l.booking_url) {
          let costBadge = '';
          if (l.booking_cost === 'free') {
            costBadge = '<span style="font-size: 0.7rem; color: #10b981; margin-left: 0.3rem;">(Free)</span>';
          } else if (l.booking_cost === 'credit') {
            costBadge = '<span style="font-size: 0.7rem; color: #cbd5e1; margin-left: 0.3rem;">(Credit)</span>';
          } else if (l.booking_cost === 'cash') {
            costBadge = '<span style="font-size: 0.7rem; color: #fbbf24; margin-left: 0.3rem;">(Fee/Paid)</span>';
          } else {
            costBadge = '<span style="font-size: 0.7rem; color: #fbbf24; margin-left: 0.3rem;">(Fee)</span>';
          }
          actionButtons.push(\`<a href="\${l.booking_url}" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="font-size: 0.8rem; padding: 0.4rem 0.75rem; border-radius: 8px; border-color: rgba(56, 189, 248, 0.3);">Reserve ↗ \${costBadge}</a>\`);
        }

        return \`
        <div class="card">
          <div>
            <div class="card-header">
              <div>
                <span class="airport-code">\${l.airport_code}</span>
                <span style="font-size: 0.85rem; color: #94a3b8; margin-left: 0.5rem;">\${l.city}, \${l.country}</span>
              </div>
              <span class="network-badge">\${l.network}</span>
            </div>
            <div class="lounge-title">\${l.lounge_name}</div>
            <div class="terminal-info">📍 \${l.terminal}</div>
            <div class="notes-box">\${l.notes || 'No specific queue restrictions noted.'}</div>
          </div>
          <div class="card-footer" style="gap: 0.5rem; flex-wrap: wrap;">
            <span class="verified-text">Verified: \${l.last_verified}</span>
            <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
              \${actionButtons.join('')}
            </div>
          </div>
        </div>
      \`;
      }).join('');
    }

    searchInput.addEventListener('input', render);
    networkSelect.addEventListener('change', render);
    accessSelect.addEventListener('change', render);
    sortSelect.addEventListener('change', render);
    render();
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf8');
  console.log('✅ Interactive Web Search App generated at dist/index.html');
}

function generatePDF(lounges) {
  return new Promise((resolve, reject) => {
    // Use Landscape A4 for wide table presentation (841.89 x 595.28 pt)
    const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });
    const pdfPathDist = path.join(distDir, 'lounges.pdf');
    const pdfPathAssets = path.join(assetsDir, 'lounges.pdf');

    const streamDist = fs.createWriteStream(pdfPathDist);
    doc.pipe(streamDist);

    const pageWidth = 841.89;
    const pageHeight = 595.28;
    const margin = 36;
    const contentWidth = pageWidth - margin * 2; // 769.89 pt

    // Table Column X Coordinates & Widths
    const cols = {
      airport: { x: margin + 6, w: 65 },
      lounge: { x: margin + 74, w: 160 },
      network: { x: margin + 238, w: 120 },
      terminal: { x: margin + 362, w: 150 },
      waitlist: { x: margin + 516, w: 85 },
      booking: { x: margin + 605, w: 90 },
      verified: { x: margin + 698, w: 65 },
    };

    // Set clean PDF document metadata
    doc.info.Title = 'Airport Lounges Waitlist Directory';
    doc.info.Author = 'Open Source Community';
    doc.info.Subject = 'Airport Lounge Digital Waitlist Directory';

    const now = new Date();
    const formattedTimestamp = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

    function drawHeader(y) {
      doc.rect(margin, y - 5, contentWidth, 20).fill('#0f172a');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
      doc.text('AIRPORT', cols.airport.x, y);
      doc.text('LOUNGE NAME', cols.lounge.x, y);
      doc.text('NETWORK', cols.network.x, y);
      doc.text('TERMINAL / LOCATION', cols.terminal.x, y);
      doc.text('WAITLIST', cols.waitlist.x, y);
      doc.text('BOOKING (COST)', cols.booking.x, y);
      doc.text('VERIFIED', cols.verified.x, y);
    }

    function drawPageHeader() {
      doc.fillColor('#0f172a').fontSize(15).font('Helvetica-Bold').text('Airport Lounges Waitlist Directory', margin, margin);
      doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(
        `Curated crowd-sourced directory · ${lounges.length} lounges verified · Last updated: ${formattedTimestamp} · https://github.com/summyfeb12/airportlounges-waitlist-links`,
        margin,
        margin + 18
      );
    }

    drawPageHeader();
    let currentY = margin + 42;
    drawHeader(currentY);
    currentY += 22;

    lounges.forEach((l, index) => {
      // Row height estimate
      const rowHeight = 24;

      if (currentY + rowHeight > pageHeight - margin - 15) {
        doc.addPage();
        drawPageHeader();
        currentY = margin + 42;
        drawHeader(currentY);
        currentY += 22;
      }

      // Alternating background
      if (index % 2 === 1) {
        doc.rect(margin, currentY - 4, contentWidth, rowHeight).fill('#f8fafc');
      } else {
        doc.rect(margin, currentY - 4, contentWidth, rowHeight).fill('#ffffff');
      }

      // Border separator
      doc.rect(margin, currentY + rowHeight - 4, contentWidth, 0.5).fill('#e2e8f0');

      // Airport & City
      doc.fillColor('#0284c7').font('Helvetica-Bold').fontSize(8.5);
      doc.text(l.airport_code, cols.airport.x, currentY);
      doc.fillColor('#64748b').font('Helvetica').fontSize(6.5);
      doc.text(l.city, cols.airport.x + 24, currentY + 1, { width: 38, ellipsis: true });

      // Lounge Name
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8);
      doc.text(l.lounge_name, cols.lounge.x, currentY + 1, { width: cols.lounge.w - 10, height: 18, ellipsis: true });

      // Network
      doc.fillColor('#334155').font('Helvetica').fontSize(7);
      doc.text(l.network, cols.network.x, currentY + 1, { width: cols.network.w - 10, height: 18, ellipsis: true });

      // Terminal
      doc.fillColor('#475569').font('Helvetica').fontSize(7);
      doc.text(l.terminal, cols.terminal.x, currentY + 1, { width: cols.terminal.w - 10, height: 18, ellipsis: true });

      // Waitlist Column
      if (l.access_method === 'app') {
        if (l.waitlist_url) {
          doc.rect(cols.waitlist.x - 2, currentY - 1, 68, 14).fillAndStroke('#e0e7ff', '#6366f1');
          doc.fillColor('#4338ca').font('Helvetica-Bold').fontSize(6.5);
          doc.text('In-App ↗', cols.waitlist.x + 4, currentY + 2, {
            link: l.waitlist_url,
            underline: false,
          });
        } else {
          doc.fillColor('#64748b').font('Helvetica-Oblique').fontSize(7);
          doc.text('In-App Only', cols.waitlist.x, currentY + 2);
        }
      } else if (l.waitlist_url) {
        doc.rect(cols.waitlist.x - 2, currentY - 1, 68, 14).fillAndStroke('#e0f2fe', '#0284c7');
        doc.fillColor('#0369a1').font('Helvetica-Bold').fontSize(7);
        doc.text('Waitlist ↗', cols.waitlist.x + 4, currentY + 2, {
          link: l.waitlist_url,
          underline: false,
        });
      } else {
        doc.fillColor('#94a3b8').font('Helvetica').fontSize(7);
        doc.text('—', cols.waitlist.x + 4, currentY + 2);
      }

      // Advance Booking Column
      if (l.booking_url) {
        let costText = l.booking_cost === 'free' ? '(Free)' : (l.booking_cost === 'credit' ? '(Credit)' : '(Fee)');
        let badgeBg = l.booking_cost === 'free' ? '#dcfce7' : '#fef3c7';
        let badgeBorder = l.booking_cost === 'free' ? '#10b981' : '#f59e0b';
        let badgeText = l.booking_cost === 'free' ? '#047857' : '#b45309';

        doc.rect(cols.booking.x - 2, currentY - 1, 75, 14).fillAndStroke(badgeBg, badgeBorder);
        doc.fillColor(badgeText).font('Helvetica-Bold').fontSize(6.5);
        doc.text(`Reserve ${costText} ↗`, cols.booking.x + 2, currentY + 2, {
          link: l.booking_url,
          underline: false,
        });
      } else {
        doc.fillColor('#94a3b8').font('Helvetica').fontSize(7);
        doc.text('—', cols.booking.x + 4, currentY + 2);
      }

      // Verified date
      doc.fillColor('#94a3b8').font('Helvetica').fontSize(7);
      doc.text(l.last_verified, cols.verified.x, currentY + 2);

      currentY += rowHeight;
    });

    doc.end();

    streamDist.on('finish', () => {
      fs.copyFileSync(pdfPathDist, pdfPathAssets);
      console.log('✅ PDF Directory generated at dist/lounges.pdf and assets/lounges.pdf');
      resolve();
    });

    streamDist.on('error', reject);
  });
}

async function build() {
  // Contributors commit only data/lounges.json, so the default build does only
  // that. CI passes --assets to regenerate the README, web app and PDF; anyone
  // wanting them locally can pass it too.
  const withAssets = process.argv.includes('--assets');

  console.log(withAssets ? '🚀 Running full build...' : '🚀 Formatting dataset...');
  const lounges = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  // Strip deprecated fields and sort
  const clean = lounges.map((l) => {
    const { qr_code_only, ...rest } = l;
    return rest;
  });
  const sorted = sortLounges(clean);

  // Write sorted data back to ensure formatting consistency
  fs.writeFileSync(dataPath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');

  if (!withAssets) {
    console.log(`✅ data/lounges.json sorted and formatted (${sorted.length} lounges).`);
    console.log('   README, web app and PDF untouched — CI builds those on merge.');
    console.log('   Need them locally? npm run build:assets');
    return;
  }

  // 1. Build README Table
  const tableContent = generateMarkdownTable(sorted);
  updateReadme(tableContent, sorted.length);

  // 2. Build Interactive Web App
  generateWebSearchApp(sorted);

  // 3. Build PDF Export
  await generatePDF(sorted);

  console.log('\n✨ Build complete successfully!');
}

build().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
