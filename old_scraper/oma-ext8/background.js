// OMA Lead Engine v8 — background.js
const LICENSE_SALT = "OMA-LEAD-ENGINE-2025-SECRET";
function generateKeyHash(e,p){const r=LICENSE_SALT+e.toLowerCase().trim()+p;let h=0;for(let i=0;i<r.length;i++){const c=r.charCodeAt(i);h=((h<<5)-h)+c;h=h&h;}const x=Math.abs(h).toString(16).toUpperCase().padStart(8,'0');return'OMA-'+x.slice(0,4)+'-'+x.slice(4,8);}
function validateLicense(k,e){if(!k||!e)return false;return k.trim().toUpperCase()===generateKeyHash(e,'PRO');}
function getCurrentMonth(){const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1);}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

function runInSilentTab(url,fn,timeout=8000){
  return new Promise(resolve=>{
    if(!url||url.startsWith('chrome://')){resolve(null);return;}
    chrome.tabs.create({url,active:false,pinned:false},tab=>{
      const id=tab.id;
      const cleanup=()=>{try{chrome.tabs.remove(id,()=>{});}catch(e){}};
      const L=(tid,info)=>{if(tid!==id||info.status!=='complete')return;chrome.tabs.onUpdated.removeListener(L);fn(id).then(r=>{cleanup();resolve(r);}).catch(()=>{cleanup();resolve(null);});};
      chrome.tabs.onUpdated.addListener(L);
      setTimeout(()=>{chrome.tabs.onUpdated.removeListener(L);cleanup();resolve(null);},timeout);
    });
  });
}

async function scrapeSilent(url){
  return runInSilentTab(url,async id=>{
    await sleep(1500);
    await new Promise(r=>chrome.scripting.executeScript({target:{tabId:id},func:()=>window.scrollTo(0,document.body.scrollHeight/2)},()=>r()));
    await sleep(800);
    await new Promise(r=>chrome.scripting.executeScript({target:{tabId:id},files:['content.js']},()=>r()));
    return new Promise(r=>chrome.tabs.sendMessage(id,{action:'scrape'},res=>r(res?.leads||[])));
  });
}

async function auditSilent(url){
  return runInSilentTab(url,async id=>{
    await sleep(2000);
    return new Promise(r=>chrome.scripting.executeScript({target:{tabId:id},files:['auditor.js']},res=>r(res?.[0]?.result||null)));
  },10000);
}

async function findContacts(websiteUrl){
  if(!websiteUrl||!websiteUrl.startsWith('http'))return{};
  const base=websiteUrl.replace(/\/$/,'');
  const paths=['/contact','/about','/team','/about-us','/contact-us'];
  let email='',phone='',ownerName='',social={};
  for(const path of paths.slice(0,3)){
    const r=await runInSilentTab(base+path,async id=>{
      await sleep(1500);
      return new Promise(r=>{chrome.scripting.executeScript({target:{tabId:id},files:['content.js']},()=>{chrome.tabs.sendMessage(id,{action:'scrapeContacts'},res=>r(res));});});
    },7000);
    if(r){if(!email&&r.emails?.length)email=r.emails[0];if(!phone&&r.phones?.length)phone=r.phones[0];if(!ownerName&&r.ownerName)ownerName=r.ownerName;if(r.social)social={...social,...r.social};if(email&&phone&&ownerName)break;}
    await sleep(300);
  }
  return{email,phone,ownerName,social};
}

async function reverseSearch(keyword,platform){
  const q=encodeURIComponent(keyword);
  const urls={google:`https://www.google.com/search?q="${q}"+(looking+for+OR+need+help)+(digital+marketing+OR+meta+ads+OR+marketing+agency)`,reddit:`https://www.google.com/search?q=site:reddit.com+"${q}"+"looking+for"+"marketing"`,linkedin:`https://www.google.com/search?q=site:linkedin.com+"${q}"+"looking+for"+"marketing"`};
  const leads=await scrapeSilent(urls[platform]||urls.google);
  return(leads||[]).map(l=>({...l,source:'Reverse Scraper — '+(platform||'google'),painPoint:'Actively looking for: '+keyword,intent:'HIGH'}));
}

