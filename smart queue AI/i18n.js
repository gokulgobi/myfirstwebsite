/**
 * SMART QUEUE AI - Global Multi-Language System (i18n.js)
 * Supports 108+ world languages via Google Translate
 * Features: First-visit modal, persistent header switcher, RTL support, region filters
 */

// RTL Language Codes
const RTL_LANGS = new Set(['ar','he','iw','fa','ur','yi','ku','ps','sd','ug','dv']);

// 108 World Languages Database
const WORLD_LANGUAGES = [
  { code:'en',    name:'English',               native:'English',           flag:'🌐', region:'Global' },
  // India
  { code:'hi',    name:'Hindi',                 native:'हिंदी',              flag:'🇮🇳', region:'India' },
  { code:'bn',    name:'Bengali',               native:'বাংলা',              flag:'🇮🇳', region:'India' },
  { code:'te',    name:'Telugu',                native:'తెలుగు',             flag:'🇮🇳', region:'India' },
  { code:'mr',    name:'Marathi',               native:'मराठी',              flag:'🇮🇳', region:'India' },
  { code:'ta',    name:'Tamil',                 native:'தமிழ்',              flag:'🇮🇳', region:'India' },
  { code:'gu',    name:'Gujarati',              native:'ગુજરાતી',            flag:'🇮🇳', region:'India' },
  { code:'kn',    name:'Kannada',               native:'ಕನ್ನಡ',              flag:'🇮🇳', region:'India' },
  { code:'ml',    name:'Malayalam',             native:'മലയാളം',             flag:'🇮🇳', region:'India' },
  { code:'pa',    name:'Punjabi',               native:'ਪੰਜਾਬੀ',             flag:'🇮🇳', region:'India' },
  { code:'or',    name:'Odia',                  native:'ଓଡ଼ିଆ',              flag:'🇮🇳', region:'India' },
  { code:'as',    name:'Assamese',              native:'অসমীয়া',            flag:'🇮🇳', region:'India' },
  // South Asia
  { code:'ur',    name:'Urdu',                  native:'اردو',              flag:'🇵🇰', region:'South Asia' },
  { code:'ne',    name:'Nepali',                native:'नेपाली',             flag:'🇳🇵', region:'South Asia' },
  { code:'si',    name:'Sinhala',               native:'සිංහල',             flag:'🇱🇰', region:'South Asia' },
  { code:'sd',    name:'Sindhi',                native:'سنڌي',              flag:'🇵🇰', region:'South Asia' },
  // Europe
  { code:'es',    name:'Spanish',               native:'Español',           flag:'🇪🇸', region:'Europe' },
  { code:'fr',    name:'French',                native:'Français',          flag:'🇫🇷', region:'Europe' },
  { code:'de',    name:'German',                native:'Deutsch',           flag:'🇩🇪', region:'Europe' },
  { code:'it',    name:'Italian',               native:'Italiano',          flag:'🇮🇹', region:'Europe' },
  { code:'pt',    name:'Portuguese',            native:'Português',         flag:'🇧🇷', region:'Europe' },
  { code:'nl',    name:'Dutch',                 native:'Nederlands',        flag:'🇳🇱', region:'Europe' },
  { code:'pl',    name:'Polish',                native:'Polski',            flag:'🇵🇱', region:'Europe' },
  { code:'ru',    name:'Russian',               native:'Русский',           flag:'🇷🇺', region:'Europe' },
  { code:'uk',    name:'Ukrainian',             native:'Українська',        flag:'🇺🇦', region:'Europe' },
  { code:'sv',    name:'Swedish',               native:'Svenska',           flag:'🇸🇪', region:'Europe' },
  { code:'no',    name:'Norwegian',             native:'Norsk',             flag:'🇳🇴', region:'Europe' },
  { code:'da',    name:'Danish',                native:'Dansk',             flag:'🇩🇰', region:'Europe' },
  { code:'fi',    name:'Finnish',               native:'Suomi',             flag:'🇫🇮', region:'Europe' },
  { code:'el',    name:'Greek',                 native:'Ελληνικά',          flag:'🇬🇷', region:'Europe' },
  { code:'ro',    name:'Romanian',              native:'Română',            flag:'🇷🇴', region:'Europe' },
  { code:'hu',    name:'Hungarian',             native:'Magyar',            flag:'🇭🇺', region:'Europe' },
  { code:'cs',    name:'Czech',                 native:'Čeština',           flag:'🇨🇿', region:'Europe' },
  { code:'sk',    name:'Slovak',                native:'Slovenčina',        flag:'🇸🇰', region:'Europe' },
  { code:'bg',    name:'Bulgarian',             native:'Български',         flag:'🇧🇬', region:'Europe' },
  { code:'hr',    name:'Croatian',              native:'Hrvatski',          flag:'🇭🇷', region:'Europe' },
  { code:'sr',    name:'Serbian',               native:'Srpski',            flag:'🇷🇸', region:'Europe' },
  { code:'sl',    name:'Slovenian',             native:'Slovenščina',       flag:'🇸🇮', region:'Europe' },
  { code:'et',    name:'Estonian',              native:'Eesti',             flag:'🇪🇪', region:'Europe' },
  { code:'lv',    name:'Latvian',               native:'Latviešu',          flag:'🇱🇻', region:'Europe' },
  { code:'lt',    name:'Lithuanian',            native:'Lietuvių',          flag:'🇱🇹', region:'Europe' },
  { code:'ca',    name:'Catalan',               native:'Català',            flag:'🏴',  region:'Europe' },
  { code:'is',    name:'Icelandic',             native:'Íslenska',          flag:'🇮🇸', region:'Europe' },
  { code:'ga',    name:'Irish',                 native:'Gaeilge',           flag:'🇮🇪', region:'Europe' },
  { code:'cy',    name:'Welsh',                 native:'Cymraeg',           flag:'🏴',  region:'Europe' },
  { code:'be',    name:'Belarusian',            native:'Беларуская',        flag:'🇧🇾', region:'Europe' },
  { code:'mk',    name:'Macedonian',            native:'Македонски',        flag:'🇲🇰', region:'Europe' },
  { code:'sq',    name:'Albanian',              native:'Shqip',             flag:'🇦🇱', region:'Europe' },
  { code:'lb',    name:'Luxembourgish',         native:'Lëtzebuergesch',    flag:'🇱🇺', region:'Europe' },
  { code:'mt',    name:'Maltese',               native:'Malti',             flag:'🇲🇹', region:'Europe' },
  { code:'af',    name:'Afrikaans',             native:'Afrikaans',         flag:'🇿🇦', region:'Europe' },
  { code:'eu',    name:'Basque',                native:'Euskara',           flag:'🏴',  region:'Europe' },
  { code:'gl',    name:'Galician',              native:'Galego',            flag:'🏴',  region:'Europe' },
  { code:'bs',    name:'Bosnian',               native:'Bosanski',          flag:'🇧🇦', region:'Europe' },
  { code:'fy',    name:'Frisian',               native:'Frysk',             flag:'🇳🇱', region:'Europe' },
  { code:'gd',    name:'Scots Gaelic',          native:'Gàidhlig',          flag:'🏴',  region:'Europe' },
  { code:'co',    name:'Corsican',              native:'Corsu',             flag:'🇫🇷', region:'Europe' },
  { code:'yi',    name:'Yiddish',               native:'ייִדיש',             flag:'✡',  region:'Europe' },
  // East & Southeast Asia
  { code:'zh-CN', name:'Chinese (Simplified)',  native:'中文 (简体)',         flag:'🇨🇳', region:'Asia' },
  { code:'zh-TW', name:'Chinese (Traditional)', native:'中文 (繁體)',        flag:'🇹🇼', region:'Asia' },
  { code:'ja',    name:'Japanese',              native:'日本語',             flag:'🇯🇵', region:'Asia' },
  { code:'ko',    name:'Korean',                native:'한국어',             flag:'🇰🇷', region:'Asia' },
  { code:'vi',    name:'Vietnamese',            native:'Tiếng Việt',        flag:'🇻🇳', region:'Asia' },
  { code:'th',    name:'Thai',                  native:'ภาษาไทย',           flag:'🇹🇭', region:'Asia' },
  { code:'id',    name:'Indonesian',            native:'Bahasa Indonesia',  flag:'🇮🇩', region:'Asia' },
  { code:'ms',    name:'Malay',                 native:'Bahasa Melayu',     flag:'🇲🇾', region:'Asia' },
  { code:'tl',    name:'Filipino',              native:'Filipino',          flag:'🇵🇭', region:'Asia' },
  { code:'my',    name:'Burmese',               native:'မြန်မာဘာသာ',        flag:'🇲🇲', region:'Asia' },
  { code:'km',    name:'Khmer',                 native:'ភាសាខ្មែរ',          flag:'🇰🇭', region:'Asia' },
  { code:'lo',    name:'Lao',                   native:'ລາວ',               flag:'🇱🇦', region:'Asia' },
  { code:'mn',    name:'Mongolian',             native:'Монгол',            flag:'🇲🇳', region:'Asia' },
  { code:'ky',    name:'Kyrgyz',                native:'Кыргызча',          flag:'🇰🇬', region:'Asia' },
  { code:'uz',    name:'Uzbek',                 native:"O'zbek",            flag:'🇺🇿', region:'Asia' },
  { code:'kk',    name:'Kazakh',                native:'Қазақша',           flag:'🇰🇿', region:'Asia' },
  { code:'tg',    name:'Tajik',                 native:'Тоҷикӣ',            flag:'🇹🇯', region:'Asia' },
  { code:'tk',    name:'Turkmen',               native:'Türkmençe',         flag:'🇹🇲', region:'Asia' },
  { code:'hy',    name:'Armenian',              native:'Հայերեն',           flag:'🇦🇲', region:'Asia' },
  { code:'ka',    name:'Georgian',              native:'ქართული',           flag:'🇬🇪', region:'Asia' },
  { code:'az',    name:'Azerbaijani',           native:'Azərbaycan',        flag:'🇦🇿', region:'Asia' },
  { code:'su',    name:'Sundanese',             native:'Basa Sunda',        flag:'🇮🇩', region:'Asia' },
  { code:'jv',    name:'Javanese',              native:'Basa Jawa',         flag:'🇮🇩', region:'Asia' },
  { code:'ceb',   name:'Cebuano',               native:'Cebuano',           flag:'🇵🇭', region:'Asia' },
  { code:'hmn',   name:'Hmong',                 native:'Hmong',             flag:'🌏', region:'Asia' },
  { code:'ug',    name:'Uyghur',                native:'ئۇيغۇرچە',          flag:'🌏', region:'Asia' },
  { code:'tt',    name:'Tatar',                 native:'Татарча',           flag:'🌍', region:'Asia' },
  // Middle East
  { code:'ar',    name:'Arabic',                native:'العربية',           flag:'🇸🇦', region:'Middle East' },
  { code:'fa',    name:'Persian (Farsi)',        native:'فارسی',             flag:'🇮🇷', region:'Middle East' },
  { code:'iw',    name:'Hebrew',                native:'עברית',             flag:'🇮🇱', region:'Middle East' },
  { code:'tr',    name:'Turkish',               native:'Türkçe',            flag:'🇹🇷', region:'Middle East' },
  { code:'ku',    name:'Kurdish',               native:'کوردی',             flag:'🌍', region:'Middle East' },
  { code:'ps',    name:'Pashto',                native:'پښتو',              flag:'🇦🇫', region:'Middle East' },
  // Africa
  { code:'sw',    name:'Swahili',               native:'Kiswahili',         flag:'🇰🇪', region:'Africa' },
  { code:'am',    name:'Amharic',               native:'አማርኛ',              flag:'🇪🇹', region:'Africa' },
  { code:'ha',    name:'Hausa',                 native:'Hausa',             flag:'🇳🇬', region:'Africa' },
  { code:'yo',    name:'Yoruba',                native:'Yorùbá',            flag:'🇳🇬', region:'Africa' },
  { code:'ig',    name:'Igbo',                  native:'Igbo',              flag:'🇳🇬', region:'Africa' },
  { code:'zu',    name:'Zulu',                  native:'isiZulu',           flag:'🇿🇦', region:'Africa' },
  { code:'xh',    name:'Xhosa',                 native:'isiXhosa',          flag:'🇿🇦', region:'Africa' },
  { code:'so',    name:'Somali',                native:'Soomaali',          flag:'🇸🇴', region:'Africa' },
  { code:'ny',    name:'Chichewa',              native:'Chichewa',          flag:'🇲🇼', region:'Africa' },
  { code:'sn',    name:'Shona',                 native:'Shona',             flag:'🇿🇼', region:'Africa' },
  { code:'st',    name:'Sesotho',               native:'Sesotho',           flag:'🇱🇸', region:'Africa' },
  { code:'mg',    name:'Malagasy',              native:'Malagasy',          flag:'🇲🇬', region:'Africa' },
  { code:'rw',    name:'Kinyarwanda',           native:'Kinyarwanda',       flag:'🇷🇼', region:'Africa' },
  // Americas & Oceania
  { code:'ht',    name:'Haitian Creole',        native:'Kreyòl ayisyen',    flag:'🇭🇹', region:'Americas' },
  { code:'mi',    name:'Maori',                 native:'Te Reo Māori',      flag:'🇳🇿', region:'Oceania' },
  { code:'sm',    name:'Samoan',                native:'Gagana Samoa',      flag:'🇼🇸', region:'Oceania' },
  { code:'haw',   name:'Hawaiian',              native:'Olelo Hawaiʻi',     flag:'🌺', region:'Oceania' },
  // Special
  { code:'eo',    name:'Esperanto',             native:'Esperanto',         flag:'🟢', region:'International' },
  { code:'la',    name:'Latin',                 native:'Latina',            flag:'🏛',  region:'Classical' },
];

