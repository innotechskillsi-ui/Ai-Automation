// ============================================================
// OMA Lead Engine v9 — popup.js
// Features: 3-tier license · Email Finder · Gmail Outreach ·
//   Social Audit · Intent Signals · CRM Kanban · Follow-ups ·
//   Lead Notes · 10 scrapers · 21 email templates
// ============================================================

let currentPlan  = 'free';   // 'free' | 'starter' | 'pro'
let activeFilter = 'all';
let activeLeadPlatform = 'google';
let outNiche     = 'realestate';
let outType      = 'cold';
let settings     = {};

const CRM_STAGES = [
  { id: 'new',       label: 'New',       color: 'var(--a)' },
  { id: 'contacted', label: 'Contacted', color: 'var(--pu)' },
  { id: 'interested',label: 'Interested',color: 'var(--w)' },
  { id: 'proposal',  label: 'Proposal',  color: 'var(--gold)' },
  { id: 'closed',    label: 'Closed ✓',  color: 'var(--a2)' }
];

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  loadSettings();
  detectPage();
  restoreState();
  checkLicense();
  updateUsageBar();
  checkFollowupsDue();
  buildTemplateGrid();
});

// ── BIND EVENTS ───────────────────────────────────────────
function bindEvents() {
  // Tabs
  ['scrape','bulk','steal','leads','crm','outreach','log','settings'].forEach(n => {
    document.getElementById('tab-' + n + '-btn').addEventListener('click', () => goTab(n));
  });

  // Scrape tab
  document.getElementById('scrapeBtn').addEventListener('click', doScrape);
  document.getElementById('auditAllBtn').addEventListener('click', auditAllSilently);

  // Quick links
  const links = {
    'link-maps':    'https://www.google.com/maps/search/real+estate+agent+Texas',
    'link-linkedin':'https://www.linkedin.com/search/results/people/?keywords=real+estate+agent',
    'link-yp':      'https://www.yellowpages.com/search?search_terms=real+estate+agent&geo_location_terms=Texas',
    'link-yelp':    'https://www.yelp.com/search?find_desc=marketing&find_loc=Texas',
    'link-clutch':  'https://clutch.co/agencies/digital-marketing',
    'link-angi':    'https://www.angi.com/companylist/us/tx/plumber.htm'
  };
  Object.entries(links).forEach(([id, url]) => {
    document.getElementById(id).addEventListener('click', e => { e.preventDefault(); chrome.tabs.create({ url }); });
  });

  // Bulk tab
  document.getElementById('bulkBtn').addEventListener('click', doBulkScrape);

  // Steal tab
  document.getElementById('compBtn').addEventListener('click', runCompetitorStealer);
  document.getElementById('reverseBtn').addEventListener('click', doReverseSearch);
  document.querySelectorAll('[data-plat]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-plat]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeLeadPlatform = btn.dataset.plat;
    });
  });

  // Leads tab
  document.getElementById('pushBtn').addEventListener('click', pushAll);
  document.getElementById('csvBtn').addEventListener('click', dlCSV);
  document.getElementById('clrBtn').addEventListener('click', clrAll);
  document.getElementById('srchInput').addEventListener('input', e => loadLeadsTab(e.target.value));
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('on'));
      chip.classList.add('on');
      activeFilter = chip.dataset.filter;
      loadLeadsTab(document.getElementById('srchInput').value);
    });
  });

  // Outreach tab
  document.getElementById('outLeadSelect').addEventListener('change', onOutLeadChange);
  document.getElementById('gmailSendBtn').addEventListener('click', sendViaGmail);
  document.getElementById('copyEmailBtn').addEventListener('click', copyEmailPreview);
  document.getElementById('refreshPreviewBtn').addEventListener('click', refreshPreview);
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      outType = btn.dataset.type;
      refreshPreview();
    });
  });

  // Settings
  document.getElementById('saveBtn').addEventListener('click', saveS);
  document.getElementById('iUrl').addEventListener('input', chkConn);

  // License
  document.getElementById('upgradeBarBtn').addEventListener('click', showModal);
  document.getElementById('upgradeSettingsBtn').addEventListener('click', showModal);
  document.getElementById('enterKeyLink').addEventListener('click', showModal);
  document.getElementById('closeModalBtn').addEventListener('click', hideModal);
  document.getElementById('activateBtn').addEventListener('click', activateLicense);

  // Follow-up alert
  document.getElementById('followupViewBtn').addEventListener('click', () => goTab('leads'));
}

// ── LICENSE ───────────────────────────────────────────────
function checkLicense() {
  chrome.runtime.sendMessage({ action: 'getLicense' }, res => {
    currentPlan = res?.plan || 'free';
    updatePlanUI(currentPlan);
  });
}

function updatePlanUI(plan) {
  currentPlan = plan;
  const badge = document.getElementById('planBadge');
  const info  = document.getElementById('licInfo');
  const feats = document.getElementById('licFeatures');
  const upgBtn = document.getElementById('upgradeSettingsBtn');
  const licBadge = document.getElementById('licStatusBadge');

  if (plan === 'pro') {
    badge.textContent   = 'PRO';
    badge.className     = 'plan-badge plan-pro';
    document.getElementById('usageBar').style.display = 'none';
    licBadge.textContent = 'PRO ACTIVE';
    licBadge.className   = 'lic-status lic-pro';
    info.textContent     = 'Unlimited leads · All features unlocked';
    feats.innerHTML      = ['Unlimited leads', 'Email Finder', 'Gmail Outreach', 'Social Audit',
      'Intent Signals', 'CRM Pipeline', 'Bulk Scrape', 'Competitor Stealer', 'All templates']
      .map(f => '<div class="lic-feat has">✓ ' + f + '</div>').join('');
    upgBtn.style.display = 'none';
  } else if (plan === 'starter') {
    badge.textContent   = 'STARTER';
    badge.className     = 'plan-badge plan-starter';
    licBadge.textContent = 'STARTER ACTIVE';
    licBadge.className   = 'lic-status lic-starter';
    info.textContent     = '500 leads/month · Starter features unlocked';
    feats.innerHTML      = [
      { l: '500 leads/month',       ok: true  },
      { l: 'Email Finder',          ok: true  },
      { l: 'Gmail 1-click Outreach',ok: true  },
      { l: 'Social Media Audit',    ok: true  },
      { l: 'Reverse Search',        ok: true  },
      { l: 'Intent Signals (Pro)',  ok: false },
      { l: 'CRM Pipeline (Pro)',    ok: false },
      { l: 'Bulk Scrape (Pro)',     ok: false },
      { l: 'Unlimited leads (Pro)', ok: false }
    ].map(f => `<div class="lic-feat ${f.ok ? 'has' : 'locked'}">${f.ok ? '✓' : '🔒'} ${f.l}</div>`).join('');
    upgBtn.textContent = '⚡ Upgrade to Pro — $79/month';
    upgBtn.style.display = '';
  } else {
    badge.textContent   = 'FREE';
    badge.className     = 'plan-badge plan-free';
  }

  // Enable/disable tier-gated buttons
  const starterOk = plan === 'starter' || plan === 'pro';
  const proOk     = plan === 'pro';
  document.getElementById('auditAllBtn').disabled  = !starterOk;
  document.getElementById('bulkBtn').disabled      = !proOk;
  document.getElementById('compBtn').disabled      = !proOk;
  document.getElementById('reverseBtn').disabled   = !starterOk;
}

