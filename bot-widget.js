/* DHDO website assistant — public marketing site.
   Self-contained, no dependencies. Included before </body> on every public page.

   Talks to the dhdo-site-bot edge function (grounded corpus, deflects when unsure).

   ── TWO THINGS THAT LOOK LIKE OMISSIONS AND ARE NOT ──────────────────────────────────
   1. IT POINTS AT dhdo-site-bot, NOT dhdo-bot. dhdo-bot is the PORTAL assistant now: its
      origins are locked to portal.dhdoscan.com and its corpus is written for signed-in
      customers who have already bought. Pointing this widget there fails CORS on every
      message, and would answer a stranger's pricing question with portal navigation.
   2. THERE IS NO LEAD FORM. The earlier draft of this file POSTed name/email/phone straight
      to the scan_requests table with the public anon key. Two things were wrong with that.
      It bypassed the Turnstile check every other form on this site routes through. And it
      could never have worked: scan_requests grants INSERT to `authenticated` only, so RLS
      rejects an anon write — every visitor who filled it in would have been told "I couldn't
      send that just now" while their details went nowhere. It also re-introduced the intake
      form the site retired. Book a Scan is the single front door and booking happens on a
      phone call, so the handoff below is a call button and a link to /book-a-scan. Do not
      add a form back. */
