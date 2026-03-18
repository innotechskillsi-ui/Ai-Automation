// ============================================================
// OMA Lead Engine v9 — background.js
// Tiers: FREE (20/mo) · STARTER ($29/mo, 500/mo) · PRO ($79/mo, unlimited)
// ============================================================

const LICENSE_SALT = "OMA-LEAD-ENGINE-2025-SECRET";
const TIER_LIMITS  = { free: 20, starter: 500, pro: 999999 };

// ── LICENSE ───────────────────────────────────────────────
function generateKeyHash(email, plan) {
  const raw = LICENSE_SALT + email.toLowerCase().trim() + plan;
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    h = ((h << 5) - h) + c;
    h = h & h;
  }
  const x = Math.abs(h).toString(16).toUpperCase().padStart(8, '0');
  return 'OMA-' + x.slice(0, 4) + '-' + x.slice(4, 8);
}

function detectPlan(key, email) {
  if (!key || !email) return 'free';
  const k = key.trim().toUpperCase();
  if (k === generateKeyHash(email, 'PRO'))     return 'pro';
  if (k === generateKeyHash(email, 'STARTER')) return 'starter';
  return 'free';
}

function getCurrentMonth() {
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── SILENT TAB RUNNER ─────────────────────────────────────
function runInSilentTab(url, fn, timeout = 10000) {
  return new Promise(resolve => {
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      resolve(null); return;
    }
    chrome.tabs.create({ url, active: false, pinned: false }, tab => {
      const id = tab.id;
      const cleanup = () => { try { chrome.tabs.remove(id, () => {}); } catch(e) {} };
      const L = (tid, info) => {
        if (tid !== id || info.status !== 'complete') return;
        chrome.tabs.onUpdated.removeListener(L);
        fn(id).then(r => { cleanup(); resolve(r); }).catch(() => { cleanup(); resolve(null); });
      };
      chrome.tabs.onUpdated.addListener(L);
      setTimeout(() => { chrome.tabs.onUpdated.removeListener(L); cleanup(); resolve(null); }, timeout);
    });
  });
}

// ── SCRAPE SILENT ─────────────────────────────────────────
async function scrapeSilent(url) {
  return runInSilentTab(url, async id => {
    await sleep(1500);
    await new Promise(r => chrome.scripting.executeScript(
      { target: { tabId: id }, func: () => window.scrollTo(0, document.body.scrollHeight / 2) },
      () => r()
    ));
    await sleep(800);
    await new Promise(r => chrome.scripting.executeScript(
      { target: { tabId: id }, files: ['content.js'] }, () => r()
    ));
    return new Promise(r => chrome.tabs.sendMessage(id, { action: 'scrape' }, res => r(res?.leads || [])));
  });
}

// ── AUDIT SILENT ──────────────────────────────────────────
async function auditSilent(url) {
  return runInSilentTab(url, async id => {
    await sleep(2000);
    return new Promise(r => chrome.scripting.executeScript(
      { target: { tabId: id }, files: ['auditor.js'] },
      res => r(res?.[0]?.result || null)
    ));
  }, 14000);
}

