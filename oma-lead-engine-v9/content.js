// ============================================================
// OMA Lead Engine v9 — content.js
// Platforms: Google Maps, LinkedIn, Yellow Pages, Realtor,
//            Zillow, Yelp, Google Search, Clutch, Angi,
//            Trustpilot, Facebook Business, Generic
// + Tech Stack Detection + Social Scraper
// ============================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrape') {
    autoScrollThenScrape().then(leads => sendResponse({ leads, url: window.location.href }));
    return true;
  }
  if (request.action === 'scrapeContacts') {
    scrapeContactInfo().then(info => sendResponse(info));
    return true;
  }
  if (request.action === 'scrapeSocialProfile') {
    sendResponse(scrapeSocialProfile());
    return true;
  }
});

// ── ROUTER ────────────────────────────────────────────────
async function autoScrollThenScrape() {
  await autoScroll();
  const url = window.location.href.toLowerCase();
  let leads = [];
  if      (url.includes('google.com/maps'))        leads = scrapeGoogleMaps();
  else if (url.includes('linkedin.com'))           leads = await scrapeLinkedIn();
  else if (url.includes('yellowpages.com'))        leads = scrapeYellowPages();
  else if (url.includes('realtor.com'))            leads = scrapeRealtor();
  else if (url.includes('zillow.com'))             leads = scrapeZillow();
  else if (url.includes('yelp.com'))               leads = scrapeYelp();
  else if (url.includes('clutch.co'))              leads = scrapeClutch();
  else if (url.includes('angi.com') || url.includes('angieslist.com')) leads = scrapeAngi();
  else if (url.includes('trustpilot.com'))         leads = scrapeTrustpilot();
  else if (url.includes('facebook.com'))           leads = scrapeFacebookBusiness();
  else if (url.includes('google.com/search'))      leads = scrapeGoogleSearch();
  else                                             leads = scrapeGeneric();
  return fuzzyDeduplicate(leads.map(cleanLead));
}

async function autoScroll() {
  return new Promise(resolve => {
    let scrolls = 0;
    const timer = setInterval(() => {
      window.scrollBy(0, 500);
      scrolls++;
      if (scrolls >= 8) { clearInterval(timer); window.scrollTo(0, 0); setTimeout(resolve, 600); }
    }, 250);
  });
}

// ── GOOGLE MAPS ───────────────────────────────────────────
function scrapeGoogleMaps() {
  const leads = [];
  let cards = qAll(['[role="article"]', '.Nv2PK', '[data-result-index]', '.lI9IFe']);
  cards.forEach(card => {
    try {
      const name    = ts(card, ['.fontHeadlineSmall', '.qBF1Pd', 'h3', '[aria-label]']);
      const type    = ts(card, ['.W4Efsd span', '.UsdlK', '.DkEaL']);
      const phone   = fp(ep(ts(card, ['[data-item-id*="phone"]', 'button[aria-label*="phone"]'])));
      const website = ta(card, ['a[data-value="Website"]', 'a[href*="http"]:not([href*="google"])'], 'href');
      const rating  = ts(card, ['.MW4etd', '.AJB7ye span', '[aria-label*="stars"]']);
      const reviews = ts(card, ['.UY7F9', '.F7nice span']);
      if (!name || name.length < 2) return;
      const np = eon(name);
      leads.push({
        firstName: np.first, lastName: np.last, email: '', company: name.trim(),
        niche: dn(type + ' ' + name), website: website || '', painPoint: type || '',
        phone, source: 'Google Maps', rating: rating || '', reviews: reviews || '', social: {}
      });
    } catch(e) {}
  });

  // Single listing fallback
  if (!leads.length) {
    const name    = ts(document, ['h1.DUwDvf', '.fontHeadlineLarge', 'h1']);
    const type    = ts(document, ['.DkEaL', '.YkuOqf']);
    const phone   = fp(ep(ts(document, ['[data-item-id*="phone"] .Io6YTe'])));
    const website = ta(document, ['a[data-item-id*="authority"]', 'a[aria-label*="website"]'], 'href');
    const emails  = ee(document.body.innerText);
    const rating  = ts(document, ['.F7nice span', '[aria-label*="stars"]']);
    if (name) {
      const np = eon(name);
      leads.push({
        firstName: np.first, lastName: np.last, email: emails[0] || '', company: name.trim(),
        niche: dn(type + ' ' + name), website: website || '', painPoint: type || '',
        phone, source: 'Google Maps', rating: rating || '', social: {}
      });
    }
  }
  return leads;
}