function showModal() { document.getElementById('upgradeModal').classList.add('show'); }
function hideModal()  { document.getElementById('upgradeModal').classList.remove('show'); document.getElementById('modalMsg').textContent = ''; }

function selectPlan(plan) {
  document.getElementById('planCardStarter').classList.toggle('selected', plan === 'STARTER');
  document.getElementById('planCardPro').classList.toggle('selected', plan === 'PRO');
}

function activateLicense() {
  const key   = document.getElementById('licKey').value.trim();
  const email = document.getElementById('licEmail').value.trim();
  const msg   = document.getElementById('modalMsg');
  if (!email || !key) { msg.textContent = '⚠️ Enter your email and license key'; msg.className = 'modal-msg err'; return; }
  chrome.runtime.sendMessage({ action: 'validateLicense', key, email }, res => {
    if (res?.valid) {
      msg.textContent = '✅ ' + res.plan.toUpperCase() + ' activated!';
      msg.className   = 'modal-msg ok';
      setTimeout(() => {
        hideModal();
        updatePlanUI(res.plan);
        updateUsageBar();
        addLog('🎉 ' + res.plan.toUpperCase() + ' activated for ' + email, 'ok');
      }, 1200);
    } else {
      msg.textContent = '❌ Invalid key — check email and key match';
      msg.className   = 'modal-msg err';
    }
  });
}

// ── USAGE BAR ─────────────────────────────────────────────
function updateUsageBar() {
  chrome.runtime.sendMessage({ action: 'checkLimit' }, res => {
    if (res?.plan === 'pro') return;
    const used  = res?.used  || 0;
    const limit = res?.limit || 20;
    const pct   = Math.min(100, (used / limit) * 100);
    document.getElementById('usageText').textContent = used + ' / ' + limit + ' this month';
    const fill = document.getElementById('usageFill');
    fill.style.width = pct + '%';
    fill.className   = 'usage-fill' + (pct >= 90 ? ' danger' : pct >= 70 ? ' warn' : '');
  });
}

// ── FOLLOW-UP CHECKER ─────────────────────────────────────
function checkFollowupsDue() {
  chrome.runtime.sendMessage({ action: 'getFollowupsDue' }, res => {
    const due = res?.due || [];
    if (!due.length) return;
    chrome.storage.local.get(['leads'], data => {
      const leads = data.leads || [];
      const alert = document.getElementById('followupAlert');
      const text  = document.getElementById('followupText');
      const names = due.map(d => {
        const l = leads.find(x => x.id == d.leadId);
        return l ? l.company || l.firstName : 'Lead';
      }).slice(0, 2);
      text.textContent = '⏰ Follow-up due: ' + names.join(', ') + (due.length > 2 ? ' +' + (due.length - 2) + ' more' : '');
      alert.classList.add('show');
    });
  });
}

// ── PAGE DETECTION ────────────────────────────────────────
function detectPage() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) return;
    const url = tabs[0].url || '';
    document.getElementById('pageUrl').textContent = url.length > 55 ? url.slice(0, 55) + '...' : url;
    setPageBar(url);
  });
}

function setPageBar(url) {
  const u = url.toLowerCase();
  const platforms = [
    ['google.com/maps',    '🗺️', 'Google Maps'],
    ['linkedin.com',       '💼', 'LinkedIn'],
    ['yellowpages.com',    '📖', 'Yellow Pages'],
    ['realtor.com',        '🏠', 'Realtor.com'],
    ['zillow.com',         '🏡', 'Zillow'],
    ['yelp.com',           '⭐', 'Yelp'],
    ['clutch.co',          '🏆', 'Clutch.co'],
    ['angi.com',           '🔧', 'Angi'],
    ['trustpilot.com',     '⭐', 'Trustpilot'],
    ['facebook.com',       '📘', 'Facebook Business'],
    ['google.com/search',  '🔍', 'Google Search']
  ];
  let ico = '🌐', name = 'Open a page to scrape';
  for (const [match, i, n] of platforms) {
    if (u.includes(match)) { ico = i; name = n + ' ✅ Ready'; break; }
  }
  if (u.startsWith('chrome://') || u.startsWith('chrome-extension://')) { ico = '🚫'; name = 'Cannot scrape Chrome pages'; }
  document.getElementById('pageIco').textContent  = ico;
  document.getElementById('pageName').textContent = name;
}

// ── RESTORE STATE ─────────────────────────────────────────
function restoreState() {
  chrome.storage.local.get(['lastTab', 'scrapeResults'], data => {
    goTab(data.lastTab || 'scrape', false);
    if (data.scrapeResults?.length) {
      renderCards(data.scrapeResults);
      document.getElementById('resBar').style.display = 'flex';
      document.getElementById('resNum').textContent   = data.scrapeResults.length;
    }
    loadLeadsTab();
  });
}

// ── TABS ──────────────────────────────────────────────────
function goTab(name, save = true) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.pnl').forEach(p => p.classList.remove('on'));
  const btn = document.getElementById('tab-' + name + '-btn');
  const pnl = document.getElementById('pnl-' + name);
  if (btn) btn.classList.add('on');
  if (pnl) pnl.classList.add('on');
  if (save) chrome.storage.local.set({ lastTab: name });
  if (name === 'leads')    loadLeadsTab();
  if (name === 'crm')      loadCRMTab();
  if (name === 'outreach') loadOutreachTab();
}

// ── SCRAPE ────────────────────────────────────────────────
function doScrape() {
  chrome.runtime.sendMessage({ action: 'checkLimit' }, res => {
    if (!res.allowed) {
      addLog('⚠️ Lead limit reached (' + res.plan + '). Upgrade to continue.', 'err');
      showModal();
      return;
    }
    executeScrape();
  });
}

