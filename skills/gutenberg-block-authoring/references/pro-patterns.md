# Gutenberg Pro Blocks — Production Pattern Library

All patterns below use 100% pure WordPress `core/*` markup enhanced with `gpb` attributes and pass `validate-blocks.js` with zero errors.

## 1. Dark Glassmorphism Hero with Floating Grid & Hover CTA

```html
<!-- wp:group {"align":"full","gpb":{"desktop":{"padding":"96px 24px","background":"radial-gradient(circle at 20% 20%, #1e293b 0%, #020617 70%)","color":"#f8fafc","overflow":"hidden"},"tablet":{"padding":"72px 20px"},"mobile":{"padding":"56px 16px"}},"layout":{"type":"constrained","contentSize":"1180px"}} -->
<div class="wp-block-group alignfull">
<!-- wp:group {"gpb":{"desktop":{"padding":"48px","borderRadius":"28px"},"tablet":{"padding":"32px"},"mobile":{"padding":"24px"},"glass":{"blur":"20px","bg":"rgba(255,255,255,0.04)","border":"1px solid rgba(255,255,255,0.12)","shadow":"0 32px 64px rgba(0,0,0,0.4)"},"animation":{"type":"blur-in","duration":800,"once":true}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
<!-- wp:heading {"level":1,"gpb":{"desktop":{"fontSize":"clamp(2.25rem,5vw,4.25rem)","lineHeight":"1.08","letterSpacing":"-0.03em","textGradient":"linear-gradient(135deg,#ffffff 0%,#94a3b8 100%)"}}} -->
<h1 class="wp-block-heading">Design Sur-Mesure en Blocs Natifs</h1>
<!-- /wp:heading -->

<!-- wp:paragraph {"gpb":{"desktop":{"fontSize":"clamp(1rem,1.4vw,1.25rem)","color":"#cbd5e1","maxWidth":"640px"}}} -->
<p>Des mises en page dignes d'un studio créatif avec la légèreté absolue du HTML commenté Gutenberg et zéro dépendance lourde.</p>
<!-- /wp:paragraph -->

<!-- wp:buttons -->
<div class="wp-block-buttons">
<!-- wp:button {"gpb":{"hover":{"translateY":"-3px","scale":1.02,"boxShadow":"0 14px 30px rgba(56,189,248,0.35)"}}} -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#bento">Découvrir l'architecture</a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:group -->
```

## 2. Responsive Bento Grid with Staggered Scroll Reveal

```html
<!-- wp:group {"align":"wide","gpb":{"desktop":{"display":"grid","gridTemplateColumns":"repeat(3, minmax(0, 1fr))","gap":"24px"},"tablet":{"gridTemplateColumns":"repeat(2, minmax(0, 1fr))"},"mobile":{"gridTemplateColumns":"1fr","gap":"16px"},"animation":{"type":"fade-up","duration":650,"stagger":120,"once":true}},"layout":{"type":"default"}} -->
<div class="wp-block-group alignwide">
<!-- wp:group {"gpb":{"desktop":{"gridColumn":"span 2","padding":"32px","borderRadius":"20px","background":"#0f172a","color":"#f8fafc"},"tablet":{"gridColumn":"span 2"},"mobile":{"gridColumn":"span 1"},"hover":{"translateY":"-6px","boxShadow":"0 24px 48px rgba(15,23,42,0.25)"}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">Responsive Desktop / Tablette / Mobile</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Chaque bloc adapte sa grille CSS, ses marges et sa typographie sur chaque point de rupture sans jamais casser l'éditeur Gutenberg.</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->

<!-- wp:group {"gpb":{"desktop":{"padding":"32px","borderRadius":"20px","background":"#f1f5f9","color":"#0f172a"},"hover":{"translateY":"-6px","boxShadow":"0 20px 40px rgba(15,23,42,0.12)"}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">Core Web Vitals 100/100</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>CSS compilé à la volée et script frontend de quelques kilo-octets chargé uniquement si nécessaire.</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:group -->
```

## 3. Infinite Partner Logo / Feature Marquee

```html
<!-- wp:group {"align":"full","gpb":{"desktop":{"padding":"32px 0","background":"#09090b","color":"#e4e4e7"},"interactive":{"type":"marquee","speed":24,"direction":"left","pauseOnHover":true}},"layout":{"type":"flex","flexWrap":"nowrap"}} -->
<div class="wp-block-group alignfull">
<!-- wp:paragraph -->
<p>WordPress 7.0 Natif</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>CSS Grid Responsive</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Glassmorphism</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Zero Block Recovery</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
```

## 4. Touch Testimonial Slider

```html
<!-- wp:group {"align":"wide","gpb":{"desktop":{"padding":"24px 0"},"interactive":{"type":"slider","arrows":true,"autoplay":5000}},"layout":{"type":"default"}} -->
<div class="wp-block-group alignwide">
<!-- wp:group {"gpb":{"desktop":{"padding":"28px","borderRadius":"20px","background":"#f8fafc","border":"1px solid #e2e8f0"}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
<!-- wp:paragraph -->
<p>« Un rendu digne d'une agence avec des blocs WordPress 100 % natifs. »</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->

<!-- wp:group {"gpb":{"desktop":{"padding":"28px","borderRadius":"20px","background":"#f8fafc","border":"1px solid #e2e8f0"}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
<!-- wp:paragraph -->
<p>« Score PageSpeed mobile à 99/100 dès le déploiement. »</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->

<!-- wp:group {"gpb":{"desktop":{"padding":"28px","borderRadius":"20px","background":"#f8fafc","border":"1px solid #e2e8f0"}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
<!-- wp:paragraph -->
<p>« Généré par IA et éditable visuellement sans aucune erreur. »</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:group -->
```
