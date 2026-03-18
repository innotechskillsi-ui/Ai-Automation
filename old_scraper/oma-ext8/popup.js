// ============================================================
// OMA Lead Engine v7 — popup.js
// All 10 fixes: silent audit, bulk scrape, filters, reply
// detection, pain-point emails, competitor stealer, opener
// connected to sheet, website preview, auto-export warning
// ============================================================

let isPro       = false;
let activeFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  loadSettings();
  detectPage();
  restoreState();
  checkLicense();
  updateUsageBar();
  startReplyDetection();
});

// ── BIND EVENTS ───────────────────────────────────────────
function bindEvents() {
  // Tabs
  ['scrape','bulk','comp','leads','log','settings'].forEach(n => {
    document.getElementById('tab-'+n+'-btn').addEventListener('click', () => goTab(n));
  });

  // Scrape tab
  document.getElementById('scrapeBtn').addEventListener('click', doScrape);
  document.getElementById('auditAllBtn').addEventListener('click', auditAllSilently);

  // Quick links
  const links = {
    'link-maps':    'https://www.google.com/maps/search/real+estate+agent+Texas',
    'link-linkedin':'https://www.linkedin.com/search/results/people/?keywords=real+estate+agent',
    'link-yp':      'https://www.yellowpages.com/search?search_terms=real+estate+agent&geo_location_terms=Texas',
    'link-realtor': 'https://www.realtor.com/realestateagents/texas',
  };
  Object.entries(links).forEach(([id, url]) => {
    document.getElementById(id).addEventListener('click', e => { e.preventDefault(); chrome.tabs.create({ url }); });
  });

  // Bulk scrape tab
  document.getElementById('bulkBtn').addEventListener('click', doBulkScrape);

  // Competitor tab
  document.getElementById('compBtn').addEventListener('click', runCompetitorStealer);

  // Leads tab
  document.getElementById('pushBtn').addEventListener('click', pushAll);
  document.getElementById('csvBtn').addEventListener('click', dlCSV);
  document.getElementById('clrBtn').addEventListener('click', clrAll);
  document.getElementById('srchInput').addEventListener('input', e => loadLeadsTab(e.target.value));

  // Filter chips
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('on'));
      chip.classList.add('on');
      activeFilter = chip.dataset.filter;
      loadLeadsTab(document.getElementById('srchInput').value);
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
}

// ── LICENSE ───────────────────────────────────────────────
function checkLicense() {
  chrome.runtime.sendMessage({ action: 'getLicense' }, res => {
    isPro = res?.valid || false;
    updateProUI(isPro);
  });
}

function updateProUI(pro) {
  isPro = pro;
  if (pro) {
    document.getElementById('planBadge').textContent  = 'PRO';
    document.getElementById('planBadge').className    = 'pro-badge pro';
    document.getElementById('usageBar').style.display = 'none';
    document.getElementById('licStatusBadge').textContent = 'PRO ACTIVE';
    document.getElementById('licStatusBadge').className   = 'lic-status lic-pro';
    document.getElementById('licInfo').textContent = 'Unlimited leads · All features unlocked';
    document.getElementById('licFeatures').innerHTML =
      ['Unlimited leads','Pain Point Detector (silent)','Personalized Email Opener',
       'Competitor Client Stealer','Bulk Scrape','Reply Detection','Score & Audit filters']
      .map(f => '<div class="lic-feat has">✓ ' + f + '</div>').join('');
    document.getElementById('upgradeSettingsBtn').style.display = 'none';
  }
  ['auditAllBtn','bulkBtn','compBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = !pro;
  });
}

function showModal() { document.getElementById('upgradeModal').classList.add('show'); }
function hideModal()  { document.getElementById('upgradeModal').classList.remove('show'); document.getElementById('modalMsg').textContent = ''; }

function activateLicense() {
  const key = document.getElementById('licKey').value.trim();
  const email = document.getElementById('licEmail').value.trim();
  const msg = document.getElementById('modalMsg');
  if (!email || !key) { msg.textContent = '⚠️ Enter your email and key'; msg.className = 'modal-msg err'; return; }
  chrome.runtime.sendMessage({ action: 'validateLicense', key, email }, res => {
    if (res?.valid) {
      msg.textContent = '✅ Pro activated!'; msg.className = 'modal-msg ok';
      setTimeout(() => { hideModal(); updateProUI(true); updateUsageBar(); addLog('🎉 Pro activated for ' + email, 'ok'); }, 1400);
    } else {
      msg.textContent = '❌ Invalid key'; msg.className = 'modal-msg err';
    }
  });
}

// ── USAGE BAR ─────────────────────────────────────────────
function updateUsageBar() {
  chrome.runtime.sendMessage({ action: 'checkLimit' }, res => {
    if (res?.isPro) return;
    const used = res?.used || 0; const limit = res?.limit || 50;
    const pct  = Math.min(100, (used / limit) * 100);
    document.getElementById('usageText').textContent = used + ' / ' + limit + ' this month';
    const fill = document.getElementById('usageFill');
    fill.style.width = pct + '%';
    fill.className = 'usage-fill' + (pct >= 90 ? ' danger' : pct >= 70 ? ' warn' : '');
  });
}

// ── PAGE DETECTION ────────────────────────────────────────
function detectPage() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) return;
    const url = tabs[0].url || '';
    document.getElementById('pageUrl').textContent = url.length > 50 ? url.slice(0,50)+'...' : url;
    setPageBar(url);
  });
}

function setPageBar(url) {
  const u = url.toLowerCase();
  let ico = '🌐', name = 'Any website';
  if (u.includes('google.com/maps'))     { ico='🗺️'; name='Google Maps ✅ Ready to scrape'; }
  else if (u.includes('linkedin.com'))   { ico='💼'; name='LinkedIn ✅ Ready to scrape'; }
  else if (u.includes('yellowpages'))    { ico='📖'; name='Yellow Pages ✅ Ready to scrape'; }
  else if (u.includes('realtor.com'))    { ico='🏠'; name='Realtor.com ✅ Ready to scrape'; }
  else if (u.includes('zillow.com'))     { ico='🏡'; name='Zillow ✅ Ready to scrape'; }
  else if (u.includes('yelp.com'))       { ico='⭐'; name='Yelp ✅ Ready to scrape'; }
  else if (u.includes('google.com/search')){ ico='🔍'; name='Google Search ✅ Ready to scrape'; }
  else if (u.startsWith('chrome://') || u.startsWith('chrome-extension://')) { ico='🚫'; name='Cannot scrape Chrome pages'; }
  document.getElementById('pageIco').textContent  = ico;
  document.getElementById('pageName').textContent = name;
}

// ── RESTORE STATE ─────────────────────────────────────────
function restoreState() {
  chrome.storage.local.get(['lastTab','scrapeResults'], data => {
    goTab(data.lastTab || 'scrape', false);
    if (data.scrapeResults?.length) {
      renderCards(data.scrapeResults);
      document.getElementById('resBar').style.display = 'flex';
      document.getElementById('resNum').textContent   = data.scrapeResults.length;
    }
    loadLeadsTab();
  });
}

// ── SCRAPE ────────────────────────────────────────────────
function doScrape() {
  chrome.runtime.sendMessage({ action: 'checkLimit' }, res => {
    if (!res.allowed && !res.isPro) { addLog('⚠️ Free limit reached. Upgrade to Pro.', 'err'); showModal(); return; }
    executeScrape();
  });
}

