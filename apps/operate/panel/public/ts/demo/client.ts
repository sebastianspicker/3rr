/** In-memory interactions for the fixture-backed static demo. */
import { demoFixture, type DemoHistoryEntry, type DemoPlayer } from './fixture';

type ToastTone = 'success' | 'error' | 'info';

let players: DemoPlayer[] = [];
let commandHistory: DemoHistoryEntry[] = [];

function element<T extends HTMLElement>(selector: string): T | null {
  return document.querySelector<T>(selector);
}

function setText(id: string, value: string): void {
  const target = document.getElementById(id);
  if (target) target.textContent = value;
}

function initToast(): void {
  if (document.getElementById('cs-toast-container')) return;
  const container = document.createElement('div');
  container.id = 'cs-toast-container';
  container.setAttribute('role', 'status');
  container.setAttribute('aria-live', 'polite');
  document.body.appendChild(container);
}

function showToast(message: string, tone: ToastTone): void {
  const container = document.getElementById('cs-toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `cs-toast cs-toast--${tone}`;
  toast.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('cs-toast--visible'));
  window.setTimeout(() => {
    toast.classList.remove('cs-toast--visible');
    window.setTimeout(() => toast.remove(), 220);
  }, 3500);
}

function announce(message: string, tone: ToastTone = 'info'): void {
  setText('demo-action-status', message);
  showToast(message, tone);
}

function showConfirm(message: string, confirmLabel = 'Confirm'): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'cs-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const modal = document.createElement('div');
    modal.className = 'cs-modal';
    const messageElement = document.createElement('p');
    messageElement.className = 'cs-modal-message';
    messageElement.id = 'demo-confirm-message';
    messageElement.textContent = message;
    overlay.setAttribute('aria-labelledby', messageElement.id);

    const actions = document.createElement('div');
    actions.className = 'cs-modal-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn btn-secondary cs-modal-cancel';
    cancel.textContent = 'Cancel';
    const confirm = document.createElement('button');
    confirm.type = 'button';
    confirm.className = 'btn btn-danger cs-modal-confirm';
    confirm.textContent = confirmLabel;
    actions.append(cancel, confirm);
    modal.append(messageElement, actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = [cancel, confirm];
    const finish = (result: boolean) => {
      document.removeEventListener('keydown', handleKeydown);
      overlay.remove();
      previouslyFocused?.focus();
      resolve(result);
    };
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish(false);
      if (event.key !== 'Tab') return;
      event.preventDefault();
      const currentIndex = document.activeElement === cancel ? 0 : 1;
      const direction = event.shiftKey ? -1 : 1;
      focusable.at((currentIndex + direction + focusable.length) % focusable.length)?.focus();
    };
    cancel.addEventListener('click', () => finish(false));
    confirm.addEventListener('click', () => finish(true));
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) finish(false);
    });
    document.addEventListener('keydown', handleKeydown);
    cancel.focus();
  });
}

function initNavigation(): void {
  const toggle = element<HTMLButtonElement>('#nav-toggle-btn');
  const links = element<HTMLElement>('#nav-links-list');
  if (!toggle || !links) return;
  const close = () => {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
  };
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !links.classList.contains('open')) return;
    close();
    toggle.focus();
  });
}

function createFleetCard(): HTMLElement {
  const { server } = demoFixture;
  const card = document.createElement('div');
  card.className = 'card server-card mb-3';
  card.setAttribute('role', 'row');
  card.innerHTML = `
    <div class="card-header" role="cell"><h3 class="card-title">${server.hostname}</h3></div>
    <div class="server-status-cell" role="cell">
      <span class="status-dot unknown" aria-hidden="true"></span>
      <span class="badge badge-unknown">Status unknown</span>
    </div>
    <div class="server-address-cell" role="cell" aria-label="Address">${server.host}:${String(server.port)}</div>
    <span class="server-player-count" role="cell" aria-label="Players">Not observed</span>
    <div class="server-card-actions" role="cell">
      <button type="button" class="btn btn-sm btn-success" data-demo-fleet-action="reconnect">Reconnect</button>
      <a class="btn btn-sm btn-primary" href="/3rr/manage/" aria-label="Manage ${server.host}:${String(server.port)}">Manage</a>
      <button type="button" class="btn btn-sm btn-danger" data-demo-fleet-action="delete">Delete</button>
    </div>`;
  return card;
}