// State
const I18N_KEY = 'sq_ai_lang_v1';
let _lang = { code:'en', name:'English', native:'English', flag:'🌐', region:'Global' };
let _activeRegion = '';

// Google Translate Helpers
function _gtSelect() {
  return document.querySelector('.goog-te-combo') ||
         document.querySelector('#google_translate_element select');
}

function _waitGT(ms) {
  ms = ms || 14000;
  return new Promise(function(resolve) {
    var sel = _gtSelect();
    if (sel) { resolve(sel); return; }
    var t0 = Date.now();
    var iv = setInterval(function() {
      var s = _gtSelect();
      if (s) { clearInterval(iv); resolve(s); }
      else if (Date.now() - t0 > ms) { clearInterval(iv); resolve(null); }
    }, 300);
  });
}

async function _applyLang(code) {
  document.documentElement.dir = RTL_LANGS.has(code) ? 'rtl' : 'ltr';
  if (code === 'en') {
    var s = _gtSelect();
    if (s) { s.value = ''; s.dispatchEvent(new Event('change')); }
    document.cookie = 'googtrans=; expires=Thu,01 Jan 1970 00:00:00 UTC; path=/';
    document.documentElement.dir = 'ltr';
    return;
  }
  _loader(true);
  var sel = await _waitGT();
  if (sel) {
    sel.value = code;
    sel.dispatchEvent(new Event('change'));
    setTimeout(function() { _loader(false); }, 2500);
  } else {
    _loader(false);
    document.cookie = 'googtrans=/en/' + code + '; path=/';
    if (typeof showToast === 'function') showToast('Reloading to apply translation...', 'info');
    setTimeout(function() { location.reload(); }, 900);
  }
}

