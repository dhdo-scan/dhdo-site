/* DHDO support chat widget — marketing site.
   Self-contained. To activate: include <script defer src="/bot-widget.js"></script>
   before </body> on the pages you want it on. Talks to the dhdo-bot edge function
   (grounded, deflects when unsure). Lead handoff writes to scan_requests (ref_code=chatbot). */
(function () {
  var SB = 'https://rpzvtfvgeqqivuykzaft.supabase.co';
  var ENDPOINT = SB + '/functions/v1/dhdo-bot';
  var REST = SB + '/rest/v1/scan_requests';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwenZ0ZnZnZXFxaXZ1eWt6YWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzU5MzEsImV4cCI6MjA5NjQ1MTkzMX0.0Gu4pwMyYj2DKciIamu1l36Gl63Ya9Vt-stLXgJH6hI';
  var GREETING = "Hi! I'm the DHDO assistant. Ask me about our 3D documentation, packages, the process, or your area — or I can connect you with the team.";

  var sid = localStorage.getItem('dhdo_bot_sid');
  if (!sid) { sid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('s' + Date.now() + Math.random()); localStorage.setItem('dhdo_bot_sid', sid); }
  var messages = [];
  var leadShown = false;

  var css = document.createElement('style');
  css.textContent = [
    '#dhdo-bot,#dhdo-bot *{box-sizing:border-box;font-family:Outfit,system-ui,Arial,sans-serif}',
    '#dhdo-bot-btn{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;background:#2E1A47;border:2px solid #C9A24E;color:#fff;cursor:pointer;box-shadow:0 6px 24px rgba(46,26,71,.35);z-index:2147483000;display:flex;align-items:center;justify-content:center}',
    '#dhdo-bot-btn svg{width:26px;height:26px}',
    '#dhdo-bot-panel{position:fixed;bottom:90px;right:20px;width:370px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 120px);background:#fff;border-radius:14px;box-shadow:0 12px 48px rgba(46,26,71,.3);z-index:2147483000;display:none;flex-direction:column;overflow:hidden;border:1px solid rgba(201,162,78,.3)}',
    '#dhdo-bot-panel.open{display:flex}',
    '#dhdo-bot-head{background:#2E1A47;color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between}',
    '#dhdo-bot-head b{font-size:14px;font-weight:600}#dhdo-bot-head span{font-size:11px;color:rgba(255,255,255,.55);display:block}',
    '#dhdo-bot-head button{background:none;border:none;color:rgba(255,255,255,.7);font-size:22px;line-height:1;cursor:pointer}',
    '#dhdo-bot-log{flex:1;overflow-y:auto;padding:16px;background:#F8F4EE}',
    '.dhdo-msg{max-width:85%;padding:10px 13px;border-radius:12px;margin-bottom:10px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word}',
    '.dhdo-bot{background:#fff;color:#2B2B2B;border:1px solid #ece5d8;border-bottom-left-radius:3px}',
    '.dhdo-me{background:#2E1A47;color:#fff;margin-left:auto;border-bottom-right-radius:3px}',
    '.dhdo-typing{color:#999;font-size:13px;font-style:italic;margin-bottom:10px}',
    '#dhdo-bot-form{display:flex;gap:8px;padding:12px;border-top:1px solid #eee;background:#fff}',
    '#dhdo-bot-input{flex:1;border:1px solid #d8d2c6;border-radius:8px;padding:9px 11px;font-size:14px;outline:none;min-width:0}',
    '#dhdo-bot-input:focus{border-color:#C9A24E}',
    '#dhdo-bot-send{background:#C9A24E;color:#2E1A47;border:none;border-radius:8px;padding:0 16px;font-weight:700;cursor:pointer;font-size:13px}',
    '#dhdo-bot-send:disabled{opacity:.5;cursor:default}',
    '.dhdo-lead{background:#fff;border:1px solid #C9A24E;border-radius:12px;padding:12px;margin-bottom:10px}',
    '.dhdo-lead input{width:100%;border:1px solid #d8d2c6;border-radius:7px;padding:8px 10px;font-size:13px;margin-bottom:8px;outline:none}',
    '.dhdo-lead input:focus{border-color:#C9A24E}',
    '.dhdo-lead button{width:100%;background:#2E1A47;color:#fff;border:none;border-radius:7px;padding:9px;font-weight:600;cursor:pointer;font-size:13px}',
    '.dhdo-foot{font-size:10px;color:#bbb;text-align:center;padding:6px}'
  ].join('');
  document.head.appendChild(css);

  var btn = document.createElement('button');
  btn.id = 'dhdo-bot-btn';
  btn.setAttribute('aria-label', 'Chat with DHDO');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#C9A24E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z"/></svg>';
  document.body.appendChild(btn);

  var panel = document.createElement('div');
  panel.id = 'dhdo-bot-panel';
  panel.innerHTML =
    '<div id="dhdo-bot-head"><div><b>DHDO Assistant</b><span>Typically replies instantly</span></div><button id="dhdo-bot-x" aria-label="Close">&times;</button></div>' +
    '<div id="dhdo-bot-log"></div>' +
    '<form id="dhdo-bot-form"><input id="dhdo-bot-input" placeholder="Ask a question..." autocomplete="off" maxlength="2000" /><button id="dhdo-bot-send" type="submit">Send</button></form>' +
    '<div class="dhdo-foot">Powered by DHDO &middot; (337) 415-1951</div>';
  document.body.appendChild(panel);

  var log = panel.querySelector('#dhdo-bot-log');
  var form = panel.querySelector('#dhdo-bot-form');
  var input = panel.querySelector('#dhdo-bot-input');
  var sendBtn = panel.querySelector('#dhdo-bot-send');

  function bubble(role, text) {
    var div = document.createElement('div');
    div.className = 'dhdo-msg ' + (role === 'user' ? 'dhdo-me' : 'dhdo-bot');
    div.textContent = text; // plain text only — never innerHTML for chat content (XSS-safe)
    log.appendChild(div); log.scrollTop = log.scrollHeight;
  }
  function open() {
    panel.classList.add('open');
    if (!messages.length) bubble('assistant', GREETING);
    input.focus();
  }
  function close() { panel.classList.remove('open'); }
  btn.addEventListener('click', function () { panel.classList.contains('open') ? close() : open(); });
  panel.querySelector('#dhdo-bot-x').addEventListener('click', close);

  function showLeadForm() {
    if (leadShown) return; leadShown = true;
    var box = document.createElement('div');
    box.className = 'dhdo-lead';
    box.innerHTML =
      '<input id="dhdo-l-name" placeholder="Your name" />' +
      '<input id="dhdo-l-email" type="email" placeholder="Email" />' +
      '<input id="dhdo-l-phone" type="tel" placeholder="Phone" />' +
      '<button id="dhdo-l-send" type="button">Have the team reach out</button>';
    log.appendChild(box); log.scrollTop = log.scrollHeight;
    box.querySelector('#dhdo-l-send').addEventListener('click', function () {
      var n = box.querySelector('#dhdo-l-name').value.trim();
      var e = box.querySelector('#dhdo-l-email').value.trim();
      var p = box.querySelector('#dhdo-l-phone').value.trim();
      if (!n || !e) { alert('Please add your name and email.'); return; }
      fetch(REST, {
        method: 'POST',
        headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ name: n, email: e, phone: p || null, source: 'website', status: 'new', ref_code: 'chatbot', notes: 'Started via website chat assistant' })
      }).then(function () {
        box.remove();
        bubble('assistant', "Thank you, " + n.split(' ')[0] + "! The DHDO team will reach out within 24-48 hours. If it's urgent, call (337) 415-1951.");
      }).catch(function () {
        bubble('assistant', "I couldn't send that just now - please call us at (337) 415-1951.");
      });
    });
  }

  function send(text) {
    bubble('user', text);
    messages.push({ role: 'user', content: text });
    input.value = ''; sendBtn.disabled = true;
    var t = document.createElement('div'); t.className = 'dhdo-typing'; t.textContent = 'DHDO is typing...';
    log.appendChild(t); log.scrollTop = log.scrollHeight;
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sid, surface: 'marketing', messages: messages.slice(-12) })
    }).then(function (r) { return r.json(); }).then(function (d) {
      t.remove(); sendBtn.disabled = false;
      var reply = (d && d.reply) || "Please call us at (337) 415-1951.";
      bubble('assistant', reply);
      messages.push({ role: 'assistant', content: reply });
      if (d && d.lead) showLeadForm();
      input.focus();
    }).catch(function () {
      t.remove(); sendBtn.disabled = false;
      bubble('assistant', "I'm having trouble connecting - please call (337) 415-1951.");
    });
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = input.value.trim();
    if (v) send(v);
  });
})();