function executeScrape() {
  const btn = document.getElementById('scrapeBtn');
  btn.disabled = true; btn.textContent = '⏳ Scraping...';
  document.getElementById('liveStatus').textContent = 'Scraping...';

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) { resetScrapeBtn(); return; }
    const url = tabs[0].url || '';
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      addLog('❌ Cannot scrape Chrome pages', 'err'); resetScrapeBtn(); return;
    }
    chrome.scripting.executeScript({ target: { tabId: tabs[0].id }, files: ['content.js'] }, () => {
      if (chrome.runtime.lastError) { addLog('❌ ' + chrome.runtime.lastError.message, 'err'); resetScrapeBtn(); return; }
      setTimeout(() => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'scrape' }, res => {
          if (chrome.runtime.lastError) { addLog('❌ Content script error. Refresh page and try again.', 'err'); resetScrapeBtn(); return; }
          const leads = (res?.leads || []).map(l => ({
            ...l, score: scoreL(l), id: Date.now() + Math.random(), status: 'new'
          }));
          addLog('✅ Found ' + leads.length + ' leads from ' + (res?.url || 'page'), leads.length > 0 ? 'ok' : 'inf');
          document.getElementById('resBar').style.display = 'flex';
          document.getElementById('resNum').textContent   = leads.length;
          document.getElementById('dupeNum').textContent  = '0 dupes skipped';
          if (!leads.length) {
            document.getElementById('scrapeResults').innerHTML =
              '<div class="empty"><div class="e-ico">😔</div><div class="e-txt">No leads found</div><div class="e-sub">Scroll down first, then scrape again</div></div>';
            chrome.storage.local.set({ scrapeResults: [] });
          } else {
            renderCards(leads);
            chrome.storage.local.set({ scrapeResults: leads });
            chrome.runtime.sendMessage({ action: 'saveLeads', leads }, r => {
              const dupes = r?.duplicates || 0;
              addLog('💾 Saved ' + (r?.added || 0) + ' new leads' + (dupes ? ' (' + dupes + ' dupes skipped)' : ''), 'ok');
              if (dupes > 0) document.getElementById('dupeNum').textContent = dupes + ' dupes skipped';
              updateUsageBar(); loadLeadsTab();
            });
          }
          resetScrapeBtn();
          document.getElementById('liveStatus').textContent = leads.length + ' found';
        });
      }, 400);
    });
  });
}

function resetScrapeBtn() {
  const btn = document.getElementById('scrapeBtn');
  btn.disabled = false; btn.textContent = '⚡ Scrape This Page';
  document.getElementById('liveStatus').textContent = 'Ready';
}

// ── SILENT AUDIT ALL ──────────────────────────────────────
async function auditAllSilently() {
  if (currentPlan === 'free') { showModal(); return; }
  chrome.storage.local.get(['scrapeResults'], async res => {
    let leads  = res.scrapeResults || [];
    const todo = leads.filter(l => l.website?.startsWith('http') && !l.audit);
    if (!todo.length) { addLog('ℹ️ All leads already audited or no websites', 'inf'); return; }

    const box = document.getElementById('auditProgress');
    box.style.display = 'block';
    document.getElementById('auditAllBtn').disabled = true;
    addLog('🎯 Auditing ' + todo.length + ' websites silently...', 'inf');

    for (let i = 0; i < todo.length; i++) {
      const lead = todo[i];
      const pct  = Math.round(((i + 1) / todo.length) * 100);
      document.getElementById('auditProgressLabel').textContent = 'Auditing: ' + (lead.company || lead.website || '').slice(0, 30) + '...';
      document.getElementById('auditProgressFill').style.width  = pct + '%';
      document.getElementById('auditProgressDetail').textContent = (i + 1) + ' / ' + todo.length + ' · ' + pct + '%';

      const audit = await new Promise(resolve => {
        chrome.runtime.sendMessage({ action: 'auditWebsite', url: lead.website }, r => resolve(r?.result || null));
      });
      if (audit) {
        lead.audit     = audit;
        lead.score     = audit.score;
        lead.opener    = audit.opener;
        lead.techStack = audit.techStack;
        if (!lead.email && audit.emails?.length) lead.email = audit.emails[0];
        if (!lead.phone && audit.phones?.length) lead.phone = audit.phones[0];
        chrome.runtime.sendMessage({ action: 'updateLead', lead });
        addLog('✅ Audited: ' + (lead.company || 'lead') + ' — score: ' + audit.score, 'ok');
      }
    }

    chrome.storage.local.set({ scrapeResults: leads });
    renderCards(leads); loadLeadsTab();
    box.style.display = 'none';
    document.getElementById('auditAllBtn').disabled = false;
    addLog('🎯 Audit complete!', 'ok');
  });
}

// ── RENDER LEAD CARDS (Scrape Tab) ────────────────────────
function renderCards(leads) {
  const container = document.getElementById('scrapeResults');
  if (!leads.length) { container.innerHTML = ''; return; }
  container.innerHTML = leads.map(l => buildCard(l)).join('');
  leads.forEach(l => bindCardEvents(l));
}

function buildCard(l) {
  const stars  = scoreToStars(l.score);
  const domain = l.website ? l.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : '';
  const tags   = buildTags(l);
  const hasAudit = !!l.audit;
  return `<div class="lc ${hasAudit ? 'audited' : ''}" id="lc-${l.id}">
    <div class="score-wrap"><div class="score-stars">${stars}</div></div>
    <div class="la-wrap">
      <button class="la la-audit" data-id="${l.id}" title="Audit website">🎯</button>
      <button class="la la-x"     data-del="${l.id}" title="Delete">✕</button>
    </div>
    <div class="lc-body">
      <div class="lc-n">${l.company || (l.firstName + ' ' + l.lastName)}</div>
      ${domain ? `<a class="lc-domain" href="${l.website}" target="_blank">${domain}</a>` : ''}
      <div class="lc-c">${[l.email, l.phone].filter(Boolean).join(' · ') || 'No contact info'}</div>
      ${l.techStack ? `<div class="lc-c" style="font-size:10px">🔧 ${l.techStack} · ${l.source || ''}</div>` : `<div class="lc-c" style="font-size:10px">${l.source || ''}</div>`}
      <div class="lc-tags">${tags}</div>
    </div>
    <div class="audit-panel" id="ap-${l.id}">${hasAudit ? buildAuditPanel(l) : ''}</div>
    <div class="email-panel" id="ep-${l.id}">
      <div class="email-panel-title">📧 Found Emails</div>
      <div id="ep-list-${l.id}"><div style="font-size:10px;color:var(--m);font-family:var(--mono)">Loading...</div></div>
    </div>
    <div class="social-panel" id="sp-${l.id}">
      <div class="social-panel-title">📱 Social Audit</div>
      <div id="sp-data-${l.id}"><div style="font-size:10px;color:var(--m);font-family:var(--mono)">Loading...</div></div>
    </div>
    <div class="notes-box" id="notes-${l.id}" style="display:none;margin-top:6px">
      <textarea class="notes-input" rows="2" placeholder="Add notes..." data-lead-id="${l.id}">${l.notes || ''}</textarea>
    </div>
  </div>`;
}

function bindCardEvents(l) {
  const card = document.getElementById('lc-' + l.id);
  if (!card) return;

  // Audit button
  card.querySelector('[data-id]')?.addEventListener('click', () => toggleAuditPanel(l));

  // Delete button
  card.querySelector('[data-del]')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'deleteLead', id: l.id }, () => {
      document.getElementById('lc-' + l.id)?.remove();
      loadLeadsTab();
    });
  });

  // Notes textarea
  card.querySelector('textarea[data-lead-id]')?.addEventListener('blur', e => {
    const note = e.target.value;
    l.notes = note;
    chrome.runtime.sendMessage({ action: 'updateLead', lead: l });
  });

  // Opener edit in audit panel
  card.querySelector('.opener-edit-btn')?.addEventListener('click', () => toggleOpenerEdit(l.id));
}