function renderFleet(): void {
  const list = element<HTMLElement>('#serverList');
  if (list) list.replaceChildren(createFleetCard());
}

function setAuthenticatedState(): void {
  const { server } = demoFixture;
  document.querySelectorAll<HTMLElement>('[data-live-status-badge]').forEach((badge) => {
    badge.className = 'badge badge-connected';
    badge.textContent = 'RCON authenticated';
  });
  setText('truth-rail-map', server.map);
  setText('truth-rail-players', `${String(server.humans)}/${String(server.maxPlayers)}`);
  setText('truth-rail-observed-at', server.observedLabel);
  setText('manage-observed-at', `RCON observed at ${server.observedLabel}`);
  setText('live-status-updated', `RCON observed at ${server.observedLabel}`);
  setText('live-status-state', 'RCON authenticated');
  setText('live-hostname', server.hostname);
  setText('live-map', server.map);
  setText('live-players', `${String(server.humans)}/${String(server.maxPlayers)}`);
  setText('live-bots', String(server.bots));
  setText('live-max-players', String(server.maxPlayers));
  setText('players-updated', `RCON observed at ${server.observedLabel}`);
  setText('truth-observed-time', server.observedLabel);
  setText(
    'truth-observed-detail',
    `${server.map}, ${String(server.humans)}/${String(server.maxPlayers)} players, ${String(server.bots)} bots`
  );
}

function activateButtons(container: HTMLElement, attribute: string, value: string): void {
  container.querySelectorAll<HTMLButtonElement>(`[${attribute}]`).forEach((button) => {
    const active = button.getAttribute(attribute) === value;
    button.classList.toggle('btn-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function selectedGameType(): string {
  return element<HTMLInputElement>('#gameTypeValue')?.value ?? demoFixture.requested.gameType;
}

function renderMaps(gameType: string, gameMode: string, preferredMap = ''): void {
  const select = element<HTMLSelectElement>('#selectedMap');
  if (!select) return;
  const maps = demoFixture.gameTypes[gameType]?.[gameMode] ?? [];
  select.replaceChildren(
    ...maps.map((map) => {
      const option = document.createElement('option');
      option.value = map;
      option.textContent = map;
      return option;
    })
  );
  select.value = maps.includes(preferredMap) ? preferredMap : (maps.at(0) ?? '');
}

function renderModes(gameType: string, preferredMode = ''): void {
  const container = element<HTMLDivElement>('#gameModeBtns');
  const modeInput = element<HTMLInputElement>('#gameModeValue');
  if (!container || !modeInput) return;
  const modes = Object.keys(demoFixture.gameTypes[gameType] ?? {});
  container.className = `btn-grid ${modes.length <= 2 ? 'cols-2' : modes.length <= 4 ? 'cols-3' : 'cols-4'}`;
  container.replaceChildren(
    ...modes.map((mode) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-secondary';
      button.dataset.gameMode = mode;
      button.setAttribute('aria-pressed', 'false');
      button.textContent = mode;
      return button;
    })
  );
  const selected = modes.includes(preferredMode) ? preferredMode : (modes.at(0) ?? '');
  modeInput.value = selected;
  activateButtons(container, 'data-game-mode', selected);
  renderMaps(gameType, selected, demoFixture.requested.map);
}

function renderGameSetup(): void {
  const typeContainer = element<HTMLElement>('#gameTypeBtns');
  const typeInput = element<HTMLInputElement>('#gameTypeValue');
  if (!typeContainer || !typeInput) return;
  typeInput.value = demoFixture.requested.gameType;
  activateButtons(typeContainer, 'data-game-type', demoFixture.requested.gameType);
  renderModes(demoFixture.requested.gameType, demoFixture.requested.gameMode);
}

function playerMatches(player: DemoPlayer, query: string): boolean {
  return [player.userid, player.name, player.steamId64].some((value) =>
    value.toLowerCase().includes(query)
  );
}

function renderPlayers(): void {
  const list = element<HTMLElement>('#playersList');
  if (!list) return;
  const query = element<HTMLInputElement>('#playerSearch')?.value.trim().toLowerCase() ?? '';
  const visiblePlayers = players.filter((player) => playerMatches(player, query));
  list.replaceChildren();
  if (!visiblePlayers.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = players.length ? 'No players match the search.' : 'No fixture players.';
    list.appendChild(empty);
    return;
  }
  visiblePlayers.forEach((player) => {
    const row = document.createElement('div');
    row.className = 'player-row';
    row.setAttribute('role', 'row');
    row.innerHTML = `
      <div class="player-name" role="cell">#${player.userid} ${player.name}</div>
      <div class="player-meta" role="cell">${player.steamId64}</div>
      <div class="row-actions" role="cell">
        <button type="button" class="btn btn-warning btn-sm" data-player-action="kick" data-player-name="${player.name}">Kick</button>
        <button type="button" class="btn btn-secondary btn-sm" data-player-action="mute" data-player-name="${player.name}">Mute</button>
        <button type="button" class="btn btn-secondary btn-sm" data-player-action="unmute" data-player-name="${player.name}">Unmute</button>
      </div>`;
    list.appendChild(row);
  });
}

function renderHistory(): void {
  const list = element<HTMLElement>('#rconHistoryList');
  if (!list) return;
  list.replaceChildren();
  if (!commandHistory.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No simulated commands in this page session.';
    list.appendChild(empty);
    return;
  }
  commandHistory.forEach((entry) => {
    const row = document.createElement('div');
    row.className = 'compact-list-item demo-history-entry';
    const command = document.createElement('code');
    command.textContent = entry.command;
    const meta = document.createElement('span');
    meta.textContent = `${String(entry.uses)} fixture use${entry.uses === 1 ? '' : 's'} · not sent`;
    row.append(command, meta);
    list.appendChild(row);
  });
}

function resetControls(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-toggle-group]').forEach((button) => {
    const active = button.dataset.toggleVal === '0';
    button.setAttribute('aria-pressed', String(active));
    button.classList.toggle('btn-active', active);
  });
  document.querySelectorAll<HTMLInputElement>('input:not([type="hidden"])').forEach((input) => {
    input.value = '';
  });
  const restoreRow = element<HTMLElement>('#restore_backup_row');
  if (restoreRow) restoreRow.hidden = true;
  const suggestions = element<HTMLElement>('#rconSuggestions');
  if (suggestions) {
    suggestions.hidden = true;
    suggestions.replaceChildren();
  }
  setText('rconResultText', 'Static demo ready. No command has been sent.');
  setText('truth-requested-time', 'Saved');
  setText(
    'truth-requested-detail',
    `${demoFixture.requested.gameType} / ${demoFixture.requested.gameMode} / ${demoFixture.requested.map}`
  );
}