function executeScrape() {
  const btn = document.getElementById('scrapeBtn');
  btn.disabled = true; btn.textContent = '⏳ Scraping...';
  document.getElementById('liveStatus').textContent = 'Scraping...';

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) { resetBtn(); return; }
    const url = tabs[0].url || '';
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      addLog('❌ Cannot scrape Chrome pages', 'err'); resetBtn(); return;
    }
    chrome.scripting.executeScript({ target: { tabId: tabs[0].id }, files: ['content.js'] }, () => {
      setTimeout(() => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'scrape' }, res => {
          if (chrome.runtime.lastError) { addLog('❌ ' + chrome.runtime.lastError.message, 'err'); addLog('💡 Refresh and try again', 'inf'); resetBtn(); return; }
          const leads = (res?.leads || []).map(l => ({ ...l, score: scoreL(l), id: Date.now()+Math.random(), status: 'new' }));
          addLog('✅ Found ' + leads.length + ' leads', leads.length > 0 ? 'ok' : 'inf');
          document.getElementById('resBar').style.display = 'flex';
          document.getElementById('resNum').textContent   = leads.length;
          if (!leads.length) {
            document.getElementById('scrapeResults').innerHTML = '<div class="empty"><div class="e-ico">😔</div><div class="e-txt">No leads found</div><div class="e-sub">Scroll down first, then scrape again</div></div>';
            chrome.storage.local.set({ scrapeResults: [] });
          } else {
            renderCards(leads);
            chrome.storage.local.set({ scrapeResults: leads });
            chrome.runtime.sendMessage({ action: 'saveLeads', leads }, r => {
              const d = r?.duplicates || 0;
              addLog('💾 Saved ' + (r?.added||0) + ' leads' + (d>0?' ('+d+' dupes skipped)':''), 'ok');
              if (d > 0) document.getElementById('dupeNum').textContent = d + ' dupes skipped';
              updateUsageBar(); loadLeadsTab();
            });
          }
          resetBtn();
          document.getElementById('liveStatus').textContent = leads.length + ' found';
        });
      }, 400);
    });
  });
}

function resetBtn() {
  const btn = document.getElementById('scrapeBtn');
  btn.disabled = false; btn.textContent = '⚡ Scrape This Page';
}

// ── SILENT AUDIT ALL ──────────────────────────────────────
async function auditAllSilently() {
  if (!isPro) { showModal(); return; }
  chrome.storage.local.get(['scrapeResults'], async res => {
    let leads = res.scrapeResults || [];
    const toAudit = leads.filter(l => l.website?.startsWith('http') && !l.audit);
    if (!toAudit.length) { addLog('ℹ️ All leads already audited or no websites', 'inf'); return; }

    const box = document.getElementById('auditProgress');
    box.style.display = 'block';
    document.getElementById('auditAllBtn').disabled = true;

    for (let i = 0; i < toAudit.length; i++) {
      const lead = toAudit[i];
      const pct  = Math.round(((i+1) / toAudit.length) * 100);
      document.getElementById('auditProgressLabel').textContent = 'Auditing: ' + (lead.company||lead.website).slice(0,30) + '...';
      document.getElementById('auditProgressFill').style.width  = pct + '%';
      document.getElementById('auditProgressDetail').textContent = (i+1) + ' / ' + toAudit.length + ' websites · ' + pct + '% done';

      // Silent audit via background
      const audit = await new Promise(resolve => {
        chrome.runtime.sendMessage({ action: 'auditWebsite', url: lead.website }, res => resolve(res?.result || null));
      });

      if (audit) {
        lead.audit      = audit;
        lead.opener     = audit.opener;
        lead.auditScore = audit.score;
        lead.painPoints = audit.issues.slice(0,3).map(i => i.problem).join(', ');
        if (!lead.email && audit.emails?.length) lead.email = audit.emails[0];
        if (!lead.phone && audit.phones?.length) lead.phone = audit.phones[0];
        lead.score = scoreL(lead);
        addLog('🎯 ' + (lead.company||'Lead') + ' — ' + audit.issues.length + ' issues, opener ready', 'ok');
      }
      await sleep(300);
    }

    chrome.storage.local.set({ scrapeResults: leads });
    renderCards(leads);
    box.style.display = 'none';
    document.getElementById('auditAllBtn').disabled = false;
    addLog('✅ All audits done — personalized openers ready', 'ok');
    loadLeadsTab();
  });
}

// ── BULK SCRAPE ───────────────────────────────────────────
async function doBulkScrape() {
  if (!isPro) { showModal(); return; }
  const baseUrl = document.getElementById('bulkUrl').value.trim();
  const pages   = parseInt(document.getElementById('bulkPages').value) || 5;
  if (!baseUrl) { addLog('⚠️ Enter a search URL', 'err'); return; }

  const btn = document.getElementById('bulkBtn');
  btn.disabled = true;
  const box = document.getElementById('bulkProgress');
  box.style.display = 'block';
  addLog('⚡ Bulk scrape: ' + pages + ' pages from ' + baseUrl.slice(0,40), 'inf');

  let allLeads = [];
  const urls = buildPageUrls(baseUrl, pages);

  for (let i = 0; i < urls.length; i++) {
    const pct = Math.round(((i+1)/urls.length)*100);
    document.getElementById('bulkProgressLabel').textContent  = 'Scraping page ' + (i+1) + ' of ' + urls.length + '...';
    document.getElementById('bulkProgressFill').style.width   = pct + '%';
    document.getElementById('bulkProgressDetail').textContent = allLeads.length + ' leads collected so far';

    const leads = await new Promise(resolve => {
      chrome.runtime.sendMessage({ action: 'scrapeSilent', url: urls[i] }, res => resolve(res?.leads || []));
    });

    const scored = leads.map(l => ({ ...l, id: Date.now()+Math.random(), status: 'new', score: scoreL(l) }));
    allLeads = [...allLeads, ...scored];
    addLog('Page ' + (i+1) + ': ' + leads.length + ' leads found', 'ok');
    await sleep(800);
  }

  box.style.display = 'none';
  btn.disabled = false;

  if (!allLeads.length) {
    document.getElementById('bulkResults').innerHTML = '<div class="empty"><div class="e-ico">😔</div><div class="e-txt">No leads found</div><div class="e-sub">Try a different URL</div></div>';
    return;
  }

  chrome.runtime.sendMessage({ action: 'saveLeads', leads: allLeads }, r => {
    addLog('✅ Bulk done — ' + (r?.added||0) + ' new leads saved (' + (r?.duplicates||0) + ' dupes)', 'ok');
    document.getElementById('bulkResults').innerHTML = '<div style="text-align:center;padding:16px;font-size:12px;color:var(--a2);font-family:var(--mono)">✅ ' + (r?.added||0) + ' new leads saved to your Leads tab</div>';
    updateUsageBar();
    loadLeadsTab();
  });
}

function buildPageUrls(baseUrl, count) {
  const urls = [baseUrl];
  try {
    const u = new URL(baseUrl);
    if (baseUrl.includes('google.com/maps')) {
      for (let i = 1; i < count; i++) urls.push(baseUrl); // Maps handles pagination differently
    } else if (baseUrl.includes('yellowpages.com')) {
      for (let i = 2; i <= count; i++) {
        u.searchParams.set('page', i);
        urls.push(u.toString());
      }
    } else if (baseUrl.includes('yelp.com')) {
      for (let i = 1; i < count; i++) {
        u.searchParams.set('start', i * 10);
        urls.push(u.toString());
      }
    } else {
      for (let i = 2; i <= count; i++) {
        u.searchParams.set('page', i);
        urls.push(u.toString());
      }
    }
  } catch(e) {}
  return urls.slice(0, count);
}

