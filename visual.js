/* Codex, 2026-10-17 (direcao-1). Copia do app: Claude tirou a barra de teste em 17/10/2026. */
(() => {
  'use strict';
  const direction = document.body.dataset.direcao;
  const themes = {
    '1': { name: 'FAIXA PRETA', subtitle: 'JIU-JITSU · TREINO', headline: 'Respeito.<br>Pressão. Repetição.', intro: 'Ajuste o treino. O resto é no tatame.' },
    '2': { name: 'ARENA', subtitle: 'JIU-JITSU / ROUND TIMER', headline: 'O próximo<br>round é seu.', intro: 'TEMPO DEFINIDO. FOCO NA LUTA.' },
    '3': { name: 'TATAME', subtitle: 'JIU-JITSU · RITMO DE TREINO', headline: 'Entre.<br>Encaixe.<br>Repita.', intro: 'Um round de cada vez.' }
  };
  const theme = themes[direction];
  // Desenhos vetoriais: o iPhone não substitui os controles por emoji.
  const icons = {
    infinito: '<svg viewBox="0 0 32 18" aria-hidden="true"><path d="M16 9C12 2 10 2 7 2a7 7 0 0 0 0 14c3 0 5-2 9-7s6-7 9-7a7 7 0 0 1 0 14c-3 0-5-2-9-7Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pausar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h5v16H5zm9 0h5v16h-5z" fill="currentColor"/></svg>',
    continuar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3v18l15-9z" fill="currentColor"/></svg>',
    parar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4z" fill="currentColor"/></svg>',
    novo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 8a8 8 0 1 0 1 8M19 3v6h-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"/></svg>'
  };
  const embedded = new URLSearchParams(location.search).get('embed') === '1';
  document.body.classList.toggle('embedded', embedded);
  document.body.insertAdjacentHTML('beforeend', `
    <main class="app" data-fase="ajuste" aria-label="Timer de Jiu-Jitsu">
      <header class="masthead">
        <div class="brand"><span class="brand-mark" aria-hidden="true"></span><span>${theme.name}<small>${theme.subtitle}</small></span></div>
        <div class="edition">TREINO LIVRE<br>JIU-JITSU</div>
      </header>
      <section class="setup" aria-label="Ajustar treino">
        <form id="settings-form">
          <div class="setup-scroll" tabindex="0" role="region" aria-label="Configurações do treino, role para ver mais">
          <div class="setup-heading"><p class="eyebrow">SEU TEMPO NO TATAME</p><h1>${theme.headline}</h1><p class="intro">${theme.intro}</p></div>
          <div class="settings">
            <fieldset><legend>Round <span>01 / TEMPO DE LUTA</span></legend>
              <div class="presets" data-presets="round">${[3,4,5,6,7,8,10].map(n => `<button class="preset" type="button" data-seconds="${n*60}" aria-pressed="${n === 5}" aria-label="${n} minutos de round">${n}<small>min</small></button>`).join('')}</div>
              <div class="custom"><span>Ajuste livre</span><div class="custom-fields"><input id="round-min" type="number" inputmode="numeric" min="0" max="99" step="1" value="5" required aria-label="Minutos do round"><span>min</span><input id="round-sec" type="number" inputmode="numeric" min="0" max="59" step="1" value="0" required aria-label="Segundos do round"><span>s</span></div></div>
            </fieldset>
            <fieldset><legend>Descanso <span>02 / RECUPERAÇÃO</span></legend>
              <div class="presets" data-presets="descanso">${[[30,'30','s'],[60,'1','min'],[90,'1:30','min'],[120,'2','min']].map(([n,label,unit]) => `<button class="preset" type="button" data-seconds="${n}" aria-pressed="${n === 60}" aria-label="${n} segundos de descanso">${label}<small>${unit}</small></button>`).join('')}</div>
              <div class="custom"><span>Ajuste livre</span><div class="custom-fields"><input id="rest-min" type="number" inputmode="numeric" min="0" max="99" step="1" value="1" required aria-label="Minutos de descanso"><span>min</span><input id="rest-sec" type="number" inputmode="numeric" min="0" max="59" step="1" value="0" required aria-label="Segundos de descanso"><span>s</span></div></div>
            </fieldset>
            <fieldset><legend>Rounds <span>03 / REPETIÇÕES</span></legend>
              <div class="count-row"><button class="preset" type="button" id="unlimited" aria-pressed="true"><span class="infinity-icon" aria-hidden="true">${icons.infinito}</span><small>SEM LIMITE</small></button><button class="preset" type="button" id="limited" aria-pressed="false">DEFINIR</button><label class="custom"><input id="round-count" type="number" inputmode="numeric" min="1" max="99" step="1" value="5" disabled required aria-label="Quantidade de rounds"></label></div>
            </fieldset>
          </div>
          </div>
          <div class="setup-foot"><button class="primary" type="submit" aria-label="Começar treino"><span class="start-copy"><small>ENTRE NO TATAME</small><strong>COMEÇAR</strong></span><span class="start-belt" aria-hidden="true"><i></i><i></i><i></i></span></button><p class="setup-note">5 segundos para preparar antes da luta.<br>Se o som não sair, <b>tire o iPhone do silencioso.</b></p></div>
        </form>
      </section>
      <section class="live" hidden aria-label="Treino">
        <div class="phase-header"><h1 class="phase-name" id="phase-name">ROUND</h1><div class="round-meta">ROUND <strong id="round-label"></strong></div></div>
        <div class="timer-box"><div class="time" id="time" role="timer" aria-atomic="true" aria-live="off"></div></div>
        <div class="status-line" id="status" role="status"></div>
        <p class="finish-message" id="finish-message"></p>
        <div class="phase-track" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
        <div class="controls"><button class="control pause" id="pause" type="button"><span class="control-icon" aria-hidden="true">${icons.pausar}</span><span id="pause-label">PAUSAR</span></button><button class="control stop" id="stop" type="button"><span class="control-icon" aria-hidden="true">${icons.parar}</span>PARAR</button></div>
      </section>
    </main>
    <dialog id="stop-dialog" aria-labelledby="stop-title" aria-describedby="stop-description"><h2 id="stop-title">Encerrar o treino?</h2><p id="stop-description">Confirme para parar. Para seguir do mesmo ponto, toque em Voltar.</p><div class="dialog-actions"><button type="button" id="cancel-stop" autofocus>VOLTAR</button><button class="confirm-stop" type="button" id="confirm-stop">ENCERRAR</button></div></dialog>
  `);
  const $ = selector => document.querySelector(selector);
  const app = $('.app');
  const dialog = $('#stop-dialog');
  // Só layout: acompanha a área visível quando o teclado cobre a tela do iOS.
  // O relógio e o áudio continuam inteiramente no motor.js.
  const viewport = window.visualViewport;
  let viewportFrame = 0;
  function updateSetupViewport() {
    const input = document.activeElement;
    const editing = app.dataset.fase === 'ajuste' && input?.matches('input');
    const keyboard = Boolean(editing && viewport && viewport.scale < 1.05 && document.documentElement.clientHeight - viewport.height > 100);
    app.classList.toggle('keyboard-open', keyboard);
    if (keyboard) {
      app.style.setProperty('--keyboard-height', `${viewport.height}px`);
      app.style.setProperty('--keyboard-top', `${viewport.offsetTop}px`);
      const scroll = $('.setup-scroll');
      const field = input.getBoundingClientRect();
      const area = scroll.getBoundingClientRect();
      if (field.bottom > area.bottom - 8) scroll.scrollTop += field.bottom - area.bottom + 8;
      else if (field.top < area.top + 8) scroll.scrollTop -= area.top + 8 - field.top;
    } else {
      app.style.removeProperty('--keyboard-height');
      app.style.removeProperty('--keyboard-top');
    }
  }
  function scheduleViewportUpdate() {
    cancelAnimationFrame(viewportFrame);
    viewportFrame = requestAnimationFrame(updateSetupViewport);
  }
  viewport?.addEventListener('resize', scheduleViewportUpdate);
  viewport?.addEventListener('scroll', scheduleViewportUpdate);
  window.addEventListener('resize', scheduleViewportUpdate);
  document.addEventListener('focusin', scheduleViewportUpdate);
  document.addEventListener('focusout', scheduleViewportUpdate);
  let current = { fase: 'ajuste', restante: 300, round: 1, totalRounds: null, pausado: false };
  let finiteRounds = false;
  const examples = {
    ajuste: { fase: 'ajuste', restante: 300, round: 1, totalRounds: null, pausado: false },
    prepara: { fase: 'prepara', restante: 5, round: 1, totalRounds: null, pausado: false },
    round: { fase: 'round', restante: 284, round: 3, totalRounds: null, pausado: false },
    ultimos: { fase: 'round', restante: 5, round: 3, totalRounds: null, pausado: false },
    descanso: { fase: 'descanso', restante: 45, round: 3, totalRounds: null, pausado: false },
    pausado: { fase: 'round', restante: 172, round: 3, totalRounds: null, pausado: true },
    fim: { fase: 'fim', restante: 0, round: 5, totalRounds: 5, pausado: false }
  };
  const segments = { '0': 'ab cdef'.replaceAll(' ', ''), '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg', '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg' };
  const paths = {
    a: '12,2 58,2 64,8 57,14 13,14 6,8',
    b: '60,16 66,10 68,14 68,53 62,59 56,53 56,22',
    c: '62,63 68,69 68,108 64,113 56,106 56,69',
    d: '13,106 57,106 64,113 58,119 12,119 6,113',
    e: '2,69 8,63 14,69 14,106 6,113 2,108',
    f: '2,14 6,10 14,17 14,53 8,59 2,53',
    g: '13,55 57,55 63,61 57,67 13,67 7,61'
  };
  function numeral(char) {
    if (direction !== '2') return `<span class="digit">${char}</span>`;
    return `<span class="digit"><svg viewBox="0 0 70 121" aria-hidden="true">${Object.entries(paths).map(([key,points])=>`<polygon class="segment${segments[char].includes(key) ? '' : ' off'}" points="${points}"/>`).join('')}</svg></span>`;
  }
  function numberGroup(text, unit) { return `<span class="time-group" aria-hidden="true">${[...text].map(numeral).join('')}<span class="unit">${unit}</span></span>`; }
  function normalize(state) {
    const int = (v, fallback, min, max) => Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Math.floor(Number(v)))) : fallback;
    return { fase: ['ajuste','prepara','round','descanso','fim'].includes(state.fase) ? state.fase : 'ajuste', restante: int(state.restante, 0, 0, 5999), round: int(state.round, 1, 1, 999), totalRounds: state.totalRounds == null ? null : int(state.totalRounds, 1, 1, 999), pausado: Boolean(state.pausado) };
  }
  // API pública: o motor externo fornece o estado inteiro a cada atualização.
  window.render = function render(state) {
    const previous = current;
    current = normalize(state || {});
    const s = current;
    const setup = s.fase === 'ajuste';
    const done = s.fase === 'fim';
    const paused = s.pausado && !setup && !done;
    const urgent = ['round','descanso'].includes(s.fase) && s.restante <= 5;
    app.dataset.fase = s.fase;
    app.classList.toggle('urgent', urgent);
    app.classList.toggle('is-paused', paused);
    $('.setup').hidden = !setup;
    $('.live').hidden = setup;
    const phaseText = { prepara: 'PREPARA', round: 'ROUND', descanso: 'DESCANSO', fim: 'TREINO CONCLUÍDO' }[s.fase] || 'AJUSTE';
    $('#phase-name').textContent = paused ? 'PAUSADO' : phaseText;
    $('#round-label').innerHTML = `<span>${String(s.round).padStart(2,'0')} / </span>${s.totalRounds == null ? `<span class="infinity-icon" role="img" aria-label="sem limite">${icons.infinito}</span>` : String(s.totalRounds).padStart(2,'0')}`;
    const mins = String(Math.floor(s.restante / 60)).padStart(2,'0');
    const secs = String(s.restante % 60).padStart(2,'0');
    const colon = direction === '2' ? '<svg viewBox="0 0 12 90" aria-hidden="true"><rect y="22" width="12" height="12"/><rect y="56" width="12" height="12"/></svg>' : ':';
    const timeMarkup = done ? 'OSS!' : `${numberGroup(mins,'MIN')}<span class="separator" aria-hidden="true">${colon}</span>${numberGroup(secs,'SEG')}`;
    if ($('#time').innerHTML !== timeMarkup) $('#time').innerHTML = timeMarkup;
    $('#time').setAttribute('aria-label', done ? 'Treino concluído' : `${Math.floor(s.restante/60)} minutos e ${s.restante%60} segundos`);
    $('#status').textContent = paused ? `${phaseText} · CONTINUE QUANDO QUISER` : done ? 'MISSÃO CUMPRIDA' : urgent ? 'ÚLTIMOS 5 SEGUNDOS' : s.fase === 'prepara' ? 'POSICIONE-SE NO TATAME' : s.fase === 'descanso' ? 'RESPIRE. O PRÓXIMO VEM AÍ.' : 'FOCO NA LUTA';
    $('#finish-message').textContent = `${s.round} ${s.round === 1 ? 'round concluído' : 'rounds concluídos'}. Treino feito.`;
    $('#pause-label').textContent = done ? 'NOVO TREINO' : paused ? 'CONTINUAR' : 'PAUSAR';
    $('#pause .control-icon').innerHTML = done ? icons.novo : paused ? icons.continuar : icons.pausar;
    $('#pause').setAttribute('aria-label', done ? 'Novo treino' : paused ? 'Continuar treino' : 'Pausar treino');
    document.querySelectorAll('.phase-track i').forEach((bar, i) => bar.classList.toggle('dim', (urgent || s.fase === 'prepara') && i >= s.restante));
    let key = setup ? 'ajuste' : paused ? 'pausado' : urgent && s.fase === 'round' ? 'ultimos' : s.fase;
    document.querySelectorAll('[data-demo]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.demo === key)));
    if (dialog.open && (setup || done || previous.fase !== s.fase)) dialog.close();
    scheduleViewportUpdate();
    return { ...current };
  };
  function secondsFor(group) {
    return Number($(`#${group}-min`).value) * 60 + Number($(`#${group}-sec`).value);
  }
  function updatePresets() {
    for (const [key, fields] of [['round','round'],['descanso','rest']]) {
      document.querySelectorAll(`[data-presets="${key}"] button`).forEach(b=>b.setAttribute('aria-pressed', String(Number(b.dataset.seconds) === secondsFor(fields))));
    }
  }
  document.querySelectorAll('[data-seconds]').forEach(button => button.addEventListener('click', () => {
    const group = button.closest('[data-presets]').dataset.presets === 'round' ? 'round' : 'rest';
    const value = Number(button.dataset.seconds);
    $(`#${group}-min`).value = Math.floor(value / 60);
    $(`#${group}-sec`).value = value % 60;
    $('#round-min').setCustomValidity('');
    updatePresets();
  }));
  $('#settings-form').addEventListener('input', () => { $('#round-min').setCustomValidity(''); updatePresets(); });
  function setFinite(value) {
    finiteRounds = value;
    $('#unlimited').setAttribute('aria-pressed', String(!value));
    $('#limited').setAttribute('aria-pressed', String(value));
    $('#round-count').disabled = !value;
  }
  $('#unlimited').addEventListener('click', () => setFinite(false));
  $('#limited').addEventListener('click', () => { setFinite(true); $('#round-count').focus(); });
  function emitAction(acao, extra, preview) {
    const event = new CustomEvent('timer:acao', { cancelable: true, detail: { acao, estado: { ...current }, ...extra } });
    // preventDefault() transfere o comportamento ao motor do Claude.
    if (window.dispatchEvent(event) && preview) window.render(preview);
  }
  $('#settings-form').addEventListener('submit', event => {
    event.preventDefault();
    const round = secondsFor('round');
    if (round <= 0) { $('#round-min').setCustomValidity('Escolha um round com pelo menos 1 segundo.'); $('#round-min').reportValidity(); return; }
    const configuracao = { tempoRound: round, tempoDescanso: secondsFor('rest'), totalRounds: finiteRounds ? Number($('#round-count').value) : null };
    emitAction('iniciar', { configuracao }, { fase:'prepara', restante:5, round:1, totalRounds:configuracao.totalRounds, pausado:false });
  });
  $('#pause').addEventListener('click', () => {
    if (current.fase === 'fim') return emitAction('novo-treino', {}, examples.ajuste);
    emitAction(current.pausado ? 'continuar' : 'pausar', {}, { ...current, pausado: !current.pausado });
  });
  $('#stop').addEventListener('click', () => dialog.showModal());
  $('#cancel-stop').addEventListener('click', () => dialog.close());
  $('#confirm-stop').addEventListener('click', () => { dialog.close(); emitAction('parar', {}, examples.ajuste); });
  document.querySelectorAll('[data-demo]').forEach(button=>button.addEventListener('click', () => window.render(examples[button.dataset.demo])));
  window.addEventListener('message', event => {
    // file:// tem origem null; só a janela pai pode comandar a comparação local.
    if (event.source !== window.parent || window.parent === window) return;
    if (event.data?.tipo === 'timer:preview') window.render(event.data.estado);
  });
  window.render(examples.ajuste);
  window.parent !== window && window.parent.postMessage({ tipo:'timer:pronto', direcao:direction }, '*');
})();
