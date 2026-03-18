// ============================================================
// OMA Lead Engine v6 — auditor.js
// Runs on a website and detects every digital marketing
// problem, missing tool, and pain point automatically
// ============================================================

(function() {
  const results = {
    url:        window.location.href,
    title:      document.title,
    issues:     [],
    score:      0,   // 0-100 (lower = more pain points = better lead)
    opener:     '',  // personalized email opening line
    emails:     [],
    phones:     [],
    hasPixel:   false,
    hasGA:      false,
    hasChat:    false,
    hasSocial:  false,
    hasSSL:     false,
    hasWA:      false,
    hasMaps:    false,
    hasForm:    false,
    hasSEO:     false,
    pageSpeed:  null,
    copyrightYear: null,
    businessName: '',
  };

  const html  = document.documentElement.innerHTML;
  const text  = document.body.innerText || '';
  const url   = window.location.href;
  const host  = window.location.hostname.replace('www.','');

  // ── BUSINESS NAME ────────────────────────────────────────
  const ogName = document.querySelector('meta[property="og:site_name"]')?.content;
  const h1     = document.querySelector('h1')?.innerText?.slice(0,50);
  results.businessName = ogName || document.title.split(/[|\-–]/)[0].trim() || host;

  // ── SSL ───────────────────────────────────────────────────
  results.hasSSL = url.startsWith('https://');
  if (!results.hasSSL) {
    results.issues.push({
      icon: '🔓',
      problem: 'No SSL certificate',
      impact: 'Visitors see "Not Secure" warning — losing customers',
      service: 'Web Development',
      pitch: 'Your website shows a "Not Secure" warning to every visitor'
    });
  }

  // ── FACEBOOK PIXEL ────────────────────────────────────────
  results.hasPixel = html.includes('fbq(') || html.includes('facebook.net/en_US/fbevents') || html.includes('connect.facebook.net');
  if (!results.hasPixel) {
    results.issues.push({
      icon: '📉',
      problem: 'No Facebook/Meta Pixel',
      impact: 'Cannot run retargeting ads or track conversions',
      service: 'Meta Ads Management',
      pitch: "You have no Facebook Pixel — you're leaving retargeting money on the table"
    });
  }

  // ── GOOGLE ANALYTICS ─────────────────────────────────────
  results.hasGA = html.includes('gtag(') || html.includes('google-analytics.com') || html.includes('googletagmanager.com') || html.includes('UA-') || html.includes('G-');
  if (!results.hasGA) {
    results.issues.push({
      icon: '📊',
      problem: 'No Google Analytics',
      impact: 'No data on website visitors, traffic sources, or conversions',
      service: 'Digital Marketing Setup',
      pitch: "You have no Google Analytics — you have no idea where your customers come from"
    });
  }

  // ── GOOGLE TAG MANAGER ───────────────────────────────────
  const hasGTM = html.includes('googletagmanager.com/gtm.js');
  if (!hasGTM && !results.hasGA) {
    results.issues.push({
      icon: '🏷️',
      problem: 'No Google Tag Manager',
      impact: 'Cannot manage marketing tags efficiently',
      service: 'Digital Marketing Setup',
      pitch: null // secondary issue, no separate pitch
    });
  }

  // ── WHATSAPP BUTTON ───────────────────────────────────────
  results.hasWA = html.includes('wa.me') || html.includes('whatsapp.com') || html.includes('api.whatsapp');
  if (!results.hasWA) {
    results.issues.push({
      icon: '💬',
      problem: 'No WhatsApp Button',
      impact: 'Mobile visitors cannot contact you instantly',
      service: 'Web Development',
      pitch: "You have no WhatsApp button — mobile visitors can't reach you with one tap"
    });
  }

  // ── LIVE CHAT ─────────────────────────────────────────────
  results.hasChat = html.includes('tawk.to') || html.includes('intercom') || html.includes('crisp.chat') || html.includes('zendesk') || html.includes('livechat') || html.includes('tidio');
  if (!results.hasChat && !results.hasWA) {
    results.issues.push({
      icon: '🤖',
      problem: 'No Live Chat',
      impact: 'Visitors leave without converting — no instant support',
      service: 'Web Development',
      pitch: null
    });
  }

  // ── CONTACT FORM ─────────────────────────────────────────
  results.hasForm = !!document.querySelector('form input[type="email"], form input[name*="email"], form input[name*="contact"]');
  if (!results.hasForm) {
    results.issues.push({
      icon: '📝',
      problem: 'No Contact Form',
      impact: 'Visitors cannot easily send inquiries',
      service: 'Web Development',
      pitch: null
    });
  }

  // ── SOCIAL MEDIA LINKS ────────────────────────────────────
  results.hasSocial = html.includes('instagram.com') || html.includes('facebook.com') || html.includes('twitter.com') || html.includes('linkedin.com') || html.includes('tiktok.com');
  if (!results.hasSocial) {
    results.issues.push({
      icon: '📱',
      problem: 'No Social Media Links',
      impact: 'Missing audience building and social proof',
      service: 'Social Media Management',
      pitch: "Your website has no social media links — you're missing a huge audience-building opportunity"
    });
  }

  // ── GOOGLE MAPS ───────────────────────────────────────────
  results.hasMaps = html.includes('google.com/maps') || html.includes('maps.googleapis') || html.includes('maps.google');
  if (!results.hasMaps) {
    results.issues.push({
      icon: '📍',
      problem: 'No Google Maps Embed',
      impact: 'Local customers cannot find your location easily',
      service: 'Local SEO',
      pitch: null
    });
  }

  // ── SEO META TAGS ─────────────────────────────────────────
  const metaDesc   = document.querySelector('meta[name="description"]')?.content || '';
  const metaTitle  = document.querySelector('title')?.textContent || '';
  const hasH1      = !!document.querySelector('h1');
  const hasAltTags = [...document.querySelectorAll('img')].every(img => img.alt);
  results.hasSEO   = metaDesc.length > 50 && metaTitle.length > 10 && hasH1;

  if (!results.hasSEO) {
    results.issues.push({
      icon: '🔍',
      problem: 'Poor SEO Setup',
      impact: 'Not showing up on Google search results',
      service: 'SEO Optimization',
      pitch: "Your website is nearly invisible on Google — missing basic SEO setup"
    });
  }

  if (!hasAltTags) {
    results.issues.push({
      icon: '🖼️',
      problem: 'Images Missing Alt Text',
      impact: 'Hurting Google image search rankings',
      service: 'SEO Optimization',
      pitch: null
    });
  }

  // ── COPYRIGHT YEAR ────────────────────────────────────────
  const yearMatch = text.match(/©\s*(20\d{2})/);
  if (yearMatch) {
    results.copyrightYear = parseInt(yearMatch[1]);
    if (results.copyrightYear < new Date().getFullYear() - 1) {
      results.issues.push({
        icon: '📅',
        problem: 'Outdated Copyright Year (' + results.copyrightYear + ')',
        impact: 'Website looks abandoned and unmaintained',
        service: 'Web Development',
        pitch: "Your website still shows Copyright " + results.copyrightYear + " — it looks like an abandoned site"
      });
    }
  }

  // ── MOBILE VIEWPORT ──────────────────────────────────────
  const hasViewport = !!document.querySelector('meta[name="viewport"]');
  if (!hasViewport) {
    results.issues.push({
      icon: '📱',
      problem: 'Not Mobile Optimized',
      impact: '60%+ of visitors on mobile will have a broken experience',
      service: 'Web Development',
      pitch: "Your website is not mobile-friendly — over 60% of your visitors are on phones"
    });
  }

  // ── EXTRACT EMAILS ────────────────────────────────────────
  const emailMatches = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}/g) || [];
  results.emails = [...new Set(emailMatches.filter(e =>
    !e.includes('example') && !e.includes('sentry') &&
    !e.includes('@2x') && !e.includes('schema') &&
    !e.endsWith('.png') && !e.endsWith('.jpg') &&
    !e.includes('google') && !e.includes('w3.org')
  ))].slice(0, 3);

  // ── EXTRACT PHONES ────────────────────────────────────────
  const phoneMatches = text.match(/[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/g) || [];
  results.phones = [...new Set(phoneMatches)].slice(0, 2);

  // ── CALCULATE SCORE ───────────────────────────────────────
  // Lower score = more pain points = hotter lead for your agency
  const checks = [
    results.hasPixel, results.hasGA, results.hasSSL,
    results.hasWA, results.hasSocial, results.hasSEO,
    results.hasForm, results.hasMaps, hasViewport
  ];
  const passing = checks.filter(Boolean).length;
  results.score = Math.round((passing / checks.length) * 100);

  // ── GENERATE PERSONALIZED OPENER ─────────────────────────
  // Pick the most impactful issue and write a personalized line
  const pitchIssues = results.issues.filter(i => i.pitch);

  if (pitchIssues.length === 0) {
    results.opener = "I checked out " + results.businessName + " and noticed a few quick wins that could bring in more leads.";
  } else if (pitchIssues.length === 1) {
    results.opener = pitchIssues[0].pitch + " — I can fix that for you.";
  } else {
    // Combine top 2 most impactful issues
    const top = pitchIssues.slice(0, 2);
    results.opener = top[0].pitch + ", and " + top[1].pitch.charAt(0).toLowerCase() + top[1].pitch.slice(1) + ".";
  }

  return results;
})();