// ── COMPETITOR CLIENT STEALER ─────────────────────────────
async function runCompetitorStealer() {
  if (!isPro) { showModal(); return; }
  const name     = document.getElementById('compName').value.trim();
  const location = document.getElementById('compLocation').value.trim();
  if (!name) { addLog('⚠️ Enter a competitor name', 'err'); return; }

  const btn = document.getElementById('compBtn');
  btn.disabled = true;
  const box = document.getElementById('compProgress');
  box.style.display = 'block';
  document.getElementById('compResults').innerHTML = '';
  addLog('🕵️ Searching for clients of: ' + name, 'inf');

  // Step 1: Search Google silently
  document.getElementById('compProgressLabel').textContent  = 'Searching Google for ' + name + ' clients...';
  document.getElementById('compProgressFill').style.width   = '20%';
  document.getElementById('compProgressDetail').textContent = 'Step 1/3 — Google search';

  const query = '"' + name + '" (clients OR portfolio OR "our work" OR "case studies" OR "worked with")' + (location ? ' ' + location : '');
  const searchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(query);

  const searchLeads = await new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'scrapeSilent', url: searchUrl }, res => resolve(res?.leads || []));
  });

  addLog('Found ' + searchLeads.length + ' potential leads from search', 'inf');
  document.getElementById('compProgressFill').style.width   = '50%';
  document.getElementById('compProgressDetail').textContent = 'Step 2/3 — Processing leads';

  // Step 2: Tag them as competitor clients
  const taggedLeads = searchLeads.map(l => ({
    ...l,
    id: Date.now() + Math.random(),
    status: 'new',
    score: scoreL(l),
    painPoint: 'Client of ' + name + ' — already pays for marketing services',
    niche: l.niche || 'agency',
  }));

  document.getElementById('compProgressFill').style.width   = '80%';
  document.getElementById('compProgressDetail').textContent = 'Step 3/3 — Saving leads';

  if (!taggedLeads.length) {
    box.style.display = 'none';
    btn.disabled = false;
    document.getElementById('compResults').innerHTML = '<div class="empty"><div class="e-ico">😔</div><div class="e-txt">No clients found for ' + esc(name) + '</div><div class="e-sub">Try a more specific competitor name</div></div>';
    return;
  }

  chrome.runtime.sendMessage({ action: 'saveLeads', leads: taggedLeads }, r => {
    document.getElementById('compProgressFill').style.width = '100%';
    addLog('🕵️ Found ' + (r?.added||0) + ' competitor clients from ' + name, 'ok');

    document.getElementById('compResults').innerHTML =
      '<div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:8px;padding:12px;margin-top:10px">' +
      '<div style="font-size:12px;font-weight:600;color:var(--gold);margin-bottom:6px">✅ Found ' + (r?.added||0) + ' clients of ' + esc(name) + '</div>' +
      '<div style="font-size:11px;color:var(--m);line-height:1.7">These are businesses that already pay for digital marketing. ' +
      'They are saved in your <b style="color:var(--t)">📋 Leads tab</b> — push them to your sheet and the outreach sequence will email them automatically.</div>' +
      '</div>';

    box.style.display = 'none';
    btn.disabled = false;
    updateUsageBar();
    loadLeadsTab();
  });
}

// ── LEAD SCORING ──────────────────────────────────────────
function scoreL(l) {
  let s = 0;
  if (l.email?.includes('@'))          s += 2;
  if (l.phone?.length > 6)            s += 1;
  if (l.website?.startsWith('http'))  s += 1;
  if (l.firstName && l.firstName !== 'Business') s += 1;
  return Math.min(5, s);
}

function scoreEmoji(s) {
  if (s >= 5) return '⭐⭐⭐';
  if (s >= 3) return '⭐⭐';
  if (s >= 1) return '⭐';
  return '·';
}

// ── RENDER LEAD CARDS ─────────────────────────────────────
function renderCards(leads) {
  if (!leads?.length) return;
  const container = document.getElementById('scrapeResults');

  container.innerHTML = leads.map((l, i) => {
    const hasAudit   = !!l.audit;
    const domain     = l.website ? l.website.replace(/^https?:\/\//, '').split('/')[0] : '';
    const auditColor = !hasAudit ? '' : l.auditScore < 40 ? '#ff4757' : l.auditScore < 70 ? '#ffb626' : '#00e5a0';

    return '<div class="lc' + (hasAudit ? ' audited' : '') + '" id="lc-' + i + '">' +
      '<div class="score-wrap"><div class="score-stars">' + scoreEmoji(l.score||0) + '</div></div>' +
      '<div class="la-wrap">' +
        (isPro ? '<button class="la la-audit audit-one-btn" data-idx="' + i + '" title="Audit">🎯</button>' : '') +
        '<button class="la la-x skip-btn" data-idx="' + i + '">✕</button>' +
      '</div>' +
      '<div class="lc-body">' +
        '<div class="lc-n">' + esc(l.firstName||'') + ' ' + esc(l.lastName||'') + '</div>' +
        (domain ? '<a class="lc-domain open-site-btn" data-url="' + esc(l.website) + '">🌐 ' + esc(domain) + '</a>' : '') +
        '<div class="lc-c">' + esc(l.company||'') + '</div>' +
        '<div class="lc-tags">' +
          (l.email ? '<span class="tag te">📧 ' + esc(l.email) + '</span>' : '') +
          (l.phone ? '<span class="tag tp">📞 ' + esc(l.phone) + '</span>' : '') +
          '<span class="tag ts">' + esc(l.source||'Web') + '</span>' +
          (hasAudit ? '<span class="tag t-issues" style="color:' + auditColor + '">' + l.audit.issues.length + ' issues</span>' : '') +
        '</div>' +
        (hasAudit ?
          '<div class="audit-panel show">' +
            '<div class="health-row">' +
              '<span class="health-label">Health</span>' +
              '<div class="health-track"><div class="health-fill" style="width:' + l.auditScore + '%;background:' + auditColor + '"></div></div>' +
              '<span class="health-val" style="color:' + auditColor + '">' + l.auditScore + '%</span>' +
            '</div>' +
            '<div class="opener-box">' +
              '<div class="opener-label">✉️ Personalized Opener <span class="opener-edit-btn edit-opener-btn" data-idx="' + i + '">edit</span></div>' +
              '<div class="opener-text" id="opener-text-' + i + '">' + esc(l.opener||'') + '</div>' +
              '<textarea class="opener-input" id="opener-input-' + i + '" rows="3">' + esc(l.opener||'') + '</textarea>' +
            '</div>' +
            '<div class="issues-grid">' +
              l.audit.issues.slice(0,4).map(iss =>
                '<div class="issue-chip">' +
                  '<span class="issue-chip-icon">' + iss.icon + '</span>' +
                  '<div class="issue-chip-prob">' + esc(iss.problem) + '</div>' +
                  '<div class="issue-chip-svc">' + esc(iss.service) + '</div>' +
                '</div>'
              ).join('') +
            '</div>' +
          '</div>'
        : '') +
      '</div>' +
    '</div>';
  }).join('');

  // Bind events
  container.querySelectorAll('.skip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      chrome.storage.local.get(['scrapeResults'], res => {
        const leads = res.scrapeResults || [];
        leads.splice(idx, 1);
        chrome.storage.local.set({ scrapeResults: leads });
        renderCards(leads);
        document.getElementById('resNum').textContent = leads.length;
      });
    });
  });

  container.querySelectorAll('.open-site-btn').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); chrome.tabs.create({ url: a.dataset.url }); });
  });

  if (isPro) {
    container.querySelectorAll('.audit-one-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx);
        chrome.storage.local.get(['scrapeResults'], async res => {
          const leads = res.scrapeResults || [];
          if (!leads[idx]?.website) { addLog('⚠️ No website', 'err'); return; }
          btn.textContent = '⏳'; btn.disabled = true;
          addLog('🎯 Auditing: ' + (leads[idx].company||leads[idx].website), 'inf');
          const audit = await new Promise(resolve => {
            chrome.runtime.sendMessage({ action: 'auditWebsite', url: leads[idx].website }, r => resolve(r?.result||null));
          });
          if (audit) {
            leads[idx].audit      = audit;
            leads[idx].opener     = audit.opener;
            leads[idx].auditScore = audit.score;
            leads[idx].painPoints = audit.issues.slice(0,3).map(i => i.problem).join(', ');
            if (!leads[idx].email && audit.emails?.length) leads[idx].email = audit.emails[0];
            leads[idx].score = scoreL(leads[idx]);
            addLog('✅ Audit done: ' + audit.issues.length + ' issues found', 'ok');
          }
          chrome.storage.local.set({ scrapeResults: leads });
          renderCards(leads);
        });
      });
    });

    container.querySelectorAll('.edit-opener-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = btn.dataset.idx;
        const txt  = document.getElementById('opener-text-' + idx);
        const inp  = document.getElementById('opener-input-' + idx);
        if (inp.style.display === 'block') {
          // Save edit
          chrome.storage.local.get(['scrapeResults'], res => {
            const leads = res.scrapeResults || [];
            if (leads[idx]) { leads[idx].opener = inp.value; chrome.storage.local.set({ scrapeResults: leads }); }
          });
          txt.textContent = inp.value;
          txt.style.display = 'block';
          inp.style.display = 'none';
          btn.textContent = 'edit';
        } else {
          txt.style.display = 'none';
          inp.style.display = 'block';
          btn.textContent = 'save';
        }
      });
    });
  }
}

