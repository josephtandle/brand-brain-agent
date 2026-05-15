# Brand Brain Agent

A lightweight local agent for maintaining a living brand brain.

It helps you:

- keep a structured `BRAND-BRAIN.md` for each project
- scan new testimonials, notes, and content drafts for brand-relevant signals
- flag brand drift in recent content
- keep reusable positioning and brand strategy frameworks in one place

This public version is intentionally generic. It does not include private client data, personal project paths, private reports, API keys, or workspace-specific automation.

## Quick Start

```bash
npm install
npm run init-project -- --name "Example Brand" --slug example-brand
npm run scan
```

## Configure

Create `brand-agent.config.json` in the repo root:

```json
{
  "projects": [
    {
      "slug": "example-brand",
      "brandBrain": "projects/example-brand/BRAND-BRAIN.md",
      "testimonialsDir": "projects/example-brand/testimonials",
      "notesDir": "projects/example-brand/notes",
      "contentQueue": "projects/example-brand/content-queue.json"
    }
  ],
  "voiceRules": {
    "bannedPhrases": [
      "leverage",
      "utilize",
      "seamless",
      "cutting-edge",
      "revolutionary"
    ],
    "flagEmDash": true
  }
}
```

## Commands

```bash
node src/brand-agent.js init-project --name "Example Brand" --slug example-brand
node src/brand-agent.js scan
node src/brand-agent.js frameworks
```

## Folder Structure

```text
frameworks/                  Reusable brand and positioning frameworks
templates/brand-brain-template.md
src/brand-agent.js           CLI scanner and project initializer
examples/brand-agent.config.json
```

## What The Scan Does

The scanner looks at each configured project and writes a dated report to `reports/`.

It checks:

- new testimonial files modified in the last 48 hours
- new notes modified in the last 48 hours
- recent content drafts in `contentQueue`
- banned phrases and optional em-dash usage

The report tells you what to review and where the brand brain may need an update.