function resetDemo(withFeedback: boolean): void {
  players = demoFixture.players.map((player) => ({ ...player }));
  commandHistory = demoFixture.commandHistory.map((entry) => ({ ...entry }));
  if (document.documentElement.dataset.demoPage === 'fleet') renderFleet();
  if (document.documentElement.dataset.demoPage === 'manage') {
    setAuthenticatedState();
    renderGameSetup();
    renderPlayers();
    renderHistory();
    resetControls();
    const historyLabel = document.querySelector<HTMLElement>(
      '.rcon-history-header .rcon-response-label'
    );
    if (historyLabel) historyLabel.textContent = 'Simulated command history';
  }
  if (withFeedback) announce('Demo reset to its fixture state. Nothing was persisted.', 'success');
}

function actionLabel(button: HTMLButtonElement): string {
  return button.getAttribute('aria-label') ?? button.textContent?.trim() ?? 'Action';
}

function isDestructive(button: HTMLButtonElement): boolean {
  return (
    button.classList.contains('btn-danger') ||
    button.classList.contains('btn-danger-outline') ||
    button.dataset.playerAction === 'kick' ||
    ['kill_bots', 'kick_all_bots', 'restore_latest_backup', 'restore_round_submit'].includes(
      button.id
    )
  );
}

async function simulateButton(button: HTMLButtonElement): Promise<void> {
  const label = actionLabel(button);
  if (isDestructive(button)) {
    const confirmed = await showConfirm(
      `Simulate “${label}”? No command will be sent and fixture state will remain local.`,
      'Simulate'
    );
    if (!confirmed) return;
  }
  if (button.dataset.toggleGroup) {
    const group = button.dataset.toggleGroup;
    document
      .querySelectorAll<HTMLButtonElement>(`[data-toggle-group="${group}"]`)
      .forEach((item) => {
        const active = item === button;
        item.setAttribute('aria-pressed', String(active));
        item.classList.toggle('btn-active', active);
      });
  } else if (button.closest('[id$="-presets"], #inf-ammo-presets')) {
    const group = button.parentElement;
    group?.querySelectorAll<HTMLButtonElement>('button').forEach((item) => {
      item.classList.toggle('btn-active', item === button);
    });
  }
  announce(`${label} simulated. No command was sent.`, 'success');
}