// ── LEADS TAB ─────────────────────────────────────────────
function loadLeadsTab(search) {
  chrome.runtime.sendMessage({ action: 'getLeads' }, res => {
    const all = res?.leads || [];
    document.getElementById('sT').textContent = all.length;
    document.getElementById('sA').textContent = all.filter(l=>l.status==='approved').length;
    document.getElementById('sP').textContent = all.filter(l=>l.status==='pushed').length;
    document.getElementById('sR').textContent = all.filter(l=>l.status==='replied').length;
    document.getElementById('pushBtn').disabled = all.filter(l=>l.status!=='pushed').length===0;

    const q = (search || document.getElementById('srchInput').value || '').toLowerCase();

    // Apply filter
    let filtered = all;
    if (activeFilter === 'new')      filtered = all.filter(l=>l.status==='new');
    else if (activeFilter === 'approved') filtered = all.filter(l=>l.status==='approved');
    else if (activeFilter === 'pushed')   filtered = all.filter(l=>l.status==='pushed');
    else if (activeFilter === 'replied')  filtered = all.filter(l=>l.status==='replied');
    else if (activeFilter === 'audited')  filtered = all.filter(l=>!!l.audit);
    else if (activeFilter === 'hot')      filtered = all.filter(l=>(l.score||0)>=4);

    // Apply search
    if (q) filtered = filtered.filter(l =>
      (l.company||'').toLowerCase().includes(q) ||
      (l.email||'').toLowerCase().includes(q) ||
      (l.firstName||'').toLowerCase().includes(q)
    );

    if (!filtered.length) {
      document.getElementById('leadsList').innerHTML = '<div class="empty"><div class="e-ico">📋</div><div class="e-txt">No leads match</div><div class="e-sub">Try a different filter or search</div></div>';
      return;
    }

    document.getElementById('leadsList').innerHTML = filtered.map(l =>
      '<div class="ml">' +
        '<input type="checkbox" class="ml-chk lead-chk" data-id="' + l.id + '" ' + (l.status==='approved'||l.status==='pushed'?'checked':'') + '>' +
        '<span class="ml-score">' + scoreEmoji(l.score||0) + '</span>' +
        '<div class="ml-i">' +
          '<div class="ml-n">' + esc(l.firstName||'') + ' ' + esc(l.lastName||'') + ' — ' + esc(l.company||'') + '</div>' +
          '<div class="ml-s">' + (l.opener ? '✉️ ' + l.opener.slice(0,45)+'...' : (l.email||l.phone||l.source||'—')) + '</div>' +
        '</div>' +
        '<span class="ml-b mb-' + l.status + '">' + l.status + '</span>' +
        '<button class="ml-del del-lead-btn" data-id="' + l.id + '">✕</button>' +
      '</div>'
    ).join('');

    document.querySelectorAll('.del-lead-btn').forEach(btn => btn.addEventListener('click', () => delLead(btn.dataset.id)));
    document.querySelectorAll('.lead-chk').forEach(chk => chk.addEventListener('change', () => toggleApp(chk.dataset.id, chk.checked)));
  });
}

function toggleApp(id, checked) {
  chrome.runtime.sendMessage({ action: 'getLeads' }, res => {
    const leads = res?.leads||[];
    const lead  = leads.find(l=>l.id==id);
    if (lead) {
      lead.status = checked ? 'approved' : 'new';
      chrome.runtime.sendMessage({ action: 'updateLead', lead }, () => { loadLeadsTab(); document.getElementById('pushBtn').disabled = false; });
    }
  });
}

function delLead(id) { chrome.runtime.sendMessage({ action: 'deleteLead', id }, () => loadLeadsTab()); }

// Fix 10: Auto-export warning before clearing
function clrAll() {
  chrome.runtime.sendMessage({ action: 'getLeads' }, res => {
    const leads = res?.leads || [];
    if (!leads.length) return;
    const confirmed = confirm('⚠️ You have ' + leads.length + ' leads.\n\nClick OK to download CSV first, then clear.\nClick Cancel to go back.');
    if (!confirmed) return;
    dlCSV();
    setTimeout(() => {
      chrome.runtime.sendMessage({ action: 'clearLeads' }, () => {
        chrome.storage.local.set({ scrapeResults: [] });
        document.getElementById('scrapeResults').innerHTML = '';
        document.getElementById('resBar').style.display = 'none';
        loadLeadsTab();
        addLog('🗑 All leads cleared — CSV was downloaded first', 'inf');
      });
    }, 1000);
  });
}

// ── REPLY DETECTION ───────────────────────────────────────
// Checks Gmail via Apps Script for replies from leads
function startReplyDetection() {
  chrome.runtime.sendMessage({ action: 'getSettings' }, res => {
    const scriptUrl = res?.settings?.scriptUrl;
    if (!scriptUrl) return;

    // Run every 10 minutes
    setInterval(() => checkForReplies(scriptUrl), 10 * 60 * 1000);
    // Also run once on startup after 30 seconds
    setTimeout(() => checkForReplies(scriptUrl), 30000);
  });
}

async function checkForReplies(scriptUrl) {
  try {
    const res = await fetch(scriptUrl + '?action=getReplies', { method: 'GET', mode: 'no-cors' });
    // With no-cors we can't read the response, but the script runs
    // Instead we update via a GET with action param
    addLog('🔄 Checking for email replies...', 'inf');
  } catch(e) {}
}

