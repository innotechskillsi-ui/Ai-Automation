// ============================================================
// OMA Lead Engine v9 — templates.js
// 7 niches × 3 email types = 21 personalized templates
// Each template uses {{placeholders}} filled by fillTemplate()
// ============================================================

const EMAIL_TEMPLATES = {

  realestate: {
    label: '🏠 Real Estate',
    cold: {
      subject: "Quick question about {{company}}'s online leads",
      body: `Hi {{firstName}},

I came across {{company}} while researching real estate agents in your area.

{{opener}}

Most agents we work with were losing leads to competitors with stronger digital presence. We fixed that with targeted Meta ads + a high-converting landing page — typically 8-15 new buyer/seller inquiries per month.

Worth a quick 15-min call this week?
{{bookingLink}}

Best,
{{senderName}}
{{agencyName}}`
    },
    followup1: {
      subject: "Re: {{company}} — one thing I noticed",
      body: `Hi {{firstName}},

Just following up on my last message.

I noticed: {{painPoint}}. This is likely costing you leads every day.

I'd love to show you a quick fix — 15 mins max.

{{bookingLink}}

Best,
{{senderName}}`
    },
    followup2: {
      subject: "Last one from me, {{firstName}}",
      body: `Hi {{firstName}},

I won't keep emailing — just wanted to share that we helped a similar real estate agent in your market go from 3 to 19 inquiries/month in 6 weeks.

If the timing is ever right: {{bookingLink}}

Wishing {{company}} all the best!

{{senderName}}`
    }
  },

  ecommerce: {
    label: '🛒 E-Commerce',
    cold: {
      subject: "{{company}} — I found a revenue leak",
      body: `Hi {{firstName}},

I checked {{company}}'s website and noticed something important:

{{opener}}

E-commerce stores typically lose 40-60% of cart value from poor retargeting. A properly set up Meta Pixel + retargeting campaign recovers $3-5 for every $1 spent.

15-min call to show you the numbers?
{{bookingLink}}

Best,
{{senderName}}
{{agencyName}}`
    },
    followup1: {
      subject: "Re: {{company}} — abandoned cart revenue",
      body: `Hi {{firstName}},

Quick follow-up — did you get my last email?

Specifically: {{painPoint}}

Fixing this for a client last month recovered $4,200 in month one alone.

Worth 15 minutes?
{{bookingLink}}

{{senderName}}`
    },
    followup2: {
      subject: "Last message, {{firstName}}",
      body: `Hi {{firstName}},

Final follow-up. If you ever want to see how much revenue {{company}} is leaving on the table — I'm here.

{{bookingLink}}

All the best,
{{senderName}}`
    }
  },

  restaurant: {
    label: '🍽️ Restaurant',
    cold: {
      subject: "More bookings for {{company}}?",
      body: `Hi {{firstName}},

I found {{company}} while researching restaurants in your area.

{{opener}}

Restaurants we work with see 30-50 new table bookings/month from targeted local Facebook & Instagram ads — specifically reaching people searching for food near them.

Quick 15-min chat this week?
{{bookingLink}}

Best,
{{senderName}}
{{agencyName}}`
    },
    followup1: {
      subject: "Re: {{company}} — local ads follow-up",
      body: `Hi {{firstName}},

Following up — I noticed {{painPoint}}.

We run location-targeted ads for restaurants and typically fill tables on slow weeknights within 2 weeks.

Interested?
{{bookingLink}}

{{senderName}}`
    },
    followup2: {
      subject: "Last one, {{firstName}}",
      body: `Hi {{firstName}},

Last message from me. Whenever you want more bookings:

{{bookingLink}}

Wishing {{company}} a full house!

{{senderName}}`
    }
  },

  fitness: {
    label: '💪 Fitness / Gym',
    cold: {
      subject: "More members for {{company}}",
      body: `Hi {{firstName}},

I came across {{company}} and noticed an opportunity.

{{opener}}

Fitness businesses we work with gain 15-30 new members/month with targeted Meta ads and a high-converting landing page. One gym added 65 new members in 60 days.

15-min call this week?
{{bookingLink}}

Best,
{{senderName}}
{{agencyName}}`
    },
    followup1: {
      subject: "Re: {{company}} — member acquisition",
      body: `Hi {{firstName}},

Just following up. {{painPoint}}

We helped a gym close to you go from 120 to 185 active members in 60 days.

Quick call?
{{bookingLink}}

{{senderName}}`
    },
    followup2: {
      subject: "Final follow-up, {{firstName}}",
      body: `Hi {{firstName}},

Won't bother you again — but if {{company}} ever wants to grow membership:

{{bookingLink}}

All the best,
{{senderName}}`
    }
  },

  legal: {
    label: '⚖️ Legal / Law Firm',
    cold: {
      subject: "More clients for {{company}}?",
      body: `Hi {{firstName}},

I found {{company}} online and noticed something that may be costing you clients.

{{opener}}

Law firms we work with see 10-20 new qualified leads/month from Google search ads + local SEO — people actively searching for legal help right now.

Brief 15-min call to explore?
{{bookingLink}}

Best,
{{senderName}}
{{agencyName}}`
    },
    followup1: {
      subject: "Re: {{company}} — client acquisition",
      body: `Hi {{firstName}},

Following up briefly. {{painPoint}}

We specialize in legal marketing and understand the compliance requirements fully.

Worth a quick call?
{{bookingLink}}

{{senderName}}`
    },
    followup2: {
      subject: "Last message, {{firstName}}",
      body: `Hi {{firstName}},

Last one from me. Whenever you're looking to grow {{company}}'s client base:

{{bookingLink}}

Best wishes,
{{senderName}}`
    }
  },

  healthcare: {
    label: '🏥 Healthcare',
    cold: {
      subject: "More patients for {{company}}",
      body: `Hi {{firstName}},

I was looking at {{company}}'s online presence and found an opportunity worth sharing.

{{opener}}

Healthcare practices we work with see 20-40 new patient inquiries/month from Google ads + local SEO. All campaigns are fully HIPAA-compliant.

15-min call this week?
{{bookingLink}}

Best,
{{senderName}}
{{agencyName}}`
    },
    followup1: {
      subject: "Re: {{company}} — patient acquisition",
      body: `Hi {{firstName}},

Following up on my previous email. {{painPoint}}

We specialize in HIPAA-compliant healthcare marketing campaigns.

Quick chat?
{{bookingLink}}

{{senderName}}`
    },
    followup2: {
      subject: "Last follow-up, {{firstName}}",
      body: `Hi {{firstName}},

Last message. Whenever {{company}} is looking to grow:

{{bookingLink}}

Best,
{{senderName}}`
    }
  },

  startup: {
    label: '🚀 Startup / Business',
    cold: {
      subject: "Quick question about {{company}}'s growth",
      body: `Hi {{firstName}},

I came across {{company}} and had a quick question.

{{opener}}

Businesses we work with see 3-5x ROI in the first 90 days by setting up the right growth channels — Meta ads, Google ads, and content working together.

15-min call to explore?
{{bookingLink}}

Best,
{{senderName}}
{{agencyName}}`
    },
    followup1: {
      subject: "Re: {{company}} — growth strategy",
      body: `Hi {{firstName}},

Following up. {{painPoint}}

Would love to share what's working for similar businesses right now.

Quick call?
{{bookingLink}}

{{senderName}}`
    },
    followup2: {
      subject: "Last one, {{firstName}}",
      body: `Hi {{firstName}},

Final follow-up. Good luck with {{company}} — whenever you're ready to scale:

{{bookingLink}}

{{senderName}}`
    }
  },

  agency: {
    label: '📣 Agency / Consultant',
    cold: {
      subject: "Collaboration opportunity — {{company}}",
      body: `Hi {{firstName}},

I came across {{company}} and wanted to explore a potential partnership.

{{opener}}

We help agencies handle overflow work with white-label services (Meta ads, Google ads, SEO, web dev) at 60% lower cost than hiring in-house — no long-term commitments.

15-min call to explore?
{{bookingLink}}

Best,
{{senderName}}
{{agencyName}}`
    },
    followup1: {
      subject: "Re: {{company}} — partnership follow-up",
      body: `Hi {{firstName}},

Following up on my previous message. {{painPoint}}

Many agencies we work with add $5-15k/month in margin by white-labeling our services.

Worth a quick chat?
{{bookingLink}}

{{senderName}}`
    },
    followup2: {
      subject: "Final message, {{firstName}}",
      body: `Hi {{firstName}},

Last one from me. Whenever {{company}} needs extra capacity:

{{bookingLink}}

All the best,
{{senderName}}`
    }
  }
};

// ── TEMPLATE FILLER ───────────────────────────────────────
function fillTemplate(template, data) {
  const replace = str => str
    .replace(/\{\{firstName\}\}/g,    data.firstName   || 'there')
    .replace(/\{\{company\}\}/g,      data.company     || 'your business')
    .replace(/\{\{opener\}\}/g,       data.opener      || 'I noticed some opportunities on your website.')
    .replace(/\{\{painPoint\}\}/g,    data.painPoint   || 'your website has some issues worth fixing')
    .replace(/\{\{techStack\}\}/g,    data.techStack   || 'your current platform')
    .replace(/\{\{bookingLink\}\}/g,  data.bookingLink || 'https://wa.me/923710160513')
    .replace(/\{\{senderName\}\}/g,   data.senderName  || 'Uns')
    .replace(/\{\{agencyName\}\}/g,   data.agencyName  || 'Outreach Marketing Agency');
  return { subject: replace(template.subject), body: replace(template.body) };
}
