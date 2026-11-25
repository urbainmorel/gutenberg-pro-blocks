# Gutenberg Pro Blocks (GPB) + Universal AI Block Authoring Skill

**100% Free & Open-Source (`v3.1.0`)** (`GPL-2.0-or-later` + `MIT`) — Build agency-grade, **Elementor Pro-class dynamic WordPress websites** using **pure native Gutenberg HTML comments (`<!-- wp:... -->`)** with a full **Visual 3D, Responsive & Dynamic Inspector in Gutenberg**, native **WordPress MCP Adapter / Abilities API** integration, server-side Display Conditions & ACF/WooCommerce Dynamic Tags, zero block recovery errors, and **0 bytes of admin UI overhead** on the visitor's frontend.

---

## Why This Project Exists

Native WordPress Gutenberg blocks (`wp:group`, `wp:columns`, `wp:heading`, `wp:button`) are lightweight and future-proof, but lack built-in controls for:
- Per-breakpoint responsive overrides (`Desktop` / `Tablet` / `Mobile`)
- **Server-Side Display Conditions** (`loggedIn`, `userRole`, `wooCart`, `metaKey/ACF`, `urlParam`, `dateFrom/dateTo`) — 0 bytes on frontend when hidden
- **Server-Side Dynamic Tags & Bindings** (`{{acf:field}}`, `{{woo:price}}`, `{{woo:discount_pct}}`, `{{woo:cart_count}}`, `{{post:title}}`, `{{user:first_name}}`, `{{query:param}}`, dynamic `linkSource` & `imageSource`)
- Full 3D CSS & Interactive 3D (`perspective`, `preserve-3d`, `rotateX/Y/Z`, `translateZ`, 3D mouse-tracking cards with specular glare, magnetic buttons)
- `:hover` / `:focus` transitions (`translateY`, `rotate`, `scale`, `boxShadow`)
- Glassmorphism (`backdrop-filter: blur(...)`)
- Responsive CSS Grid column spans & positioning (`z-index`, `sticky`, `absolute`)
- Scroll-triggered reveal animations (`fade-up`, `blur-in`, `flip-*`, `rotate-3d`, `stagger`, `parallax`) and lightweight interactive controllers (`sticky-header`, `offcanvas`, `countdown`, `filter-grid`, `before-after`, `lightbox`, `scroll-progress`, `tilt3d`, `magnetic`, `marquee`, `slider`, `counter`, `accordion`, `tabs`, `modal`)

**Gutenberg Pro Blocks (`GPB v3.0`)** solves this in two parts:
1. **A Universal AI Agent Skill (`skills/gutenberg-block-authoring/`)** — Works across **Antigravity, Claude Code, Codex, OpenCode, Cursor, Windsurf**, and `npx skills`. Teaches your AI assistant every serialization rule of WordPress 7.0 core blocks + the `gpb` Pro attribute system, with an automated CLI validator (`validate-blocks.js`).
2. **A Featherweight WordPress Plugin (`wordpress-plugin/gutenberg-pro-blocks/`)** — Adds a complete bidirectional **Visual Inspector (Sliders, Tabs, Presets)** in `wp-admin` (0 bytes loaded for site visitors!) and registers `gpb` on `core/*` blocks **without changing `save()` HTML**. Server-side, `WP_HTML_Tag_Processor` injects a scoped class and compiles responsive CSS on the fly. Even if you deactivate the plugin later, your core content remains 100% intact.

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

## Visual Inspector in Gutenberg (`wp-admin` Only — 0 Bytes on Frontend)

Click any core block in the WordPress Block Editor to customize all GPB v3.0 properties visually without writing code:

| Tab | Controls Included |
| :--- | :--- |
| **`Resp.`** (`Desktop` / `Tablette` / `Mobile`) | Per-screen visibility (`hide`), `display` (`flex` / `grid`), `gridTemplateColumns`, `gridColumn`, `flexDirection`, `gap`, `padding`, `margin`, `borderRadius`, `position` (`relative` / `absolute` / `sticky` / `fixed`), `zIndex`, `fontSize` (`clamp()`), `textGradient` |
| **`Hover/3D`** | Live sliders for `:hover` `rotate` (`-180°` to `+180°`), `rotateX`, `rotateY`, `translateX`, `translateY`, `translateZ`, `scale`, `boxShadow`, `borderColor`, `transition`, plus base `perspective` and `preserve-3d` |
| **`Glass`** | Glassmorphism sliders (`blur`, `saturate`), translucent `bg`, `border`, `shadow`, `background`, `clipPath` |
| **`Anim/Int`** | Scroll reveal animations (`fade-*`, `zoom-*`, `blur-in`, `flip-*`, `rotate-3d`, `stagger`, `parallax`) + all 15 Interactive Controllers |
| **`Dyn.`** | Server-side Display Conditions (`loggedIn`, `userRole`, `wooCart`, `metaKey`/`metaCompare`, `urlParam`, `dateFrom`/`dateTo`) + Dynamic `linkSource` / `imageSource` |
| **`CSS/JSON`** | Scoped Custom CSS (`&` selector) + live-synced raw GPB JSON |

---

## Server-Side Dynamic Tags & Display Conditions (0 Bytes Frontend)