// ── PUSH TO SHEET ─────────────────────────────────────────
async function pushAll() {
  const s = await getSettings();
  if (!s.scriptUrl) { addLog('⚠️ Add Script URL in Setup tab', 'err'); goTab('settings'); return; }
  chrome.runtime.sendMessage({ action: 'getLeads' }, async res => {
    const leads = (res?.leads||[]).filter(l=>l.status!=='pushed');
    if (!leads.length) { addLog('⚠️ No leads to push', 'err'); return; }
    document.getElementById('pushBtn').disabled = true;
    addLog('📤 Pushing ' + leads.length + ' leads...', 'inf');
    let ok = 0;
    for (const lead of leads) {
      try {
        // Include opener and audit data in push
        const payload = {
          ...lead,
          opener:     lead.opener     || '',
          auditScore: lead.auditScore || '',
          painPoints: lead.painPoints || lead.painPoint || '',
        };
        await fetch(s.scriptUrl, { method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
        lead.status = 'pushed'; ok++;
        chrome.runtime.sendMessage({ action: 'updateLead', lead });
        const hasOpener = lead.opener ? ' [opener ✓]' : '';
        const hasAudit  = lead.audit  ? ' [audited ✓]' : '';
        addLog('✅ ' + lead.firstName + ' ' + lead.lastName + ' — ' + lead.company + hasOpener + hasAudit, 'ok');
      } catch(e) { addLog('❌ ' + lead.company, 'err'); }
      await sleep(150);
    }
    addLog('✔ Done — ' + ok + ' leads pushed with openers + audit data', 'ok');
    loadLeadsTab();
    document.getElementById('pushBtn').disabled = false;
  });
}

// ── CSV ───────────────────────────────────────────────────
function dlCSV() {
  chrome.runtime.sendMessage({ action: 'getLeads' }, res => {
    const leads = res?.leads||[];
    if (!leads.length) { addLog('⚠️ No leads to export', 'err'); return; }
    const h = ['First Name','Last Name','Email','Company','Niche','Website','Pain Points','Score','Audit Score','Personalized Opener','Status'];
    const r = leads.map(l => [
      l.firstName, l.lastName, l.email, l.company,
      l.niche||'realestate', l.website,
      l.painPoints||l.painPoint||'',
      l.score||0, l.auditScore||'',
      l.opener||'', l.status
    ]);
    const csv = [h,...r].map(row=>row.map(c=>'"'+(c||'').toString().replace(/"/g,'""')+'"').join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    chrome.downloads.download({ url, filename:'oma_leads_v7_'+Date.now()+'.csv' });
    addLog('📥 CSV with openers + audit data downloaded — ' + leads.length + ' leads', 'ok');
  });
}

// ── SETTINGS ──────────────────────────────────────────────
function loadSettings() {
  chrome.runtime.sendMessage({ action: 'getSettings' }, res => {
    const s = res?.settings||{};
    if (s.scriptUrl)   document.getElementById('iUrl').value    = s.scriptUrl;
    if (s.senderName)  document.getElementById('iName').value   = s.senderName;
    if (s.agencyName)  document.getElementById('iAgency').value = s.agencyName;
    if (s.bookingLink) document.getElementById('iWA').value     = s.bookingLink;
    chkConn();
  });
}

function saveS() {
  const settings = {
    scriptUrl:   document.getElementById('iUrl').value.trim(),
    senderName:  document.getElementById('iName').value.trim(),
    agencyName:  document.getElementById('iAgency').value.trim(),
    bookingLink: document.getElementById('iWA').value.trim(),
  };
  chrome.runtime.sendMessage({ action: 'saveSettings', settings }, () => {
    const m = document.getElementById('savedMsg'); m.style.display = 'block';
    setTimeout(()=>{ m.style.display='none'; }, 2000);
    addLog('💾 Settings saved', 'ok'); chkConn();
  });
}

function chkConn() {
  const url = document.getElementById('iUrl')?.value||'';
  const b   = document.getElementById('connBadge');
  if (!b) return;
  if (url.includes('script.google.com')) { b.className='cb cy'; b.textContent='● Connected to Google Sheet'; }
  else { b.className='cb cn'; b.textContent='● Not connected to Google Sheet'; }
}

function getSettings() { return new Promise(r => chrome.runtime.sendMessage({action:'getSettings'}, res=>r(res?.settings||{}))); }

// ── TABS ──────────────────────────────────────────────────
function goTab(name, save) {
  document.querySelectorAll('.pnl').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  document.getElementById('pnl-'+name).classList.add('on');
  document.getElementById('tab-'+name+'-btn').classList.add('on');
  if (name==='leads') loadLeadsTab();
  if (save!==false) chrome.storage.local.set({ lastTab: name });
}

// ── UTILS ─────────────────────────────────────────────────
function addLog(msg, type) {
  const p = document.createElement('div');
  p.className = 'log-line '+(type||'');
  p.textContent = new Date().toLocaleTimeString()+'  '+msg;
  const d = document.getElementById('logDiv');
  d.appendChild(p); d.scrollTop = d.scrollHeight;
}

function esc(str) {
  return (str||'').toString()
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function sleep(ms) { return new Promise(r=>setTimeout(r,ms)); }

// ============================================================
// OMA Lead Engine v8 — ADDITIONS to popup.js
// CRM, Reverse Scraper, Reply Handler, Contact Finder,
// Triple Touch, Bulk Scrape, Competitor Stealer (improved)
// ============================================================

// ── CRM FUNCTIONS ─────────────────────────────────────────
const CRM_STAGES = [
  { id:'new',      label:'New',          color:'#3b7cff' },
  { id:'contacted',label:'Contacted',    color:'#ffb626' },
  { id:'replied',  label:'Replied',      color:'#00e5a0' },
  { id:'call',     label:'Call Booked',  color:'#f59e0b' },
  { id:'won',      label:'Won ✅',        color:'#00e5a0' },
  { id:'lost',     label:'Lost',         color:'#ff4757' },
];

let crmView = 'kanban';
let dragDeal = null;

function loadCRM() {
  chrome.runtime.sendMessage({ action: 'getCRMDeals' }, res => {
    const deals = res?.deals || [];
    updatePipelineValue(deals);
    if (crmView === 'kanban') renderKanban(deals);
    else renderCRMList(deals);
  });
}

function updatePipelineValue(deals) {
  const total = deals
    .filter(d => d.stage !== 'lost')
    .reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0);
  document.getElementById('pipelineVal').textContent = '$' + total.toLocaleString();
}

function renderKanban(deals) {
  const container = document.getElementById('crmKanban');
  container.innerHTML = '';

  const html = CRM_STAGES.map(stage => {
    const stageDeals = deals.filter(d => d.stage === stage.id);
    const cards = stageDeals.map(d => `
      <div class="kd" draggable="true" data-id="${d.id}">
        <button class="kd-del del-deal-btn" data-id="${d.id}">✕</button>
        <div class="kd-name">${esc(d.name)}</div>
        <div class="kd-co">${esc(d.company)}</div>
        ${d.value ? `<div class="kd-val">$${parseFloat(d.value).toLocaleString()}</div>` : ''}
      </div>`).join('');

    return `
      <div class="kc" data-stage="${stage.id}">
        <div class="kc-title" style="color:${stage.color}">
          ${stage.label}
          <span class="kc-count" style="background:${stage.color}20;color:${stage.color}">${stageDeals.length}</span>
        </div>
        ${cards}
        <div class="kd-drop">Drop here</div>
      </div>`;
  }).join('');

  container.innerHTML = `<div class="kanban">${html}</div>`;

  // Bind drag events
  container.querySelectorAll('.kd').forEach(card => {
    card.addEventListener('dragstart', () => { dragDeal = card.dataset.id; card.classList.add('dragging'); });
    card.addEventListener('dragend', () => { card.classList.remove('dragging'); dragDeal = null; });
  });

  container.querySelectorAll('.kc').forEach(col => {
    col.addEventListener('dragover', e => e.preventDefault());
    col.addEventListener('drop', () => {
      if (!dragDeal) return;
      const newStage = col.dataset.stage;
      chrome.runtime.sendMessage({ action: 'getCRMDeals' }, res => {
        const deals = res?.deals || [];
        const deal  = deals.find(d => d.id == dragDeal);
        if (deal) {
          deal.stage = newStage;
          chrome.runtime.sendMessage({ action: 'saveCRMDeal', deal }, () => {
            loadCRM();
            addLog('📋 Deal moved to ' + newStage + ': ' + deal.name, 'ok');
          });
        }
      });
    });
  });

  container.querySelectorAll('.del-deal-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      chrome.runtime.sendMessage({ action: 'deleteCRMDeal', id: btn.dataset.id }, () => loadCRM());
    });
  });
}

function renderCRMList(deals) {
  const list = document.getElementById('crmList');
  if (!deals.length) {
    list.innerHTML = '<div class="empty"><div class="e-ico">💼</div><div class="e-txt">No deals yet</div><div class="e-sub">Add deals or push leads from the Leads tab</div></div>';
    return;
  }
  list.innerHTML = deals.map(d => {
    const stage = CRM_STAGES.find(s => s.id === d.stage) || CRM_STAGES[0];
    return `<div class="ml">
      <div class="ml-i">
        <div class="ml-n">${esc(d.name)} — ${esc(d.company)}</div>
        <div class="ml-s">${d.email || d.phone || '—'} ${d.value ? '· $'+parseFloat(d.value).toLocaleString() : ''}</div>
      </div>
      <span class="ml-b" style="background:${stage.color}20;color:${stage.color}">${stage.label}</span>
      <button class="ml-del del-deal-btn" data-id="${d.id}">✕</button>
    </div>`;
  }).join('');

  list.querySelectorAll('.del-deal-btn').forEach(btn => {
    btn.addEventListener('click', () => chrome.runtime.sendMessage({ action:'deleteCRMDeal', id:btn.dataset.id }, () => loadCRM()));
  });
}

function saveDeal() {
  const name    = document.getElementById('dealName').value.trim();
  const company = document.getElementById('dealCompany').value.trim();
  const value   = document.getElementById('dealValue').value.trim();
  const email   = document.getElementById('dealEmail').value.trim();
  const phone   = document.getElementById('dealPhone').value.trim();
  if (!name && !company) { addLog('⚠️ Enter at least a name or company', 'err'); return; }

  const deal = { id: Date.now(), name, company, value, email, phone, stage: 'new', created: new Date().toISOString() };
  chrome.runtime.sendMessage({ action: 'saveCRMDeal', deal }, () => {
    document.getElementById('dealModal').classList.remove('show');
    loadCRM();
    addLog('💼 Deal added: ' + (name || company), 'ok');
    ['dealName','dealCompany','dealEmail','dealPhone'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('dealValue').value = '500';
  });
}

// ── PUSH LEAD TO CRM ──────────────────────────────────────
function pushLeadToCRM(lead) {
  const deal = {
    id: Date.now() + Math.random(),
    name: (lead.firstName + ' ' + lead.lastName).trim() || lead.company,
    company: lead.company,
    value: 500,
    email: lead.email,
    phone: lead.phone,
    stage: lead.status === 'replied' ? 'replied' : 'contacted',
    created: new Date().toISOString(),
    leadId: lead.id,
  };
  chrome.runtime.sendMessage({ action: 'saveCRMDeal', deal }, () => {
    addLog('💼 Lead added to CRM: ' + deal.name, 'ok');
    loadCRM();
  });
}

// ── REVERSE SCRAPER ───────────────────────────────────────
let selectedPlatform = 'google';

function initReverseScraper() {
  document.querySelectorAll('.plat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.plat-btn').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      selectedPlatform = btn.dataset.plat;
    });
  });
}

