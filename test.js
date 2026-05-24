      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
    
      gtag('config', 'G-M7TEVM1KM8');
    // ============================================================
    // ORARIO ENGINE (inlined)
    // ============================================================
    const FESTIVITA_FISSE = [[1, 1], [1, 6], [4, 25], [5, 1], [6, 2], [8, 15], [11, 1], [12, 7], [12, 8], [12, 25], [12, 26]];
    function calcolaPasqua(y) { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), gi = ((h + l - 7 * m + 114) % 31) + 1; return new Date(y, mo - 1, gi); }
    function getTipoGiornata(date = new Date()) { let d = new Date(date); if (d.getHours() < 3) d.setDate(d.getDate() - 1); const g = d.getDay(), m = d.getMonth() + 1, gm = d.getDate(), y = d.getFullYear(); for (const [mm, gg] of FESTIVITA_FISSE) if (m === mm && gm === gg) return "festivo"; const pq = new Date(calcolaPasqua(y)); pq.setDate(pq.getDate() + 1); if (d.getMonth() === pq.getMonth() && d.getDate() === pq.getDate()) return "festivo"; if (g === 0) return "festivo"; if (g === 6) return "sabato"; return "feriale"; }
    function getNextTrains(data, dir, filtro = null, target = new Date(), n = 3) { const dd = data?.[dir]; if (!dd) return []; const tipo = getTipoGiornata(target), orari = dd[tipo]; if (!orari || !Object.keys(orari).length) return []; const oC = target.getHours(), mC = target.getMinutes(), res = []; for (let off = 0; off < 25 && res.length < n; off++) { const oT = (oC + off) % 24, oK = oT.toString().padStart(2, "0"), nodo = orari[oK]; if (nodo == null) continue; if (typeof nodo === "string") { if (off === 0) { let oF = oT; let skipOff = off; for (let lk = 1; lk < 25; lk++) { const nH = (oT + lk) % 24, nK = nH.toString().padStart(2, "0"); if (typeof orari[nK] === "string") { oF = nH; skipOff = off + lk; } else break; } const banner = { ora_partenza: null, destinazione: filtro || dir, minuti_attesa: null, tipo: "frequenza", messaggio: nodo, fascia_inizio: oT, fascia_fine: oF }; if (n <= 3) return [banner]; res.push(banner); off = skipOff; continue; } let oF = oT, skipOff = off; for (let lk = 1; lk < 25; lk++) { const nH = (oC + off + lk) % 24, nK = nH.toString().padStart(2, "0"); if (typeof orari[nK] === "string") { oF = nH; skipOff = off + lk; } else break; } res.push({ ora_partenza: null, destinazione: filtro || dir, minuti_attesa: null, tipo: "frequenza_blocco", messaggio: nodo, fascia_inizio: oT, fascia_fine: oF }); off = skipOff; continue; } if (typeof nodo === "object") { const treni = []; const dests = filtro ? { [filtro]: nodo[filtro] } : nodo; for (const [dest, mins] of Object.entries(dests)) { if (!Array.isArray(mins)) continue; for (const m of mins) { if (off === 0 && m < mC) continue; let att = (oT * 60 + m) - (oC * 60 + mC); if (att < 0) att += 1440; treni.push({ ora_partenza: `${oK}:${m.toString().padStart(2, "0")}`, destinazione: dest, minuti_attesa: att, tipo: "esatto" }); } } treni.sort((a, b) => a.minuti_attesa - b.minuti_attesa); for (const t of treni) { if (res.length >= n) break; res.push(t); } } } return res; }
    function formattaDest(n) { if (!n) return ""; return n.split("_").map(w => ["fs", "pza"].includes(w.toLowerCase()) ? w.toUpperCase() : /^\d+$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" "); }

    // ============================================================
    // DATI
    // ============================================================
    const BASE_URL = "https://raw.githubusercontent.com/simonetriozzi/orariogaia/main/json_orari/";

    // Stazioni M1 da Pagano a Sesto I Maggio (escluso ramo Rho e fermate dopo De Angeli verso Bisceglie)
    const STAZIONI_MILANO = [
      { id: "M1_Pagano", label: "Pagano" },
      { id: "M1_Conciliazione", label: "Conciliazione" },
      { id: "M1_Cadorna", label: "Cadorna" },
      { id: "M1_Cairoli", label: "Cairoli" },
      { id: "M1_Cordusio", label: "Cordusio" },
      { id: "M1_Duomo", label: "Duomo" },
      { id: "M1_San_Babila", label: "San Babila" },
      { id: "M1_Palestro", label: "Palestro" },
      { id: "M1_Porta_Venezia", label: "Porta Venezia" },
      { id: "M1_Lima", label: "Lima" },
      { id: "M1_Loreto", label: "Loreto" },
      { id: "M1_Pasteur", label: "Pasteur" },
      { id: "M1_Rovereto", label: "Rovereto" },
      { id: "M1_Turro", label: "Turro" },
      { id: "M1_Gorla", label: "Gorla" },
      { id: "M1_Precotto", label: "Precotto" },
      { id: "M1_Villa_S_Giovanni", label: "Villa S. Giovanni" },
      { id: "M1_Sesto_Marelli", label: "Sesto Marelli" },
      { id: "M1_Sesto_Rondo", label: "Sesto Rondò" },
      { id: "M1_Sesto_I_Maggio", label: "Sesto I Maggio FS" },
    ];

    const TEMPI_ESCO = [
      { name: "Pagano", min: 2 }, { name: "Conciliazione", min: 4 }, { name: "Cadorna", min: 5 },
      { name: "Cairoli", min: 7 }, { name: "Cordusio", min: 8 }, { name: "Duomo", min: 9 },
      { name: "San Babila", min: 11 }, { name: "Palestro", min: 12 }, { name: "Porta Venezia", min: 14 },
      { name: "Lima", min: 15 }, { name: "Loreto", min: 16 }, { name: "Pasteur", min: 18 },
      { name: "Rovereto", min: 19 }, { name: "Turro", min: 20 }, { name: "Gorla", min: 21 },
      { name: "Precotto", min: 23 }, { name: "Villa S. Giovanni", min: 25 }, { name: "Sesto Marelli", min: 26 },
      { name: "Sesto Rondò", min: 28 }, { name: "Sesto 1° Maggio", min: 29 }
    ];

    const TEMPI_A_CASA = {
      "M1_Pagano": 3, "M1_Conciliazione": 4, "M1_Cadorna": 6, "M1_Cairoli": 7, "M1_Cordusio": 8,
      "M1_Duomo": 10, "M1_San_Babila": 11, "M1_Palestro": 12, "M1_Porta_Venezia": 14, "M1_Lima": 15,
      "M1_Loreto": 17, "M1_Pasteur": 18, "M1_Rovereto": 19, "M1_Turro": 20, "M1_Gorla": 22,
      "M1_Precotto": 23, "M1_Villa_S_Giovanni": 25, "M1_Sesto_Marelli": 26, "M1_Sesto_Rondo": 28, "M1_Sesto_I_Maggio": 30
    };

    function aggiungiMinuti(oraStr, minuti) {
      if (!oraStr) return null;
      const [h, m] = oraStr.split(':').map(Number);
      const data = new Date();
      data.setHours(h, m + minuti, 0, 0);
      return data.getHours().toString().padStart(2, '0') + ':' + data.getMinutes().toString().padStart(2, '0');
    }

    function toggleStops(id, event) {
      event.stopPropagation();
      const detail = document.getElementById(id);
      const toggle = event.currentTarget;
      if (!detail.style.maxHeight || detail.style.maxHeight === '0px' || detail.style.maxHeight === '0') {
        detail.style.maxHeight = detail.scrollHeight + 'px';
        toggle.classList.add('open');
      } else {
        detail.style.maxHeight = '0';
        toggle.classList.remove('open');
      }
    }

    // ============================================================
    // STATE
    // ============================================================
    let percorsoAttivo = null;
    let dataOraCorrente = new Date();
    let cacheJSON = {};
    let stazioneSelezionata = null;
    let limiteN = 3;

    async function caricaJSON(nome) {
      if (cacheJSON[nome]) return cacheJSON[nome];
      if (typeof BUNDLE_ORARI !== 'undefined' && BUNDLE_ORARI[nome]) {
        cacheJSON[nome] = BUNDLE_ORARI[nome];
        return cacheJSON[nome];
      }
      const r = await fetch(`${BASE_URL}${nome}.json`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      cacheJSON[nome] = await r.json();
      return cacheJSON[nome];
    }

    // ============================================================
    // ROUTING
    // ============================================================
    function scegliPercorso(tipo) {
      if (percorsoAttivo !== tipo) {
        limiteN = 3;
      }
      percorsoAttivo = tipo;
      stazioneSelezionata = null;

      document.getElementById('btn-casa').classList.toggle('active', tipo === 'casa');
      document.getElementById('btn-milano').classList.toggle('active', tipo === 'milano');

      if (tipo === 'casa') renderCasa();
      else renderMilano();
    }

    // ============================================================
    // PERCORSO CASA — De Angeli → Sesto
    // ============================================================
    async function renderCasa(targetDate) {
      const now = targetDate || dataOraCorrente;
      const content = document.getElementById('main-content');

      content.innerHTML = `<div class="panel"><div class="loading"><div class="spinner"></div><p>Cerco i treni…</p></div></div>`;

      try {
        const data = await caricaJSON('M1_De_Angeli');
        const treni = getNextTrains(data, 'sesto_1_maggio_fs', null, now, limiteN);
        const tipo = getTipoGiornata(now);
        const oraStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

        let html = `<div class="panel">
      <div class="panel-title"> 🏡 De Angeli → Sesto I Maggio FS</div>
      <div style="font-size:0.75rem;color:var(--text-soft);margin-bottom:14px;">
        ${oraStr} · ${tipo}
      </div>`;
        html += renderTreni(treni);
        if(treni.length > 0) {
          html += `<button class="more-btn" onclick="mostraSuccessivoGaia()">+ Mostra successivo</button>`;
        }
        html += `</div>`;
        content.innerHTML = html;
      } catch (e) {
        document.getElementById('main-content').innerHTML =
          `<div class="panel"><div class="empty">⚠️ Errore nel caricamento. Riprova.</div></div>`;
      }
    }

    // ============================================================
    // PERCORSO MILANO — Ricerca stazione → Bisceglie
    // ============================================================
    function renderMilano() {
      const content = document.getElementById('main-content');
      content.innerHTML = `
    <div class="panel">
      <div class="panel-title">😴 Da dove parti?</div>
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" class="search-input" id="search-stazione" placeholder="Digita una stazione…" autocomplete="off">
        <div class="suggestions" id="suggestions" style="display:none"></div>
      </div>
    </div>
    <div id="result-milano" style="margin-top:0"></div>`;

      const input = document.getElementById('search-stazione');
      const sugBox = document.getElementById('suggestions');

      input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        if (!q) { sugBox.style.display = 'none'; return; }

        const matches = STAZIONI_MILANO.filter(s => s.label.toLowerCase().includes(q));
        if (!matches.length) { sugBox.style.display = 'none'; return; }

        sugBox.innerHTML = matches.map(s => {
          const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
          const label = s.label.replace(re, '<mark>$1</mark>');
          return `<div class="suggestion-item" data-id="${s.id}" data-label="${s.label}">${label}</div>`;
        }).join('');
        sugBox.style.display = 'block';

        sugBox.querySelectorAll('.suggestion-item').forEach(el => {
          el.addEventListener('click', () => {
            input.value = el.dataset.label;
            sugBox.style.display = 'none';
            limiteN = 3;
            selezionaStazione(el.dataset.id, el.dataset.label);
          });
        });
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrap')) sugBox.style.display = 'none';
      }, { once: false });
    }

    async function selezionaStazione(id, label) {
      stazioneSelezionata = id;
      const result = document.getElementById('result-milano');
      result.innerHTML = `<div class="panel" style="margin-top:18px"><div class="loading"><div class="spinner"></div><p>Cerco i treni…</p></div></div>`;

      try {
        const data = await caricaJSON(id);
        const now = dataOraCorrente;
        // Direzione Bisceglie: rho_fiera_bisceglie, filtro bisceglie
        const treni = getNextTrains(data, 'rho_fiera_bisceglie', 'bisceglie', now, limiteN);
        const tipo = getTipoGiornata(now);
        const oraStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

        let html = `<div class="panel" style="margin-top:18px">
      <div class="panel-title">🚇 ${label} → 🏡 Casa</div>
      <div style="font-size:0.75rem;color:var(--text-soft);margin-bottom:14px;">${oraStr} · ${tipo}</div>`;
        html += renderTreni(treni);
        if(treni.length > 0) {
          html += `<button class="more-btn" onclick="mostraSuccessivoGaia()">+ Mostra successivo</button>`;
        }
        html += `</div>`;
        result.innerHTML = html;
      } catch (e) {
        result.innerHTML = `<div class="panel" style="margin-top:18px"><div class="empty">⚠️ Errore nel caricamento.</div></div>`;
      }
    }

    // ============================================================
    // RENDER HELPERS
    // ============================================================
    function renderTreni(treni) {
      if (!treni.length) return `<div class="empty">Nessun treno disponibile in questa fascia oraria 🌙</div>`;

      if (treni.length === 1 && treni[0].tipo === 'frequenza') {
        const t = treni[0];
        const msg = t.messaggio.split(/every/i)[0].trim();
        const fasciaStr = `Dalle ${String(t.fascia_inizio).padStart(2,'0')}:00 alle ${String(t.fascia_fine).padStart(2,'0')}:59`;
        return `<div class="freq-banner">
      <div class="icon">🚇</div>
      <div class="freq-text">${msg}</div>
      <div class="freq-sub">${fasciaStr} — Alta frequenza, non serve controllare gli orari!</div>
    </div>
    <button class="more-btn" onclick="mostraSuccessivoGaia()">+ Mostra metro dopo alta frequenza</button>`;
      }

      let html = treni.map((t, idx) => {
        if (t.tipo === 'frequenza_blocco' || t.tipo === 'frequenza') {
          const msg = t.messaggio.split(/every/i)[0].trim();
          const fasciaStr = `Dalle ${String(t.fascia_inizio).padStart(2,'0')}:00 alle ${String(t.fascia_fine).padStart(2,'0')}:59`;
          return `<div class="freq-banner" style="margin:8px 0">
      <div class="icon">🚇</div>
      <div class="freq-text">${msg}</div>
      <div class="freq-sub">${fasciaStr} — Alta frequenza</div>
    </div>`;
        }

        const timelineId = 'timeline-' + idx + '-' + Date.now();
        let stopsHtml = '';
        
        if (percorsoAttivo === 'casa') {
          stopsHtml = `
            <div class="train-stops-toggle" onclick="toggleStops('${timelineId}', event)">
              <span>Mostra fermate</span> <span class="arrow-icon">▼</span>
            </div>
            <div class="train-stops-detail" id="${timelineId}" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
              <div class="stops-timeline">
                ${TEMPI_ESCO.map(stop => {
                  const arrTime = aggiungiMinuti(t.ora_partenza, stop.min);
                  return '<div class="stop-row"><div class="stop-bullet"></div><div class="stop-name">' + stop.name + '</div><div class="stop-time">' + arrTime + '</div></div>';
                }).join('')}
              </div>
            </div>
          `;
        } else if (percorsoAttivo === 'milano' && stazioneSelezionata) {
          const tDeAngeli = TEMPI_A_CASA[stazioneSelezionata];
          if (tDeAngeli) {
            const arrTime = aggiungiMinuti(t.ora_partenza, tDeAngeli);
            stopsHtml = `
              <div class="arrival-home-pill">
                <span>🏡 Arrivo a De Angeli: <strong>${arrTime}</strong></span>
                <span class="travel-duration">(${tDeAngeli} min)</span>
              </div>
            `;
          }
        }

        return `
    <div class="train-card" style="flex-direction: column; align-items: stretch; gap: 8px;">
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <div class="train-time">${t.ora_partenza}</div>
        <div class="train-info" style="flex: 1; padding: 0 10px;">
          <div class="train-dest">${formattaDest(t.destinazione)}</div>
          <div class="train-wait">Treno programmato</div>
        </div>
        <div class="train-eta">${t.minuti_attesa}<span> min</span></div>
      </div>
      ${stopsHtml}
    </div>`;
      }).join('');
      
      return html;
    }

    function mostraSuccessivoGaia() {
      limiteN++;
      if (percorsoAttivo === 'casa') {
        renderCasa();
      } else {
        selezionaStazione(stazioneSelezionata, document.getElementById('search-stazione').value);
      }
    }

    function apriModalTime() {
      const now = dataOraCorrente;
      document.getElementById('inp-date').value = now.toISOString().split('T')[0];
      document.getElementById('inp-time').value = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
      document.getElementById('time-modal').style.display = 'flex';
    }

    function chiudiModalTime(e) {
      if(e && e.target !== e.currentTarget) return;
      document.getElementById('time-modal').style.display = 'none';
    }

    document.getElementById('apply-time-modal').addEventListener('click', () => {
      const d = document.getElementById('inp-date').value;
      const t = document.getElementById('inp-time').value;
      if (d && t) {
        dataOraCorrente = new Date(`${d}T${t}`);
        chiudiModalTime();
        if (percorsoAttivo === 'casa') renderCasa();
        else if (stazioneSelezionata) selezionaStazione(stazioneSelezionata, document.getElementById('search-stazione').value);
      }
    });

    function impostaOraAttuale() {
      const now = new Date();
      document.getElementById('inp-date').value = now.toISOString().split('T')[0];
      document.getElementById('inp-time').value = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    }

    function toggleDarkMode() {
      const body = document.body;
      const isDark = body.classList.toggle('dark-mode');
      const icon = document.getElementById('theme-icon');
      const text = document.getElementById('theme-text');
      
      if (isDark) {
        icon.textContent = '☀️';
        text.textContent = 'Modalità Giorno';
        localStorage.setItem('gaiaTheme', 'dark');
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) metaTheme.setAttribute('content', '#441c1c');
      } else {
        icon.textContent = '🌙';
        text.textContent = 'Modalità Notte';
        localStorage.setItem('gaiaTheme', 'light');
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) metaTheme.setAttribute('content', '#fdf5f8');
      }
    }

    // Inizializza tema
    if (localStorage.getItem('gaiaTheme') === 'dark') {
      document.body.classList.add('dark-mode');
      const icon = document.getElementById('theme-icon');
      const text = document.getElementById('theme-text');
      if (icon) icon.textContent = '☀️';
      if (text) text.textContent = 'Modalità Giorno';
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) metaTheme.setAttribute('content', '#441c1c');
    }

    // Seleziona automaticamente "Esco! 😁" al caricamento della pagina
    scegliPercorso('casa');
