#!/usr/bin/env node
/**
 * Validates Gutenberg block markup (WordPress 7.0 core + GPB Pro attributes)
 * using the official @wordpress/block-serialization-default-parser.
 *
 * Usage:
 *   echo '<!-- wp:paragraph --><p>Hi</p><!-- /wp:paragraph -->' | node validate-blocks.js
 *   node validate-blocks.js --file content.html
 *   node validate-blocks.js --skill
 *   node validate-blocks.js --skill --path path/to/file.md
 */

const { parse } = require('@wordpress/block-serialization-default-parser');
const fs = require('fs');
const path = require('path');

const GUTENBERG_DIR = process.env.GUTENBERG_DIR || '/tmp/gutenberg';
const BLOCK_LIB_SRC = path.join(GUTENBERG_DIR, 'packages/block-library/src');
let blockSchemas = {};

const GPB_TOP_KEYS = new Set([
  'desktop',
  'tablet',
  'mobile',
  'glass',
  'hover',
  'focus',
  'animation',
  'interactive',
  'customCss',
]);

const GPB_RESPONSIVE_KEYS = new Set([
  'display', 'flexDirection', 'justifyContent', 'alignItems', 'flexWrap',
  'gap', 'rowGap', 'columnGap', 'gridTemplateColumns', 'gridTemplateRows',
  'gridColumn', 'gridRow', 'padding', 'margin', 'width', 'minWidth', 'maxWidth',
  'height', 'minHeight', 'maxHeight', 'position', 'top', 'right', 'bottom', 'left',
  'zIndex', 'overflow', 'aspectRatio', 'fontSize', 'lineHeight', 'letterSpacing',
  'textAlign', 'borderRadius', 'border', 'borderColor', 'outline', 'outlineOffset',
  'boxShadow', 'background', 'color', 'opacity', 'transform', 'perspective',
  'transformStyle', 'backfaceVisibility', 'transformOrigin', 'translateX',
  'translateY', 'translateZ', 'scale', 'rotate', 'rotateZ', 'rotateX', 'rotateY',
  'skewX', 'skewY', 'filter', 'backdropFilter', 'mixBlendMode', 'clipPath',
  'textGradient', 'transition', 'cursor', 'pointerEvents', 'userSelect',
  'objectFit', 'hide',
]);

const GPB_ANIM_TYPES = new Set([
  'fade-up', 'fade-down', 'fade-left', 'fade-right',
  'zoom-in', 'zoom-out', 'blur-in', 'flip-up', 'flip-down',
  'flip-left', 'flip-right', 'rotate-3d', 'none',
]);

const GPB_INTERACTIVE_TYPES = new Set([
  'tilt3d', 'magnetic', 'marquee', 'slider', 'counter', 'tabs', 'accordion', 'modal',
]);

function loadBlockSchemas() {
  if (!fs.existsSync(BLOCK_LIB_SRC)) return false;
  const dirs = fs.readdirSync(BLOCK_LIB_SRC, { withFileTypes: true });
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const bjPath = path.join(BLOCK_LIB_SRC, d.name, 'block.json');
    if (!fs.existsSync(bjPath)) continue;
    try {
      const bj = JSON.parse(fs.readFileSync(bjPath, 'utf8'));
      if (bj.name) blockSchemas[bj.name] = bj;
    } catch (e) { /* skip invalid */ }
  }
  return Object.keys(blockSchemas).length > 0;
}