// ── LINKEDIN ──────────────────────────────────────────────
async function scrapeLinkedIn() {
  await wfe(['.reusable-search__result-container', '.entity-result', '[data-chameleon-result-urn]'], 5000);
  const leads = [];
  let cards = qAll(['.reusable-search__result-container', '.entity-result', '[data-chameleon-result-urn]']);
  cards.forEach(card => {
    try {
      const nameEl  = card.querySelector('.entity-result__title-text a span[aria-hidden="true"],.actor-name,.app-aware-link span[aria-hidden="true"]');
      const titleEl = card.querySelector('.entity-result__primary-subtitle,.subline-level-1');
      const compEl  = card.querySelector('.entity-result__secondary-subtitle,.subline-level-2');
      const linkEl  = card.querySelector('a[href*="/in/"]');
      const fullName = (nameEl?.innerText || '').trim().replace(/\n.*/,'');
      if (!fullName || fullName.length < 2) return;
      const np    = fullName.split(' ');
      const title = (titleEl?.innerText || '').trim();
      const company = (compEl?.innerText || '').trim();
      leads.push({
        firstName: np[0] || '', lastName: np.slice(1).join(' ') || '', email: '',
        company: company || title || 'Professional', niche: dn(title + ' ' + company),
        website: linkEl?.href || '', painPoint: title, phone: '', source: 'LinkedIn',
        social: { linkedin: linkEl?.href || '' }
      });
    } catch(e) {}
  });

  // Profile page fallback
  if (!leads.length) {
    const name    = ts(document, ['h1.text-heading-xlarge', '.pv-text-details__left-panel h1']);
    const title   = ts(document, ['.text-body-medium.break-words']);
    const company = ts(document, ['.pv-text-details__right-panel .hoverable-link-text span']);
    const email   = document.querySelector('a[href^="mailto:"]')?.href?.replace('mailto:', '') || '';
    if (name) {
      const np = name.trim().split(' ');
      leads.push({
        firstName: np[0] || '', lastName: np.slice(1).join(' ') || '', email,
        company: company || '', niche: dn(title + ' ' + company),
        website: window.location.href, painPoint: title || '', phone: '', source: 'LinkedIn Profile',
        social: esl(document.body.innerHTML)
      });
    }
  }
  return leads;
}

// ── YELLOW PAGES ──────────────────────────────────────────
function scrapeYellowPages() {
  const leads = [];
  let cards = qAll(['.result', '.srp-listing', '[class*="listing"]', '.v-card']);
  cards.forEach(card => {
    try {
      const name    = ts(card, ['.business-name', 'h2 a', '.n a']);
      const phone   = fp(ep(ts(card, ['.phones', '.phone'])));
      const website = ta(card, ['a.track-visit-website', 'a[class*="website"]'], 'href');
      const cat     = ts(card, ['.categories a', '.cat']);
      const email   = card.querySelector('a[href^="mailto:"]')?.href?.replace('mailto:', '') || '';
      if (!name || name.length < 2) return;
      const np = eon(name);
      leads.push({
        firstName: np.first, lastName: np.last, email, company: name.trim(),
        niche: dn(cat + ' ' + name), website: website || '', painPoint: cat || '',
        phone, source: 'Yellow Pages', social: esl(card.innerHTML)
      });
    } catch(e) {}
  });
  return leads;
}

// ── REALTOR.COM ───────────────────────────────────────────
function scrapeRealtor() {
  const leads = [];
  let cards = qAll(['[data-testid="agent-card"]', '.agent-list-card', '[class*="AgentCard"]']);
  cards.forEach(card => {
    try {
      const name  = ts(card, ['[data-testid="agent-name"]', 'h2', '.agent-name']);
      const comp  = ts(card, ['[data-testid="agent-office"]', '.office-name']);
      const phone = fp(ep(ts(card, ['[data-testid="agent-phone"]', '.agent-phone', 'a[href^="tel:"]'])));
      const link  = ta(card, ['a[href*="/realestateagents/"]'], 'href');
      if (!name || name.length < 2) return;
      const np = name.trim().split(' ');
      leads.push({
        firstName: np[0] || '', lastName: np.slice(1).join(' ') || '', email: '',
        company: comp || 'Real Estate Agent', niche: 'realestate',
        website: link || '', painPoint: 'Real estate agent', phone, source: 'Realtor.com', social: {}
      });
    } catch(e) {}
  });
  return leads;
}

