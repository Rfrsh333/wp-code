(function() {
  try {
  var existing = document.getElementById('ttj-panel');
  if (existing) { existing.remove(); return; }

  var BASE = '__BASE_URL__';

  // Platform detectie
  var host = window.location.hostname;
  var platform = host.includes('facebook.com') ? 'facebook'
    : host.includes('linkedin.com') ? 'linkedin'
    : host.includes('instagram.com') ? 'instagram'
    : (host.includes('google.com') || host.includes('maps.google')) ? 'google'
    : 'website';

  // Scrape wat we kunnen
  var title = (document.title || '').trim();
  var bron_naam = '';
  var naam = '';

  if (platform === 'facebook') {
    bron_naam = title.replace(/\s*[\|–·]\s*Facebook.*$/i, '').replace(/^\(\d+\)\s*/, '').trim() || 'Facebook';
  } else if (platform === 'linkedin') {
    bron_naam = 'LinkedIn';
    naam = title.replace(/\s*[\|–·]\s*LinkedIn.*$/i, '').replace(/^\(\d+\)\s*/, '').trim();
  } else if (platform === 'instagram') {
    bron_naam = 'Instagram';
    naam = title.replace(/\s*[\|•·]\s*Instagram.*$/i, '').replace(/\(@.*?\)\s*/g, '').trim();
  } else if (platform === 'google') {
    bron_naam = 'Google Maps';
    naam = title.replace(/\s*[-–]\s*Google Maps.*$/i, '').trim();
  } else {
    bron_naam = host.replace('www.', '');
  }

  // Inject panel rechtsonder
  var style = document.createElement('style');
  style.id = 'ttj-style';
  style.textContent = '#ttj-panel{position:fixed;bottom:20px;right:20px;width:340px;max-height:80vh;overflow-y:auto;background:#fff;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.25);z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;animation:ttj-slide .3s ease}@keyframes ttj-slide{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}#ttj-panel *{box-sizing:border-box}#ttj-panel .ttj-h{background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;padding:14px 16px;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center}#ttj-panel .ttj-h span{font-weight:700;font-size:15px}#ttj-panel .ttj-x{background:none;border:none;color:#fff;font-size:20px;cursor:pointer;padding:0 4px;line-height:1}#ttj-panel .ttj-b{padding:14px 16px}#ttj-panel .ttj-r{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}#ttj-panel .ttj-f{margin-bottom:8px}#ttj-panel label{display:block;font-size:11px;font-weight:600;color:#6b7280;margin-bottom:3px}#ttj-panel input,#ttj-panel textarea{width:100%;padding:7px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;outline:none;font-family:inherit}#ttj-panel input:focus,#ttj-panel textarea:focus{border-color:#f97316}#ttj-panel textarea{resize:none;height:50px}#ttj-panel .ttj-save{width:100%;padding:10px;background:#f97316;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;margin-top:8px}#ttj-panel .ttj-save:hover{background:#ea580c}#ttj-panel .ttj-badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;color:#fff;margin-left:8px}#ttj-panel .ttj-badge.facebook{background:#1877f2}#ttj-panel .ttj-badge.linkedin{background:#0a66c2}#ttj-panel .ttj-badge.instagram{background:#e4405f}#ttj-panel .ttj-badge.google{background:#ea4335}#ttj-panel .ttj-badge.website{background:#6b7280}';
  document.head.appendChild(style);

  var panel = document.createElement('div');
  panel.id = 'ttj-panel';

  // Header
  var header = document.createElement('div');
  header.className = 'ttj-h';
  var headerTitle = document.createElement('span');
  headerTitle.textContent = 'Lead toevoegen';
  var badge = document.createElement('span');
  badge.className = 'ttj-badge ' + platform;
  badge.textContent = platform.charAt(0).toUpperCase() + platform.slice(1);
  headerTitle.appendChild(badge);
  var closeBtn = document.createElement('button');
  closeBtn.className = 'ttj-x';
  closeBtn.textContent = '\u00D7';
  closeBtn.onclick = function() { panel.remove(); style.remove(); };
  header.appendChild(headerTitle);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // Body
  var body = document.createElement('div');
  body.className = 'ttj-b';

  function addField(parent, id, label, type, val, ph, cls) {
    var wrap = document.createElement('div');
    if (cls) wrap.className = cls;
    var lbl = document.createElement('label');
    lbl.textContent = label;
    wrap.appendChild(lbl);
    if (type === 'textarea') {
      var ta = document.createElement('textarea');
      ta.id = id; ta.placeholder = ph || ''; ta.value = val || '';
      wrap.appendChild(ta);
    } else {
      var inp = document.createElement('input');
      inp.id = id; inp.type = type || 'text'; inp.placeholder = ph || ''; inp.value = val || '';
      wrap.appendChild(inp);
    }
    parent.appendChild(wrap);
  }

  // Row 1
  var r1 = document.createElement('div'); r1.className = 'ttj-r';
  addField(r1, 'ttj-naam', 'Naam *', 'text', naam, 'Voor- en achternaam');
  addField(r1, 'ttj-bedrijf', 'Bedrijf', 'text', '', 'Bedrijfsnaam');
  body.appendChild(r1);

  // Row 2
  var r2 = document.createElement('div'); r2.className = 'ttj-r';
  addField(r2, 'ttj-telefoon', 'Telefoon', 'tel', '', '+31 6 ...');
  addField(r2, 'ttj-email', 'Email', 'email', '', 'naam@bedrijf.nl');
  body.appendChild(r2);

  // Row 3
  var r3 = document.createElement('div'); r3.className = 'ttj-r';
  addField(r3, 'ttj-functie', 'Functie', 'text', '', 'Bijv. Kok');
  addField(r3, 'ttj-stad', 'Stad', 'text', '', 'Bijv. Utrecht');
  body.appendChild(r3);

  // Bron
  addField(body, 'ttj-bron', 'Bron', 'text', bron_naam, 'Groep/pagina naam', 'ttj-f');

  // Notities
  addField(body, 'ttj-notities', 'Notities', 'textarea', '', 'Context, eerste indruk...', 'ttj-f');

  // Save button
  var saveBtn = document.createElement('button');
  saveBtn.className = 'ttj-save';
  saveBtn.textContent = 'Opslaan als Lead';
  saveBtn.onclick = function() {
    var n = document.getElementById('ttj-naam').value.trim();
    if (!n) {
      document.getElementById('ttj-naam').style.borderColor = '#ef4444';
      document.getElementById('ttj-naam').focus();
      return;
    }

    // Bouw URL params
    var params = [];
    params.push('naam=' + encodeURIComponent(n));
    params.push('platform=' + encodeURIComponent(platform));
    params.push('bron_url=' + encodeURIComponent(window.location.href));

    var fields = {bedrijf:'ttj-bedrijf',functie:'ttj-functie',telefoon:'ttj-telefoon',email:'ttj-email',stad:'ttj-stad',bron_naam:'ttj-bron',notities:'ttj-notities'};
    for (var key in fields) {
      var val = document.getElementById(fields[key]).value.trim();
      if (val) params.push(key + '=' + encodeURIComponent(val));
    }

    // Open dashboard in nieuw tabblad — bypassed CSP!
    window.open(BASE + '/admin/leads/add?' + params.join('&'), '_blank');

    // Sluit panel
    panel.remove();
    style.remove();
  };
  body.appendChild(saveBtn);

  panel.appendChild(body);
  document.body.appendChild(panel);

  // Focus op naam
  var naamInput = document.getElementById('ttj-naam');
  if (naamInput) naamInput.focus();

  // Escape om te sluiten
  var escH = function(e) { if (e.key === 'Escape') { panel.remove(); style.remove(); document.removeEventListener('keydown', escH); } };
  document.addEventListener('keydown', escH);

  } catch(err) { alert('TopTalent Error: ' + err.message); }
})();void(0);