function safeDemoCommand(command: string): boolean {
  return (
    command.length > 0 &&
    command.length <= 200 &&
    /^[\x20-\x7E]+$/.test(command) &&
    !/[;\n\r]/.test(command)
  );
}

function simulateRconInput(): void {
  const input = element<HTMLInputElement>('#rconInput');
  const command = input?.value.trim() ?? '';
  if (!safeDemoCommand(command)) {
    announce('Enter one printable ASCII command without separators.', 'error');
    return;
  }
  const existing = commandHistory.find((entry) => entry.command === command);
  if (existing) existing.uses += 1;
  else commandHistory.unshift({ command, uses: 1 });
  renderHistory();
  setText(
    'rconResultText',
    `[simulation] ${command}\nNo RCON connection was made and no command was sent.`
  );
  if (input) input.value = '';
  announce(`“${command}” added to in-memory simulation history. No command was sent.`, 'success');
}

function renderSuggestions(): void {
  const suggestions = element<HTMLElement>('#rconSuggestions');
  if (!suggestions) return;
  suggestions.hidden = false;
  suggestions.replaceChildren(
    ...['status', 'hostname', 'map de_ancient'].map((command) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-ghost btn-sm';
      button.dataset.demoSuggestion = command;
      button.textContent = command;
      return button;
    })
  );
  announce('Fixture-backed command suggestions opened.');
}

async function handleFleetAction(button: HTMLButtonElement): Promise<void> {
  if (button.dataset.demoFleetAction === 'reconnect') {
    announce('Reconnect simulated. No RCON connection was attempted.', 'success');
    return;
  }
  const confirmed = await showConfirm(
    'Simulate deleting Server 1? The fixture will remain available and nothing will be persisted.',
    'Simulate delete'
  );
  if (confirmed) announce('Delete simulated. The fixture server was not removed.', 'success');
}

function bindManageInputs(): void {
  element<HTMLInputElement>('#playerSearch')?.addEventListener('input', renderPlayers);
  element<HTMLInputElement>('#rconInput')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      simulateRconInput();
    }
  });
  element<HTMLInputElement>('#say_input')?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const input = event.currentTarget as HTMLInputElement;
    const message = input.value.trim();
    if (!message) {
      announce('Enter an admin message to simulate.', 'error');
      return;
    }
    input.value = '';
    announce('Admin message simulated. No command was sent.', 'success');
  });
  element<HTMLFormElement>('#server_setup_form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const gameType = selectedGameType();
    const gameMode = element<HTMLInputElement>('#gameModeValue')?.value ?? '';
    const map = element<HTMLSelectElement>('#selectedMap')?.value ?? '';
    setText('truth-requested-time', new Date().toLocaleTimeString());
    setText('truth-requested-detail', `${gameType} / ${gameMode} / ${map}`);
    announce('Setup request simulated in memory. No commands were sent.', 'success');
  });
}