// ── ZILLOW ────────────────────────────────────────────────
function scrapeZillow() {
  const leads = [];
  let cards = qAll(['[class*="AgentCard"]', '[data-test="agent-card"]', '.agent-result']);
  cards.forEach(card => {
    try {
      const name  = ts(card, ['[class*="agentName"]', 'h2', '.agent-name']);
      const comp  = ts(card, ['[class*="businessName"]', '.company']);
      const phone = fp(ep(card.querySelector('a[href^="tel:"]')?.href?.replace('tel:', '') || ts(card, ['[class*="phone"]'])));
      if (!name || name.length < 2) return;
      const np = name.trim().split(' ');
      leads.push({
        firstName: np[0] || '', lastName: np.slice(1).join(' ') || '', email: '',
        company: comp || 'Real Estate Agent', niche: 'realestate',
        website: window.location.href, painPoint: 'Real estate agent', phone, source: 'Zillow', social: {}
      });
    } catch(e) {}
  });
  return leads;
}

// ── YELP ──────────────────────────────────────────────────
function scrapeYelp() {
  const leads = [];
  let cards = qAll(['[class*="container__09f24"] li', '.lemon--li__373c0', 'li[class*="css-"]']);
  cards.forEach(card => {
    try {
      const name   = ts(card, ['a[class*="businessName"]', 'h3 a', 'a[href*="/biz/"]']);
      const link   = ta(card, ['a[href*="/biz/"]'], 'href');
      const phone  = fp(ep(ts(card, ['p[class*="secondaryAttributes"]'])));
      const rating = ts(card, ['.i-stars', '[aria-label*="star"]']);
      if (!name || name.length < 2) return;
      const np = eon(name);
      leads.push({
        firstName: np.first, lastName: np.last, email: '', company: name.trim(),
        niche: dn(name), website: link ? 'https://yelp.com' + link : '',
        painPoint: '', phone, source: 'Yelp', rating: rating || '', social: {}
      });
    } catch(e) {}
  });
  return leads;
}

// ── CLUTCH.CO ─────────────────────────────────────────────
function scrapeClutch() {
  const leads = [];
  let cards = qAll(['.provider-row', '.directory_profile', '[data-uid]', '.sg-provider']);
  cards.forEach(card => {
    try {
      const name    = ts(card, ['.directory_profile-title', '.company-name', 'h3', 'h2']);
      const link    = ta(card, ['a[href*="/profile/"]', 'a[href*="/directory/"]', 'a.company-link'], 'href');
      const rating  = ts(card, ['.sg-rating__number', '.rating-number', '.star-rating']);
      const reviews = ts(card, ['.reviews-count', '.num-reviews']);
      const tags    = [...card.querySelectorAll('.sg-tag, .service-tag, .focus-tag')].map(t => t.innerText.trim()).slice(0, 3).join(', ');
      if (!name || name.length < 2) return;
      const np = eon(name);
      leads.push({
        firstName: np.first, lastName: np.last, email: '', company: name.trim(),
        niche: 'agency', website: link ? (link.startsWith('http') ? link : 'https://clutch.co' + link) : '',
        painPoint: tags || 'Agency services', phone: '', source: 'Clutch.co',
        rating: rating || '', reviews: reviews || '', social: {}
      });
    } catch(e) {}
  });
  return leads;
}

// ── ANGI ──────────────────────────────────────────────────
function scrapeAngi() {
  const leads = [];
  let cards = qAll(['.provider-listing', '.profile-card', '[data-provider-id]', '.business-card', '[class*="ProCard"]']);
  cards.forEach(card => {
    try {
      const name   = ts(card, ['.business-name', '.provider-name', 'h2', 'h3', '[class*="businessName"]']);
      const phone  = fp(ep(ts(card, ['.phone-number', 'a[href^="tel:"]'])));
      const link   = ta(card, ['a[href*="/pros/detail"]', 'a[href*="/pro/"]', 'a.business-link'], 'href');
      const rating = ts(card, ['.star-rating', '.rating-value', '[class*="rating"]']);
      if (!name || name.length < 2) return;
      const np = eon(name);
      leads.push({
        firstName: np.first, lastName: np.last, email: '', company: name.trim(),
        niche: dn(name), website: link || '', painPoint: 'Home services',
        phone, source: 'Angi', rating: rating || '', social: {}
      });
    } catch(e) {}
  });
  return leads;
}

