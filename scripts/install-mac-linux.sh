#!/usr/bin/env bash
# CampusKonnect installer for macOS and Linux.
#
# Installs Node.js and Git (if missing), downloads the project, installs
# everything it needs (including a private PostgreSQL database), fills in demo
# data and starts the app in your browser.
#
#   bash install-mac-linux.sh
set -euo pipefail

REPO_URL="https://github.com/dheerajcse9-tech/campusKonnect.git"
BRANCH="claude/awesome-archimedes-e97y6b"

step() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
have() { command -v "$1" >/dev/null 2>&1; }
node_ok() { have node && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ]; }

install_tools() {
  if [ "$(uname)" = "Darwin" ]; then
    if ! have brew; then
      echo "Homebrew is needed to install Node.js and Git. Install it from https://brew.sh, then run this again."
      echo "(Or install Node.js LTS from https://nodejs.org yourself.)"
      exit 1
    fi
    node_ok || brew install node
    have git || brew install git
  elif have apt-get; then
    sudo apt-get update
    have git || sudo apt-get install -y git curl
    if ! node_ok; then
      curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
      sudo apt-get install -y nodejs
    fi
  elif have dnf; then
    have git || sudo dnf install -y git
    node_ok || sudo dnf install -y nodejs
  else
    echo "Please install Node.js 20+ (https://nodejs.org) and Git, then run this again."
    exit 1
  fi
}

step "Checking Node.js and Git"
if ! node_ok || ! have git; then install_tools; fi
echo "Node.js $(node -v), $(git --version)"

step "Getting the CampusKonnect code"
if [ -f package.json ] && grep -q '"name": "campuskonnect"' package.json; then
  : # already inside the project
else
  [ -d campusKonnect ] || git clone --branch "$BRANCH" "$REPO_URL" campusKonnect
  cd campusKonnect
fi
echo "Project folder: $(pwd)"

step "Installing libraries (first time: a few minutes)"
npm install

step "Setting up the database and demo data"
npm run setup

step "Starting CampusKonnect (press Ctrl+C to stop)"
printf '\033[32mNext time, open this folder in a terminal and run:  npm run dev\033[0m\n'
npm run dev