(function () {
  'use strict';

  var ENDPOINT = 'https://rpzvtfvgeqqivuykzaft.supabase.co/functions/v1/dhdo-site-bot';
  // Supabase anon key — publishable by design, and this is a public page. It is NOT a secret.
  // It grants nothing on its own: site_bot_messages has RLS on with no policies, so this key
  // can neither read nor write it. Only the edge function's service role touches that table.
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwenZ0ZnZnZXFxaXZ1eWt6YWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzU5MzEsImV4cCI6MjA5NjQ1MTkzMX0.0Gu4pwMyYj2DKciIamu1l36Gl63Ya9Vt-stLXgJH6hI';

  var PHONE_TEXT = '(337) 415-1951';
  var PHONE_HREF = 'tel:+13374151951';
  var GREETING = "Hi — I'm the DHDO assistant. Ask me about packages and pricing, what's included, "
    + "how a scan works, or whether we cover your area.";
  var DISCLAIMER = "Automated answers. For anything you're relying on, call " + PHONE_TEXT + ".";

  var STARTERS = [
    'What does a scan cost?',
    "What's included?",
    'Do you cover my area?',
    'How long does it take?'
  ];

  // Only these paths become links when the assistant mentions them. An allowlist, not a
  // pattern — the model must never be able to render an arbitrary URL into this page.
  var LINKABLE = {
    '/pricing': 'Pricing', '/faq': 'FAQ', '/book-a-scan': 'Book a Scan',
    '/home-documentation': 'Home Documentation', '/insurance-professionals': 'Insurance Professionals',
    '/hurricane': 'Hurricane Prep', '/estate-planning': 'Estate Planning',
    '/real-estate': 'Real Estate', '/lake-charles': 'Lake Charles', '/lafayette': 'Lafayette',
    '/about': 'About', '/privacy': 'Privacy'
  };

  var sid = null;
  try {
    sid = localStorage.getItem('dhdo_bot_sid');
    if (!sid) {
      sid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
        : ('s' + Date.now() + Math.random().toString(36).slice(2));
      localStorage.setItem('dhdo_bot_sid', sid);
    }
  } catch (e) {
    // Safari private mode throws on localStorage. Fall back to a per-page id.
    sid = 's' + Date.now() + Math.random().toString(36).slice(2);
  }

  var messages = [];
  var busy = false;
  var greeted = false;
  var lastFocus = null;

  var css = document.createElement('style');
  css.textContent = [
    '#dhdo-bot-btn,#dhdo-bot-panel,#dhdo-bot-panel *{box-sizing:border-box;font-family:Outfit,system-ui,-apple-system,Arial,sans-serif}',
    '#dhdo-bot-btn{position:fixed;bottom:20px;right:20px;width:58px;height:58px;border-radius:50%;',
    'background:#2E1A47;border:1.5px solid #C9A24E;color:#fff;cursor:pointer;',
    'box-shadow:0 6px 24px rgba(46,26,71,.35);z-index:2147483000;display:flex;align-items:center;justify-content:center;transition:transform .2s,background .2s}',
    '#dhdo-bot-btn:hover{transform:translateY(-2px);background:#3D2660}',
    '#dhdo-bot-btn:focus-visible{outline:2px solid #C9A24E;outline-offset:3px}',
    '#dhdo-bot-btn svg{width:25px;height:25px;pointer-events:none}',
    '#dhdo-bot-panel{position:fixed;bottom:88px;right:20px;width:374px;max-width:calc(100vw - 32px);',
    'height:540px;max-height:calc(100vh - 116px);background:#fff;border-radius:12px;',
    'box-shadow:0 16px 52px rgba(46,26,71,.32);z-index:2147483000;display:none;flex-direction:column;',
    'overflow:hidden;border:1px solid rgba(201,162,78,.32)}',
    '#dhdo-bot-panel.open{display:flex}',
    '#dhdo-bot-head{background:#2E1A47;color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex:none}',
    '#dhdo-bot-head b{font-family:"Cormorant Garamond",Georgia,serif;font-size:1.12rem;font-weight:600;letter-spacing:.04em;display:block}',
    '#dhdo-bot-head span{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#C9A24E;opacity:.85;display:block;margin-top:2px}',
    '#dhdo-bot-x{background:none;border:none;color:rgba(255,255,255,.7);font-size:24px;line-height:1;cursor:pointer;padding:0 2px}',
    '#dhdo-bot-x:hover{color:#C9A24E}',
    '#dhdo-bot-x:focus-visible{outline:2px solid #C9A24E;outline-offset:2px}',
    '#dhdo-bot-log{flex:1 1 auto;overflow-y:auto;padding:16px;background:#F8F4EE;min-height:0}',
    '.dhdo-msg{max-width:86%;padding:10px 13px;border-radius:12px;margin-bottom:10px;font-size:14px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}',
    '.dhdo-bot{background:#fff;color:#2B2B2B;border:1px solid #EDE7DD;border-bottom-left-radius:3px}',
    '.dhdo-bot a{color:#2E1A47;font-weight:600;text-decoration:underline;text-underline-offset:2px}',
    '.dhdo-me{background:#2E1A47;color:#fff;margin-left:auto;border-bottom-right-radius:3px}',
    '.dhdo-typing{color:#8a8377;font-size:13px;font-style:italic;margin-bottom:10px}',
    '.dhdo-note{font-size:11px;line-height:1.5;color:#8a8377;margin:0 0 12px;padding:0 2px}',
    '.dhdo-starters{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}',
    '.dhdo-starters button{background:#fff;border:1px solid rgba(201,162,78,.5);color:#2E1A47;',
    'border-radius:999px;padding:6px 12px;font-size:12px;cursor:pointer;transition:background .15s,border-color .15s}',
    '.dhdo-starters button:hover{background:#EDE7DD;border-color:#C9A24E}',
    '.dhdo-cta{display:flex;gap:8px;padding:10px 12px;background:#fff;border-top:1px solid #EDE7DD;flex:none}',
    '.dhdo-cta a{flex:1;text-align:center;font-size:11px;font-weight:600;letter-spacing:.1em;',
    'text-transform:uppercase;padding:9px 6px;border-radius:1px;text-decoration:none;transition:all .2s}',
    '.dhdo-cta .bk{background:#C9A24E;color:#2E1A47;border:1px solid #C9A24E}',
    '.dhdo-cta .bk:hover{background:#D9B56A;border-color:#D9B56A}',
    '.dhdo-cta .cl{color:#2E1A47;border:1px solid rgba(46,26,71,.25)}',
    '.dhdo-cta .cl:hover{border-color:#C9A24E;color:#C9A24E}',
    '#dhdo-bot-form{display:flex;gap:8px;padding:10px 12px 12px;border-top:1px solid #EDE7DD;background:#fff;flex:none}',
    '#dhdo-bot-input{flex:1;border:1px solid #d8d2c6;border-radius:8px;padding:9px 11px;font-size:16px;outline:none;min-width:0;color:#2B2B2B}',
    '#dhdo-bot-input:focus{border-color:#C9A24E}',
    '#dhdo-bot-send{background:#2E1A47;color:#fff;border:none;border-radius:8px;padding:0 15px;font-weight:600;cursor:pointer;font-size:13px}',
    '#dhdo-bot-send:hover:not(:disabled){background:#3D2660}',
    '#dhdo-bot-send:disabled{opacity:.45;cursor:default}',
    '.dhdo-foot{font-size:10px;color:#b3aca0;text-align:center;padding:0 10px 9px;background:#fff;flex:none}',
    // The cookie notice is fixed to the bottom of every page and shows on a first visit, exactly
    // where the launcher sits. The widget appends itself to <body> AFTER #cookie-note, so a general
    // sibling selector lifts the launcher clear while the notice is up and drops it back the moment
    // "Got it" removes .show — no JS, no measuring, and a no-op on any page without the notice.
    // Only the launcher needs lifting: the open panel already sits at bottom:88px, clear of the
    // ~65px notice, and on phones it goes fullscreen over the top of it. Note the sibling rule
    // outranks the plain #dhdo-bot-btn offsets on specificity, so the phone override below must
    // match its shape rather than rely on source order.
    '#cookie-note.show ~ #dhdo-bot-btn{bottom:96px}',
    '@media (max-width:620px){#cookie-note.show ~ #dhdo-bot-btn{bottom:180px}}',
    // Phone: take the panel near-fullscreen so the keyboard does not bury the input.
    '@media (max-width:520px){',
    '#dhdo-bot-panel{bottom:0;right:0;left:0;width:100%;max-width:100%;height:100dvh;max-height:100dvh;border-radius:0;border:none}',
    '#dhdo-bot-btn{bottom:16px;right:16px}',
    '}',
    '@media (prefers-reduced-motion:reduce){#dhdo-bot-btn,.dhdo-cta a,.dhdo-starters button{transition:none}#dhdo-bot-btn:hover{transform:none}}'
  ].join('');
  document.head.appendChild(css);

  var btn = document.createElement('button');
  btn.id = 'dhdo-bot-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Open the DHDO chat assistant');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'dhdo-bot-panel');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#C9A24E" stroke-width="1.8" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z"/></svg>';
  document.body.appendChild(btn);

  var panel = document.createElement('div');
  panel.id = 'dhdo-bot-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'false');
  panel.setAttribute('aria-label', 'DHDO chat assistant');
  panel.innerHTML =
    '<div id="dhdo-bot-head"><div><b>DHDO Assistant</b><span>Digital Home Documentation</span></div>'
    + '<button id="dhdo-bot-x" type="button" aria-label="Close chat">&times;</button></div>'
    + '<div id="dhdo-bot-log" role="log" aria-live="polite" aria-atomic="false"></div>'
    + '<div class="dhdo-cta">'
    + '<a class="bk" href="/book-a-scan">Book a Scan</a>'
    + '<a class="cl" href="' + PHONE_HREF + '">Call ' + PHONE_TEXT + '</a></div>'
    + '<form id="dhdo-bot-form"><label for="dhdo-bot-input" class="dhdo-sr" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap">Your question</label>'
    + '<input id="dhdo-bot-input" placeholder="Ask a question…" autocomplete="off" maxlength="2000" />'
    + '<button id="dhdo-bot-send" type="submit">Send</button></form>'
    + '<div class="dhdo-foot">DHDO &middot; ' + PHONE_TEXT + '</div>';
  document.body.appendChild(panel);

  var log = panel.querySelector('#dhdo-bot-log');
  var form = panel.querySelector('#dhdo-bot-form');
  var input = panel.querySelector('#dhdo-bot-input');
  var sendBtn = panel.querySelector('#dhdo-bot-send');

  function scroll() { log.scrollTop = log.scrollHeight; }

  /* Renders assistant text. Never innerHTML — every fragment goes in as a text node, and the
     only elements created are anchors whose href comes from the LINKABLE allowlist or the
     hard-coded phone number. Model output can therefore never inject markup. */
  function render(target, text) {
    /* The model answers in light markdown — "**(337) 415-1951**", "* Basic — $350". Bubbles are
       built from text nodes, so those markers rendered as literal asterisks on the page. Strip the
       emphasis and turn list markers into real bullets. Deliberately NOT a markdown parser: the
       output still goes in as text nodes, so this cannot introduce markup. */
    var clean = String(text)
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/(^|\n)\s*[*-]\s+/g, '$1• ')
      .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s.,;:!?)]|$)/g, '$1$2');
    var parts = clean.split(/(\/[a-z0-9-]+|\(337\)\s?415-1951)/g);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (!p) continue;
      if (Object.prototype.hasOwnProperty.call(LINKABLE, p)) {
        var a = document.createElement('a');
        a.href = p;
        a.textContent = LINKABLE[p];
        target.appendChild(a);
      } else if (/^\(337\)\s?415-1951$/.test(p)) {
        var t = document.createElement('a');
        t.href = PHONE_HREF;
        t.textContent = PHONE_TEXT;
        target.appendChild(t);
      } else {
        target.appendChild(document.createTextNode(p));
      }
    }
  }

  function bubble(role, text) {
    var div = document.createElement('div');
    div.className = 'dhdo-msg ' + (role === 'user' ? 'dhdo-me' : 'dhdo-bot');
    if (role === 'user') div.textContent = text; else render(div, text);
    log.appendChild(div);
    scroll();
    return div;
  }

  function showStarters() {
    var wrap = document.createElement('div');
    wrap.className = 'dhdo-starters';
    STARTERS.forEach(function (q) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = q;
      b.addEventListener('click', function () { wrap.remove(); send(q); });
      wrap.appendChild(b);
    });
    log.appendChild(wrap);
    scroll();
  }

  function openPanel() {
    lastFocus = document.activeElement;
    panel.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Close the DHDO chat assistant');
    if (!greeted) {
      greeted = true;
      bubble('assistant', GREETING);
      var note = document.createElement('p');
      note.className = 'dhdo-note';
      note.textContent = DISCLAIMER;
      log.appendChild(note);
      showStarters();
    }
    input.focus();
  }

  function closePanel() {
    panel.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open the DHDO chat assistant');
    if (lastFocus && lastFocus.focus) lastFocus.focus(); else btn.focus();
  }

  /* Keep the launcher clear of the cookie notice.
     The CSS sibling rules above handle this without JS, but they have to guess the notice's
     height, and that height changes with how the copy wraps — at 375px it wraps to 183px and a
     guessed offset clipped it by 3px. So measure the real element instead and let the inline
     style win, with the CSS rules left in as the fallback. A ResizeObserver keeps it correct
     through rotation and resize; dismissing the notice clears the offset. */
  (function trackCookieNote() {
    var note = document.getElementById('cookie-note');
    if (!note) return;
    function sync() {
      if (note.classList.contains('show') && note.offsetHeight) {
        btn.style.bottom = (note.offsetHeight + 16) + 'px';
      } else {
        btn.style.bottom = '';
      }
    }
    sync();
    if (window.ResizeObserver) new ResizeObserver(sync).observe(note);
    if (window.MutationObserver) {
      new MutationObserver(sync).observe(note, { attributes: true, attributeFilter: ['class', 'style'] });
    }
    window.addEventListener('resize', sync);
  })();

  btn.addEventListener('click', function () {
    panel.classList.contains('open') ? closePanel() : openPanel();
  });
  panel.querySelector('#dhdo-bot-x').addEventListener('click', closePanel);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('open')) closePanel();
  });

  function send(text) {
    if (busy) return;
    busy = true;
    bubble('user', text);
    messages.push({ role: 'user', content: text });
    input.value = '';
    sendBtn.disabled = true;

    var typing = document.createElement('div');
    typing.className = 'dhdo-typing';
    typing.textContent = 'DHDO is typing…';
    log.appendChild(typing);
    scroll();

    var done = false;
    /* Sits just above the edge function's own 20s upstream cap, so in normal failure the SERVER
       answers first with a proper message and this never fires. At 45s it was firing before the
       server gave up — the visitor saw "taking longer than it should" while a perfectly good
       answer arrived seconds later and was thrown away. */
    var killer = setTimeout(function () {
      if (done) return;
      done = true;
      typing.remove();
      busy = false; sendBtn.disabled = false;
      bubble('assistant', "That's taking longer than it should — please call " + PHONE_TEXT + ".");
    }, 27000);

    fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        apikey: ANON,
        Authorization: 'Bearer ' + ANON,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ session_id: sid, surface: 'marketing', messages: messages.slice(-12) })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (done) return;
      done = true; clearTimeout(killer);
      typing.remove();
      busy = false; sendBtn.disabled = false;
      var replyText = (d && d.reply) || ('Please call us at ' + PHONE_TEXT + '.');
      bubble('assistant', replyText);
      messages.push({ role: 'assistant', content: replyText });
      input.focus();
    }).catch(function () {
      if (done) return;
      done = true; clearTimeout(killer);
      typing.remove();
      busy = false; sendBtn.disabled = false;
      bubble('assistant', "I'm having trouble connecting — please call " + PHONE_TEXT + ".");
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = input.value.trim();
    if (v) send(v);
  });
})();