// ── TRUSTPILOT ────────────────────────────────────────────
function scrapeTrustpilot() {
  const leads = [];
  let cards = qAll(['.paper_paper', '[data-business-unit-id]', '.styles_businessUnitCell__', 'div[class*="businessUnit"]']);
  cards.forEach(card => {
    try {
      const name    = ts(card, ['[class*="businessName"]', '.business-info__name', 'h3', 'h2']);
      const link    = ta(card, ['a[href*="/review/"]', 'a[href*="/evaluate/"]'], 'href');
      const rating  = ts(card, ['[class*="ratingText"]', '.star-rating__score', '[data-rating-typography]']);
      const reviews = ts(card, ['[class*="reviewsCount"]', '.reviews-count']);
      if (!name || name.length < 2) return;
      const np = eon(name);
      leads.push({
        firstName: np.first, lastName: np.last, email: '', company: name.trim(),
        niche: dn(name), website: link ? (link.startsWith('http') ? link : 'https://trustpilot.com' + link) : '',
        painPoint: '', phone: '', source: 'Trustpilot',
        rating: rating || '', reviews: reviews || '', social: {}
      });
    } catch(e) {}
  });
  return leads;
}

// ── FACEBOOK BUSINESS ────────────────────────────────────
function scrapeFacebookBusiness() {
  const leads = [];
  let cards = qAll(['[class*="x1qjc9v5"]', '[role="article"]', '.x1yztbdb']);
  cards.forEach(card => {
    try {
      const name  = ts(card, ['[class*="x193iq5w"]', 'strong', 'h2', 'h3', '[dir="auto"]']);
      const link  = ta(card, ['a[href*="facebook.com/"]'], 'href');
      if (!name || name.length < 2 || name.length > 60) return;
      const np = eon(name);
      leads.push({
        firstName: np.first, lastName: np.last, email: '', company: name.trim(),
        niche: dn(name), website: link || '', painPoint: '',
        phone: '', source: 'Facebook', social: { facebook: link || '' }
      });
    } catch(e) {}
  });
  return leads;
}

// ── GOOGLE SEARCH ─────────────────────────────────────────
function scrapeGoogleSearch() {
  const leads = [];
  let results = qAll(['#search .g', '.MjjYud > div', '.tF2Cxc', '.g']);
  results.forEach(r => {
    try {
      const title = ts(r, ['h3', 'h2', '.LC20lb']);
      const link  = ta(r, ['a[href]'], 'href');
      const desc  = ts(r, ['.VwiC3b', '.s3v9rd', 'span.aCOpRe']);
      const email = ee(desc || '')[0] || '';
      const phone = fp(ep(desc || ''));
      if (!title || !link || link.includes('google.com')) return;
      const np = eon(title);
      leads.push({
        firstName: np.first, lastName: np.last, email, company: title.trim(),
        niche: dn(title + ' ' + desc), website: link.split('?')[0],
        painPoint: (desc || '').slice(0, 100), phone, source: 'Google Search', social: {}
      });
    } catch(e) {}
  });
  return leads;
}

// ── GENERIC ───────────────────────────────────────────────
function scrapeGeneric() {
  const leads = [];
  const text   = document.body.innerText || '';
  const html   = document.body.innerHTML || '';
  const emails = ee(text);
  const phone  = fp(ep(text));
  const social = esl(html);
  const ogName = document.querySelector('meta[property="og:site_name"]')?.content;
  const company = ogName || document.title.split(/[|\-–]/)[0].trim() || window.location.hostname.replace('www.', '');
  let firstName = 'Business', lastName = 'Owner';
  document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
    try {
      const d = JSON.parse(s.innerText);
      const items = Array.isArray(d) ? d : [d];
      items.forEach(item => {
        if (item['@type'] === 'Person') {
          const p = (item.name || '').split(' ');
          firstName = item.givenName  || p[0]              || firstName;
          lastName  = item.familyName || p.slice(1).join(' ') || lastName;
        }
      });
    } catch(e) {}
  });
  const techStack = detectTechStack(html);
  if (emails.length > 0 || company) {
    leads.push({
      firstName, lastName, email: emails[0] || '', company, niche: dn(document.title + ' ' + text.slice(0, 500)),
      website: window.location.href.split('?')[0], painPoint: '', phone: phone || '',
      source: 'Direct Website', social, techStack
    });
  }
  return leads;
}