function toggleAuditPanel(lead) {
  const ap = document.getElementById('ap-' + lead.id);
  const ep = document.getElementById('ep-' + lead.id);
  const sp = document.getElementById('sp-' + lead.id);
  const nb = document.getElementById('notes-' + lead.id);

  if (ap.classList.contains('show')) {
    ap.classList.remove('show'); ep.classList.remove('show');
    sp.classList.remove('show'); if (nb) nb.style.display = 'none';
    return;
  }

  // Show audit panel
  ap.classList.add('show');
  if (nb) nb.style.display = 'block';
  if (lead.audit) { ap.innerHTML = buildAuditPanel(lead); bindAuditPanelEvents(lead); return; }

  // Run audit
  ap.innerHTML = '<div style="font-size:10px;color:var(--m);font-family:var(--mono);padding:6px 0">⏳ Auditing website...</div>';
  chrome.runtime.sendMessage({ action: 'auditWebsite', url: lead.website }, res => {
    if (res?.result) {
      lead.audit     = res.result;
      lead.score     = res.result.score;
      lead.opener    = res.result.opener;
      lead.techStack = res.result.techStack;
      if (!lead.email && res.result.emails?.length) lead.email = res.result.emails[0];
      chrome.runtime.sendMessage({ action: 'updateLead', lead });
      ap.innerHTML = buildAuditPanel(lead);
      bindAuditPanelEvents(lead);
      document.getElementById('lc-' + lead.id)?.classList.add('audited');
      addLog('✅ Audited: ' + lead.company + ' — score: ' + lead.score, 'ok');
    } else {
      ap.innerHTML = '<div style="font-size:10px;color:var(--d);font-family:var(--mono);padding:6px 0">❌ Could not audit (no website or blocked)</div>';
    }
  });

  // Email finder
  if ((currentPlan === 'starter' || currentPlan === 'pro') && lead.website) {
    ep.classList.add('show');
    const domain = lead.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '');
    chrome.runtime.sendMessage({ action: 'findEmailsForLead', firstName: lead.firstName, lastName: lead.lastName, domain }, r => {
      const list = document.getElementById('ep-list-' + lead.id);
      if (!list) return;
      if (r?.emails?.length) {
        list.innerHTML = r.emails.map(e =>
          `<div class="email-row">
            <span class="email-addr">${e.email}</span>
            <span class="email-conf conf-${e.confidence}">${e.confidence}</span>
            <button class="btn-sm" onclick="navigator.clipboard.writeText('${e.email}')">Copy</button>
           </div>`
        ).join('');
        if (!lead.email && r.emails[0]?.confidence === 'verified') {
          lead.email = r.emails[0].email;
          chrome.runtime.sendMessage({ action: 'updateLead', lead });
        }
        addLog('📧 Found ' + r.emails.length + ' emails for ' + lead.company, 'ok');
      } else {
        list.innerHTML = '<div style="font-size:10px;color:var(--m);font-family:var(--mono)">No emails found</div>';
      }
    });
  }

  // Social audit
  if ((currentPlan === 'starter' || currentPlan === 'pro') && lead.social && Object.keys(lead.social).length > 0) {
    sp.classList.add('show');
    chrome.runtime.sendMessage({ action: 'auditSocialMedia', socialLinks: lead.social }, r => {
      const container = document.getElementById('sp-data-' + lead.id);
      if (!container) return;
      const result = r?.result || {};
      let html = '';
      if (result.instagram) {
        const ig = result.instagram;
        html += `<div class="social-stat"><span class="social-ico">📸</span><span class="social-val">${ig.followers || '?'} followers</span><span class="social-sub">${ig.posts || '?'} posts</span></div>`;
      }
      if (result.facebook) {
        const fb = result.facebook;
        html += `<div class="social-stat"><span class="social-ico">📘</span><span class="social-val">${fb.likes || '?'} likes</span></div>`;
      }
      if (!html) html = '<div style="font-size:10px;color:var(--m);font-family:var(--mono)">No public social data found</div>';
      container.innerHTML = html;
    });
  } else if ((currentPlan === 'starter' || currentPlan === 'pro') && lead.website) {
    sp.classList.add('show');
    document.getElementById('sp-data-' + lead.id).innerHTML = '<div style="font-size:10px;color:var(--m);font-family:var(--mono)">No social profiles detected</div>';
  }
}

function buildAuditPanel(l) {
  if (!l.audit) return '';
  const a      = l.audit;
  const score  = a.score || 0;
  const color  = score >= 70 ? 'var(--a2)' : score >= 40 ? 'var(--w)' : 'var(--d)';
  const issues = (a.issues || []).filter(i => i.pitch || i.problem);
  return `
    <div class="health-row">
      <span class="health-label">Website Health</span>
      <div class="health-track"><div class="health-fill" style="width:${score}%;background:${color}"></div></div>
      <span class="health-val" style="color:${color}">${score}</span>
    </div>
    ${a.techStack ? `<div style="font-size:10px;color:var(--pu);font-family:var(--mono);margin-bottom:6px">🔧 Built on: ${a.techStack}</div>` : ''}
    ${a.loadTime ? `<div style="font-size:10px;color:var(--m);font-family:var(--mono);margin-bottom:6px">⏱️ Load time: ${(a.loadTime/1000).toFixed(1)}s${a.loadTime > 4000 ? ' 🐌' : ''}</div>` : ''}
    <div class="opener-box">
      <div class="opener-label">
        <span>✉️ Personalized Opener</span>
        <span class="opener-edit-btn" data-lid="${l.id}">edit</span>
      </div>
      <div class="opener-text" id="opener-text-${l.id}">${a.opener || l.opener || ''}</div>
      <textarea class="opener-input" id="opener-input-${l.id}" rows="2">${a.opener || l.opener || ''}</textarea>
    </div>
    ${issues.length ? `<div class="issues-grid">${issues.slice(0, 6).map(i =>
      `<div class="issue-chip">
        <div class="issue-chip-prob">${i.icon || ''} ${i.problem}</div>
        <div class="issue-chip-svc">${i.service || ''}</div>
       </div>`
    ).join('')}</div>` : ''}`;
}

function bindAuditPanelEvents(lead) {
  document.getElementById('ap-' + lead.id)?.querySelector('.opener-edit-btn')?.addEventListener('click', () => {
    toggleOpenerEdit(lead.id);
  });
}

function toggleOpenerEdit(id) {
  const txt   = document.getElementById('opener-text-' + id);
  const input = document.getElementById('opener-input-' + id);
  if (!txt || !input) return;
  if (input.style.display === 'block') {
    txt.textContent  = input.value;
    input.style.display = 'none';
    txt.style.display   = 'block';
  } else {
    input.style.display = 'block';
    txt.style.display   = 'none';
    input.focus();
  }
}