// Translation Loader Bar
function _loader(show) {
  var el = document.getElementById('i18n-loader');
  if (show) {
    if (!el) {
      el = document.createElement('div');
      el.id = 'i18n-loader';
      el.className = 'i18n-loader';
      el.innerHTML = '<div class="i18n-loader-inner"><div class="i18n-spinner"></div><div class="i18n-loader-text"><strong>Translating to ' + _lang.native + '...</strong><span>Powered by Google Translate</span></div></div>';
      document.body.appendChild(el);
    }
    requestAnimationFrame(function() { el.classList.add('i18n-loader-show'); });
  } else {
    if (el) {
      el.classList.remove('i18n-loader-show');
      setTimeout(function() { if(el.parentNode) el.parentNode.removeChild(el); }, 400);
    }
  }
}

// Header Switcher
function _updateSwitcher() {
  var btn = document.getElementById('lang-switcher-btn');
  if (!btn) return;
  btn.innerHTML = '<span class="lsb-flag">' + _lang.flag + '</span><span class="lsb-name">' + _lang.native + '</span><span class="lsb-arrow">▾</span>';
}

// Language Modal
function openLangModal() {
  var existing = document.getElementById('lang-modal');
  if (existing) existing.parentNode.removeChild(existing);

  var total = WORLD_LANGUAGES.length;
  var isEn = _lang.code === 'en';

  var cards = WORLD_LANGUAGES.map(function(l) {
    var active = l.code === _lang.code ? ' lm-active' : '';
    return '<button class="lm-card' + active + '" data-code="' + l.code + '" data-search="' + l.name.toLowerCase() + ' ' + l.native.toLowerCase() + ' ' + l.region.toLowerCase() + '" data-region="' + l.region + '" onclick="lmPick(this)">' +
      '<span class="lm-flag">' + l.flag + '</span>' +
      '<div class="lm-card-text"><div class="lm-native">' + l.native + '</div><div class="lm-english">' + l.name + '</div></div>' +
      '</button>';
  }).join('');

  var resetBtn = !isEn ? '<button class="lm-reset-btn" onclick="lmPick(null,\'en\')">&#8635; Reset to English</button>' : '';
  var skipLabel = isEn ? 'Continue in English &rarr;' : 'Keep ' + _lang.native + ' &#10003;';

  var modal = document.createElement('div');
  modal.id = 'lang-modal';
  modal.className = 'lm-overlay';
  modal.innerHTML =
    '<div class="lm-backdrop" onclick="closeLangModal()"></div>' +
    '<div class="lm-card-wrap">' +
      '<div class="lm-head">' +
        '<div class="lm-head-icon">🌍</div>' +
        '<div class="lm-head-text">' +
          '<h2>Select Your Language</h2>' +
          '<p>Smart Queue AI will instantly translate everything &bull; ' + total + ' languages supported</p>' +
        '</div>' +
        '<button class="lm-close-btn" onclick="closeLangModal()" title="Close">&times;</button>' +
      '</div>' +
      '<div class="lm-current-bar">' +
        '<span class="lm-cur-label">Active Language:</span>' +
        '<span class="lm-cur-chip"><span>' + _lang.flag + '</span><span>' + _lang.native + '</span></span>' +
        resetBtn +
        '<span class="lm-count-pill" id="lm-count">' + total + ' languages</span>' +
      '</div>' +
      '<div class="lm-search-row">' +
        '<div class="lm-search-box">' +
          '<span class="lm-search-icon">&#128269;</span>' +
          '<input id="lm-search" type="text" placeholder="Search by language name, native name, or region..." oninput="lmSearch(this.value)" autocomplete="off">' +
          '<button id="lm-search-clr" class="lm-search-clr" style="display:none" onclick="lmClear()">&times;</button>' +
        '</div>' +
      '</div>' +
      '<div class="lm-region-bar">' +
        '<button class="lm-rpill active" onclick="lmRegion(this,\'\')">🌐 All</button>' +
        '<button class="lm-rpill" onclick="lmRegion(this,\'India\')">🇮🇳 India</button>' +
        '<button class="lm-rpill" onclick="lmRegion(this,\'South Asia\')">🌏 South Asia</button>' +
        '<button class="lm-rpill" onclick="lmRegion(this,\'Asia\')">🌏 Asia</button>' +
        '<button class="lm-rpill" onclick="lmRegion(this,\'Europe\')">🇪🇺 Europe</button>' +
        '<button class="lm-rpill" onclick="lmRegion(this,\'Middle East\')">🌙 Middle East</button>' +
        '<button class="lm-rpill" onclick="lmRegion(this,\'Africa\')">🌍 Africa</button>' +
        '<button class="lm-rpill" onclick="lmRegion(this,\'Americas\')">🌎 Americas</button>' +
        '<button class="lm-rpill" onclick="lmRegion(this,\'Oceania\')">🌊 Oceania</button>' +
        '<button class="lm-rpill" onclick="lmRegion(this,\'International\')">🟢 Special</button>' +
      '</div>' +
      '<div class="lm-grid-wrap">' +
        '<div class="lm-grid" id="lm-grid">' + cards + '</div>' +
        '<div id="lm-empty" class="lm-empty" style="display:none">No languages matched. Try a different search.</div>' +
      '</div>' +
      '<div class="lm-foot">' +
        '<span class="lm-foot-note">&#128260; Powered by Google Translate &bull; Real-time translation</span>' +
        '<button class="lm-skip-btn" onclick="closeLangModal()">' + skipLabel + '</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(modal);
  requestAnimationFrame(function() { modal.classList.add('lm-open'); });

  setTimeout(function() {
    var activeCard = document.querySelector('.lm-card.lm-active');
    if (activeCard) activeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    var searchEl = document.getElementById('lm-search');
    if (searchEl) searchEl.focus();
  }, 260);
}