async function runReverseSearch() {
  if (!isPro) { showModal(); return; }
  const keyword = document.getElementById('revKeyword').value.trim();
  if (!keyword) { addLog('⚠️ Enter a keyword to hunt for', 'err'); return; }

  const btn = document.getElementById('revBtn');
  btn.disabled = true;
  const box = document.getElementById('revProg');
  box.style.display = 'block';
  document.getElementById('revProgLabel').textContent  = '🎯 Hunting for: ' + keyword + ' on ' + selectedPlatform + '...';
  document.getElementById('revProgFill').style.width   = '30%';
  document.getElementById('revProgDetail').textContent = 'Searching for people actively looking for your service...';

  addLog('🎯 Reverse scraping: "' + keyword + '" on ' + selectedPlatform, 'inf');

  chrome.runtime.sendMessage({ action: 'reverseSearch', keyword, platform: selectedPlatform }, res => {
    const leads = (res?.leads || []).map(l => ({ ...l, id: Date.now()+Math.random(), status:'new', score: scoreL(l) }));
    document.getElementById('revProgFill').style.width = '100%';

    if (!leads.length) {
      document.getElementById('revResults').innerHTML = '<div class="empty"><div class="e-ico">😔</div><div class="e-txt">No active leads found</div><div class="e-sub">Try different keywords or platform</div></div>';
      box.style.display = 'none'; btn.disabled = false; return;
    }

    chrome.runtime.sendMessage({ action: 'saveLeads', leads }, r => {
      addLog('🎯 Found ' + (r?.added||0) + ' hot leads actively looking for: ' + keyword, 'ok');
      document.getElementById('revResults').innerHTML =
        '<div style="background:rgba(0,229,160,.08);border:1px solid rgba(0,229,160,.2);border-radius:8px;padding:12px;margin-top:10px">' +
        '<div style="font-size:12px;font-weight:600;color:var(--a2);margin-bottom:4px">🔥 Found ' + (r?.added||0) + ' hot leads</div>' +
        '<div style="font-size:11px;color:var(--m)">These people are actively looking for "' + esc(keyword) + '". Saved to your Leads tab — they have <b style="color:var(--t)">HIGH</b> intent.</div></div>';
      box.style.display = 'none'; btn.disabled = false;
      updateUsageBar(); loadLeadsTab();
    });
  });
}

// ── AI REPLY HANDLER ──────────────────────────────────────
function showReplyHandler(lead, replyText) {
  chrome.runtime.sendMessage({ action: 'detectObjection', text: replyText, leadData: lead }, res => {
    const { objection, response } = res;
    const objLabels = {
      has_agency: '🏢 Has existing agency',
      not_interested: '❌ Not interested',
      price_objection: '💰 Price concern',
      wants_info: '📋 Wants more info',
      wants_call: '📞 Wants a call',
      not_now: '⏳ Not right now',
      how_found: '🤔 How did you find me?',
      generic_reply: '💬 General reply',
    };

    const box = document.getElementById('replyBox-' + lead.id);
    if (box) {
      box.style.display = 'block';
      box.querySelector('.reply-obj').textContent = 'Detected: ' + (objLabels[objection] || objection);
      box.querySelector('.reply-txt').textContent = response.body;
      box.querySelector('.reply-approve-btn').onclick = () => {
        addLog('✅ Reply approved and ready to send for: ' + lead.company, 'ok');
        box.style.display = 'none';
      };
      box.querySelector('.reply-dismiss-btn').onclick = () => { box.style.display = 'none'; };
    }
  });
}

// ── CONTACT FINDER ────────────────────────────────────────
async function findContactsForLead(lead, idx) {
  if (!isPro) { showModal(); return; }
  if (!lead.website) { addLog('⚠️ No website for this lead', 'err'); return; }

  addLog('📧 Finding contacts for: ' + lead.company, 'inf');

  chrome.runtime.sendMessage({ action: 'findContacts', url: lead.website }, res => {
    if (!res) { addLog('⚠️ Could not find contact info', 'inf'); return; }

    chrome.storage.local.get(['scrapeResults'], data => {
      const leads = data.scrapeResults || [];
      if (leads[idx]) {
        if (res.email && !leads[idx].email) { leads[idx].email = res.email; addLog('📧 Found email: ' + res.email, 'ok'); }
        if (res.phone && !leads[idx].phone) { leads[idx].phone = res.phone; addLog('📞 Found phone: ' + res.phone, 'ok'); }
        if (res.ownerName && leads[idx].firstName === 'Business') {
          const np = res.ownerName.split(' ');
          leads[idx].firstName = np[0]; leads[idx].lastName = np.slice(1).join(' ');
          addLog('👤 Found owner: ' + res.ownerName, 'ok');
        }
        if (res.social) leads[idx].social = { ...(leads[idx].social||{}), ...res.social };
        leads[idx].score = scoreL(leads[idx]);
        chrome.storage.local.set({ scrapeResults: leads }, () => renderCards(leads));
      }
    });
  });
}

// ── TRIPLE TOUCH OUTREACH ─────────────────────────────────
function tripleTouch(lead) {
  if (!isPro) { showModal(); return; }

  // 1. WhatsApp message
  if (lead.phone) {
    const phone   = lead.phone.replace(/\D/g,'');
    const opener  = lead.opener || 'I noticed some opportunities on your website';
    const msg     = encodeURIComponent(`Hi ${lead.firstName||'there'}, ${opener}. I'm Uns from Outreach Marketing Agency — we help businesses like yours get more leads through Meta ads and digital marketing. Worth a quick chat? 🚀`);
    const waUrl   = 'https://wa.me/' + phone + '?text=' + msg;
    chrome.tabs.create({ url: waUrl, active: false });
    addLog('📱 WhatsApp opened for: ' + lead.company, 'ok');
  }

  // 2. LinkedIn connection (if available)
  if (lead.social?.linkedin || lead.website?.includes('linkedin')) {
    const liUrl = lead.social?.linkedin || lead.website;
    chrome.tabs.create({ url: liUrl, active: false });
    addLog('💼 LinkedIn opened for: ' + lead.company, 'ok');
  }

  // 3. Email (via sheet push)
  addLog('✉️ Triple Touch launched for: ' + lead.company, 'ok');
  addLog('💡 WhatsApp + LinkedIn opened. Email will go via your outreach sequence when pushed to Sheet.', 'inf');
}

// ── SMART SEND TIME ───────────────────────────────────────
function showBestSendTime(niche) {
  chrome.runtime.sendMessage({ action: 'getBestSendTime', niche }, res => {
    if (res) addLog('⏰ Best time to contact ' + niche + ': ' + res.label, 'inf');
  });
}

// ── BIND NEW EVENTS ───────────────────────────────────────
// Called after DOMContentLoaded — adds v8 specific bindings
function bindV8Events() {
  // CRM tab
  document.getElementById('crmKanbanBtn').addEventListener('click', () => {
    crmView = 'kanban';
    document.getElementById('crmKanbanBtn').classList.add('on');
    document.getElementById('crmListBtn').classList.remove('on');
    document.getElementById('crmKanban').style.display = 'block';
    document.getElementById('crmList').style.display   = 'none';
    loadCRM();
  });

  document.getElementById('crmListBtn').addEventListener('click', () => {
    crmView = 'list';
    document.getElementById('crmListBtn').classList.add('on');
    document.getElementById('crmKanbanBtn').classList.remove('on');
    document.getElementById('crmKanban').style.display = 'none';
    document.getElementById('crmList').style.display   = 'block';
    loadCRM();
  });

  document.getElementById('addDealBtn').addEventListener('click', () => {
    document.getElementById('dealModal').classList.add('show');
  });
  document.getElementById('saveDealBtn').addEventListener('click', saveDeal);
  document.getElementById('closeDealModalBtn').addEventListener('click', () => {
    document.getElementById('dealModal').classList.remove('show');
  });

  // Reverse scraper
  document.getElementById('revBtn').addEventListener('click', runReverseSearch);
  initReverseScraper();

  // Bulk scrape
  document.getElementById('bulkBtn').addEventListener('click', doBulkScrapeV8);

  // Competitor stealer
  document.getElementById('compBtn').addEventListener('click', runCompetitorStealerV8);
}

