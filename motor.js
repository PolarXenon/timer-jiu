/* Motor do timer: tempo, som e tela acesa. Claude, 17/10/2026.
   O visual (visual.js, do Codex) desenha a tela por window.render(estado) e avisa os botoes
   pelo evento 'timer:acao'. Aqui fica a parte que conta o tempo e toca.

   Regras do som (pedido do Marcos, 16/10/2026):
   - PREPARA de 5 s com beep a cada segundo e gongo no zero;
   - ROUND: beep nos ultimos 5 s e gongo no zero;
   - DESCANSO: beep nos ultimos 5 s e gongo no zero, e volta o round;
   - repete ate parar (ou acabar o numero de rounds).

   O relogio de verdade e o performance.now(); o som e agendado no relogio do AudioContext
   com 1,5 s de antecedencia, entao o beep cai no segundo certo mesmo se a tela engasgar. */
(() => {
  'use strict';

  const PREPARA = 5;            // segundos
  const AVISO = 5;              // beeps antes do gongo
  const ANTECEDENCIA = 1.5;     // segundos de som agendado a frente
  const GUARDA = 'timerJiu.ajuste';

  let ctx = null;
  const buffers = {};
  const brutos = {};
  let baixando = null;
  let agendados = new Map();    // id do evento -> { fonte, quando }
  let trava = null;
  let somVencido = false;       // o app foi pro fundo: o som so volta com um toque

  let ajuste = null;            // { tempoRound, tempoDescanso, totalRounds }
  let fase = 'ajuste';
  let round = 1;
  let seq = 0;                  // numero da fase atual, so pra dar nome unico aos eventos
  let fimDaFase = 0;            // performance.now() em ms
  let duracaoFase = 0;          // segundos
  let pausadoRestante = null;   // ms, quando pausado
  let ultimoRender = '';

  const agora = () => performance.now();

  /* ---------- som ---------- */

  function baixaSons() {
    if (!baixando) {
      baixando = Promise.all(['beep', 'gongo'].map(async nome => {
        const r = await fetch('sons/' + nome + '.wav');
        brutos[nome] = await r.arrayBuffer();
      }));
    }
    return baixando;
  }

  // Chamado dentro de um toque: o iPhone so libera som que nasce de um toque.
  // Depois que o app vai pro fundo, o iPhone mata o som da pagina e o contexto antigo pode
  // continuar dizendo "running" sem sair nada (o Marcos achou em 17/10/2026). Entao, na volta,
  // o contexto e jogado fora e nasce um novo no primeiro toque.
  async function ligaSom() {
    if ('audioSession' in navigator) {
      // "ambient" toca por cima da musica sem pausar o Spotify (Safari nao sabe abaixar a musica)
      try { navigator.audioSession.type = 'ambient'; } catch (e) {}
    }
    if (ctx && somVencido) {
      descartaFuturos();
      const velho = ctx;
      ctx = null;
      velho.close().catch(() => {});
      for (const nome in buffers) delete buffers[nome];
    }
    somVencido = false;
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state !== 'running') { try { await ctx.resume(); } catch (e) {} }
    await baixaSons();
    const meu = ctx;
    for (const nome of ['beep', 'gongo']) {
      if (!buffers[nome]) buffers[nome] = await meu.decodeAudioData(brutos[nome].slice(0));
    }
    if (ctx !== meu) return;
    // um quase-silencio pra acordar a saida Bluetooth antes do primeiro beep
    const s = ctx.createBufferSource();
    s.buffer = ctx.createBuffer(1, 2205, ctx.sampleRate);
    s.connect(ctx.destination);
    s.start();
    avisoSom();
  }

  function toca(nome, quandoMs, id) {
    if (!ctx || !buffers[nome] || ctx.state !== 'running') return false;
    const atraso = (quandoMs - agora()) / 1000;
    const s = ctx.createBufferSource();
    s.buffer = buffers[nome];
    s.connect(ctx.destination);
    const quando = ctx.currentTime + Math.max(0, atraso);
    s.start(quando);
    agendados.set(id, { fonte: s, quando, em: quandoMs });
    s.onended = () => { if (agendados.get(id)?.fonte === s) agendados.get(id).acabou = true; };
    return true;
  }

  // Corta o que ainda nao comecou a tocar (o gongo que ja esta soando termina natural).
  function cancelaFuturos() {
    for (const [id, a] of agendados) {
      if (ctx && a.quando > ctx.currentTime + 0.01) {
        try { a.fonte.stop(); } catch (e) {}
        agendados.delete(id);
      }
    }
  }

  // Esquece tudo que ainda ia tocar (pelo relogio da tela), pra agendar de novo no contexto novo.
  function descartaFuturos() {
    const t = agora();
    for (const [id, a] of agendados) {
      if (a.fonte && a.em > t) {
        try { a.fonte.stop(); } catch (e) {}
        agendados.delete(id);
      }
    }
  }

  // Eventos da fase: beeps em -5..-1 s e gongo no zero, contados do fim da fase.
  function eventosDaFase() {
    const lista = [];
    for (let k = AVISO; k >= 1; k--) {
      if (k <= duracaoFase) lista.push({ id: seq + ':b' + k, nome: 'beep', em: fimDaFase - k * 1000 });
    }
    lista.push({ id: seq + ':g', nome: 'gongo', em: fimDaFase });
    return lista;
  }

  function agenda() {
    if (pausadoRestante !== null || !['prepara', 'round', 'descanso'].includes(fase)) return;
    const t = agora();
    for (const ev of eventosDaFase()) {
      if (agendados.has(ev.id)) continue;
      if (ev.em < t - 250) { agendados.set(ev.id, { perdido: true, quando: 0 }); continue; } // passou (tela estava em segundo plano)
      if (ev.em <= t + ANTECEDENCIA * 1000) toca(ev.nome, ev.em, ev.id);
    }
  }

  /* ---------- tela acesa ---------- */

  async function seguraTela() {
    if (!('wakeLock' in navigator) || document.hidden) return;
    try {
      if (!trava || trava.released) trava = await navigator.wakeLock.request('screen');
    } catch (e) {}
  }
  function soltaTela() {
    if (trava) { trava.release().catch(() => {}); trava = null; }
  }

  /* ---------- aviso de som desligado ---------- */

  const aviso = document.createElement('button');
  aviso.type = 'button';
  aviso.className = 'aviso-som';
  aviso.hidden = true;
  aviso.innerHTML = '<b>SOM DESLIGADO</b><span>Toque em qualquer lugar da tela pra religar</span>';
  document.querySelector('.app').appendChild(aviso);

  const emLuta = () => ['prepara', 'round', 'descanso'].includes(fase);
  const semSom = () => ctx && (somVencido || ctx.state !== 'running');

  function avisoSom() {
    aviso.hidden = !(emLuta() && pausadoRestante === null && semSom());
  }

  // Qualquer toque na tela religa o som (o iPhone so aceita som que nasce de um toque).
  async function religaNoToque() {
    if (!emLuta() || !semSom()) return;
    await ligaSom();
    agenda();
    avisoSom();
  }
  document.addEventListener('touchend', religaNoToque, true);
  document.addEventListener('click', religaNoToque, true);

  /* ---------- fases ---------- */

  function entra(novaFase, segundos, inicioMs) {
    fase = novaFase;
    seq++;
    duracaoFase = segundos;
    fimDaFase = inicioMs + segundos * 1000;
  }

  // Avanca quantas fases tiverem acabado (pode ser mais de uma se a tela ficou apagada).
  function avanca() {
    while (['prepara', 'round', 'descanso'].includes(fase) && pausadoRestante === null && agora() >= fimDaFase) {
      const inicio = fimDaFase;
      if (fase === 'prepara') {
        entra('round', ajuste.tempoRound, inicio);
      } else if (fase === 'round') {
        if (ajuste.totalRounds && round >= ajuste.totalRounds) { fase = 'fim'; soltaTela(); break; }
        if (ajuste.tempoDescanso > 0) entra('descanso', ajuste.tempoDescanso, inicio);
        else { round++; entra('round', ajuste.tempoRound, inicio); }
      } else if (fase === 'descanso') {
        round++;
        entra('round', ajuste.tempoRound, inicio);
      }
    }
  }

  function restante() {
    if (fase === 'ajuste' || fase === 'fim') return 0;
    const ms = pausadoRestante !== null ? pausadoRestante : fimDaFase - agora();
    return Math.max(0, Math.min(duracaoFase, Math.ceil(ms / 1000 - 0.001)));
  }

  function desenha() {
    const estado = {
      fase,
      restante: fase === 'ajuste' ? (ajuste ? ajuste.tempoRound : 300) : restante(),
      round,
      totalRounds: ajuste ? ajuste.totalRounds : null,
      pausado: pausadoRestante !== null,
    };
    const chave = JSON.stringify(estado);
    if (chave !== ultimoRender) { ultimoRender = chave; window.render(estado); }
  }

  function passo() {
    avanca();
    agenda();
    desenha();
    avisoSom();
  }

  // Duas batidas: a da tela (rapida, para o numero trocar na hora) e um intervalo de reserva.
  function laco() { passo(); requestAnimationFrame(laco); }
  requestAnimationFrame(laco);
  setInterval(passo, 250);

  /* ---------- botoes ---------- */

  window.addEventListener('timer:acao', async ev => {
    ev.preventDefault();
    const { acao, configuracao } = ev.detail;

    if (acao === 'iniciar') {
      ajuste = configuracao;
      try { localStorage.setItem(GUARDA, JSON.stringify(configuracao)); } catch (e) {}
      cancelaFuturos();
      agendados = new Map();
      round = 1;
      pausadoRestante = null;
      entra('prepara', PREPARA, agora() + 600); // 0,6 s de folga pro som ligar antes do primeiro beep
      duracaoFase = PREPARA;
      seguraTela();
      passo();
      await ligaSom();
      passo();
    } else if (acao === 'pausar') {
      if (pausadoRestante === null) {
        pausadoRestante = Math.max(0, fimDaFase - agora());
        cancelaFuturos();
      }
      passo();
    } else if (acao === 'continuar') {
      if (pausadoRestante !== null) {
        fimDaFase = agora() + pausadoRestante;
        pausadoRestante = null;
        seguraTela(); // antes de qualquer await: o iPhone so aceita dentro do toque
        await ligaSom();
      }
      passo();
    } else if (acao === 'parar' || acao === 'novo-treino') {
      cancelaFuturos();
      fase = 'ajuste';
      pausadoRestante = null;
      round = 1;
      soltaTela();
      passo();
    }
  });

  document.addEventListener('visibilitychange', () => {
    // foi pro fundo: o iPhone mata o som da pagina; na volta, a faixa vermelha pede um toque
    if (document.hidden) { if (ctx) somVencido = true; return; }
    if (emLuta()) seguraTela();
    passo();
  });
  window.addEventListener('pagehide', () => { if (ctx) somVencido = true; });

  /* ---------- lembrar o ultimo ajuste ---------- */

  function restaura() {
    let a = null;
    try { a = JSON.parse(localStorage.getItem(GUARDA) || 'null'); } catch (e) {}
    if (!a || !a.tempoRound) return;
    const $ = s => document.querySelector(s);
    $('#round-min').value = Math.floor(a.tempoRound / 60);
    $('#round-sec').value = a.tempoRound % 60;
    $('#rest-min').value = Math.floor(a.tempoDescanso / 60);
    $('#rest-sec').value = a.tempoDescanso % 60;
    if (a.totalRounds) { $('#limited').click(); $('#round-count').value = a.totalRounds; $('#round-count').blur(); }
    else $('#unlimited').click();
    $('#settings-form').dispatchEvent(new Event('input', { bubbles: true }));
    ajuste = a;
  }
  restaura();
  baixaSons().catch(() => {});

  /* ---------- funcionar sem internet ---------- */

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
