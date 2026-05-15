#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'brand-agent.config.json');
const TEMPLATE_PATH = path.join(ROOT, 'templates', 'brand-brain-template.md');
const REPORTS_DIR = path.join(ROOT, 'reports');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value.startsWith('--')) {
      const key = value.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) args[key] = true;
      else {
        args[key] = next;
        i += 1;
      }
    } else {
      args._.push(value);
    }
  }
  return args;
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function relativeDate() {
  return new Date().toISOString().slice(0, 10);
}

function recentMarkdownFiles(dir, hours = 48) {
  if (!fs.existsSync(dir)) return [];
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  const out = [];

  function walk(target) {
    for (const entry of fs.readdirSync(target)) {
      const full = path.join(target, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (entry.endsWith('.md') && stat.mtimeMs > cutoff) out.push(full);
    }
  }

  walk(dir);
  return out;
}

function loadConfig() {
  const fallback = {
    projects: [],
    voiceRules: {
      bannedPhrases: ['leverage', 'utilize', 'seamless', 'cutting-edge', 'revolutionary'],
      flagEmDash: true,
    },
  };
  return readJson(CONFIG_PATH, fallback);
}

function scanContentQueue(project, voiceRules) {
  const queuePath = path.resolve(ROOT, project.contentQueue || '');
  if (!project.contentQueue || !fs.existsSync(queuePath)) return [];

  const queue = readJson(queuePath, []);
  const posts = Array.isArray(queue) ? queue : queue.items || queue.feedQueue || [];
  const recent = posts.slice(0, 10);
  const flags = [];

  for (const post of recent) {
    const text = String(post.caption || post.text || post.body || '');
    const id = post.id || post.slug || 'unlabeled';
    for (const phrase of voiceRules.bannedPhrases || []) {
      if (text.toLowerCase().includes(String(phrase).toLowerCase())) {
        flags.push({ id, severity: 'medium', issue: `Banned phrase found: ${phrase}` });
      }
    }
    if (voiceRules.flagEmDash && text.includes('—')) {
      flags.push({ id, severity: 'high', issue: 'Em dash found in content draft' });
    }
  }

  return flags;
}

function scan() {
  const config = loadConfig();
  ensureDir(REPORTS_DIR);
  const date = relativeDate();
  const lines = [`# Brand Brain Agent Report - ${date}`, ''];

  if (!config.projects.length) {
    lines.push('No projects configured. Copy `examples/brand-agent.config.json` to `brand-agent.config.json` and edit the paths.');
  }

  for (const project of config.projects) {
    lines.push(`## ${project.slug}`, '');

    const testimonialFiles = recentMarkdownFiles(path.resolve(ROOT, project.testimonialsDir || ''));
    const noteFiles = recentMarkdownFiles(path.resolve(ROOT, project.notesDir || ''));
    const driftFlags = scanContentQueue(project, config.voiceRules || {});

    if (!testimonialFiles.length && !noteFiles.length && !driftFlags.length) {
      lines.push('No new testimonial files, notes, or drift flags in the last 48 hours.', '');
      continue;
    }

    if (testimonialFiles.length) {
      lines.push('### Testimonials To Review', '');
      for (const file of testimonialFiles) lines.push(`- ${path.relative(ROOT, file)}`);
      lines.push('');
    }

    if (noteFiles.length) {
      lines.push('### Notes To Review', '');
      for (const file of noteFiles) lines.push(`- ${path.relative(ROOT, file)}`);
      lines.push('');
    }

    if (driftFlags.length) {
      lines.push('### Brand Drift Flags', '');
      for (const flag of driftFlags) lines.push(`- [${flag.severity}] ${flag.id}: ${flag.issue}`);
      lines.push('');
    }
  }

  const reportPath = path.join(REPORTS_DIR, `${date}.md`);
  fs.writeFileSync(reportPath, `${lines.join('\n').trim()}\n`);
  console.log(`Report written: ${reportPath}`);
}

function initProject(args) {
  const name = args.name || 'Example Brand';
  const slug = args.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const projectDir = path.join(ROOT, 'projects', slug);
  ensureDir(path.join(projectDir, 'testimonials'));
  ensureDir(path.join(projectDir, 'notes'));

  const template = fs.existsSync(TEMPLATE_PATH)
    ? fs.readFileSync(TEMPLATE_PATH, 'utf8')
    : '# [Project Name] - Brand Brain\n';
  const brain = template.replace(/\[Project Name\]/g, name).replace(/\[DATE\]/g, relativeDate());
  fs.writeFileSync(path.join(projectDir, 'BRAND-BRAIN.md'), brain);

  if (!fs.existsSync(CONFIG_PATH)) {
    const config = {
      projects: [
        {
          slug,
          brandBrain: `projects/${slug}/BRAND-BRAIN.md`,
          testimonialsDir: `projects/${slug}/testimonials`,
          notesDir: `projects/${slug}/notes`,
          contentQueue: `projects/${slug}/content-queue.json`,
        },
      ],
      voiceRules: {
        bannedPhrases: ['leverage', 'utilize', 'seamless', 'cutting-edge', 'revolutionary'],
        flagEmDash: true,
      },
    };
    fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`);
  }

  console.log(`Initialized project: ${slug}`);
}

function listFrameworks() {
  const dir = path.join(ROOT, 'frameworks');
  for (const file of fs.readdirSync(dir).filter((item) => item.endsWith('.md')).sort()) {
    console.log(file);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || 'scan';
  if (command === 'scan') scan();
  else if (command === 'init-project') initProject(args);
  else if (command === 'frameworks') listFrameworks();
  else {
    console.error('Usage: brand-brain-agent <scan|init-project|frameworks>');
    process.exit(1);
  }
}

main();