function getBestSendTime(niche){
  const t={realestate:{day:0,hour:19,label:'Sunday 7pm'},ecommerce:{day:1,hour:9,label:'Monday 9am'},restaurant:{day:2,hour:10,label:'Tuesday 10am'},fitness:{day:1,hour:8,label:'Monday 8am'},agency:{day:2,hour:9,label:'Tuesday 9am'},startup:{day:2,hour:7,label:'Tuesday 7am'},legal:{day:3,hour:9,label:'Wednesday 9am'},healthcare:{day:2,hour:8,label:'Tuesday 8am'}};
  return t[niche]||{day:2,hour:9,label:'Tuesday 9am'};
}

function detectObjection(text){
  const t=(text||'').toLowerCase();
  if(t.match(/already have|currently (work|using)|someone else|our (own|in.?house|team)/))return'has_agency';
  if(t.match(/not interested|no thank|don.?t need|unsubscribe|remove/))return'not_interested';
  if(t.match(/too expensive|can.?t afford|budget|cost|price|how much/))return'price_objection';
  if(t.match(/send (more|info|details)|tell me more|interested|sounds good|curious/))return'wants_info';
  if(t.match(/call|schedule|meet|talk|discuss|available|when/))return'wants_call';
  if(t.match(/not (now|yet)|later|maybe|in (a few|some) (months|weeks)/))return'not_now';
  if(t.match(/who are you|how did you|where did/))return'how_found';
  return'generic_reply';
}

function generateReply(objection,leadData){
  const{firstName='there',company='your business'}=leadData||{};
  const book="https://wa.me/923710160513";
  const r={
    has_agency:{subject:'Re: Quick question',body:`Hi ${firstName},\n\nMost of our clients came to us while working with another agency. The difference is 2-week sprints — you see results fast, no long retainers.\n\nWorth a 10-min comparison call? ${book}\n\nBest,\nUns`},
    not_interested:{subject:'Re: Totally understand',body:`Hi ${firstName},\n\nNo problem at all. If things change, I'm here. Wishing ${company} all the best!\n\nBest,\nUns`},
    price_objection:{subject:'Re: About the investment',body:`Hi ${firstName},\n\nMost clients spend $300-800/month with us — less than US agencies charge for setup alone. Let me show you the ROI first: ${book}\n\nBest,\nUns`},
    wants_info:{subject:'Re: More details',body:`Hi ${firstName},\n\nWe specialize in Meta ads, Google ads, SEO and web dev. Pakistan-based = 60-70% lower cost than US agencies, same quality. Quick call? ${book}\n\nBest,\nUns`},
    wants_call:{subject:'Re: Let\'s connect',body:`Hi ${firstName},\n\nAbsolutely! Book here: ${book}\n\nI'll come prepared with specific ideas for ${company}.\n\nBest,\nUns`},
    not_now:{subject:'Re: No problem',body:`Hi ${firstName},\n\nI'll follow up in a month. Anytime sooner: ${book}\n\nWishing ${company} all the best!\n\nBest,\nUns`},
    how_found:{subject:'Re: How I found you',body:`Hi ${firstName},\n\nI came across ${company} while researching businesses in your area and noticed some opportunities. I'm Uns from Outreach Marketing Agency. Can I share what I found? ${book}\n\nBest,\nUns`},
    generic_reply:{subject:'Re: Thanks for getting back',body:`Hi ${firstName},\n\nThanks for replying! Quick 15-min call? ${book}\n\nBest,\nUns`},
  };
  return r[objection]||r.generic_reply;
}