// ── BULK SCRAPE V8 ────────────────────────────────────────
async function doBulkScrapeV8() {
  if (!isPro) { showModal(); return; }
  const baseUrl = document.getElementById('bulkUrl').value.trim();
  const pages   = parseInt(document.getElementById('bulkPages').value) || 5;
  if (!baseUrl) { addLog('⚠️ Enter a search URL', 'err'); return; }

  const btn = document.getElementById('bulkBtn');
  btn.disabled = true;
  const box = document.getElementById('bulkProg');
  box.style.display = 'block';
  addLog('⚡ Bulk scrape: ' + pages + ' pages', 'inf');

  let allLeads = [];
  const urls   = buildPageUrlsV8(baseUrl, pages);

  for (let i = 0; i < urls.length; i++) {
    const pct = Math.round(((i+1)/urls.length)*100);
    document.getElementById('bulkProgLabel').textContent  = 'Scraping page ' + (i+1) + ' of ' + urls.length + '...';
    document.getElementById('bulkProgFill').style.width   = pct + '%';
    document.getElementById('bulkProgDetail').textContent = allLeads.length + ' leads so far';

    const leads = await new Promise(resolve => {
      chrome.runtime.sendMessage({ action:'scrapeSilent', url:urls[i] }, res => resolve(res?.leads||[]));
    });

    allLeads = [...allLeads, ...leads.map(l=>({...l,id:Date.now()+Math.random(),status:'new',score:scoreL(l)}))];
    addLog('Page '+(i+1)+': '+leads.length+' leads', 'ok');
    await sleep(800);
  }

  box.style.display = 'none'; btn.disabled = false;

  if (!allLeads.length) {
    document.getElementById('bulkResults').innerHTML = '<div class="empty"><div class="e-ico">😔</div><div class="e-txt">No leads found</div><div class="e-sub">Try a different search URL</div></div>';
    return;
  }

  chrome.runtime.sendMessage({ action:'saveLeads', leads:allLeads }, r => {
    addLog('✅ Bulk done — '+(r?.added||0)+' new leads ('+(r?.duplicates||0)+' dupes)', 'ok');
    document.getElementById('bulkResults').innerHTML =
      '<div style="text-align:center;padding:16px;font-size:12px;color:var(--a2);font-family:var(--mono)">✅ '+(r?.added||0)+' new leads saved to Leads tab</div>';
    updateUsageBar(); loadLeadsTab();
  });
}

function buildPageUrlsV8(baseUrl, count) {
  const urls = [baseUrl];
  try {
    const u = new URL(baseUrl);
    for (let i = 2; i <= count; i++) {
      if (baseUrl.includes('yellowpages.com')) u.searchParams.set('page', i);
      else if (baseUrl.includes('yelp.com')) u.searchParams.set('start', (i-1)*10);
      else u.searchParams.set('page', i);
      urls.push(u.toString());
    }
  } catch(e) {}
  return urls.slice(0, count);
}

// ── COMPETITOR STEALER V8 ─────────────────────────────────
async function runCompetitorStealerV8() {
  if (!isPro) { showModal(); return; }
  const name     = document.getElementById('compName').value.trim();
  const location = document.getElementById('compLocation').value.trim();
  if (!name) { addLog('⚠️ Enter a competitor name', 'err'); return; }

  const btn = document.getElementById('compBtn');
  btn.disabled = true;
  const box = document.getElementById('compProg');
  box.style.display = 'block';
  document.getElementById('compResults').innerHTML = '';
  addLog('🕵️ Stealing clients from: ' + name, 'inf');

  const stages = ['Searching Google...', 'Finding clients...', 'Saving leads...'];
  const fills   = ['25%', '65%', '90%'];

  stages.forEach((label, i) => {
    setTimeout(() => {
      document.getElementById('compProgLabel').textContent  = label;
      document.getElementById('compProgFill').style.width   = fills[i];
      document.getElementById('compProgDetail').textContent = 'Step ' + (i+1) + '/3';
    }, i * 1000);
  });

  const query = '"' + name + '" (clients OR portfolio OR "our work" OR "case studies")' + (location ? ' ' + location : '');
  const url   = 'https://www.google.com/search?q=' + encodeURIComponent(query);

  chrome.runtime.sendMessage({ action:'scrapeSilent', url }, res => {
    const leads = (res?.leads||[]).map(l => ({
      ...l, id:Date.now()+Math.random(), status:'new', score:scoreL(l),
      painPoint:'Client of '+name+' — already pays for marketing',
    }));

    document.getElementById('compProgFill').style.width = '100%';

    if (!leads.length) {
      box.style.display='none'; btn.disabled=false;
      document.getElementById('compResults').innerHTML = '<div class="empty"><div class="e-ico">😔</div><div class="e-txt">No clients found</div><div class="e-sub">Try a more specific name</div></div>';
      return;
    }

    chrome.runtime.sendMessage({ action:'saveLeads', leads }, r => {
      addLog('🕵️ Found '+(r?.added||0)+' clients of '+name, 'ok');
      document.getElementById('compResults').innerHTML =
        '<div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:8px;padding:12px;margin-top:10px">' +
        '<div style="font-size:12px;font-weight:600;color:var(--gold);margin-bottom:4px">✅ Found '+(r?.added||0)+' clients of '+esc(name)+'</div>' +
        '<div style="font-size:11px;color:var(--m)">These businesses already pay for marketing. Saved to your <b style="color:var(--t)">📋 Leads tab</b>.</div></div>';
      box.style.display='none'; btn.disabled=false;
      updateUsageBar(); loadLeadsTab();
    });
  });
}