function validateGpbAttributes(gpb, blockName, prefix, errors) {
  if (typeof gpb !== 'object' || gpb === null || Array.isArray(gpb)) {
    errors.push({ block: blockName, level: 'error', msg: `${prefix}: "gpb" must be a JSON object` });
    return;
  }

  for (const key of Object.keys(gpb)) {
    if (!GPB_TOP_KEYS.has(key)) {
      errors.push({ block: blockName, level: 'error', msg: `${prefix}: Unknown gpb key "${key}"` });
    }
  }

  for (const bp of ['desktop', 'tablet', 'mobile']) {
    if (gpb[bp] === undefined) continue;
    if (typeof gpb[bp] !== 'object' || gpb[bp] === null || Array.isArray(gpb[bp])) {
      errors.push({ block: blockName, level: 'error', msg: `${prefix}: "gpb.${bp}" must be an object` });
      continue;
    }
    for (const [prop, val] of Object.entries(gpb[bp])) {
      if (!GPB_RESPONSIVE_KEYS.has(prop)) {
        errors.push({ block: blockName, level: 'warn', msg: `${prefix}: Unknown gpb.${bp} CSS property "${prop}"` });
      }
      if (prop === 'hide' && typeof val !== 'boolean') {
        errors.push({ block: blockName, level: 'error', msg: `${prefix}: "gpb.${bp}.hide" must be boolean` });
      }
    }
  }

  if (gpb.animation !== undefined) {
    if (typeof gpb.animation !== 'object' || gpb.animation === null || Array.isArray(gpb.animation)) {
      errors.push({ block: blockName, level: 'error', msg: `${prefix}: "gpb.animation" must be an object` });
    } else {
      if (gpb.animation.type && !GPB_ANIM_TYPES.has(gpb.animation.type)) {
        errors.push({ block: blockName, level: 'error', msg: `${prefix}: Unsupported gpb.animation.type "${gpb.animation.type}"` });
      }
      for (const numKey of ['duration', 'delay', 'stagger', 'parallax']) {
        if (gpb.animation[numKey] !== undefined && typeof gpb.animation[numKey] !== 'number') {
          errors.push({ block: blockName, level: 'error', msg: `${prefix}: "gpb.animation.${numKey}" must be a number` });
        }
      }
    }
  }

  if (gpb.interactive !== undefined) {
    if (typeof gpb.interactive !== 'object' || gpb.interactive === null || Array.isArray(gpb.interactive)) {
      errors.push({ block: blockName, level: 'error', msg: `${prefix}: "gpb.interactive" must be an object` });
    } else if (!gpb.interactive.type || !GPB_INTERACTIVE_TYPES.has(gpb.interactive.type)) {
      errors.push({ block: blockName, level: 'error', msg: `${prefix}: "gpb.interactive.type" must be one of [${Array.from(GPB_INTERACTIVE_TYPES).join(', ')}]` });
    }
  }

  if (gpb.customCss !== undefined && typeof gpb.customCss !== 'string') {
    errors.push({ block: blockName, level: 'error', msg: `${prefix}: "gpb.customCss" must be a string` });
  }
}

