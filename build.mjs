// Builds the static site into ./dist
//   npm run build
// Pages live in src/pages/*.html. Each starts with a metadata comment:
//   <!--meta {"title": "...", "description": "...", "nav": "about"} -->
// {{tokens}} anywhere in pages/partials are replaced from site.config.json.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const siteUrl = (config.siteUrl || '').replace(/\/$/, '');

const NAV = [
  { key: 'index', href: 'index.html', label: 'Home' },
  { key: 'about', href: 'about.html', label: 'About Us' },
  { key: 'services', href: 'services.html', label: 'Services' },
  { key: 'projects', href: 'projects.html', label: 'Projects' },
  { key: 'team', href: 'team.html', label: 'Team' },
  { key: 'contact', href: 'contact.html', label: 'Contact' },
];

const read = (p) => fs.readFileSync(p, 'utf8');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const derived = {
  web3formsKey: config.web3formsKey || '',
  formRedirect: siteUrl ? `<input type="hidden" name="redirect" value="${siteUrl}/thank-you.html">` : '',
};
const tokens = (html, extra = {}) =>
  html.replace(/\{\{(\w+)\}\}/g, (m, k) => {
    const v = k in extra ? extra[k] : k in derived ? derived[k] : config[k];
    if (v === undefined) throw new Error(`Unknown token ${m}`);
    return v;
  });

function navDesktop(active) {
  return NAV.map(({ key, href, label }) =>
    key === active
      ? `      <a aria-current="page" class="font-label-caps text-label-caps tracking-widest uppercase text-primary-container font-semibold after:content-[''] after:block after:w-full after:h-[2px] after:bg-primary-container after:mt-0.5" href="${href}">${label}</a>`
      : `      <a class="font-label-caps text-label-caps text-on-surface-variant hover:text-primary-container transition-colors tracking-widest uppercase" href="${href}">${label}</a>`
  ).join('\n');
}
function navMobile(active) {
  return NAV.map(({ key, href, label }) =>
    `      <li><a ${key === active ? 'aria-current="page" ' : ''}class="flex items-center justify-between py-3 border-b border-primary-container/10 font-label-caps text-label-caps tracking-widest uppercase ${key === active ? 'text-primary-container font-semibold' : 'text-on-surface-variant'}" href="${href}">${label}<span class="material-symbols-outlined text-sm" aria-hidden="true">east</span></a></li>`
  ).join('\n');
}

const orgJsonLd = () => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'GeneralContractor',
  name: config.name,
  ...(siteUrl && { url: siteUrl + '/', logo: siteUrl + '/assets/img/logo.png' }),
  telephone: config.phoneHref,
  email: config.email,
  address: { '@type': 'PostalAddress', streetAddress: config.addressLine, addressLocality: config.city, addressCountry: 'KE' },
  openingHours: ['Mo-Fr 08:00-17:30', 'Sa 08:00-13:00'],
  areaServed: 'East Africa',
});

function layout({ meta, slug, body, header, footer, iconsHref, cssHref, jsHref }) {
  const file = slug === 'index' ? '' : `${slug}.html`;
  const canonical = siteUrl ? `${siteUrl}/${file}` : '';
  const ogImage = meta.image || 'assets/img/index-01.jpg';
  const title = slug === 'index' ? meta.title : `${meta.title} | ${config.name}`;
  return `<!DOCTYPE html>
<html lang="en-KE">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${slug === '404' ? '<base href="/">\n' : ''}<title>${esc(title)}</title>
<meta name="description" content="${esc(meta.description)}">
${meta.noindex ? '<meta name="robots" content="noindex">\n' : ''}${canonical ? `<link rel="canonical" href="${canonical}">\n` : ''}<meta name="theme-color" content="#183d32">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(config.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:image" content="${siteUrl ? siteUrl + '/' : ''}${ogImage}">
${canonical ? `<meta property="og:url" content="${canonical}">\n` : ''}<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="assets/img/logo.png">
<link rel="apple-touch-icon" href="assets/img/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Space+Grotesk:wght@400;600;700&display=swap">
<link rel="stylesheet" href="${iconsHref}">
<link rel="stylesheet" href="${cssHref}">
${slug === 'index' ? `<script type="application/ld+json">${orgJsonLd()}</script>\n` : ''}</head>
<body class="bg-surface-container-low font-body-md text-body-md text-on-surface antialiased selection:bg-primary-container selection:text-on-primary">
${header}
<main id="main" class="w-full pt-20 bg-surface-container-low"><div class="flex flex-col w-full">
${body}
</div></main>
${footer}
<script src="${jsHref}" defer></script>
</body>
</html>
`;
}