// ── EMAIL FINDER ──────────────────────────────────────────
async function findEmailsForLead(firstName, lastName, domain) {
  if (!domain) return [];
  const d = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '').toLowerCase().trim();
  if (!d || !d.includes('.')) return [];

  const fn = (firstName || '').toLowerCase().replace(/[^a-z]/g, '');
  const ln = (lastName  || '').toLowerCase().replace(/[^a-z]/g, '');

  // Generate common patterns
  const patterns = [];
  if (fn && ln) {
    patterns.push({ email: `${fn}.${ln}@${d}`,    confidence: 'high',   type: 'pattern' });
    patterns.push({ email: `${fn}@${d}`,           confidence: 'medium', type: 'pattern' });
    patterns.push({ email: `${fn[0]}${ln}@${d}`,   confidence: 'medium', type: 'pattern' });
    patterns.push({ email: `${fn[0]}.${ln}@${d}`,  confidence: 'medium', type: 'pattern' });
    patterns.push({ email: `${fn}${ln[0]}@${d}`,   confidence: 'low',    type: 'pattern' });
  }
  patterns.push({ email: `info@${d}`,    confidence: 'low', type: 'generic' });
  patterns.push({ email: `contact@${d}`, confidence: 'low', type: 'generic' });
  patterns.push({ email: `hello@${d}`,   confidence: 'low', type: 'generic' });
  patterns.push({ email: `admin@${d}`,   confidence: 'low', type: 'generic' });

  // Try to scrape real emails from common pages
  const base   = `https://${d}`;
  const pages  = ['/contact', '/about', '/team', '/contact-us', '/about-us', '/leadership'];
  let found    = [];

  for (const page of pages.slice(0, 4)) {
    const result = await runInSilentTab(base + page, async id => {
      await sleep(1500);
      return new Promise(r => {
        chrome.scripting.executeScript({
          target: { tabId: id },
          func: () => {
            const text    = document.body.innerText || '';
            const mailtos = [...document.querySelectorAll('a[href^="mailto:"]')]
              .map(a => a.href.replace('mailto:', '').split('?')[0].toLowerCase().trim());
            const scraped = (text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}/g) || [])
              .map(e => e.toLowerCase())
              .filter(e => !e.includes('example') && !e.includes('sentry') &&
                           !e.includes('@2x') && !e.endsWith('.png') &&
                           !e.includes('google') && !e.includes('w3.org') &&
                           !e.includes('schema'));
            return [...new Set([...mailtos, ...scraped])].slice(0, 5);
          }
        }, res => r(res?.[0]?.result || null));
      });
    }, 7000);

    if (result?.length) {
      found = [...found, ...result.map(e => ({ email: e, confidence: 'verified', type: 'scraped' }))];
      if (found.length >= 3) break;
    }
    await sleep(300);
  }

  if (found.length > 0) {
    return [...new Map(found.map(x => [x.email, x])).values()].slice(0, 4);
  }
  return patterns.slice(0, 5);
}

// ── SOCIAL MEDIA AUDIT ────────────────────────────────────
async function auditSocialMedia(socialLinks) {
  const result = {};

  if (socialLinks?.instagram && socialLinks.instagram.includes('instagram.com')) {
    const data = await runInSilentTab(socialLinks.instagram, async id => {
      await sleep(2500);
      return new Promise(r => {
        chrome.scripting.executeScript({
          target: { tabId: id },
          func: () => {
            try {
              const desc = document.querySelector('meta[name="description"]')?.content ||
                           document.querySelector('meta[property="og:description"]')?.content || '';
              const followers = desc.match(/([\d,.]+[KkMm]?)\s*Followers/i)?.[1] || '';
              const posts     = desc.match(/([\d,]+)\s*Posts/i)?.[1] || '';
              const bio       = document.querySelector('meta[property="og:description"]')?.content || '';
              return { followers, posts, bio: bio.slice(0, 80), platform: 'instagram' };
            } catch(e) { return null; }
          }
        }, res => r(res?.[0]?.result || null));
      });
    }, 10000);
    if (data) result.instagram = data;
  }

  if (socialLinks?.facebook && socialLinks.facebook.includes('facebook.com')) {
    const data = await runInSilentTab(socialLinks.facebook, async id => {
      await sleep(2500);
      return new Promise(r => {
        chrome.scripting.executeScript({
          target: { tabId: id },
          func: () => {
            try {
              const desc  = document.querySelector('meta[name="description"]')?.content || '';
              const likes = desc.match(/([\d,.]+[KkMm]?)\s*(?:likes|followers)/i)?.[1] || '';
              const title = document.querySelector('title')?.textContent || '';
              return { likes, title, platform: 'facebook' };
            } catch(e) { return null; }
          }
        }, res => r(res?.[0]?.result || null));
      });
    }, 10000);
    if (data) result.facebook = data;
  }

  return result;
}