function validateParsedBlock(block, errors, stats, depth = 0) {
  if (!block.blockName) return;

  stats.blockCount++;
  const prefix = `Block #${stats.blockCount} (${block.blockName})`;

  if (block.attrs && typeof block.attrs === 'string') {
    try {
      JSON.parse(block.attrs);
    } catch (e) {
      errors.push({ block: block.blockName, level: 'error', msg: `${prefix}: Invalid JSON attributes` });
    }
  }

  const attrs = block.attrs || {};
  const fullName = block.blockName.includes('/') ? block.blockName : `core/${block.blockName}`;
  const schema = blockSchemas[fullName];

  if (attrs.gpb !== undefined) {
    stats.gpbCount++;
    validateGpbAttributes(attrs.gpb, block.blockName, prefix, errors);
  }

  if (attrs.style?.typography?.color) {
    errors.push({ block: block.blockName, level: 'error', msg: `${prefix}: "style.typography.color" does not exist in Gutenberg — use "style.color.text" instead` });
  }

  const blockVisibility = attrs.metadata?.blockVisibility;
  if (blockVisibility !== undefined && blockVisibility !== false && typeof blockVisibility !== 'object') {
    errors.push({ block: block.blockName, level: 'error', msg: `${prefix}: "metadata.blockVisibility" must be false or an object with viewport rules` });
  }
  if (blockVisibility && typeof blockVisibility === 'object' && blockVisibility.viewport !== undefined) {
    if (!blockVisibility.viewport || typeof blockVisibility.viewport !== 'object' || Array.isArray(blockVisibility.viewport)) {
      errors.push({ block: block.blockName, level: 'error', msg: `${prefix}: "metadata.blockVisibility.viewport" must be an object` });
    } else {
      const allowedViewportKeys = new Set(['mobile', 'tablet', 'desktop']);
      for (const [viewport, value] of Object.entries(blockVisibility.viewport)) {
        if (!allowedViewportKeys.has(viewport)) {
          errors.push({ block: block.blockName, level: 'warn', msg: `${prefix}: Unknown block visibility viewport "${viewport}" — WordPress 7.0 supports mobile, tablet, desktop` });
        }
        if (typeof value !== 'boolean') {
          errors.push({ block: block.blockName, level: 'error', msg: `${prefix}: block visibility viewport "${viewport}" must be boolean` });
        }
      }
    }
  }

  const slug = block.blockName.replace('core/', '');
  if ((slug === 'paragraph' || slug === 'heading') && attrs.align && ['left', 'center', 'right'].includes(attrs.align)) {
    errors.push({ block: block.blockName, level: 'error', msg: `${prefix}: Top-level "align":"${attrs.align}" is deprecated for text alignment — use "style.typography.textAlign" instead` });
  }

  if (slug === 'heading' && attrs.textAlign) {
    errors.push({ block: block.blockName, level: 'warn', msg: `${prefix}: Top-level "textAlign" is deprecated — use "style.typography.textAlign" instead` });
  }

  if (schema && schema.attributes) {
    for (const [key, value] of Object.entries(attrs)) {
      const attrDef = schema.attributes[key];
      if (!attrDef) continue;
      if (attrDef.type === 'number' && typeof value === 'string') {
        errors.push({ block: block.blockName, level: 'error', msg: `${prefix}: "${key}" should be number, got string "${value}"` });
      }
      if (attrDef.type === 'boolean' && typeof value !== 'boolean') {
        errors.push({ block: block.blockName, level: 'error', msg: `${prefix}: "${key}" should be boolean, got ${typeof value}` });
      }
      if (attrDef.type === 'integer' && (!Number.isInteger(value))) {
        errors.push({ block: block.blockName, level: 'error', msg: `${prefix}: "${key}" should be integer, got ${typeof value} (${value})` });
      }
      if (attrDef.enum && !attrDef.enum.includes(value)) {
        errors.push({ block: block.blockName, level: 'warn', msg: `${prefix}: "${key}" value "${value}" not in enum [${attrDef.enum.join(', ')}]` });
      }
    }
  }

  const innerHTML = (block.innerHTML || '').trim();
  const innerBlocks = block.innerBlocks || [];
  const isSelfClosing = innerHTML === '' && innerBlocks.length === 0;

  const mustBeSelfClosing = new Set([
    'core/breadcrumbs', 'core/icon', 'core/navigation-overlay-close', 'core/home-link',
    'core/post-title', 'core/post-featured-image', 'core/post-excerpt', 'core/post-date',
    'core/post-terms', 'core/post-content', 'core/post-author', 'core/post-author-biography',
    'core/post-author-name', 'core/post-comment', 'core/post-comments-count',
    'core/post-comments-link', 'core/post-navigation-link', 'core/post-time-to-read',
    'core/post-comments-form', 'core/query-title', 'core/query-total',
    'core/query-pagination-previous', 'core/query-pagination-numbers',
    'core/query-pagination-next', 'core/comments-title', 'core/avatar',
    'core/comment-author-avatar', 'core/comment-author-name', 'core/comment-date',
    'core/comment-content', 'core/comment-reply-link', 'core/comment-edit-link',
    'core/site-title', 'core/site-tagline', 'core/site-logo', 'core/search',
    'core/loginout', 'core/page-list', 'core/page-list-item', 'core/latest-posts',
    'core/latest-comments', 'core/categories', 'core/archives', 'core/tag-cloud',
    'core/rss', 'core/calendar', 'core/navigation-link', 'core/social-link',
    'core/pattern', 'core/template-part', 'core/comments-pagination-previous',
    'core/comments-pagination-numbers', 'core/comments-pagination-next', 'core/block',
    'core/footnotes', 'core/math', 'core/read-more', 'core/table-of-contents',
    'core/term-count', 'core/term-description', 'core/term-name',
  ]);

  if (mustBeSelfClosing.has(fullName) && !isSelfClosing) {
    errors.push({ block: block.blockName, level: 'warn', msg: `${prefix}: Server-rendered block should be self-closing but has inner content` });
  }

  const ownHtml = (block.innerContent || []).filter(c => c !== null).join('').trim();

  if (ownHtml) {
    const expectedClass = `wp-block-${block.blockName.replace('core/', '').replace('/', '-')}`;
    const classRequired = [
      'image', 'group', 'columns', 'column', 'cover', 'buttons', 'button',
      'list', 'quote', 'pullquote', 'separator', 'media-text', 'table',
      'code', 'preformatted', 'embed', 'gallery', 'spacer', 'details',
      'audio', 'video', 'file', 'verse', 'social-links', 'heading',
      'accordion', 'accordion-item', 'accordion-heading', 'accordion-panel',
      'tabs', 'tabs-menu', 'tabs-menu-item', 'tab', 'tab-panel',
      'form', 'form-input', 'form-submit-button', 'form-submission-notification',
      'text-columns', 'terms-query', 'navigation-overlay-close',
    ];
    const classExcluded = ['paragraph', 'list-item', 'html', 'shortcode', 'more', 'nextpage', 'freeform', 'missing'];

    if (classRequired.includes(slug) && !ownHtml.includes(expectedClass)) {
      errors.push({ block: block.blockName, level: 'error', msg: `${prefix}: Missing expected class "${expectedClass}" in HTML` });
    } else if (classExcluded.includes(slug) && ownHtml.includes(expectedClass)) {
      errors.push({ block: block.blockName, level: 'error', msg: `${prefix}: Has class "${expectedClass}" but this block has supports.className:false — class must NOT be present` });
    }

    if (slug === 'image' && attrs.id && !ownHtml.includes(`wp-image-${attrs.id}`)) {
      errors.push({ block: block.blockName, level: 'error', msg: `${prefix}: Missing "wp-image-${attrs.id}" class on <img>` });
    }

    if (slug === 'image' && attrs.url) {
      const srcMatch = ownHtml.match(/src="([^"]+)"/);
      if (srcMatch && srcMatch[1] !== attrs.url) {
        errors.push({ block: block.blockName, level: 'error', msg: `${prefix}: <img src="${srcMatch[1]}"> doesn't match url attr "${attrs.url}"` });
      }
    }

    if (slug === 'heading') {
      const level = attrs.level || 2;
      const tagMatch = ownHtml.match(/<h([1-6])/);
      if (tagMatch && parseInt(tagMatch[1], 10) !== level) {
        errors.push({ block: block.blockName, level: 'error', msg: `${prefix}: <h${tagMatch[1]}> doesn't match level ${level}` });
      }
    }

    if (slug === 'list') {
      const isOrdered = attrs.ordered === true;
      if (isOrdered && ownHtml.includes('<ul')) {
        errors.push({ block: block.blockName, level: 'error', msg: `${prefix}: ordered=true but uses <ul>` });
      }
      if (!isOrdered && ownHtml.includes('<ol')) {
        errors.push({ block: block.blockName, level: 'error', msg: `${prefix}: ordered is not true but uses <ol>` });
      }
    }

    if (slug === 'button' && !ownHtml.includes('wp-element-button')) {
      errors.push({ block: block.blockName, level: 'error', msg: `${prefix}: Missing "wp-element-button" class on button inner element` });
    }

    if (slug === 'button' && (attrs.fontSize || attrs.style?.typography?.fontSize) && !ownHtml.includes('has-custom-font-size')) {
      errors.push({ block: block.blockName, level: 'error', msg: `${prefix}: Missing "has-custom-font-size" class — required when fontSize or style.typography.fontSize is set` });
    }

    if (slug === 'button' && (attrs.borderColor || attrs.style?.border?.color) && !ownHtml.includes('has-border-color')) {
      errors.push({ block: block.blockName, level: 'error', msg: `${prefix}: Missing "has-border-color" class — required when borderColor or style.border.color is set` });
    }

    if (slug === 'file' && attrs.id && ownHtml.includes('wp-block-file__button') && !ownHtml.includes('aria-describedby')) {
      errors.push({ block: block.blockName, level: 'error', msg: `${prefix}: Missing "aria-describedby" on download button <a> — required: aria-describedby="wp-block-file--media-{id}"` });
    }

    if (slug === 'separator' && !ownHtml.includes('has-alpha-channel-opacity')) {
      errors.push({ block: block.blockName, level: 'error', msg: `${prefix}: Missing "has-alpha-channel-opacity" class` });
    }

    if (attrs.style?.css && !ownHtml.includes('has-custom-css')) {
      errors.push({ block: block.blockName, level: 'error', msg: `${prefix}: Missing "has-custom-css" class — required when style.css is set` });
    }
  }

  for (const inner of innerBlocks) {
    validateParsedBlock(inner, errors, stats, depth + 1);
  }
}

