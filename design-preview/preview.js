/* 3RR Operate interactive demo — local mock interactions only. */
(function () {
  'use strict';

  var body = document.body;
  var html = document.documentElement;
  var activeTab = 'console';
  var clock = 12 * 60 * 60 + 41 * 60 + 9;
  var toastTimer;
  var termOut = document.getElementById('termOut');
  var termInput = document.getElementById('termInput');
  var history = document.getElementById('commandHistory');
  var toast = document.getElementById('demoToast');
  var observed = document.getElementById('tbObserved');

  function notify(message) {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(function () { toast.hidden = true; }, 3600);
  }

  function nextTime() {
    clock += 1;
    var hours = Math.floor(clock / 3600) % 24;
    var minutes = Math.floor(clock / 60) % 60;
    var seconds = clock % 60;
    return [hours, minutes, seconds].map(function (value) {
      return String(value).padStart(2, '0');
    }).join(':');
  }

  function setActiveTab(tab, syncHash) {
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.tabs [role="tab"]'));
    var valid = tabs.some(function (item) { return item.dataset.tab === tab; });
    activeTab = valid ? tab : 'console';
    tabs.forEach(function (item) {
      item.setAttribute('aria-selected', String(item.dataset.tab === activeTab));
    });
    document.querySelectorAll('.tabpanel').forEach(function (panel) {
      panel.hidden = panel.id !== 'tab-' + activeTab;
    });
    if (syncHash && body.dataset.view === 'manage') updateHash('manage', activeTab);
  }

  function updateHash(view, tab) {
    var target = '#' + view + (view === 'manage' && tab !== 'console' ? '/' + tab : '');
    if (window.location.hash !== target) window.location.hash = target;
  }

  function go(view, tab, syncHash) {
    var targetView = view === 'manage' ? 'manage' : 'fleet';
    body.dataset.view = targetView;
    var navFleet = document.getElementById('navFleet');
    if (navFleet) navFleet.setAttribute('aria-current', targetView === 'fleet' ? 'page' : 'false');
    if (targetView === 'manage') setActiveTab(tab || activeTab, false);
    if (syncHash !== false) updateHash(targetView, targetView === 'manage' ? activeTab : null);
    window.scrollTo(0, 0);
    closeRail();
  }

  function applyHash() {
    var parts = window.location.hash.replace(/^#/, '').split('/');
    if (parts[0] === 'manage') go('manage', parts[1] || 'console', false);
    else go('fleet', null, false);
  }

  function closeRail() {
    body.classList.remove('rail-open');
    var toggle = document.getElementById('railToggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function appendTerminal(command, response, rejected) {
    if (!termOut) return;
    var entry = document.createElement('span');
    var time = nextTime();
    entry.appendChild(document.createTextNode('\n' + time + '  ' + command + '\n' + response));
    entry.className = rejected ? 'bad' : 'ok';
    termOut.appendChild(entry);
    termOut.scrollTop = termOut.scrollHeight;
    if (history) {
      var empty = history.querySelector('.hist-empty');
      if (empty) empty.remove();
      var item = document.createElement('li');
      var status = rejected ? 'simulated policy rejection' : 'simulated · 42ms';
      item.innerHTML = '<span class="t"></span><span class="c"></span><span class="r"></span>';
      item.querySelector('.t').textContent = time;
      item.querySelector('.c').textContent = command;
      item.querySelector('.r').textContent = status;
      item.querySelector('.r').className = 'r ' + (rejected ? 'bad' : 'ok');
      history.insertBefore(item, history.firstChild);
    }
  }

  function runCommand(command) {
    var normalized = command.trim();
    if (!normalized) return;
    var rejected = /(^|\s)(sv_cheats|rcon_password|quit)(\s|$)/i.test(normalized);
    var response = rejected
      ? 'Rejected by the demo command policy — no request made.'
      : normalized === 'status'
        ? 'Simulated status: SCRIM · EU-1 / de_mirage / 10 of 12 players.'
        : 'Simulated command accepted — no request made.';
    appendTerminal(normalized, response, rejected);
    notify(rejected ? 'Command rejected by the local demo policy.' : 'Command simulated locally.');
  }

  function applyTheme(theme) {
    var selected = theme === 'light' ? 'light' : 'dark';
    html.dataset.theme = selected;
    try { window.localStorage.setItem('3rr-demo-theme', selected); } catch (error) { /* storage is optional */ }
    var button = document.getElementById('themeToggle');
    if (button) {
      var next = selected === 'light' ? 'dark' : 'light';
      button.setAttribute('aria-label', 'Switch to ' + next + ' theme');
      button.textContent = selected === 'light' ? '◐ Light' : '◐ Dark';
    }
  }

  function restoreTheme() {
    var saved = 'dark';
    try { saved = window.localStorage.getItem('3rr-demo-theme') || 'dark'; } catch (error) { /* storage is optional */ }
    applyTheme(saved);
  }

  /* ---- navigation and view state ---- */
  document.addEventListener('click', function (event) {
    var target = event.target.closest('[data-goto]');
    if (!target) return;
    event.preventDefault();
    var label = target.textContent.trim();
    if (label === 'Add server' || label === 'Settings' || label === 'Users' || label === 'Remove') {
      notify(label + ' is simulated in this demo.');
      return;
    }
    go(target.dataset.goto, 'console', true);
  });
  document.addEventListener('keydown', function (event) {
    var row = event.target.closest && event.target.closest('tr[data-goto]');
    if (row && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      go(row.dataset.goto, 'console', true);
    }
  });
  window.addEventListener('hashchange', applyHash);

  /* ---- tabs and segmented controls ---- */
  document.querySelectorAll('.tabs [role="tab"]').forEach(function (tab) {
    tab.addEventListener('click', function () { setActiveTab(tab.dataset.tab, true); });
  });
  document.addEventListener('click', function (event) {
    var button = event.target.closest('.seg button');
    if (!button) return;
    button.parentElement.querySelectorAll('button').forEach(function (item) {
      item.setAttribute('aria-pressed', String(item === button));
    });
    notify(button.textContent.trim() + ' selected in the local demo.');
  });

  /* ---- console ---- */
  if (termInput) {
    termInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        runCommand(termInput.value);
        termInput.value = '';
      }
    });
  }
  document.querySelectorAll('.chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      if (termInput) {
        termInput.value = chip.dataset.cmd;
        termInput.focus();
      }
    });
  });
  var clearHistory = document.getElementById('clearHistory');
  if (clearHistory) clearHistory.addEventListener('click', function () {
    history.replaceChildren();
    var empty = document.createElement('li');
    empty.className = 'hist-empty';
    empty.textContent = 'No simulated commands sent in this session.';
    history.appendChild(empty);
    notify('Local command history cleared.');
  });
  var reconnect = document.getElementById('reconnectButton');
  if (reconnect) reconnect.addEventListener('click', function () {
    if (observed) observed.textContent = '1s ago';
    notify('Simulated reconnection complete.');
  });

  /* ---- player search and safe local actions ---- */
  var search = document.getElementById('playerSearch');
  if (search) {
    search.addEventListener('input', function () {
      var query = search.value.trim().toLowerCase();
      var visible = 0;
      document.querySelectorAll('#playerTable tbody tr').forEach(function (row) {
        var hit = row.textContent.toLowerCase().indexOf(query) !== -1;
        row.hidden = !hit;
        if (hit) visible += 1;
      });
      var empty = document.getElementById('playerEmpty');
      if (empty) empty.hidden = visible !== 0;
    });
  }
  var refreshPlayers = document.getElementById('refreshPlayers');
  if (refreshPlayers) refreshPlayers.addEventListener('click', function () {
    document.querySelectorAll('#playerTable tbody tr').forEach(function (row) { row.hidden = false; });
    if (search) search.value = '';
    document.getElementById('playerEmpty').hidden = true;
    notify('Fixed player snapshot restored.');
  });
  document.addEventListener('click', function (event) {
    var action = event.target.closest('.player-row-actions button');
    if (!action) return;
    var row = action.closest('tr');
    var player = row.cells[0].textContent.trim();
    row.hidden = true;
    notify(player + ' ' + action.textContent.trim().toLowerCase() + ' simulated locally.');
  });

  /* ---- command palette ---- */
  var overlay = document.getElementById('paletteOverlay');
  var paletteInput = document.getElementById('paletteInput');
  var paletteItems = Array.prototype.slice.call(document.querySelectorAll('#paletteList li'));
  var selectedIndex = 0;
  function visibleItems() { return paletteItems.filter(function (item) { return !item.hidden; }); }
  function markSelection() {
    var visible = visibleItems();
    if (selectedIndex >= visible.length) selectedIndex = Math.max(0, visible.length - 1);
    paletteItems.forEach(function (item) {
      var selected = item === visible[selectedIndex];
      item.classList.toggle('is-sel', selected);
      item.setAttribute('aria-selected', String(selected));
    });
  }
  function filterPalette(query) {
    paletteItems.forEach(function (item) {
      item.hidden = Boolean(query) && item.textContent.toLowerCase().indexOf(query) === -1;
    });
    selectedIndex = 0;
    markSelection();
  }
  function openPalette() {
    overlay.hidden = false;
    paletteInput.value = '';
    filterPalette('');
    paletteInput.focus();
  }
  function closePalette() { overlay.hidden = true; }
  function runPaletteItem(item) {
    if (!item) return;
    closePalette();
    if (item.dataset.paletteView) go(item.dataset.paletteView, null, true);
    else if (item.dataset.paletteAction) notify(item.dataset.paletteAction + ' simulated locally.');
    else runCommand(item.dataset.command);
  }
  document.addEventListener('keydown', function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (overlay.hidden) openPalette(); else closePalette();
    } else if (event.key === 'Escape' && !overlay.hidden) {
      closePalette();
    }
  });
  var paletteHint = document.getElementById('paletteHint');
  if (paletteHint) paletteHint.addEventListener('click', openPalette);
  overlay.addEventListener('click', function (event) { if (event.target === overlay) closePalette(); });
  if (paletteInput) {
    paletteInput.addEventListener('input', function () { filterPalette(paletteInput.value.trim().toLowerCase()); });
    paletteInput.addEventListener('keydown', function (event) {
      var visible = visibleItems();
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        selectedIndex = Math.max(0, Math.min(visible.length - 1, selectedIndex + (event.key === 'ArrowDown' ? 1 : -1)));
        markSelection();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        runPaletteItem(visible[selectedIndex]);
      }
    });
  }
  paletteItems.forEach(function (item) { item.addEventListener('click', function () { runPaletteItem(item); }); });

  /* ---- theme, mobile rail, and generic safe feedback ---- */
  var themeButton = document.getElementById('themeToggle');
  if (themeButton) themeButton.addEventListener('click', function () {
    applyTheme(html.dataset.theme === 'light' ? 'dark' : 'light');
  });
  var railToggle = document.getElementById('railToggle');
  if (railToggle) railToggle.addEventListener('click', function () {
    var isOpen = body.classList.toggle('rail-open');
    railToggle.setAttribute('aria-expanded', String(isOpen));
  });
  var scrim = document.getElementById('railScrim');
  if (scrim) scrim.addEventListener('click', closeRail);
  document.addEventListener('click', function (event) {
    var button = event.target.closest('button[data-demo-action], #tab-match .btn, #tab-setup .btn, .fleet-head .btn--primary');
    if (!button || button.id || button.closest('.seg') || button.closest('[data-goto]')) return;
    notify((button.dataset.demoAction || button.textContent.trim()) + ' is simulated locally.');
  });

  restoreTheme();
  applyHash();
})();