function buildTags(l) {
  const tags = [];
  if (l.email)     tags.push('<span class="tag te">✉ email</span>');
  if (l.phone)     tags.push('<span class="tag tp">📞 phone</span>');
  if (l.techStack) tags.push('<span class="tag t-stack">🔧 ' + l.techStack + '</span>');
  if (l.audit) {
    const s = l.audit.score || 0;
    if (s < 40)      tags.push('<span class="tag t-issues">🔥 Hot Lead</span>');
    else if (s < 60) tags.push('<span class="tag tn">✓ Audited</span>');
    else             tags.push('<span class="tag ts">✓ Audited</span>');
  }
  if (l.intent?.isNewBusiness) tags.push('<span class="tag t-intent">🆕 New Biz</span>');
  return tags.join('');
}

function scoreToStars(score) {
  if (score === undefined || score === null) return '⬜⬜⬜';
  if (score < 30) return '⭐⭐⭐';
  if (score < 60) return '⭐⭐';
  return '⭐';
}

function scoreL(l) {
  let s = 50;
  if (l.email)   s -= 10;
  if (l.phone)   s -= 5;
  if (l.website) s -= 10;
  if (l.social && Object.keys(l.social).length > 0) s -= 5;
  return Math.max(0, Math.min(100, s));
}

// ── BULK SCRAPE ───────────────────────────────────────────
async function doBulkScrape() {
  if (currentPlan !== 'pro') { showModal(); return; }
  const url   = document.getElementById('bulkUrl').value.trim();
  const pages = parseInt(document.getElementById('bulkPages').value) || 5;
  if (!url) { addLog('❌ Enter a search URL', 'err'); return; }

  document.getElementById('bulkBtn').disabled = true;
  const box = document.getElementById('bulkProgress');
  box.style.display = 'block';
  addLog('⚡ Bulk scraping ' + pages + ' pages...', 'inf');

  let allLeads = [], totalDupes = 0;
  for (let p = 1; p <= pages; p++) {
    const pageUrl = buildPaginatedUrl(url, p);
    document.getElementById('bulkProgressLabel').textContent = 'Scraping page ' + p + ' / ' + pages + '...';
    document.getElementById('bulkProgressFill').style.width  = Math.round((p / pages) * 100) + '%';
    document.getElementById('bulkProgressDetail').textContent = allLeads.length + ' leads so far';

    const leads = await new Promise(resolve => {
      chrome.runtime.sendMessage({ action: 'scrapeSilent', url: pageUrl }, r => resolve(r?.leads || []));
    });
    allLeads = [...allLeads, ...leads.map(l => ({ ...l, score: scoreL(l), id: Date.now() + Math.random(), status: 'new' }))];
    addLog('📄 Page ' + p + ': ' + leads.length + ' leads', 'ok');
  }

  document.getElementById('bulkBtn').disabled = false;
  box.style.display = 'none';

  if (allLeads.length) {
    document.getElementById('bulkResults').innerHTML = '<div style="font-size:11px;color:var(--a2);font-family:var(--mono);padding:6px 0">✅ Collected ' + allLeads.length + ' leads</div>';
    chrome.runtime.sendMessage({ action: 'saveLeads', leads: allLeads }, r => {
      addLog('💾 Bulk saved ' + (r?.added || 0) + ' leads', 'ok');
      updateUsageBar(); loadLeadsTab();
    });
  }
}

function buildPaginatedUrl(url, page) {
  if (url.includes('google.com/maps')) {
    return url + (url.includes('?') ? '&' : '?') + 'start=' + ((page - 1) * 20);
  }
  if (url.includes('yellowpages.com'))  return url.replace(/&pg=\d+/, '') + '&pg=' + page;
  if (url.includes('linkedin.com'))     return url.replace(/&start=\d+/, '') + '&start=' + ((page - 1) * 10);
  if (url.includes('clutch.co'))        return url.replace(/\/page\/\d+/, '') + '/page/' + page;
  return url;
}

// ── COMPETITOR STEALER ────────────────────────────────────
async function runCompetitorStealer() {
  if (currentPlan !== 'pro') { showModal(); return; }
  const name     = document.getElementById('compName').value.trim();
  const location = document.getElementById('compLocation').value.trim();
  if (!name) { addLog('❌ Enter a competitor name', 'err'); return; }

  document.getElementById('compBtn').disabled = true;
  const box = document.getElementById('compProgress');
  box.style.display = 'block';
  document.getElementById('compProgressLabel').textContent = 'Searching for ' + name + "'s clients...";
  document.getElementById('compProgressFill').style.width  = '30%';

  const query  = name + (location ? ' ' + location : '') + ' clients testimonials';
  const leads  = await new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'reverseSearch', keyword: query, platform: 'google' }, r => resolve(r?.leads || []));
  });

  document.getElementById('compProgressFill').style.width = '100%';
  box.style.display = 'none';
  document.getElementById('compBtn').disabled = false;

  if (leads.length) {
    chrome.runtime.sendMessage({ action: 'saveLeads', leads }, r => {
      document.getElementById('compResults').innerHTML =
        '<div style="font-size:11px;color:var(--a2);font-family:var(--mono);padding:6px 0">✅ Found ' + leads.length + ' potential clients from ' + name + '</div>';
      addLog('🕵️ Competitor stealer: ' + leads.length + ' clients found', 'ok');
      loadLeadsTab();
    });
  } else {
    document.getElementById('compResults').innerHTML = '<div style="font-size:11px;color:var(--m);font-family:var(--mono);padding:6px 0">No results found. Try a different name.</div>';
  }
}

async function doReverseSearch() {
  if (currentPlan === 'free') { showModal(); return; }
  const keyword = document.getElementById('reverseKw').value.trim();
  if (!keyword) { addLog('❌ Enter a search keyword', 'err'); return; }
  document.getElementById('reverseBtn').disabled = true;
  addLog('🔄 Reverse searching: ' + keyword, 'inf');

  const leads = await new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'reverseSearch', keyword, platform: activeLeadPlatform }, r => resolve(r?.leads || []));
  });
  document.getElementById('reverseBtn').disabled = false;
  if (leads.length) {
    chrome.runtime.sendMessage({ action: 'saveLeads', leads }, r => {
      addLog('🔄 Reverse search: ' + r?.added + ' leads added', 'ok');
      loadLeadsTab();
    });
  } else {
    addLog('🔄 Reverse search: no leads found', 'inf');
  }
}