function validateMarkup(markup, label) {
  const parsed = parse(markup);
  const errors = [];
  const stats = { blockCount: 0, gpbCount: 0 };

  for (let i = 0; i < parsed.length; i++) {
    if (parsed[i].blockName) {
      validateParsedBlock(parsed[i], errors, stats);
    }
  }

  if (stats.blockCount === 0 && markup.includes('<!-- wp:')) {
    errors.push({ block: '(parser)', level: 'error', msg: 'Markup contains block comments but parser found 0 blocks — likely malformed delimiters' });
  }

  return { parsed, blockCount: stats.blockCount, gpbCount: stats.gpbCount, errors, label };
}

function extractCodeBlocks(markdown) {
  const codeBlockPattern = /```html\r?\n([\s\S]*?)```/g;
  const blocks = [];
  let match;
  let index = 0;
  while ((match = codeBlockPattern.exec(markdown)) !== null) {
    index++;
    const before = markdown.substring(0, match.index);
    const lineNum = before.split('\n').length;
    blocks.push({ code: match[1], index, lineNum });
  }
  return blocks;
}

function resolveDefaultSkillPath() {
  const candidates = [
    path.join(__dirname, '..', 'SKILL.md'),
    path.join(__dirname, 'SKILL.md'),
    path.join(__dirname, 'skills', 'gutenberg-block-authoring', 'SKILL.md'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

const args = process.argv.slice(2);
const hasSchemas = loadBlockSchemas();

if (args.includes('--skill')) {
  const pathIdx = args.indexOf('--path');
  const skillPath = pathIdx !== -1 && args[pathIdx + 1]
    ? args[pathIdx + 1]
    : resolveDefaultSkillPath();
  const markdown = fs.readFileSync(skillPath, 'utf8');
  const codeBlocks = extractCodeBlocks(markdown);

  console.log(`=== Block Markup Validation (${path.basename(skillPath)}) ===\n`);
  console.log(`Code blocks found: ${codeBlocks.length}`);
  if (hasSchemas) {
    console.log(`Block schemas loaded: ${Object.keys(blockSchemas).length}`);
  }
  console.log('');

  let totalBlocks = 0;
  let totalGpbBlocks = 0;
  let totalErrors = 0;
  let totalWarnings = 0;
  const failedBlocks = [];

  for (const { code, index, lineNum } of codeBlocks) {
    if (!code.includes('<!-- wp:')) continue;

    const result = validateMarkup(code, `Code block #${index} (line ${lineNum})`);
    totalBlocks += result.blockCount;
    totalGpbBlocks += result.gpbCount;

    const errs = result.errors.filter(e => e.level === 'error');
    const warns = result.errors.filter(e => e.level === 'warn');
    totalErrors += errs.length;
    totalWarnings += warns.length;

    if (errs.length > 0) {
      failedBlocks.push({ index, lineNum, errors: errs, warnings: warns });
    }
  }

  if (failedBlocks.length === 0) {
    console.log(`PASSED: All code blocks valid (${totalBlocks} blocks parsed, ${totalGpbBlocks} GPB Pro blocks)`);
  } else {
    console.log(`FAILED: ${failedBlocks.length} code block(s) with errors\n`);
    for (const fb of failedBlocks) {
      console.log(`--- Code block #${fb.index} (line ${fb.lineNum}) ---`);
      for (const e of fb.errors) console.log(`  ✗ ${e.msg}`);
      for (const w of fb.warnings) console.log(`  ⚠ ${w.msg}`);
      console.log('');
    }
  }

  if (totalWarnings > 0 && failedBlocks.length === 0) {
    console.log(`\nWarnings: ${totalWarnings}`);
    for (const { code, index, lineNum } of codeBlocks) {
      if (!code.includes('<!-- wp:')) continue;
      const result = validateMarkup(code);
      const warns = result.errors.filter(e => e.level === 'warn');
      for (const w of warns) {
        console.log(`  ⚠ Code block #${index} (line ${lineNum}): ${w.msg}`);
      }
    }
  }

  console.log(`\nSummary: ${totalBlocks} blocks (${totalGpbBlocks} GPB Pro), ${totalErrors} errors, ${totalWarnings} warnings`);
  process.exit(totalErrors > 0 ? 1 : 0);

} else if (args.includes('--file')) {
  const fileIdx = args.indexOf('--file') + 1;
  const filePath = args[fileIdx];
  if (!filePath || !fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  const markup = fs.readFileSync(filePath, 'utf8');
  const result = validateMarkup(markup, filePath);
  printResult(result);
  process.exit(result.errors.filter(e => e.level === 'error').length > 0 ? 1 : 0);

} else {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => input += chunk);
  process.stdin.on('end', () => {
    if (!input.trim()) {
      console.log('Usage:');
      console.log('  node validate-blocks.js --skill                   # validate SKILL.md examples');
      console.log('  node validate-blocks.js --skill --path file.md    # validate markdown examples');
      console.log('  node validate-blocks.js --file content.html       # validate a file');
      console.log('  echo "markup" | node validate-blocks.js           # validate from stdin');
      process.exit(0);
    }
    const result = validateMarkup(input, 'stdin');
    printResult(result);
    process.exit(result.errors.filter(e => e.level === 'error').length > 0 ? 1 : 0);
  });
}

function printResult(result) {
  console.log(`=== Block Markup Validation ===\n`);
  console.log(`Source: ${result.label}`);
  console.log(`Blocks parsed: ${result.blockCount} (${result.gpbCount} GPB Pro)`);

  if (result.errors.length === 0) {
    console.log('\nPASSED: All blocks valid');
  } else {
    const errs = result.errors.filter(e => e.level === 'error');
    const warns = result.errors.filter(e => e.level === 'warn');
    if (errs.length > 0) {
      console.log(`\nErrors (${errs.length}):`);
      errs.forEach(e => console.log(`  ✗ ${e.msg}`));
    }
    if (warns.length > 0) {
      console.log(`\nWarnings (${warns.length}):`);
      warns.forEach(e => console.log(`  ⚠ ${e.msg}`));
    }
  }
}
