'use strict';
// Visit statistics with Umami Cloud (https://umami.is): no cookies, no personal
// data, so no consent banner is needed. Paste the website ID from the Umami
// dashboard below; while it is empty nothing is loaded or sent. Visits are only
// counted on squadraw.com, never on local copies or test hosts.
const UMAMI_WEBSITE_ID='';
const UMAMI_SCRIPT='https://cloud.umami.is/script.js';
if(UMAMI_WEBSITE_ID&&location.hostname==='squadraw.com'){
  const script=document.createElement('script');
  script.defer=true;script.src=UMAMI_SCRIPT;
  script.dataset.websiteId=UMAMI_WEBSITE_ID;script.dataset.domains='squadraw.com';
  document.head.append(script);
}
// Custom events (export, backup, sport, language). Lineup content and player names are never sent.
function track(name,data){try{if(window.umami&&typeof window.umami.track==='function')window.umami.track(name,data);}catch(error){/* Statistics never break the site. */}}
