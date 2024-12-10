# Ethos Chrome Extension

This Chrome Extension enhances the Twitter user experience by surfacing Ethos credibility scores and profiles for Ethereum addresses and Ethos-linked Twitter accounts. Built using Vite, React, and TypeScript, this extension provides a responsive and interactive user interface.

## Features

- Ethereum Address Detection: Detects Ethereum addresses in Twitter posts and comments.
- Credibility Scores: Displays scores in tooltips or as clickable links.
- Profile Enhancements: Modifies Twitter avatars to include Ethos credibility scores.

## Getting Started

### Prerequisites

- Node.js (same version as Ethos)
- Google Chrome

### Installation

1. Install dependencies: `npm ci`

2. Build the project: `npm run build`

3. Load the extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable Developer Mode
   - Click "Load unpacked" and select the dist directory.

### Development

- To start the development server, run: `npm run dev`
- Reload chrome extension every time you make a change 🤦‍♂️

#### Connecting to local echo server

- Run `npm run start:echo` in repo root
- Set `VITE_ECHO_API_URL` to `http://localhost:8080`
- Restart your vite server when you make changes to manifest file

## Architecture

- Manifest File: Defines permissions and background scripts.
- Background Scripts: Handle API calls and manage core functionality.
- Content Scripts: Inject functionality into Twitter's web pages.

## Testing

Ensure all functionalities work as expected by:

- Manual testing in Chrome.

## Publishing

To publish the extension to the Chrome Web Store:

1. Make sure you are on the latest `main` to include all recent changes.
1. Run `npm run pack`.
1. Upload zip file from `release/` directory through the Chrome Developer Dashboard.
1. Commit changes to `package.json` and push to remote.