// ── LEADS TAB ─────────────────────────────────────────────
function loadLeadsTab(query = '') {
  chrome.runtime.sendMessage({ action: 'getLeads' }, res => {
    let leads = res?.leads || [];
    updateLeadStats(leads);
    document.getElementById('pushBtn').disabled = leads.length === 0;

    if (query) leads = leads.filter(l =>
      (l.company || '').toLowerCase().includes(query.toLowerCase()) ||
      (l.email   || '').toLowerCase().includes(query.toLowerCase()) ||
      (l.niche   || '').toLowerCase().includes(query.toLowerCase())
    );
    if (activeFilter === 'new')       leads = leads.filter(l => l.status === 'new' || !l.status);
    if (activeFilter === 'contacted') leads = leads.filter(l => l.status === 'contacted');
    if (activeFilter === 'pushed')    leads = leads.filter(l => l.status === 'pushed');
    if (activeFilter === 'replied')   leads = leads.filter(l => l.status === 'replied');
    if (activeFilter === 'audited')   leads = leads.filter(l => !!l.audit);
    if (activeFilter === 'hot')       leads = leads.filter(l => (l.audit?.score || l.score || 50) < 40);

    const list = document.getElementById('leadsList');
    if (!leads.length) {
      list.innerHTML = '<div class="empty"><div class="e-ico">📋</div><div class="e-txt">No leads</div></div>';
      return;
    }
    list.innerHTML = leads.slice(0, 80).map(l => buildMiniLead(l)).join('');
    leads.slice(0, 80).forEach(l => bindMiniLeadEvents(l));
  });
}

function buildMiniLead(l) {
  const status   = l.status || 'new';
  const badgeCls = { new: 'mb-new', contacted: 'mb-contacted', pushed: 'mb-pushed', replied: 'mb-replied', approved: 'mb-approved' }[status] || 'mb-new';
  const score    = l.audit?.score ?? l.score ?? 50;
  const stars    = scoreToStars(score);
  return `<div class="ml" id="ml-${l.id}">
    <input type="checkbox" class="ml-chk" data-id="${l.id}">
    <span class="ml-score">${stars}</span>
    <div class="ml-i">
      <div class="ml-n">${l.company || l.firstName + ' ' + l.lastName}</div>
      <div class="ml-s">${[l.email, l.techStack ? '🔧 '+l.techStack : ''].filter(Boolean).join(' · ') || l.source || ''}</div>
    </div>
    <div class="ml-actions">
      <button class="btn-gmail" style="padding:2px 6px;font-size:9px" data-gmail="${l.id}" title="Open Gmail">✉️</button>
      <span class="ml-b ${badgeCls}">${status}</span>
      <button class="ml-del" data-del="${l.id}">✕</button>
    </div>
  </div>`;
}

function bindMiniLeadEvents(l) {
  const row = document.getElementById('ml-' + l.id);
  if (!row) return;
  row.querySelector('[data-del]')?.addEventListener('click', e => {
    e.stopPropagation();
    chrome.runtime.sendMessage({ action: 'deleteLead', id: l.id }, () => { loadLeadsTab(); });
  });
  row.querySelector('[data-gmail]')?.addEventListener('click', e => {
    e.stopPropagation();
    openGmailForLead(l);
  });
}

function updateLeadStats(leads) {
  document.getElementById('sT').textContent = leads.length;
  document.getElementById('sA').textContent = leads.filter(l => l.status === 'contacted').length;
  document.getElementById('sP').textContent = leads.filter(l => l.status === 'pushed').length;
  document.getElementById('sR').textContent = leads.filter(l => l.status === 'replied').length;
}

// ── PUSH TO SHEET ─────────────────────────────────────────
function pushAll() {
  chrome.storage.local.get(['leads', 'settings'], data => {
    const leads    = (data.leads || []).filter(l => l.status !== 'pushed');
    const s        = data.settings || {};
    const sheetUrl = s.sheetUrl || '';
    if (!sheetUrl) { addLog('❌ Set Google Sheet URL in Settings first', 'err'); return; }
    if (!leads.length) { addLog('ℹ️ No new leads to push', 'inf'); return; }

    let done = 0;
    leads.forEach(l => {
      fetch(sheetUrl, {
        method: 'POST',
        body: JSON.stringify({
          firstName:   l.firstName,  lastName:  l.lastName,
          email:       l.email,      company:   l.company,
          niche:       l.niche,      website:   l.website,
          painPoints:  l.painPoint,  opener:    l.opener || l.audit?.opener || '',
          auditScore:  l.audit?.score || '',
          techStack:   l.techStack || l.audit?.techStack || '',
          phone:       l.phone,      source:    l.source,
          intentSignal: l.intent?.intentLabel || ''
        })
      }).then(() => {
        l.status = 'pushed';
        chrome.runtime.sendMessage({ action: 'updateLead', lead: l });
        done++;
        if (done === leads.length) { addLog('📤 Pushed ' + done + ' leads to Sheet', 'ok'); loadLeadsTab(); }
      }).catch(err => addLog('❌ Push failed: ' + err.message, 'err'));
    });
  });
}

// ── CSV EXPORT ────────────────────────────────────────────
function dlCSV() {
  chrome.runtime.sendMessage({ action: 'getLeads' }, res => {
    const leads = res?.leads || [];
    if (!leads.length) { addLog('ℹ️ No leads to export', 'inf'); return; }
    const cols = ['firstName','lastName','email','company','niche','website','phone','painPoint','techStack','source','status','opener'];
    const rows = [cols.join(','), ...leads.map(l =>
      cols.map(c => '"' + ((l[c] || l.audit?.[c] || '').toString().replace(/"/g, '""')) + '"').join(',')
    )];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename: 'oma-leads-' + Date.now() + '.csv' });
    addLog('⬇ CSV exported: ' + leads.length + ' leads', 'ok');
  });
}

function clrAll() {
  if (!confirm('Clear ALL leads? This cannot be undone.')) return;
  chrome.runtime.sendMessage({ action: 'clearLeads' }, () => { loadLeadsTab(); addLog('✕ All leads cleared', 'inf'); });
}

// ── CRM TAB ───────────────────────────────────────────────
function loadCRMTab() {
  chrome.runtime.sendMessage({ action: 'getCRMDeals' }, res => {
    const deals = res?.deals || [];
    document.getElementById('crmTotal').textContent  = deals.length;
    document.getElementById('crmClosed').textContent = deals.filter(d => d.stage === 'closed').length;
    const total = deals.reduce((s, d) => s + (parseFloat(d.value) || 0), 0);
    document.getElementById('crmValue').textContent  = '$' + (total >= 1000 ? (total/1000).toFixed(1)+'k' : total);
    renderKanban(deals);
  });
}

function renderKanban(deals) {
  const container = document.getElementById('crmPipeline');
  container.innerHTML = CRM_STAGES.map(stage => {
    const cards = deals.filter(d => d.stage === stage.id);
    return `<div class="crm-col">
      <div class="crm-col-title" style="border-left:3px solid ${stage.color}">
        ${stage.label} <span class="crm-col-count">${cards.length}</span>
      </div>
      ${cards.map(d => buildCRMCard(d, stage)).join('')}
      <button class="crm-add-btn" data-stage="${stage.id}">+ Add Lead</button>
    </div>`;
  }).join('');

  // Bind move/delete
  container.querySelectorAll('.crm-mv').forEach(btn => {
    btn.addEventListener('click', () => moveDeal(btn.dataset.id, btn.dataset.stage));
  });
  container.querySelectorAll('.crm-del').forEach(btn => {
    btn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'deleteCRMDeal', id: btn.dataset.del }, () => loadCRMTab());
    });
  });
  container.querySelectorAll('.crm-add-btn').forEach(btn => {
    btn.addEventListener('click', () => addDealFromLeads(btn.dataset.stage));
  });
}

