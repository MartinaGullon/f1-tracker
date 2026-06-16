/* main.js - tema + calendario/resultados (sin sobreescribir variables CSS innecesarias) */
const API_BASE = 'https://ergast.com/api/f1';
const season = new Date().getFullYear();
const raceListEl = document.getElementById('race-list');
const resultsContainer = document.getElementById('results-container');
const calendarNote = document.getElementById('calendar-note');
const themeToggleBtn = document.getElementById('theme-toggle');

const THEME_KEY = 'f1app_theme';

function applyTheme(theme) {
    if (theme === 'light') {
        document.documentElement.classList.add('light-theme');
        themeToggleBtn.setAttribute('aria-pressed', 'true');

        // Forzar paneles más opacos y asegurar contraste en modo claro
        document.documentElement.style.setProperty('--panel-bg', getComputedStyle(document.documentElement).getPropertyValue('--light-panel-bg') || 'rgba(255,255,255,0.96)');
        document.documentElement.style.setProperty('--card-border', getComputedStyle(document.documentElement).getPropertyValue('--light-card-border') || 'rgba(2,6,23,0.08)');
        // Ajuste del overlay (más fuerte tinte crema)
        document.querySelector('body').style.setProperty('--overlay-opacity', '0.9');
    } else {
        document.documentElement.classList.remove('light-theme');
        themeToggleBtn.setAttribute('aria-pressed', 'false');

        // Forzar paneles más oscuros y overlay más intenso en modo oscuro
        document.documentElement.style.setProperty('--panel-bg', 'rgba(2,6,23,0.78)');
        document.documentElement.style.setProperty('--card-border', 'rgba(255,255,255,0.05)');
        document.querySelector('body').style.setProperty('--overlay-opacity', '1');
    }
}

function getStoredTheme() {
    return localStorage.getItem(THEME_KEY);
}

function detectSystemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function initTheme() {
    const stored = getStoredTheme();
    const theme = stored || detectSystemTheme();
    applyTheme(theme);
}

themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.classList.contains('light-theme') ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
});

initTheme();

/* UTILIDADES FECHA Y FETCH/RENDER (idéntico a la versión previa) */
function formatToART(dateString) {
    const d = new Date(dateString);
    const utc = d.getTime();
    const offsetMs = 3 * 60 * 60 * 1000;
    const artTime = new Date(utc - offsetMs);
    return artTime.toLocaleString('es-AR', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

async function fetchCalendar(season) {
    const url = `${API_BASE}/${season}.json`;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Error al obtener calendario');
        const data = await res.json();
        const races = data.MRData.RaceTable.Races;
        return races;
    } catch (err) {
        console.error(err);
        throw err;
    }
}

function renderRaces(races) {
    raceListEl.innerHTML = '';
    if (!races || races.length === 0) {
        raceListEl.innerHTML = '<li class="muted">No hay carreras para mostrar.</li>';
        return;
    }

    races.forEach(race => {
        const li = document.createElement('li');
        li.className = 'race-item';
        li.tabIndex = 0;
        li.setAttribute('role', 'button');

        const raceName = document.createElement('div');
        raceName.className = 'race-title';
        raceName.textContent = `${race.raceName} · ${race.Circuit.circuitName}`;

        const meta = document.createElement('div');
        meta.className = 'race-meta';
        const round = document.createElement('span');
        round.textContent = `Ronda ${race.round}`;
        const date = document.createElement('span');
        const dateTime = race.date + (race.time ? 'T' + race.time : '');
        date.textContent = formatToART(dateTime);

        meta.appendChild(round);
        meta.appendChild(date);

        li.appendChild(raceName);
        li.appendChild(meta);

        li.addEventListener('click', () => {
            showRaceDetails(race);
            document.getElementById('resultados').scrollIntoView({ behavior: 'smooth' });
        });

        li.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                li.click();
            }
        });

        raceListEl.appendChild(li);
    });
}

function showRaceDetails(race) {
    resultsContainer.innerHTML = '';
    const title = document.createElement('h3');
    title.textContent = `${race.raceName} · ${race.Circuit.circuitName}`;

    const info = document.createElement('p');
    const dateTime = race.date + (race.time ? 'T' + race.time : '');
    info.innerHTML = `<strong>Fecha</strong>: ${formatToART(dateTime)}<br>
                    <strong>País</strong>: ${race.Circuit.Location.country}<br>
                    <strong>Localidad</strong>: ${race.Circuit.Location.locality}`;

    const note = document.createElement('p');
    note.className = 'muted';
    note.textContent = 'Haz clic en "Ver resultados" para cargar resultados oficiales de la carrera.';

    const btn = document.createElement('button');
    btn.textContent = 'Ver resultados';
    btn.className = 'btn';
    btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Cargando...';
        try {
            const results = await fetchRaceResults(season, race.round);
            renderResults(results);
        } catch (err) {
            resultsContainer.innerHTML = `<p class="muted">No se pudieron cargar los resultados.</p>`;
        } finally {
            btn.disabled = false;
            btn.textContent = 'Ver resultados';
        }
    });

    resultsContainer.appendChild(title);
    resultsContainer.appendChild(info);
    resultsContainer.appendChild(note);
    resultsContainer.appendChild(btn);
}

async function fetchRaceResults(season, round) {
    const url = `${API_BASE}/${season}/${round}/results.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al obtener resultados');
    const data = await res.json();
    return data.MRData.RaceTable.Races[0];
}

function renderResults(raceWithResults) {
    if (!raceWithResults || !raceWithResults.Results) {
        resultsContainer.innerHTML += `<p class="muted">No hay resultados disponibles.</p>`;
        return;
    }

    const table = document.createElement('table');
    table.className = 'results-table';
    table.innerHTML = `
    <thead>
      <tr>
        <th>Pos</th>
        <th>Piloto</th>
        <th>Equipo</th>
        <th>Tiempo</th>
        <th>Puntos</th>
      </tr>
    </thead>
    <tbody>
      ${raceWithResults.Results.map(r => `
        <tr>
          <td>${r.position}</td>
          <td>${r.Driver.givenName} ${r.Driver.familyName}</td>
          <td>${r.Constructor.name}</td>
          <td>${r.Time ? r.Time.time : (r.status || 'N/A')}</td>
          <td>${r.points}</td>
        </tr>
      `).join('')}
    </tbody>
  `;

    resultsContainer.appendChild(table);
}

async function init() {
    try {
        const races = await fetchCalendar(season);
        calendarNote.style.display = 'none';
        renderRaces(races);
    } catch (err) {
        raceListEl.innerHTML = '<li class="muted">Error cargando calendario. Intenta recargar la página.</li>';
    }
}

init();