// ── CONTACT INFO SCRAPER ──────────────────────────────────
async function scrapeContactInfo() {
  const text  = document.body.innerText || '';
  const html  = document.body.innerHTML || '';
  const emails = ee(text);
  const phones = [fp(ep(text))].filter(Boolean);
  const social = esl(html);
  let ownerName = '';
  document.querySelectorAll('h1,h2,h3,h4').forEach(h => {
    const t = h.innerText.trim();
    if (t.split(' ').length === 2 && /^[A-Z]/.test(t) && !t.includes('&')) ownerName = t;
  });
  return { emails, phones, social, ownerName };
}

// ── SOCIAL PROFILE SCRAPER (silent tab use) ───────────────
function scrapeSocialProfile() {
  const url  = window.location.href.toLowerCase();
  const desc = document.querySelector('meta[name="description"]')?.content ||
               document.querySelector('meta[property="og:description"]')?.content || '';
  const title = document.querySelector('title')?.textContent || '';

  if (url.includes('instagram.com')) {
    const followers = desc.match(/([\d,.]+[KkMm]?)\s*Followers/i)?.[1] || '';
    const posts     = desc.match(/([\d,]+)\s*Posts/i)?.[1] || '';
    const lastPost  = document.querySelector('time')?.getAttribute('datetime') || '';
    return { platform: 'instagram', followers, posts, lastPost, bio: desc.slice(0, 100) };
  }
  if (url.includes('facebook.com')) {
    const likes = desc.match(/([\d,.]+[KkMm]?)\s*(?:likes|followers)/i)?.[1] || '';
    return { platform: 'facebook', likes, title };
  }
  if (url.includes('twitter.com') || url.includes('x.com')) {
    const followers = desc.match(/([\d,.]+[KkMm]?)\s*Followers/i)?.[1] || '';
    return { platform: 'twitter', followers, bio: desc.slice(0, 100) };
  }
  return null;
}

// ── TECH STACK DETECTION ─────────────────────────────────
function detectTechStack(html) {
  const h = (html || '').toLowerCase();
  if (h.includes('shopify.com') || h.includes('cdn.shopify'))                              return 'Shopify';
  if (h.includes('wp-content') || h.includes('wp-includes') || h.includes('wordpress'))   return 'WordPress';
  if (h.includes('squarespace.com') || h.includes('static1.squarespace'))                  return 'Squarespace';
  if (h.includes('wix.com') || h.includes('wixstatic.com') || h.includes('wixsite'))       return 'Wix';
  if (h.includes('webflow.com') || h.includes('webflow.io'))                               return 'Webflow';
  if (h.includes('framer.com') || h.includes('framerusercontent'))                          return 'Framer';
  if (h.includes('godaddy.com') || h.includes('godaddy'))                                  return 'GoDaddy';
  if (h.includes('bigcommerce.com'))                                                        return 'BigCommerce';
  if (h.includes('weebly.com'))                                                             return 'Weebly';
  if (h.includes('notion.site'))                                                            return 'Notion';
  return '';
}

// ── HELPERS ───────────────────────────────────────────────
function eon(name) {
  if (!name) return { first: 'Business', last: 'Owner' };
  const stop = new Set(['realty','properties','real','estate','group','team','agency','services',
    'solutions','inc','llc','co','and','the','of','&','digital','marketing','media','consulting']);
  const words = name.trim().split(/\s+/);
  const nw    = words.filter((w, i) => i < 3 && w.length > 1 && /^[A-Z][a-z]+$/.test(w) &&
                                       !stop.has(w.toLowerCase()) && !/\d/.test(w));
  if (nw.length >= 2) return { first: nw[0], last: nw[1] };
  if (nw.length === 1) return { first: nw[0], last: 'Owner' };
  return { first: 'Business', last: 'Owner' };
}

function fp(phone) {
  if (!phone) return '';
  const d = phone.replace(/\D/g, '');
  if (d.length === 10)              return '(' + d.slice(0,3) + ') ' + d.slice(3,6) + '-' + d.slice(6);
  if (d.length === 11 && d[0]==='1') return '(' + d.slice(1,4) + ') ' + d.slice(4,7) + '-' + d.slice(7);
  return phone.trim();
}