### Dynamic Tags (`{{namespace:key|fallback}}`)

Use these tokens inside any native Gutenberg text, heading, or button:
- **Post / Archive**: `{{post:title}}`, `{{post:excerpt}}`, `{{post:date}}`, `{{post:modified}}`, `{{post:url}}`, `{{post:id}}`, `{{post:author}}`
- **ACF & Custom Fields**: `{{acf:field_name}}`, `{{meta:field_key}}`
- **WooCommerce**: `{{woo:price}}`, `{{woo:regular_price}}`, `{{woo:sale_price}}`, `{{woo:discount_pct}}`, `{{woo:sku}}`, `{{woo:stock_status}}`, `{{woo:stock_qty}}`, `{{woo:rating}}`, `{{woo:review_count}}`, `{{woo:cart_count}}`, `{{woo:cart_total}}`
- **User**: `{{user:display_name}}`, `{{user:first_name}}`, `{{user:last_name}}`, `{{user:email}}`, `{{user:role}}`, `{{user_meta:key}}`
- **Site / Date / URL Query**: `{{site:name}}`, `{{site:tagline}}`, `{{site:url}}`, `{{date:Y}}`, `{{query:utm_campaign|Default}}`

### Dynamic Attribute Bindings (`gpb.dynamic`) & Display Conditions (`gpb.conditions`)

- **Dynamic Links & Images**: `"dynamic": {"linkSource": "woo:add_to_cart_url", "imageSource": "post:featured_image"}`
- **Display Conditions** (omits block completely from HTML when false):
  - `loggedIn` (`true` / `false`), `userRole` (`"customer, administrator"`), `postType`
  - `wooCart` (`"empty"` / `"not_empty"`)
  - `metaKey` + `metaCompare` (`"exists"`, `"not_exists"`, `"equals"`, `"not_equals"`, `"gt"`, `"lt"`, `"contains"`) + `metaValue`
  - `urlParam` (`"utm_source=vip"`), `dateFrom`, `dateTo`, `dayOfWeek`

---

## 15 Lightweight Interactive & 3D Controllers (`gpb.interactive`)

Loaded on the frontend **only** when a page actually uses an interactive block:

`tilt3d` (3D mouse tilt + specular glare) • `magnetic` (cursor attraction) • `sticky-header` (transparent to glass on scroll + auto-hide) • `offcanvas` (slide-over drawer) • `countdown` (fixed date or evergreen) • `filter-grid` (instant category filter) • `before-after` (image comparison slider) • `lightbox` (full-screen image zoom) • `scroll-progress` (reading progress bar) • `marquee` (infinite ticker) • `slider` (touch/snap carousel) • `counter` (animated KPI numbers) • `accordion` • `tabs` • `modal`

---

## Examples: Pure Gutenberg + `gpb` Pro Attributes

### 1. Responsive Glassmorphism Bento Card

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

### 2. Conditional VIP 3D Card with WooCommerce & ACF Dynamic Tags

```html
<!-- wp:group {"gpb":{"desktop":{"padding":"28px","borderRadius":"20px","background":"#0f172a","color":"#f8fafc"},"conditions":{"loggedIn":true,"metaKey":"offre_vip","metaCompare":"exists"},"dynamic":{"linkSource":"woo:add_to_cart_url"},"interactive":{"type":"tilt3d","maxTilt":12,"perspective":1000,"glare":true}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
<!-- wp:paragraph {"gpb":{"desktop":{"color":"#38bdf8"}}} -->
<p>Offre réservée à {{user:first_name}} ({{woo:discount_pct}} — {{acf:offre_vip}})</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">{{post:title}} — {{woo:price}}</h3>
<!-- /wp:heading -->

<!-- wp:buttons -->
<div class="wp-block-buttons">
<!-- wp:button {"gpb":{"interactive":{"type":"magnetic","strength":0.3}}} -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#cart">Commander</a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
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

---

## 100% Controllable via WordPress MCP Adapter (`gpb/v1`)

Both **WordPress Abilities API (`wp_register_ability` with `mcp.public = true`)** and mirrored **REST API (`/wp-json/gpb/v1/*`)** routes are built in:

| Ability / MCP Tool | REST Endpoint | Purpose |
| :--- | :--- | :--- |
| `gpb/get-schema` | `GET /wp-json/gpb/v1/schema` | Discover all GPB v3 breakpoints, animations, controllers, conditions & tags |
| `gpb/upsert-page` | `POST /wp-json/gpb/v1/page` | Create or update any page/post/CPT with validated GPB block markup |
| `gpb/upsert-template-part` | `POST /wp-json/gpb/v1/template-part` | Create or update FSE `wp_template_part` (headers, footers) & `wp_template` |
| `gpb/get-post-blocks` | `GET /wp-json/gpb/v1/post/{id}/blocks` | Inspect block indices and `attrs.gpb` of an existing page |
| `gpb/update-block-gpb` | `POST /wp-json/gpb/v1/post/{id}/block-gpb` | Surgically merge/replace `attrs.gpb` on a single block by index |
| `gpb/compile-css-preview` | `POST /wp-json/gpb/v1/compile-css` | Preview compiled responsive/3D CSS |
