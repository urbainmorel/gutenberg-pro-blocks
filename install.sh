#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_SRC="$SCRIPT_DIR/skills/gutenberg-block-authoring"
SKILL_NAME="gutenberg-block-authoring"
PROJECT_MODE=false

if [[ "${1:-}" == "--project" ]]; then
  PROJECT_MODE=true
fi

install_to() {
  local target="$1"
  local label="$2"
  mkdir -p "$target"
  cp -R "$SKILL_SRC/." "$target/"
  if [[ -f "$target/package.json" ]] && command -v npm >/dev/null 2>&1; then
    (cd "$target" && npm install --omit=dev --no-audit --no-fund >/dev/null 2>&1 || true)
  fi
  echo "  [OK] $label -> $target"
}

echo "Installing $SKILL_NAME..."

if [[ "$PROJECT_MODE" == true ]]; then
  install_to "$(pwd)/.agents/skills/$SKILL_NAME" "Universal Project (.agents)"
  install_to "$(pwd)/.claude/skills/$SKILL_NAME" "Claude Code Project (.claude)"
  exit 0
fi

INSTALLED=0

# Antigravity / Gemini CLI
if [[ -d "$HOME/.gemini/config" ]] || [[ -d "$HOME/.gemini" ]]; then
  install_to "$HOME/.gemini/config/skills/$SKILL_NAME" "Antigravity / Gemini CLI"
  INSTALLED=$((INSTALLED + 1))
fi

# Claude Code
if [[ -d "$HOME/.claude" ]]; then
  install_to "$HOME/.claude/skills/$SKILL_NAME" "Claude Code"
  INSTALLED=$((INSTALLED + 1))
fi

# OpenAI Codex
if [[ -d "$HOME/.codex" ]]; then
  install_to "$HOME/.codex/skills/$SKILL_NAME" "Codex"
  INSTALLED=$((INSTALLED + 1))
fi

# OpenCode
if [[ -d "$HOME/.config/opencode" ]]; then
  install_to "$HOME/.config/opencode/skills/$SKILL_NAME" "OpenCode"
  INSTALLED=$((INSTALLED + 1))
fi

# Universal fallback (.agents)
if [[ $INSTALLED -eq 0 ]]; then
  install_to "$HOME/.agents/skills/$SKILL_NAME" "Universal (.agents)"
fi

echo "Done! $SKILL_NAME is ready."