function closeLangModal() {
  var m = document.getElementById('lang-modal');
  if (!m) return;
  m.classList.remove('lm-open');
  setTimeout(function() { if (m.parentNode) m.parentNode.removeChild(m); }, 360);
}

function lmSearch(q) {
  var query = q.toLowerCase().trim();
  var clr = document.getElementById('lm-search-clr');
  if (clr) clr.style.display = query ? 'flex' : 'none';
  _lmFilter(query, _activeRegion);
}

function lmClear() {
  var inp = document.getElementById('lm-search');
  if (inp) { inp.value = ''; inp.focus(); }
  lmSearch('');
}

function lmRegion(btn, region) {
  _activeRegion = region;
  document.querySelectorAll('.lm-rpill').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  var q = document.getElementById('lm-search') ? document.getElementById('lm-search').value : '';
  _lmFilter(q.toLowerCase().trim(), region);
}

function _lmFilter(q, region) {
  var vis = 0;
  document.querySelectorAll('.lm-card').forEach(function(c) {
    var rMatch = !region || (c.dataset.region && c.dataset.region.toLowerCase().indexOf(region.toLowerCase()) !== -1);
    var qMatch = !q || (c.dataset.search && c.dataset.search.indexOf(q) !== -1);
    var show = rMatch && qMatch;
    c.style.display = show ? 'flex' : 'none';
    if (show) vis++;
  });
  var empty = document.getElementById('lm-empty');
  if (empty) empty.style.display = vis === 0 ? 'flex' : 'none';
  var cnt = document.getElementById('lm-count');
  if (cnt) cnt.textContent = (q || region) ? vis + ' languages' : WORLD_LANGUAGES.length + ' languages';
}