function ep(text) {
  if (!text) return '';
  const m = (text || '').match(/[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/);
  return m ? m[0] : '';
}

function ee(text) {
  const m = (text || '').match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}/g) || [];
  return [...new Set(m.filter(e =>
    !e.includes('example') && !e.includes('sentry') && !e.includes('@2x') &&
    !e.endsWith('.png') && !e.includes('google') && !e.includes('w3.org') && !e.includes('schema')
  ))];
}

function esl(html) {
  const s = {};
  const p = {
    facebook:  /facebook\.com\/([^"'\s\/]+)/,
    instagram: /instagram\.com\/([^"'\s\/]+)/,
    linkedin:  /linkedin\.com\/(?:company|in)\/([^"'\s\/]+)/,
    twitter:   /(?:twitter|x)\.com\/([^"'\s\/]+)/,
    tiktok:    /tiktok\.com\/@([^"'\s\/]+)/
  };
  Object.entries(p).forEach(([pl, re]) => {
    const m = html.match(re);
    if (m && m[1] !== 'share' && m[1] !== 'sharer') s[pl] = 'https://' + pl + '.com/' + m[1];
  });
  return s;
}

function fuzzyDeduplicate(leads) {
  const seen = [];
  return leads.filter(lead => {
    const ck = nc(lead.company), ek = (lead.email || '').toLowerCase().trim();
    const isDupe = seen.some(s => (ek && s.email === ek) || (ck && s.company && sim(ck, s.company) > 0.85));
    if (!isDupe) { seen.push({ company: ck, email: ek }); return true; }
    return false;
  });
}

function nc(name) {
  return (name || '').toLowerCase().replace(/\b(llc|inc|ltd|co|corp|the|a|an)\b/g, '').replace(/[^a-z0-9]/g, '').trim();
}

function sim(a, b) {
  if (!a || !b) return 0; if (a === b) return 1;
  const l = a.length > b.length ? a : b, s = a.length > b.length ? b : a;
  if (!l.length) return 1;
  return (l.length - ed(l, s)) / l.length;
}

function ed(a, b) {
  const m = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++)
    for (let j = 1; j <= a.length; j++) {
      if (b[i-1] === a[j-1]) m[i][j] = m[i-1][j-1];
      else m[i][j] = Math.min(m[i-1][j-1]+1, m[i][j-1]+1, m[i-1][j]+1);
    }
  return m[b.length][a.length];
}

function cleanLead(l) {
  const html = document.body?.innerHTML || '';
  return {
    ...l,
    firstName:  cl(l.firstName),
    lastName:   cl(l.lastName),
    company:    cl(l.company),
    email:      (l.email || '').toLowerCase().trim(),
    phone:      fp(l.phone || ''),
    website:    (l.website || '').split('?')[0].replace(/\/$/, ''),
    painPoint:  cl(l.painPoint),
    techStack:  l.techStack || detectTechStack(html)
  };
}

function cl(s)  { return (s || '').trim().replace(/\s+/g, ' '); }

function dn(text) {
  const t = (text || '').toLowerCase();
  if (t.match(/real estate|realtor|realty|property|broker|agent|homes/))  return 'realestate';
  if (t.match(/ecomm|shopify|store|retail|shop|dtc/))                      return 'ecommerce';
  if (t.match(/restaurant|food|cafe|catering|bakery/))                     return 'restaurant';
  if (t.match(/gym|fitness|yoga|trainer|crossfit/))                        return 'fitness';
  if (t.match(/agency|marketing|ads|media|digital|seo/))                   return 'agency';
  if (t.match(/lawyer|attorney|law firm|legal/))                           return 'legal';
  if (t.match(/doctor|dentist|medical|clinic|healthcare/))                 return 'healthcare';
  return 'startup';
}

function ts(root, sels) {
  for (const s of sels) { try { const el = root.querySelector(s); if (el) return el.innerText?.trim() || el.getAttribute('aria-label')?.trim() || ''; } catch(e) {} }
  return '';
}
function ta(root, sels, attr) {
  for (const s of sels) { try { const el = root.querySelector(s); if (el && el[attr]) return el[attr]; } catch(e) {} }
  return '';
}
function qAll(sels) {
  for (const s of sels) { const r = document.querySelectorAll(s); if (r.length > 0) return r; }
  return [];
}
function wfe(sels, timeout) {
  return new Promise(resolve => {
    const check = () => sels.some(s => document.querySelector(s));
    if (check()) { resolve(true); return; }
    const obs = new MutationObserver(() => { if (check()) { obs.disconnect(); resolve(true); } });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { obs.disconnect(); resolve(false); }, timeout);
  });
}
