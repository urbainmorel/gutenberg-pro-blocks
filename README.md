# Gutenberg Pro Blocks (GPB) + Universal AI Block Authoring Skill

**100% Free & Open-Source** (`GPL-2.0-or-later` + `MIT`) — Build agency-grade, ultra-modern WordPress websites using **pure native Gutenberg HTML comments (`<!-- wp:... -->`)** with zero block recovery errors and a **100/100 Core Web Vitals** footprint.

---

## Why This Project Exists

Native WordPress Gutenberg blocks (`wp:group`, `wp:columns`, `wp:heading`, `wp:button`) are lightweight and future-proof, but lack built-in controls for:
- Per-breakpoint responsive overrides (`Desktop` / `Tablet` / `Mobile`)
- `:hover` / `:focus` transitions (`translateY`, `scale`, `boxShadow`)
- Glassmorphism (`backdrop-filter: blur(...)`)
- Responsive CSS Grid column spans & positioning (`z-index`, `sticky`, `absolute`)
- Scroll-triggered reveal animations, stagger, parallax, and lightweight interactive components (Marquee, Touch Slider, Counter, Tabs, Modal)

**Gutenberg Pro Blocks (`GPB`)** solves this in two parts:
1. **A Universal AI Agent Skill (`skills/gutenberg-block-authoring/`)** — Works across **Antigravity, Claude Code, Codex, OpenCode, Cursor, Windsurf**, and `npx skills`. Teaches your AI assistant every serialization rule of WordPress 7.0 core blocks + the `gpb` Pro attribute system, with an automated CLI validator (`validate-blocks.js`).
2. **A Featherweight WordPress Plugin (`wordpress-plugin/gutenberg-pro-blocks/`)** — Registers the `gpb` JSON attribute on `core/*` blocks **without changing `save()` HTML**. Server-side, `WP_HTML_Tag_Processor` injects a scoped class and compiles responsive CSS on the fly. Even if you deactivate the plugin later, your core content remains 100% intact.

---

## Quick Start: Install the AI Skill (Any Harness)

### Option 1: Universal CLI (`npx skills`)
Works with **Claude Code, Antigravity, Codex, OpenCode, Cursor, Windsurf**:
```bash
npx skills add urbainmorel/gutenberg-pro-blocks
```

### Option 2: Automated Multi-Harness Installer

**Windows (PowerShell):**
```powershell
git clone https://github.com/urbainmorel/gutenberg-pro-blocks.git
cd gutenberg-pro-blocks
.\install.ps1
```

**macOS / Linux:**
```bash
git clone https://github.com/urbainmorel/gutenberg-pro-blocks.git
cd gutenberg-pro-blocks
chmod +x install.sh && ./install.sh
```

*(Pass `--project` or `-Project` to install only inside the current project's `.agents/skills/` and `.claude/skills/` folders.)*

---

## Install the WordPress Plugin

1. Download `gutenberg-pro-blocks.zip` from the [GitHub Releases](https://github.com/urbainmorel/gutenberg-pro-blocks/releases) page (or zip the `wordpress-plugin/gutenberg-pro-blocks` folder).
2. In WordPress Admin, go to **Plugins > Add New > Upload Plugin**, upload the `.zip`, and click **Activate**.
3. Paste any generated `<!-- wp:... -->` markup into the WordPress Code Editor (`Ctrl+Shift+Alt+M`) — live preview works immediately in Gutenberg with **zero "Attempt Block Recovery" warnings**.

---

## Example: Pure Gutenberg + `gpb` Pro Attributes

```html
<!-- wp:group {"gpb":{"desktop":{"padding":"32px","borderRadius":"24px","display":"grid","gridTemplateColumns":"repeat(2,minmax(0,1fr))","gap":"24px"},"mobile":{"gridTemplateColumns":"1fr","padding":"20px"},"glass":{"blur":"16px","bg":"rgba(15,23,42,0.7)","border":"1px solid rgba(255,255,255,0.14)"},"hover":{"translateY":"-6px","boxShadow":"0 28px 56px rgba(0,0,0,0.3)"},"animation":{"type":"fade-up","duration":700,"stagger":100,"once":true}},"layout":{"type":"default"}} -->
<div class="wp-block-group">
<!-- wp:heading {"level":3,"gpb":{"desktop":{"textGradient":"linear-gradient(135deg,#fff 0%,#38bdf8 100%)"}}} -->
<h3 class="wp-block-heading">Gutenberg Natif, Puissance Pro</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Responsive par écran, Glassmorphism, Hover et Animations sans dépendance lourde.</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
```

---

## Validate Block Markup Locally

```bash
npm install
npm run validate
# Or validate any HTML file:
node skills/gutenberg-block-authoring/scripts/validate-blocks.js --file my-page.html
```

---

## Dual License (`GPL-2.0-or-later` AND `MIT`)

- **WordPress Plugin (`wordpress-plugin/`)**: Licensed under **GPL-2.0-or-later** (`LICENSE-GPL-2.0.txt`) for full WordPress ecosystem compatibility.
- **AI Skill, JSON Schemas, Installers & Validator (`skills/`, `install.*`, `plugin.json`)**: Dual-licensed under **MIT** (`LICENSE-MIT.txt`) and **GPL-2.0-or-later**.