function buildCRMCard(d, stage) {
  const nextStages = CRM_STAGES.filter(s => s.id !== stage.id).slice(0, 2);
  const mvBtns = nextStages.map(s => `<button class="crm-mv" data-id="${d.id}" data-stage="${s.id}">${s.label}</button>`).join('');
  return `<div class="crm-card">
    <div class="crm-card-n" title="${d.company}">${d.company}</div>
    <div class="crm-card-niche">${d.niche || ''} ${d.email ? '· ' + d.email : ''}</div>
    <div class="crm-card-val">${d.value ? '$' + d.value + '/mo' : 'No value set'}</div>
    <div class="crm-card-actions">
      ${mvBtns}
      <button class="crm-del" data-del="${d.id}">✕</button>
    </div>
  </div>`;
}

function moveDeal(dealId, newStage) {
  chrome.runtime.sendMessage({ action: 'getCRMDeals' }, res => {
    const deals = res?.deals || [];
    const deal  = deals.find(d => d.id == dealId);
    if (!deal) return;
    deal.stage     = newStage;
    deal.updatedAt = Date.now();
    chrome.runtime.sendMessage({ action: 'saveCRMDeal', deal }, () => {
      loadCRMTab();
      addLog('📊 Moved ' + deal.company + ' → ' + newStage, 'inf');
    });
  });
}

function addDealFromLeads(stage) {
  chrome.runtime.sendMessage({ action: 'getLeads' }, res => {
    const leads = res?.leads || [];
    if (!leads.length) { addLog('ℹ️ No leads in database. Scrape some first.', 'inf'); return; }
    const names = leads.slice(0, 10).map(l => l.company || l.firstName).join(', ');
    const idx   = parseInt(prompt('Which lead? (1-' + Math.min(10, leads.length) + ')\n' + leads.slice(0, 10).map((l, i) => (i+1) + '. ' + (l.company || l.firstName)).join('\n'))) - 1;
    if (isNaN(idx) || idx < 0 || idx >= leads.length) return;
    const lead = leads[idx];
    const value = prompt('Monthly value? (e.g. 500)', '500');
    const deal = {
      id:        Date.now(),
      leadId:    lead.id,
      company:   lead.company || lead.firstName + ' ' + lead.lastName,
      email:     lead.email,
      niche:     lead.niche,
      stage,
      value:     value || '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    chrome.runtime.sendMessage({ action: 'saveCRMDeal', deal }, () => {
      loadCRMTab();
      addLog('📊 Added ' + deal.company + ' to CRM (' + stage + ')', 'ok');
    });
  });
}

// ── OUTREACH TAB ──────────────────────────────────────────
function loadOutreachTab() {
  chrome.runtime.sendMessage({ action: 'getLeads' }, res => {
    const leads  = res?.leads || [];
    const select = document.getElementById('outLeadSelect');
    const current = select.value;
    select.innerHTML = '<option value="">— Select a lead —</option>' +
      leads.slice(0, 100).map(l =>
        `<option value="${l.id}" ${l.id == current ? 'selected' : ''}>${l.company || l.firstName + ' ' + l.lastName} ${l.email ? '· ' + l.email : ''}</option>`
      ).join('');
    if (current) onOutLeadChange();
  });
}

function buildTemplateGrid() {
  const grid = document.getElementById('templateGrid');
  grid.innerHTML = Object.entries(EMAIL_TEMPLATES).map(([key, tmpl]) =>
    `<button class="tmpl-btn ${key === outNiche ? 'on' : ''}" data-niche="${key}">${tmpl.label}</button>`
  ).join('');
  grid.querySelectorAll('.tmpl-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      grid.querySelectorAll('.tmpl-btn').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      outNiche = btn.dataset.niche;
      refreshPreview();
    });
  });
}

function onOutLeadChange() {
  const id = document.getElementById('outLeadSelect').value;
  if (!id) {
    document.getElementById('outLeadInfo').style.display = 'none';
    document.getElementById('intentBox').style.display  = 'none';
    return;
  }
  chrome.runtime.sendMessage({ action: 'getLeads' }, res => {
    const lead = (res?.leads || []).find(l => l.id == id);
    if (!lead) return;

    const info = document.getElementById('outLeadInfo');
    info.style.display = 'block';
    document.getElementById('outLeadEmail').textContent = lead.email || 'No email — use Email Finder';

    // Best send time
    chrome.runtime.sendMessage({ action: 'getBestSendTime', niche: lead.niche }, r => {
      document.getElementById('outBestTime').textContent = (r?.emoji || '') + ' ' + (r?.label || 'Tuesday 9am');
    });

    // Auto-detect niche for template
    if (lead.niche && EMAIL_TEMPLATES[lead.niche]) {
      outNiche = lead.niche;
      document.querySelectorAll('.tmpl-btn').forEach(b => {
        b.classList.toggle('on', b.dataset.niche === outNiche);
      });
    }

    refreshPreview();

    // Intent signals (Pro only)
    if (currentPlan === 'pro' && lead.website) {
      const intentBox = document.getElementById('intentBox');
      intentBox.style.display = 'block';
      document.getElementById('intentContent').innerHTML = '<div style="font-size:10px;color:var(--m);font-family:var(--mono)">Loading intent signals...</div>';
      const domain = lead.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '');
      chrome.runtime.sendMessage({ action: 'getIntentSignals', domain }, r => {
        const sig = r?.result || {};
        let html = '';
        if (sig.intentLabel) html += `<div class="intent-row"><span class="intent-ico">📅</span><span class="intent-val">${sig.intentLabel}</span><span class="intent-badge ${sig.isNewBusiness ? 'ib-new' : 'ib-old'}">${sig.isNewBusiness ? 'NEW' : 'ESTABLISHED'}</span></div>`;
        if (sig.domainAgeMonths !== null && sig.domainAgeMonths !== undefined) html += `<div class="intent-row"><span class="intent-ico">🌐</span><span class="intent-val">Domain age: ${sig.domainAgeMonths} months</span></div>`;
        if (lead.techStack) html += `<div class="intent-row"><span class="intent-ico">🔧</span><span class="intent-val">Built on ${lead.techStack}</span><span class="intent-badge ib-warn">UPGRADE LEAD</span></div>`;
        if (lead.audit?.score !== undefined) html += `<div class="intent-row"><span class="intent-ico">💡</span><span class="intent-val">Website health: ${lead.audit.score}/100</span><span class="intent-badge ${lead.audit.score < 40 ? 'ib-new' : 'ib-old'}">${lead.audit.score < 40 ? 'HOT' : 'WARM'}</span></div>`;
        document.getElementById('intentContent').innerHTML = html || '<div style="font-size:10px;color:var(--m);font-family:var(--mono)">No signals detected</div>';
      });
    }
  });
}