// ── INTENT SIGNALS (DOMAIN AGE) ───────────────────────────
async function getIntentSignals(domain) {
  if (!domain) return {};
  const d = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '').toLowerCase().trim();
  if (!d) return {};

  const whoisData = await runInSilentTab(`https://www.whois.com/whois/${d}`, async id => {
    await sleep(2500);
    return new Promise(r => {
      chrome.scripting.executeScript({
        target: { tabId: id },
        func: () => {
          const text    = document.body.innerText || '';
          const created = text.match(/Creation Date:\s*([^\n\r]+)/i)?.[1]?.trim() ||
                          text.match(/Registered On:\s*([^\n\r]+)/i)?.[1]?.trim() ||
                          text.match(/Created:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
          const updated = text.match(/Updated Date:\s*([^\n\r]+)/i)?.[1]?.trim() ||
                          text.match(/Last Updated:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
          return { created, updated };
        }
      }, res => r(res?.[0]?.result || null));
    });
  }, 10000);

  let domainAgeMonths = null;
  let isNewBusiness   = false;

  if (whoisData?.created) {
    const dt = new Date(whoisData.created.replace(/T.*/, ''));
    if (!isNaN(dt)) {
      domainAgeMonths = Math.floor((Date.now() - dt) / (1000 * 60 * 60 * 24 * 30));
      isNewBusiness   = domainAgeMonths <= 6;
    }
  }

  return {
    domainAgeMonths,
    isNewBusiness,
    createdDate:  whoisData?.created  || '',
    lastUpdated:  whoisData?.updated  || '',
    intentLabel:  isNewBusiness ? '🆕 New Business (<6 months)' :
                  domainAgeMonths !== null ? `Domain: ${domainAgeMonths}mo old` : ''
  };
}

// ── FIND CONTACTS ─────────────────────────────────────────
async function findContacts(websiteUrl) {
  if (!websiteUrl || !websiteUrl.startsWith('http')) return {};
  const base  = websiteUrl.replace(/\/$/, '');
  const paths = ['/contact', '/about', '/team', '/about-us', '/contact-us'];
  let email = '', phone = '', ownerName = '', social = {};

  for (const path of paths.slice(0, 3)) {
    const r = await runInSilentTab(base + path, async id => {
      await sleep(1500);
      return new Promise(r => {
        chrome.scripting.executeScript({ target: { tabId: id }, files: ['content.js'] }, () => {
          chrome.tabs.sendMessage(id, { action: 'scrapeContacts' }, res => r(res));
        });
      });
    }, 7000);
    if (r) {
      if (!email && r.emails?.length)  email     = r.emails[0];
      if (!phone && r.phones?.length)  phone     = r.phones[0];
      if (!ownerName && r.ownerName)   ownerName = r.ownerName;
      if (r.social) social = { ...social, ...r.social };
      if (email && phone && ownerName) break;
    }
    await sleep(300);
  }
  return { email, phone, ownerName, social };
}

// ── REVERSE SEARCH ────────────────────────────────────────
async function reverseSearch(keyword, platform) {
  const q    = encodeURIComponent(keyword);
  const urls = {
    google:   `https://www.google.com/search?q="${q}"+(looking+for+OR+need+help)+(digital+marketing+OR+meta+ads+OR+marketing+agency)`,
    reddit:   `https://www.google.com/search?q=site:reddit.com+"${q}"+"looking+for"+"marketing"`,
    linkedin: `https://www.google.com/search?q=site:linkedin.com+"${q}"+"looking+for"+"marketing"`
  };
  const leads = await scrapeSilent(urls[platform] || urls.google);
  return (leads || []).map(l => ({
    ...l,
    source:    'Reverse Scraper — ' + (platform || 'google'),
    painPoint: 'Actively looking for: ' + keyword,
    intent:    'HIGH'
  }));
}

// ── BEST SEND TIME ────────────────────────────────────────
function getBestSendTime(niche) {
  const t = {
    realestate: { label: 'Sunday 7pm',     emoji: '🏠' },
    ecommerce:  { label: 'Monday 9am',     emoji: '🛒' },
    restaurant: { label: 'Tuesday 10am',   emoji: '🍽️' },
    fitness:    { label: 'Monday 8am',     emoji: '💪' },
    agency:     { label: 'Tuesday 9am',    emoji: '📣' },
    startup:    { label: 'Tuesday 7am',    emoji: '🚀' },
    legal:      { label: 'Wednesday 9am',  emoji: '⚖️' },
    healthcare: { label: 'Tuesday 8am',    emoji: '🏥' }
  };
  return t[niche] || { label: 'Tuesday 9am', emoji: '📅' };
}

// ── OBJECTION HANDLER ─────────────────────────────────────
function detectObjection(text) {
  const t = (text || '').toLowerCase();
  if (t.match(/already have|currently (work|using)|someone else|our (own|in.?house|team)/)) return 'has_agency';
  if (t.match(/not interested|no thank|don.?t need|unsubscribe|remove/))                    return 'not_interested';
  if (t.match(/too expensive|can.?t afford|budget|cost|price|how much/))                    return 'price_objection';
  if (t.match(/send (more|info|details)|tell me more|interested|sounds good|curious/))      return 'wants_info';
  if (t.match(/call|schedule|meet|talk|discuss|available|when/))                            return 'wants_call';
  if (t.match(/not (now|yet)|later|maybe|in (a few|some) (months|weeks)/))                  return 'not_now';
  if (t.match(/who are you|how did you|where did/))                                         return 'how_found';
  return 'generic_reply';
}

function generateReply(objection, leadData) {
  const { firstName = 'there', company = 'your business' } = leadData || {};
  const book = "https://wa.me/923710160513";
  const replies = {
    has_agency:      { subject: 'Re: Quick question',            body: `Hi ${firstName},\n\nMost of our clients came to us while working with another agency. The difference is 2-week sprints — you see results fast, no long retainers.\n\nWorth a 10-min comparison call?\n${book}\n\nBest,\nUns` },
    not_interested:  { subject: 'Re: Totally understand',        body: `Hi ${firstName},\n\nNo problem at all. If things change, I'm here. Wishing ${company} all the best!\n\nBest,\nUns` },
    price_objection: { subject: 'Re: About the investment',      body: `Hi ${firstName},\n\nMost clients spend $300-800/month with us — less than US agencies charge for setup alone. Let me show you the ROI first:\n${book}\n\nBest,\nUns` },
    wants_info:      { subject: 'Re: More details',              body: `Hi ${firstName},\n\nWe specialize in Meta ads, Google ads, SEO and web dev. Pakistan-based = 60-70% lower cost than US agencies, same quality.\n\nQuick call?\n${book}\n\nBest,\nUns` },
    wants_call:      { subject: "Re: Let's connect",             body: `Hi ${firstName},\n\nAbsolutely! Book here:\n${book}\n\nI'll come prepared with specific ideas for ${company}.\n\nBest,\nUns` },
    not_now:         { subject: 'Re: No problem',                body: `Hi ${firstName},\n\nI'll follow up in a month. Anytime sooner:\n${book}\n\nWishing ${company} all the best!\n\nBest,\nUns` },
    how_found:       { subject: 'Re: How I found you',           body: `Hi ${firstName},\n\nI came across ${company} while researching businesses in your area and noticed some opportunities. I'm Uns from Outreach Marketing Agency.\n\nCan I share what I found?\n${book}\n\nBest,\nUns` },
    generic_reply:   { subject: 'Re: Thanks for getting back',   body: `Hi ${firstName},\n\nThanks for replying! Quick 15-min call?\n${book}\n\nBest,\nUns` }
  };
  return replies[objection] || replies.generic_reply;
}

// ── FOLLOW-UP ALARMS ──────────────────────────────────────
chrome.alarms.onAlarm.addListener(alarm => {
  if (!alarm.name.startsWith('followup_')) return;
  const leadId = alarm.name.replace('followup_', '');
  chrome.storage.local.get(['followupDue'], data => {
    const due = data.followupDue || [];
    if (!due.find(x => x.leadId === leadId)) {
      due.push({ leadId, dueAt: Date.now() });
      chrome.storage.local.set({ followupDue: due });
    }
  });
});

// ── MESSAGE HANDLER ───────────────────────────────────────
chrome.runtime.onMessage.addListener((req, sender, res) => {

  // ── Leads CRUD
  if (req.action === 'saveLeads') {
    chrome.storage.local.get(['leads', 'usage'], d => {
      const ex = d.leads || [], u = d.usage || {}, m = getCurrentMonth();
      if (!u[m]) u[m] = 0;
      const keys = new Set(ex.map(l => ((l.email || '') + (l.company || '')).toLowerCase().replace(/\s/g, '')));
      const nl   = req.leads.filter(l => {
        const k = ((l.email || '') + (l.company || '')).toLowerCase().replace(/\s/g, '');
        return k && !keys.has(k);
      });
      u[m] += nl.length;
      chrome.storage.local.set({ leads: [...ex, ...nl], usage: u }, () =>
        res({ count: ex.length + nl.length, added: nl.length, duplicates: req.leads.length - nl.length })
      );
    }); return true;
  }
  if (req.action === 'getLeads')   { chrome.storage.local.get(['leads'],   d => res({ leads:  d.leads  || [] })); return true; }
  if (req.action === 'clearLeads') { chrome.storage.local.set({ leads: [] }, () => res({ ok: true }));            return true; }

  if (req.action === 'updateLead') {
    chrome.storage.local.get(['leads'], d => {
      const l = d.leads || [], i = l.findIndex(x => x.id == req.lead.id);
      if (i !== -1) l[i] = req.lead;
      chrome.storage.local.set({ leads: l }, () => res({ ok: true }));
    }); return true;
  }
  if (req.action === 'deleteLead') {
    chrome.storage.local.get(['leads'], d => {
      chrome.storage.local.set({ leads: (d.leads || []).filter(l => l.id != req.id) }, () => res({ ok: true }));
    }); return true;
  }

  // ── Settings
  if (req.action === 'saveSettings') { chrome.storage.local.set({ settings: req.settings }, () => res({ ok: true })); return true; }
  if (req.action === 'getSettings')  { chrome.storage.local.get(['settings'], d => res({ settings: d.settings || {} })); return true; }

  // ── License
  if (req.action === 'validateLicense') {
    const plan  = detectPlan(req.key, req.email);
    const valid = plan !== 'free';
    chrome.storage.local.set({ licenseKey: req.key, licenseEmail: req.email, licenseValid: valid, licensePlan: plan },
      () => res({ valid, plan })
    ); return true;
  }
  if (req.action === 'getLicense') {
    chrome.storage.local.get(['licenseKey', 'licenseEmail', 'licenseValid', 'licensePlan'], d =>
      res({ key: d.licenseKey || '', email: d.licenseEmail || '', valid: d.licenseValid || false, plan: d.licensePlan || 'free' })
    ); return true;
  }
  if (req.action === 'checkLimit') {
    chrome.storage.local.get(['licenseValid', 'licensePlan', 'usage'], d => {
      const plan  = d.licensePlan || 'free';
      const valid = d.licenseValid || false;
      if (valid && plan === 'pro')     { res({ allowed: true,  plan: 'pro',     isPro: true,  isStarter: false, remaining: 999999, used: 0, limit: 999999 }); return; }
      if (valid && plan === 'starter') {
        const used = (d.usage || {})[getCurrentMonth()] || 0;
        res({ allowed: used < 500, plan: 'starter', isPro: false, isStarter: true, remaining: Math.max(0, 500 - used), used, limit: 500 });
        return;
      }
      const used = (d.usage || {})[getCurrentMonth()] || 0;
      res({ allowed: used < 20, plan: 'free', isPro: false, isStarter: false, remaining: Math.max(0, 20 - used), used, limit: 20 });
    }); return true;
  }

  // ── Scraping / Auditing
  if (req.action === 'auditWebsite')    { auditSilent(req.url).then(r  => res({ result: r }));         return true; }
  if (req.action === 'scrapeSilent')    { scrapeSilent(req.url).then(l => res({ leads:  l || [] }));   return true; }
  if (req.action === 'findContacts')    { findContacts(req.url).then(r => res(r));                     return true; }

  // ── New v9 features
  if (req.action === 'findEmailsForLead') {
    findEmailsForLead(req.firstName, req.lastName, req.domain).then(r => res({ emails: r })); return true;
  }
  if (req.action === 'auditSocialMedia') {
    auditSocialMedia(req.socialLinks).then(r => res({ result: r })); return true;
  }
  if (req.action === 'getIntentSignals') {
    getIntentSignals(req.domain).then(r => res({ result: r })); return true;
  }
  if (req.action === 'reverseSearch')    { reverseSearch(req.keyword, req.platform).then(l => res({ leads: l }));    return true; }
  if (req.action === 'getBestSendTime')  { res(getBestSendTime(req.niche));                                          return true; }
  if (req.action === 'detectObjection')  {
    const o = detectObjection(req.text);
    res({ objection: o, response: generateReply(o, req.leadData || {}) }); return true;
  }

  // ── CRM Deals
  if (req.action === 'saveCRMDeal') {
    chrome.storage.local.get(['crmDeals'], d => {
      const deals = d.crmDeals || [], i = deals.findIndex(x => x.id == req.deal.id);
      if (i !== -1) deals[i] = req.deal; else deals.push(req.deal);
      chrome.storage.local.set({ crmDeals: deals }, () => res({ ok: true }));
    }); return true;
  }
  if (req.action === 'getCRMDeals')  { chrome.storage.local.get(['crmDeals'], d => res({ deals: d.crmDeals || [] })); return true; }
  if (req.action === 'deleteCRMDeal') {
    chrome.storage.local.get(['crmDeals'], d => {
      chrome.storage.local.set({ crmDeals: (d.crmDeals || []).filter(x => x.id != req.id) }, () => res({ ok: true }));
    }); return true;
  }

  // ── Follow-ups
  if (req.action === 'scheduleFollowup') {
    const ms = (req.days || 3) * 24 * 60 * 60 * 1000;
    chrome.alarms.create('followup_' + req.leadId, { when: Date.now() + ms });
    res({ ok: true }); return true;
  }
  if (req.action === 'getFollowupsDue') {
    chrome.storage.local.get(['followupDue'], d => res({ due: d.followupDue || [] })); return true;
  }
  if (req.action === 'clearFollowup') {
    chrome.storage.local.get(['followupDue'], d => {
      chrome.storage.local.set({ followupDue: (d.followupDue || []).filter(x => x.leadId !== req.leadId) },
        () => res({ ok: true }));
    }); return true;
  }
});