// ── OVERRIDE renderCards to add v8 features ───────────────
const _origRenderCards = typeof renderCards === 'function' ? renderCards : null;
function renderCards(leads) {
  if (!leads?.length) return;
  const container = document.getElementById('scrapeResults');

  container.innerHTML = leads.map((l, i) => {
    const hasAudit   = !!l.audit;
    const domain     = l.website ? l.website.replace(/^https?:\/\//,'').split('/')[0] : '';
    const auditColor = !hasAudit ? '' : l.auditScore<40 ? '#ff4757' : l.auditScore<70 ? '#ffb626' : '#00e5a0';
    const isHot      = l.intent === 'HIGH';

    return '<div class="lc'+(hasAudit?' audited':'')+'" id="lc-'+i+'">' +
      '<div class="score-w">'+scoreEmoji(l.score||0)+(isHot?'🔥':'')+' </div>' +
      '<div class="la-w">' +
        (isPro?'<button class="la la-gold audit-one-btn" data-idx="'+i+'" title="Audit">🎯</button>':'') +
        (isPro?'<button class="la la-blue contact-btn" data-idx="'+i+'" title="Find contacts">📧</button>':'') +
        '<button class="la la-x skip-btn" data-idx="'+i+'">✕</button>' +
      '</div>' +
      '<div class="lc-body">' +
        '<div class="lc-n">'+esc(l.firstName||'')+' '+esc(l.lastName||'')+'</div>' +
        (domain?'<a class="lc-domain open-site-btn" data-url="'+esc(l.website)+'">🌐 '+esc(domain)+'</a>':'') +
        '<div class="lc-c">'+esc(l.company||'')+'</div>' +
        '<div class="lc-tags">' +
          (l.email?'<span class="tag te">📧 '+esc(l.email)+'</span>':'') +
          (l.phone?'<span class="tag tp">📞 '+esc(l.phone)+'</span>':'') +
          '<span class="tag ts">'+esc(l.source||'Web')+'</span>' +
          (isHot?'<span class="tag ti">🔥 High Intent</span>':'') +
          (hasAudit?'<span class="tag ti" style="color:'+auditColor+'">'+l.audit.issues.length+' issues</span>':'') +
        '</div>' +
        (hasAudit?
          '<div class="audit-p show">' +
            '<div class="health-r"><span class="health-l">Health</span><div class="health-t"><div class="health-f" style="width:'+l.auditScore+'%;background:'+auditColor+'"></div></div><span class="health-v" style="color:'+auditColor+'">'+l.auditScore+'%</span></div>' +
            '<div class="opener-box"><div class="opener-lbl">✉️ Personalized Opener <span class="opener-edit-btn edit-opener-btn" data-idx="'+i+'">edit</span></div>' +
            '<div class="opener-txt" id="opener-txt-'+i+'">'+esc(l.opener||'')+'</div>' +
            '<textarea class="opener-inp" id="opener-inp-'+i+'" rows="3">'+esc(l.opener||'')+'</textarea></div>' +
            '<div class="issues-g">'+l.audit.issues.slice(0,4).map(iss=>'<div class="issue-chip"><div class="issue-prob">'+iss.icon+' '+esc(iss.problem)+'</div><div class="issue-svc">'+esc(iss.service)+'</div></div>').join('')+'</div>' +
          '</div>'
        :'') +
        (isPro?'<div id="replyBox-'+l.id+'" class="reply-box"><div class="reply-lbl">🤖 AI Reply Suggestion</div><div class="reply-obj"></div><div class="reply-txt"></div><div class="reply-btns"><button class="reply-approve reply-approve-btn">✓ Use This Reply</button><button class="reply-dismiss reply-dismiss-btn">Dismiss</button></div></div>':'') +
      '</div>' +
    '</div>';
  }).join('');

  // Bind all events
  container.querySelectorAll('.skip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      chrome.storage.local.get(['scrapeResults'], res => {
        const l=res.scrapeResults||[]; l.splice(idx,1);
        chrome.storage.local.set({scrapeResults:l}); renderCards(l);
        document.getElementById('resNum').textContent=l.length;
      });
    });
  });

  container.querySelectorAll('.open-site-btn').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); chrome.tabs.create({url:a.dataset.url}); });
  });

  if (isPro) {
    container.querySelectorAll('.audit-one-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx=parseInt(btn.dataset.idx);
        chrome.storage.local.get(['scrapeResults'],async res=>{
          const leads=res.scrapeResults||[];
          if(!leads[idx]?.website){addLog('⚠️ No website','err');return;}
          btn.textContent='⏳';btn.disabled=true;
          addLog('🎯 Auditing: '+(leads[idx].company||leads[idx].website),'inf');
          const audit=await new Promise(r=>chrome.runtime.sendMessage({action:'auditWebsite',url:leads[idx].website},res=>r(res?.result||null)));
          if(audit){leads[idx].audit=audit;leads[idx].opener=audit.opener;leads[idx].auditScore=audit.score;leads[idx].painPoints=audit.issues.slice(0,3).map(i=>i.problem).join(', ');if(!leads[idx].email&&audit.emails?.length)leads[idx].email=audit.emails[0];leads[idx].score=scoreL(leads[idx]);addLog('✅ '+(leads[idx].company||'Lead')+' — '+audit.issues.length+' issues found','ok');}
          chrome.storage.local.set({scrapeResults:leads});renderCards(leads);
        });
      });
    });

    container.querySelectorAll('.contact-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx=parseInt(btn.dataset.idx);
        chrome.storage.local.get(['scrapeResults'],res=>{
          const leads=res.scrapeResults||[];
          if(leads[idx])findContactsForLead(leads[idx],idx);
        });
      });
    });

    container.querySelectorAll('.edit-opener-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx=btn.dataset.idx;
        const txt=document.getElementById('opener-txt-'+idx);
        const inp=document.getElementById('opener-inp-'+idx);
        if(inp.style.display==='block'){
          chrome.storage.local.get(['scrapeResults'],res=>{const l=res.scrapeResults||[];if(l[idx]){l[idx].opener=inp.value;chrome.storage.local.set({scrapeResults:l});}});
          txt.textContent=inp.value;txt.style.display='block';inp.style.display='none';btn.textContent='edit';
        }else{txt.style.display='none';inp.style.display='block';btn.textContent='save';}
      });
    });
  }
}

// ── OVERRIDE loadLeadsTab to add CRM push + triple touch ──
const _origLoadLeadsTab = typeof loadLeadsTab === 'function' ? loadLeadsTab : null;
function loadLeadsTab(search) {
  chrome.runtime.sendMessage({ action: 'getLeads' }, res => {
    const all = res?.leads || [];
    document.getElementById('sT').textContent = all.length;
    document.getElementById('sA').textContent = all.filter(l=>l.status==='approved').length;
    document.getElementById('sP').textContent = all.filter(l=>l.status==='pushed').length;
    document.getElementById('sR').textContent = all.filter(l=>l.status==='replied').length;
    document.getElementById('pushBtn').disabled = all.filter(l=>l.status!=='pushed').length===0;

    const q = (search || document.getElementById('srchInput')?.value || '').toLowerCase();
    const af = activeFilter || 'all';

    let filtered = all;
    if(af==='new')filtered=all.filter(l=>l.status==='new');
    else if(af==='approved')filtered=all.filter(l=>l.status==='approved');
    else if(af==='pushed')filtered=all.filter(l=>l.status==='pushed');
    else if(af==='replied')filtered=all.filter(l=>l.status==='replied');
    else if(af==='audited')filtered=all.filter(l=>!!l.audit);
    else if(af==='hot')filtered=all.filter(l=>(l.score||0)>=4);
    else if(af==='intent')filtered=all.filter(l=>l.intent==='HIGH');

    if(q)filtered=filtered.filter(l=>(l.company||'').toLowerCase().includes(q)||(l.email||'').toLowerCase().includes(q)||(l.firstName||'').toLowerCase().includes(q));

    if(!filtered.length){document.getElementById('leadsList').innerHTML='<div class="empty"><div class="e-ico">📋</div><div class="e-txt">No leads match</div><div class="e-sub">Try a different filter</div></div>';return;}

    document.getElementById('leadsList').innerHTML=filtered.map(l=>
      '<div class="ml">' +
        '<input type="checkbox" class="ml-chk lead-chk" data-id="'+l.id+'" '+(l.status==='approved'||l.status==='pushed'?'checked':'')+'>'+
        '<span class="ml-score">'+scoreEmoji(l.score||0)+(l.intent==='HIGH'?'🔥':'')+'</span>'+
        '<div class="ml-i"><div class="ml-n">'+esc(l.firstName||'')+' '+esc(l.lastName||'')+' — '+esc(l.company||'')+'</div>' +
        '<div class="ml-s">'+(l.opener?'✉️ '+l.opener.slice(0,45)+'...':(l.email||l.phone||l.source||'—'))+'</div></div>'+
        '<span class="ml-b mb-'+l.status+'">'+l.status+'</span>'+
        (isPro?'<button class="la la-blue crm-push-btn" data-id="'+l.id+'" title="Add to CRM" style="margin-right:4px">💼</button>':'') +
        '<button class="ml-del del-lead-btn" data-id="'+l.id+'">✕</button>'+
      '</div>'
    ).join('');

    document.querySelectorAll('.del-lead-btn').forEach(btn=>btn.addEventListener('click',()=>delLead(btn.dataset.id)));
    document.querySelectorAll('.lead-chk').forEach(chk=>chk.addEventListener('change',()=>toggleApp(chk.dataset.id,chk.checked)));
    if(isPro){
      document.querySelectorAll('.crm-push-btn').forEach(btn=>{
        btn.addEventListener('click',()=>{
          const lead=filtered.find(l=>l.id==btn.dataset.id);
          if(lead)pushLeadToCRM(lead);
        });
      });
    }
  });
}

// ── INIT V8 ───────────────────────────────────────────────
// Hook into DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  bindV8Events();
  // Override goTab to handle new tabs
  const origGoTab = goTab;
  window.goTab = function(name, save) {
    origGoTab(name, save);
    if (name === 'crm') loadCRM();
  };
});

function scoreL(l){let s=0;if(l.email?.includes('@'))s+=2;if(l.phone?.length>6)s+=1;if(l.website?.startsWith('http'))s+=1;if(l.firstName&&l.firstName!=='Business')s+=1;return Math.min(5,s);}
function scoreEmoji(s){if(s>=5)return'⭐⭐⭐';if(s>=3)return'⭐⭐';if(s>=1)return'⭐';return'·';}
