// ============================================================
// OMA Lead Engine v9 — auditor.js
// Runs silently on a website. Detects every digital marketing
// problem, missing tool, pain point, and tech stack.
// ============================================================

(function () {
  const results = {
    url:           window.location.href,
    title:         document.title,
    issues:        [],
    score:         0,       // 0-100 (lower = more pain = hotter lead)
    opener:        '',      // personalized email opening line
    emails:        [],
    phones:        [],
    techStack:     '',      // WordPress, Shopify, Wix, etc.
    techStacks:    [],      // all detected stacks
    hasPixel:      false,
    hasGA:         false,
    hasGTM:        false,
    hasChat:       false,
    hasSocial:     false,
    hasSSL:        false,
    hasWA:         false,
    hasMaps:       false,
    hasForm:       false,
    hasSEO:        false,
    hasMobile:     false,
    hasSchemaOrg:  false,
    hasReviews:    false,
    hasCookieBanner: false,
    pageSpeed:     null,
    copyrightYear: null,
    businessName:  '',
    loadTime:      null,
    imageCount:    0,
    unoptimizedImages: 0,
    socialLinks:   {}
  };

  const html = document.documentElement.innerHTML;
  const text = document.body.innerText || '';
  const url  = window.location.href;
  const host = window.location.hostname.replace('www.', '');

  // ── LOAD TIME ─────────────────────────────────────────────
  try {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) results.loadTime = Math.round(nav.loadEventEnd - nav.startTime);
  } catch(e) {}

  // ── BUSINESS NAME ─────────────────────────────────────────
  const ogName = document.querySelector('meta[property="og:site_name"]')?.content;
  const h1Text = document.querySelector('h1')?.innerText?.slice(0, 50);
  results.businessName = ogName || document.title.split(/[|\-–]/)[0].trim() || host;

  // ── SSL ───────────────────────────────────────────────────
  results.hasSSL = url.startsWith('https://');
  if (!results.hasSSL) {
    results.issues.push({
      icon: '🔓', problem: 'No SSL Certificate',
      impact: 'Visitors see "Not Secure" — losing customers immediately',
      service: 'Web Development',
      pitch: 'Your website shows a "Not Secure" warning to every visitor'
    });
  }

  // ── SLOW WEBSITE ──────────────────────────────────────────
  if (results.loadTime && results.loadTime > 4000) {
    results.issues.push({
      icon: '🐌', problem: 'Slow Website (' + Math.round(results.loadTime / 1000) + 's load)',
      impact: '53% of mobile users abandon pages that take >3s to load',
      service: 'Web Development / Speed Optimization',
      pitch: 'Your website takes ' + Math.round(results.loadTime / 1000) + ' seconds to load — you\'re losing over half your mobile visitors'
    });
  }

  // ── FACEBOOK / META PIXEL ─────────────────────────────────
  results.hasPixel = html.includes('fbq(') || html.includes('facebook.net/en_US/fbevents') ||
                     html.includes('connect.facebook.net') || html.includes('meta-pixel');
  if (!results.hasPixel) {
    results.issues.push({
      icon: '📉', problem: 'No Facebook / Meta Pixel',
      impact: 'Cannot run retargeting ads or track conversions',
      service: 'Meta Ads Management',
      pitch: "You have no Facebook Pixel — you're leaving retargeting money on the table"
    });
  }

  // ── GOOGLE ANALYTICS ──────────────────────────────────────
  results.hasGA = html.includes('gtag(') || html.includes('google-analytics.com') ||
                  html.includes('googletagmanager.com') || html.includes('UA-') || html.includes('G-');
  if (!results.hasGA) {
    results.issues.push({
      icon: '📊', problem: 'No Google Analytics',
      impact: 'No data on visitors, traffic sources, or conversions',
      service: 'Digital Marketing Setup',
      pitch: "You have no Google Analytics — you have no idea where your customers come from"
    });
  }

  // ── GOOGLE TAG MANAGER ────────────────────────────────────
  results.hasGTM = html.includes('googletagmanager.com/gtm.js');

  // ── WHATSAPP BUTTON ───────────────────────────────────────
  results.hasWA = html.includes('wa.me') || html.includes('whatsapp.com') || html.includes('api.whatsapp');
  if (!results.hasWA) {
    results.issues.push({
      icon: '💬', problem: 'No WhatsApp Button',
      impact: 'Mobile visitors cannot contact you instantly',
      service: 'Web Development',
      pitch: "You have no WhatsApp button — mobile visitors can't reach you with one tap"
    });
  }

  // ── LIVE CHAT ─────────────────────────────────────────────
  results.hasChat = html.includes('tawk.to') || html.includes('intercom') || html.includes('crisp.chat') ||
                    html.includes('zendesk') || html.includes('livechat') || html.includes('tidio') ||
                    html.includes('drift.com') || html.includes('hubspot.com/conversations');
  if (!results.hasChat && !results.hasWA) {
    results.issues.push({
      icon: '🤖', problem: 'No Live Chat',
      impact: 'Visitors leave without converting — no instant support',
      service: 'Web Development',
      pitch: null
    });
  }

  // ── CONTACT FORM ──────────────────────────────────────────
  results.hasForm = !!document.querySelector(
    'form input[type="email"], form input[name*="email"], form input[name*="contact"], form[action*="contact"]'
  );
  if (!results.hasForm) {
    results.issues.push({
      icon: '📝', problem: 'No Contact Form',
      impact: 'Visitors cannot send inquiries easily',
      service: 'Web Development',
      pitch: null
    });
  }

  // ── SOCIAL MEDIA LINKS ────────────────────────────────────
  results.hasSocial = html.includes('instagram.com') || html.includes('facebook.com') ||
                      html.includes('twitter.com') || html.includes('linkedin.com') || html.includes('tiktok.com');
  if (!results.hasSocial) {
    results.issues.push({
      icon: '📱', problem: 'No Social Media Links',
      impact: 'Missing audience building and social proof',
      service: 'Social Media Management',
      pitch: "Your website has no social media links — you're missing a huge audience-building opportunity"
    });
  }

  // ── EXTRACT SOCIAL LINKS ──────────────────────────────────
  const socialPatterns = {
    facebook:  /facebook\.com\/([^"'\s\/]+)/,
    instagram: /instagram\.com\/([^"'\s\/]+)/,
    linkedin:  /linkedin\.com\/(?:company|in)\/([^"'\s\/]+)/,
    twitter:   /(?:twitter|x)\.com\/([^"'\s\/]+)/,
    tiktok:    /tiktok\.com\/@([^"'\s\/]+)/
  };
  Object.entries(socialPatterns).forEach(([pl, re]) => {
    const m = html.match(re);
    if (m && m[1] !== 'share' && m[1] !== 'sharer') results.socialLinks[pl] = 'https://' + pl + '.com/' + m[1];
  });

  // ── GOOGLE MAPS EMBED ─────────────────────────────────────
  results.hasMaps = html.includes('google.com/maps') || html.includes('maps.googleapis') || html.includes('maps.google');
  if (!results.hasMaps) {
    results.issues.push({
      icon: '📍', problem: 'No Google Maps Embed',
      impact: 'Local customers cannot find your location easily',
      service: 'Local SEO',
      pitch: null
    });
  }

  // ── SEO BASICS ────────────────────────────────────────────
  const metaDesc  = document.querySelector('meta[name="description"]')?.content || '';
  const metaTitle = document.querySelector('title')?.textContent || '';
  const hasH1     = !!document.querySelector('h1');
  results.hasSEO  = metaDesc.length > 50 && metaTitle.length > 10 && hasH1;
  if (!results.hasSEO) {
    results.issues.push({
      icon: '🔍', problem: 'Poor SEO Setup',
      impact: 'Not showing up on Google search results',
      service: 'SEO Optimization',
      pitch: "Your website is nearly invisible on Google — missing basic SEO setup"
    });
  }

  // ── IMAGES ALT TEXT ───────────────────────────────────────
  const imgs    = [...document.querySelectorAll('img')];
  const noAlt   = imgs.filter(img => !img.alt || img.alt.trim() === '');
  results.imageCount        = imgs.length;
  results.unoptimizedImages = noAlt.length;
  if (noAlt.length > 2) {
    results.issues.push({
      icon: '🖼️', problem: `${noAlt.length} Images Missing Alt Text`,
      impact: 'Hurting Google image search rankings',
      service: 'SEO Optimization',
      pitch: null
    });
  }

  // ── SCHEMA.ORG ────────────────────────────────────────────
  results.hasSchemaOrg = html.includes('schema.org') || html.includes('application/ld+json');
  if (!results.hasSchemaOrg) {
    results.issues.push({
      icon: '🏷️', problem: 'No Schema Markup',
      impact: 'Missing rich results in Google (stars, hours, prices)',
      service: 'SEO Optimization',
      pitch: null
    });
  }

  // ── MOBILE VIEWPORT ───────────────────────────────────────
  results.hasMobile = !!document.querySelector('meta[name="viewport"]');
  if (!results.hasMobile) {
    results.issues.push({
      icon: '📱', problem: 'Not Mobile Optimized',
      impact: '60%+ of visitors on mobile will have a broken experience',
      service: 'Web Development',
      pitch: "Your website is not mobile-friendly — over 60% of your visitors are on phones"
    });
  }

  // ── COPYRIGHT YEAR ────────────────────────────────────────
  const yearMatch = text.match(/©\s*(20\d{2})/);
  if (yearMatch) {
    results.copyrightYear = parseInt(yearMatch[1]);
    if (results.copyrightYear < new Date().getFullYear() - 1) {
      results.issues.push({
        icon: '📅', problem: 'Outdated Copyright (' + results.copyrightYear + ')',
        impact: 'Website looks abandoned and unmaintained',
        service: 'Web Development',
        pitch: "Your website still shows Copyright " + results.copyrightYear + " — it looks like an abandoned site"
      });
    }
  }

  // ── REVIEWS / TESTIMONIALS ────────────────────────────────
  results.hasReviews = html.includes('google.com/maps') || html.includes('trustpilot') ||
                       html.includes('testimonial') || html.includes('review') ||
                       !!document.querySelector('[class*="review"], [class*="testimonial"], [id*="review"]');
  if (!results.hasReviews) {
    results.issues.push({
      icon: '⭐', problem: 'No Reviews / Testimonials',
      impact: 'Low trust — visitors don\'t convert without social proof',
      service: 'Reputation Management',
      pitch: "Your website has no testimonials or reviews — visitors don't trust you enough to reach out"
    });
  }

  // ── COOKIE CONSENT ────────────────────────────────────────
  results.hasCookieBanner = html.includes('cookie') || html.includes('gdpr') || html.includes('cookieconsent');

  // ── TECH STACK DETECTION ──────────────────────────────────
  const h = html.toLowerCase();
  const stackChecks = [
    { name: 'Shopify',     check: h.includes('shopify.com') || h.includes('cdn.shopify') },
    { name: 'WordPress',   check: h.includes('wp-content') || h.includes('wp-includes') },
    { name: 'Squarespace', check: h.includes('squarespace.com') || h.includes('static1.squarespace') },
    { name: 'Wix',         check: h.includes('wix.com') || h.includes('wixstatic.com') },
    { name: 'Webflow',     check: h.includes('webflow.com') || h.includes('webflow.io') },
    { name: 'Framer',      check: h.includes('framerusercontent') || h.includes('framer.com') },
    { name: 'GoDaddy',     check: h.includes('godaddy.com') },
    { name: 'BigCommerce', check: h.includes('bigcommerce.com') },
    { name: 'Weebly',      check: h.includes('weebly.com') },
    { name: 'HubSpot',     check: h.includes('hubspot.com') || h.includes('hs-scripts.com') },
  ];
  results.techStacks = stackChecks.filter(s => s.check).map(s => s.name);
  results.techStack  = results.techStacks[0] || '';

  // Add tech-stack-specific issues
  if (results.techStack === 'Wix' || results.techStack === 'GoDaddy' || results.techStack === 'Weebly') {
    results.issues.push({
      icon: '🔧', problem: `Built on ${results.techStack} (Limited & Slow)`,
      impact: 'Poor SEO performance, slow load times, no custom features',
      service: 'Web Development',
      pitch: `Your website is built on ${results.techStack} — it's slow, hard to rank on Google, and limits your growth`
    });
  }

  // ── EXTRACT EMAILS & PHONES ───────────────────────────────
  const emailMatches = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}/g) || [];
  results.emails = [...new Set(emailMatches.filter(e =>
    !e.includes('example') && !e.includes('sentry') && !e.includes('@2x') &&
    !e.endsWith('.png') && !e.includes('google') && !e.includes('w3.org') && !e.includes('schema')
  ))].slice(0, 3);

  const phoneMatches = text.match(/[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/g) || [];
  results.phones = [...new Set(phoneMatches)].slice(0, 2);

  // ── SCORE CALCULATION ─────────────────────────────────────
  // Lower score = more pain points = hotter lead
  const checks = [
    results.hasPixel, results.hasGA,     results.hasSSL,
    results.hasWA,    results.hasSocial, results.hasSEO,
    results.hasForm,  results.hasMaps,   results.hasMobile,
    results.hasSchemaOrg, results.hasReviews,
    !results.loadTime || results.loadTime < 4000
  ];
  const passing  = checks.filter(Boolean).length;
  results.score  = Math.round((passing / checks.length) * 100);

  // ── PERSONALIZED OPENER ───────────────────────────────────
  const pitchIssues = results.issues.filter(i => i.pitch);
  if (pitchIssues.length === 0) {
    results.opener = "I checked out " + results.businessName + " and found a few quick wins that could bring in more leads.";
  } else if (pitchIssues.length === 1) {
    results.opener = pitchIssues[0].pitch + " — I can fix that for you.";
  } else {
    const top = pitchIssues.slice(0, 2);
    results.opener = top[0].pitch + ", and " + top[1].pitch.charAt(0).toLowerCase() + top[1].pitch.slice(1) + ".";
  }

  return results;
})();