function lmPick(btn, overrideCode) {
  var code = overrideCode || (btn && btn.dataset ? btn.dataset.code : null);
  var lang = null;
  for (var i = 0; i < WORLD_LANGUAGES.length; i++) {
    if (WORLD_LANGUAGES[i].code === code) { lang = WORLD_LANGUAGES[i]; break; }
  }
  if (!lang) return;
  handleLangSelect(lang.code, lang.name, lang.native, lang.flag, lang.region);
}

async function handleLangSelect(code, name, native, flag, region) {
  _lang = { code: code, name: name, native: native, flag: flag, region: region };
  localStorage.setItem(I18N_KEY, JSON.stringify(_lang));
  _updateSwitcher();
  closeLangModal();
  if (code !== 'en') {
    if (typeof showToast === 'function') showToast('🌐 Translating to ' + native + '...', 'info');
  }
  await _applyLang(code);
  setTimeout(function() {
    if (typeof showToast === 'function') {
      if (code !== 'en') showToast('Language set to ' + native + ' (' + name + ')', 'success');
      else showToast('Restored to English', 'info');
    }
  }, 2200);
}

// Initialise
function initI18n() {
  var saved = localStorage.getItem(I18N_KEY);
  if (saved) {
    try {
      _lang = JSON.parse(saved);
      _updateSwitcher();
      if (_lang.code !== 'en') {
        setTimeout(function() { _applyLang(_lang.code); }, 1400);
      }
    } catch(e) {}
  } else {
    setTimeout(openLangModal, 1000);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initI18n);
} else {
  initI18n();
}