function refreshPreview() {
  const id = document.getElementById('outLeadSelect').value;
  if (!id) { setPreview('Select a lead and template', '—'); return; }

  chrome.runtime.sendMessage({ action: 'getLeads' }, res => {
    const lead = (res?.leads || []).find(l => l.id == id);
    if (!lead) return;

    const tmpl = EMAIL_TEMPLATES[outNiche];
    if (!tmpl) return;
    const type = tmpl[outType];
    if (!type) return;

    const data = {
      firstName:   lead.firstName || 'there',
      company:     lead.company   || lead.firstName,
      opener:      lead.audit?.opener || lead.opener || 'I noticed some opportunities on your website.',
      painPoint:   lead.audit?.issues?.[0]?.problem || lead.painPoint || 'your website has some issues worth fixing',
      techStack:   lead.techStack || lead.audit?.techStack || 'your current platform',
      bookingLink: settings.bookingLink || 'https://wa.me/923710160513',
      senderName:  settings.senderName  || 'Uns',
      agencyName:  settings.agencyName  || 'Outreach Marketing Agency'
    };

    const filled = fillTemplate(type, data);
    setPreview(filled.subject, filled.body);
  });
}

function setPreview(subject, body) {
  document.getElementById('previewSubject').textContent = subject;
  document.getElementById('previewBody').textContent    = body;
}

function sendViaGmail() {
  const id = document.getElementById('outLeadSelect').value;
  if (!id) { addLog('❌ Select a lead first', 'err'); return; }

  chrome.runtime.sendMessage({ action: 'getLeads' }, res => {
    const lead = (res?.leads || []).find(l => l.id == id);
    if (!lead) return;

    const subj = document.getElementById('previewSubject').textContent;
    const body = document.getElementById('previewBody').textContent;
    const to   = lead.email || '';

    if (!to) {
      addLog('⚠️ No email for this lead — use Email Finder first', 'err');
      // Still open Gmail compose without a To address
    }

    openGmailCompose(to, subj, body);

    // Mark lead as contacted
    lead.status = 'contacted';
    chrome.runtime.sendMessage({ action: 'updateLead', lead });

    // Schedule follow-up
    const days = parseInt(document.getElementById('followupDays').value);
    if (days > 0) {
      chrome.runtime.sendMessage({ action: 'scheduleFollowup', leadId: lead.id, days });
      addLog('⏰ Follow-up scheduled in ' + days + ' days for ' + lead.company, 'inf');
    }

    addLog('✉️ Opened Gmail for ' + lead.company + ' (' + (to || 'no email') + ')', 'ok');
    loadLeadsTab();
  });
}

function openGmailCompose(to, subject, body) {
  const url = 'https://mail.google.com/mail/?view=cm&fs=1' +
    '&to=' + encodeURIComponent(to) +
    '&su=' + encodeURIComponent(subject) +
    '&body=' + encodeURIComponent(body);
  chrome.tabs.create({ url });
}

function openGmailForLead(lead) {
  const tmpl = EMAIL_TEMPLATES[lead.niche] || EMAIL_TEMPLATES.startup;
  const data = {
    firstName:   lead.firstName || 'there',
    company:     lead.company || lead.firstName,
    opener:      lead.audit?.opener || lead.opener || 'I noticed some opportunities on your website.',
    painPoint:   lead.audit?.issues?.[0]?.problem || lead.painPoint || 'your website has some issues worth fixing',
    techStack:   lead.techStack || '',
    bookingLink: settings.bookingLink || 'https://wa.me/923710160513',
    senderName:  settings.senderName  || 'Uns',
    agencyName:  settings.agencyName  || 'Outreach Marketing Agency'
  };
  const filled = fillTemplate(tmpl.cold, data);
  openGmailCompose(lead.email || '', filled.subject, filled.body);
  lead.status = 'contacted';
  chrome.runtime.sendMessage({ action: 'updateLead', lead });
  addLog('✉️ Gmail opened for ' + lead.company, 'ok');
  loadLeadsTab();
}

function copyEmailPreview() {
  const subj = document.getElementById('previewSubject').textContent;
  const body = document.getElementById('previewBody').textContent;
  navigator.clipboard.writeText('Subject: ' + subj + '\n\n' + body).then(() => {
    const btn = document.getElementById('copyEmailBtn');
    btn.textContent = '✅ Copied!';
    setTimeout(() => { btn.textContent = '📋 Copy'; }, 2000);
  });
}

// ── SETTINGS ──────────────────────────────────────────────
function loadSettings() {
  chrome.runtime.sendMessage({ action: 'getSettings' }, res => {
    settings = res?.settings || {};
    if (settings.sheetUrl) document.getElementById('iUrl').value    = settings.sheetUrl;
    if (settings.senderName)  document.getElementById('iName').value   = settings.senderName;
    if (settings.agencyName)  document.getElementById('iAgency').value = settings.agencyName;
    if (settings.bookingLink) document.getElementById('iWA').value     = settings.bookingLink;
    chkConn();
  });
}

function saveS() {
  settings = {
    sheetUrl:    document.getElementById('iUrl').value.trim(),
    senderName:  document.getElementById('iName').value.trim(),
    agencyName:  document.getElementById('iAgency').value.trim(),
    bookingLink: document.getElementById('iWA').value.trim()
  };
  chrome.runtime.sendMessage({ action: 'saveSettings', settings }, () => {
    const msg = document.getElementById('savedMsg');
    msg.style.display = 'block';
    setTimeout(() => { msg.style.display = 'none'; }, 2000);
    chkConn();
    addLog('💾 Settings saved', 'ok');
  });
}

function chkConn() {
  const url   = document.getElementById('iUrl')?.value || '';
  const badge = document.getElementById('connBadge');
  if (!badge) return;
  const ok = url.includes('script.google.com');
  badge.textContent = ok ? '● Connected to Google Sheet' : '● Not connected to Google Sheet';
  badge.className   = ok ? 'cb cy' : 'cb cn';
}

// ── LOG ───────────────────────────────────────────────────
function addLog(msg, type = '') {
  const div  = document.getElementById('logDiv');
  const line = document.createElement('div');
  line.className   = 'log-line' + (type ? ' ' + type : '');
  line.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg;
  div.insertBefore(line, div.firstChild);
  // Keep last 100 lines
  while (div.children.length > 100) div.removeChild(div.lastChild);
}

// ── REPLY DETECTION ───────────────────────────────────────
function startReplyDetection() {
  // Check for reply keywords in page title (basic Gmail tab monitoring)
  chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
    if (info.status !== 'complete') return;
    if (!tab.url?.includes('mail.google.com')) return;
    if (!tab.title) return;
    const lower = tab.title.toLowerCase();
    if (lower.includes('re:') || lower.includes('reply')) {
      addLog('💬 Possible reply detected in Gmail — check your inbox!', 'ok');
    }
  });
}

// Init reply detection
startReplyDetection();