// ---------- build ----------
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'assets/css'), { recursive: true });
fs.mkdirSync(path.join(DIST, 'assets/js'), { recursive: true });
fs.mkdirSync(path.join(DIST, 'assets/img'), { recursive: true });

const hash = (s) => crypto.createHash('md5').update(s).digest('hex').slice(0, 8);

// JS
const js = read(path.join(SRC, 'assets/js/main.js'));
fs.writeFileSync(path.join(DIST, 'assets/js/main.js'), js);

// Pages (first pass: render bodies so we can collect icon names)
const pages = fs.readdirSync(path.join(SRC, 'pages')).filter((f) => f.endsWith('.html')).map((f) => {
  const raw = read(path.join(SRC, 'pages', f));
  const m = raw.match(/^<!--meta (\{[\s\S]*?\}) -->\s*/);
  if (!m) throw new Error(`${f}: missing <!--meta {...} --> header`);
  const slug = f.replace(/\.html$/, '');
  const meta = JSON.parse(m[1]);
  const body = tokens(raw.slice(m[0].length)).replace(/<!--[\s\S]*?-->\n?/g, '');
  return { slug, meta, body };
});
const header = (active) => tokens(read(path.join(SRC, 'partials/header.html')), { navDesktop: navDesktop(active), navMobile: navMobile(active) });
const footer = tokens(read(path.join(SRC, 'partials/footer.html')));

// Material Symbols: request only the glyphs we use (much smaller font download)
const allHtml = pages.map((p) => p.body).join('') + header('') + footer;
const icons = new Set(['menu', 'close']);
for (const m of allHtml.matchAll(/material-symbols-outlined[^"]*"[^>]*>\s*([a-z0-9_]+)\s*</g)) icons.add(m[1]);
const iconsHref = `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=${[...icons].sort().join(',')}&display=block`;

// CSS (Tailwind scans src/ for class names)
execSync(`npx --no-install tailwindcss -c tailwind.config.js -i src/styles.css -o dist/assets/css/styles.css --minify`, { cwd: ROOT, stdio: 'inherit' });
const css = read(path.join(DIST, 'assets/css/styles.css'));
const cssHref = `assets/css/styles.css?v=${hash(css)}`;
const jsHref = `assets/js/main.js?v=${hash(js)}`;

const usedImages = new Set(['logo.png', 'index-01.jpg']);
for (const p of pages) {
  const html = layout({ ...p, header: header(p.meta.nav || p.slug), footer, iconsHref, cssHref, jsHref });
  for (const m of html.matchAll(/assets\/img\/([\w.-]+)/g)) usedImages.add(m[1]);
  fs.writeFileSync(path.join(DIST, `${p.slug}.html`), html);
}
for (const img of usedImages) fs.copyFileSync(path.join(SRC, 'assets/img', img), path.join(DIST, 'assets/img', img));

// robots + sitemap
const indexable = pages.filter((p) => !p.meta.noindex);
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n${siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml\n` : ''}`);
if (siteUrl) {
  const urls = indexable.map((p) => `  <url><loc>${siteUrl}/${p.slug === 'index' ? '' : p.slug + '.html'}</loc></url>`).join('\n');
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
}

if (!derived.web3formsKey) console.warn('\n⚠  web3formsKey is empty in site.config.json — the contact forms will NOT send until you add it.\n');
console.log(`Built ${pages.length} pages, ${usedImages.size} images, ${icons.size} icons -> dist/${siteUrl ? '' : '  (set siteUrl in site.config.json to enable canonical URLs + sitemap.xml)'}`);