chrome.runtime.onMessage.addListener((req,sender,res)=>{
  if(req.action==='saveLeads'){
    chrome.storage.local.get(['leads','usage'],d=>{
      const ex=d.leads||[],u=d.usage||{},m=getCurrentMonth();if(!u[m])u[m]=0;
      const keys=new Set(ex.map(l=>((l.email||'')+(l.company||'')).toLowerCase().replace(/\s/g,'')));
      const nl=req.leads.filter(l=>{const k=((l.email||'')+(l.company||'')).toLowerCase().replace(/\s/g,'');return k&&!keys.has(k);});
      const merged=[...ex,...nl];u[m]+=nl.length;
      chrome.storage.local.set({leads:merged,usage:u},()=>res({count:merged.length,added:nl.length,duplicates:req.leads.length-nl.length}));
    });return true;
  }
  if(req.action==='getLeads'){chrome.storage.local.get(['leads'],d=>res({leads:d.leads||[]}));return true;}
  if(req.action==='clearLeads'){chrome.storage.local.set({leads:[]},()=>res({ok:true}));return true;}
  if(req.action==='updateLead'){chrome.storage.local.get(['leads'],d=>{const l=d.leads||[];const i=l.findIndex(x=>x.id==req.lead.id);if(i!==-1)l[i]=req.lead;chrome.storage.local.set({leads:l},()=>res({ok:true}));});return true;}
  if(req.action==='deleteLead'){chrome.storage.local.get(['leads'],d=>{chrome.storage.local.set({leads:(d.leads||[]).filter(l=>l.id!=req.id)},()=>res({ok:true}));});return true;}
  if(req.action==='saveSettings'){chrome.storage.local.set({settings:req.settings},()=>res({ok:true}));return true;}
  if(req.action==='getSettings'){chrome.storage.local.get(['settings'],d=>res({settings:d.settings||{}}));return true;}
  if(req.action==='validateLicense'){const v=validateLicense(req.key,req.email);chrome.storage.local.set({licenseKey:req.key,licenseEmail:req.email,licenseValid:v},()=>res({valid:v}));return true;}
  if(req.action==='getLicense'){chrome.storage.local.get(['licenseKey','licenseEmail','licenseValid'],d=>res({key:d.licenseKey||'',email:d.licenseEmail||'',valid:d.licenseValid||false}));return true;}
  if(req.action==='checkLimit'){
    chrome.storage.local.get(['licenseValid','usage'],d=>{
      if(d.licenseValid){res({allowed:true,isPro:true,remaining:999999});return;}
      const u=d.usage||{},m=getCurrentMonth(),used=u[m]||0;
      res({allowed:used<50,isPro:false,remaining:Math.max(0,50-used),used,limit:50});
    });return true;
  }
  if(req.action==='auditWebsite'){auditSilent(req.url).then(r=>res({result:r}));return true;}
  if(req.action==='scrapeSilent'){scrapeSilent(req.url).then(l=>res({leads:l||[]}));return true;}
  if(req.action==='findContacts'){findContacts(req.url).then(r=>res(r));return true;}
  if(req.action==='reverseSearch'){reverseSearch(req.keyword,req.platform).then(l=>res({leads:l}));return true;}
  if(req.action==='getBestSendTime'){res(getBestSendTime(req.niche));return true;}
  if(req.action==='detectObjection'){const o=detectObjection(req.text);res({objection:o,response:generateReply(o,req.leadData||{})});return true;}
  if(req.action==='saveCRMDeal'){chrome.storage.local.get(['crmDeals'],d=>{const deals=d.crmDeals||[];const i=deals.findIndex(x=>x.id==req.deal.id);if(i!==-1)deals[i]=req.deal;else deals.push(req.deal);chrome.storage.local.set({crmDeals:deals},()=>res({ok:true}));});return true;}
  if(req.action==='getCRMDeals'){chrome.storage.local.get(['crmDeals'],d=>res({deals:d.crmDeals||[]}));return true;}
  if(req.action==='deleteCRMDeal'){chrome.storage.local.get(['crmDeals'],d=>{chrome.storage.local.set({crmDeals:(d.crmDeals||[]).filter(x=>x.id!=req.id)},()=>res({ok:true}));});return true;}
});