async function handleManageButton(button: HTMLButtonElement): Promise<void> {
  if (button.id === 'manage-reconnect') {
    announce('Reconnect simulated. No RCON connection was attempted.', 'success');
    return;
  }
  if (button.id === 'refresh_status') {
    setAuthenticatedState();
    announce(
      'Observed status restored from the local fixture. No server was contacted.',
      'success'
    );
    return;
  }
  if (button.id === 'refresh_players') {
    players = demoFixture.players.map((player) => ({ ...player }));
    renderPlayers();
    announce('Players restored from the local fixture. No server was contacted.', 'success');
    return;
  }
  if (button.dataset.gameType) {
    const gameType = button.dataset.gameType;
    const typeContainer = element<HTMLElement>('#gameTypeBtns');
    const typeInput = element<HTMLInputElement>('#gameTypeValue');
    if (typeContainer && typeInput) {
      typeInput.value = gameType;
      activateButtons(typeContainer, 'data-game-type', gameType);
      renderModes(gameType);
      announce(`${button.textContent?.trim() ?? gameType} selected in memory.`);
    }
    return;
  }
  if (button.dataset.gameMode) {
    const gameMode = button.dataset.gameMode;
    const container = element<HTMLElement>('#gameModeBtns');
    const input = element<HTMLInputElement>('#gameModeValue');
    if (container && input) {
      input.value = gameMode;
      activateButtons(container, 'data-game-mode', gameMode);
      renderMaps(selectedGameType(), gameMode);
      announce(`${gameMode} selected in memory.`);
    }
    return;
  }
  if (button.dataset.demoSuggestion) {
    const input = element<HTMLInputElement>('#rconInput');
    if (input) {
      input.value = button.dataset.demoSuggestion;
      input.focus();
    }
    announce('Suggestion copied to the local command field.');
    return;
  }
  if (button.id === 'rconSuggestRefreshBtn') {
    renderSuggestions();
    return;
  }
  if (button.id === 'rconInputBtn') {
    simulateRconInput();
    return;
  }
  if (button.id === 'rconHistoryClearBtn') {
    const confirmed = await showConfirm(
      'Clear the in-memory simulated command history? The fixture can be restored with Reset demo.',
      'Clear history'
    );
    if (confirmed) {
      commandHistory = [];
      renderHistory();
      announce('In-memory simulation history cleared. Nothing was persisted.', 'success');
    }
    return;
  }
  if (button.id === 'rconClearBtn') {
    setText('rconResultText', '');
    announce('Local console output cleared.');
    return;
  }
  if (button.id === 'say_input_btn') {
    const input = element<HTMLInputElement>('#say_input');
    if (!input?.value.trim()) {
      announce('Enter an admin message to simulate.', 'error');
      return;
    }
    input.value = '';
    announce('Admin message simulated. No command was sent.', 'success');
    return;
  }
  if (button.dataset.playerAction) {
    const action = button.dataset.playerAction;
    const playerName = button.dataset.playerName ?? 'player';
    if (action === 'kick') {
      const confirmed = await showConfirm(
        `Simulate kicking ${playerName}? The fixture player will remain listed.`,
        'Simulate kick'
      );
      if (!confirmed) return;
    }
    announce(`${action} for ${playerName} simulated. No command was sent.`, 'success');
    return;
  }
  if (button.id === 'restore_backup') {
    const row = element<HTMLElement>('#restore_backup_row');
    if (row) row.hidden = false;
    element<HTMLInputElement>('#restore_round_input')?.focus();
    announce('Choose a fixture round number to simulate restore.');
    return;
  }
  if (button.id === 'restore_round_cancel') {
    const row = element<HTMLElement>('#restore_backup_row');
    if (row) row.hidden = true;
    announce('Round restore simulation cancelled.');
    return;
  }
  if (button.id === 'addWorkshopFavorite') {
    const name = element<HTMLInputElement>('#favoriteWorkshopName')?.value.trim() ?? '';
    const id = element<HTMLInputElement>('#favoriteWorkshopId')?.value.trim() ?? '';
    if (!name || !/^\d{5,20}$/.test(id)) {
      announce('Enter a favorite name and a 5 to 20 digit Workshop ID.', 'error');
      return;
    }
    const list = element<HTMLElement>('#workshopFavoritesList');
    if (list) {
      const item = document.createElement('div');
      item.className = 'compact-list-item';
      item.textContent = `${name} (${id}) - in memory only`;
      list.replaceChildren(item);
    }
    announce('Workshop favorite saved in memory. Nothing was persisted.', 'success');
    return;
  }
  await simulateButton(button);
}

function bindDocumentActions(): void {
  document.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!button || button.id === 'nav-toggle-btn' || button.closest('.cs-modal')) return;
    if (button.matches('[data-demo-reset]')) {
      resetDemo(true);
      return;
    }
    if (button.dataset.demoFleetAction) {
      void handleFleetAction(button);
      return;
    }
    if (document.documentElement.dataset.demoPage === 'manage') void handleManageButton(button);
  });
}

function initialize(): void {
  initToast();
  initNavigation();
  bindDocumentActions();
  bindManageInputs();
  resetDemo(false);
}

initialize();
