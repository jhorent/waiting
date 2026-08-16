const STORAGE_KEY    = 'kine_patients';
const ARCHIVE_KEY    = 'kine_patients_archives';
const SHADOW_KEY     = 'kine_shadow_backup';
const AUTOEXP_KEY    = 'kine_autoexport_minutes';

const REQUIRED_FIELDS = ['nom', 'telephone', 'motif', 'date-entree'];

let editState      = null;
let isDirty        = false;
let autoExportTimer = null;
let patientSort    = { field: null, dir: 'asc' };
let archiveSort    = { field: null, dir: 'asc' };

const STATUTS = {
  en_attente:     { label: 'En attente',     badge: 'secondary' },
  message_laisse: { label: 'Message laissé', badge: 'warning'   },
  refuse:         { label: 'Refusé',         badge: 'danger'    },
  rdv_confirme:   { label: 'RDV confirmé',   badge: 'success'   }
};

const KINES = {
  antoine: { label: 'Antoine', color: '#1565c0' },
  aymeric: { label: 'Aymeric', color: '#212121' },
  rym:     { label: 'Rym',     color: '#e65100' },
};

function loadPatients() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function savePatients(patients) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
  isDirty = true;
}

function loadArchives() {
  const raw = localStorage.getItem(ARCHIVE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveArchives(archives) {
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archives));
  isDirty = true;
}

function todayStr() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-');
}

function dateToInput(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

function inputToDate(str) {
  if (!str) return '';
  const parts = str.split('/');
  if (parts.length !== 3 || parts[2].length !== 4) return '';
  return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
}

function formatDateInput(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
}

function formatDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

function formatJours(jours) {
  if (!jours || jours.length === 0) return '—';
  const order = ['lun', 'mar', 'mer', 'jeu', 'ven'];
  return order.filter(j => jours.includes(j)).join('/');
}

function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showError(msg) {
  const el = document.getElementById('error-alert');
  document.getElementById('error-message').textContent = msg;
  el.classList.remove('d-none');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideError() {
  document.getElementById('error-alert').classList.add('d-none');
}

function isDuplicate(nom, telephone) {
  const nomN = nom.trim().toLowerCase();
  const telN = telephone.trim().replace(/\s/g, '');
  return loadPatients().some(p => {
    const sameName = p.nom.toLowerCase() === nomN;
    const sameTel  = p.telephone.replace(/\s/g, '') === telN;
    return sameName || sameTel;
  });
}

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ');
}

function markErrors(ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el.value.trim()) el.classList.add('field-error');
  });
}

function clearFieldError(id) {
  document.getElementById(id).classList.remove('field-error');
}

function resetForm() {
  document.getElementById('patient-form').reset();
  document.getElementById('date-entree').value = dateToInput(todayStr());
  document.querySelectorAll('.jour-check').forEach(cb => cb.checked = false);
  REQUIRED_FIELDS.forEach(id => document.getElementById(id).classList.remove('field-error'));
  hideError();
}

function startEdit(id, source) {
  const list = source === 'archives' ? loadArchives() : loadPatients();
  const p = list.find(p => p.id === id);
  if (!p) return;

  editState = { id, source };

  document.getElementById('nom').value              = p.nom;
  const kineRadio = document.querySelector(`input[name="kine"][value="${p.kine || ''}"]`);
  if (kineRadio) kineRadio.checked = true;
  document.getElementById('valide').checked = !!p.valide;
  document.getElementById('telephone').value        = p.telephone;
  document.getElementById('motif').value            = p.motif;
  document.getElementById('date-entree').value      = dateToInput(p.dateEntree);
  document.getElementById('date-disponibilite').value = dateToInput(p.dateDisponibilite || '');
  const jours = p.joursDisponibles || [];
  document.querySelectorAll('.jour-check').forEach(cb => cb.checked = jours.includes(cb.value));

  const header = document.getElementById('form-card-header');
  header.classList.replace('bg-light', 'bg-warning');
  header.classList.add('bg-opacity-50');
  document.getElementById('form-title').textContent = `Modifier — ${p.nom}`;
  document.getElementById('btn-submit').textContent = 'Enregistrer';
  document.getElementById('btn-cancel-edit').classList.remove('d-none');

  document.getElementById('patient-form').closest('.card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function cancelEdit() {
  editState = null;
  const header = document.getElementById('form-card-header');
  header.classList.replace('bg-warning', 'bg-light');
  header.classList.remove('bg-opacity-50');
  document.getElementById('form-title').textContent = 'Nouveau patient';
  document.getElementById('btn-submit').textContent = 'Ajouter';
  document.getElementById('btn-cancel-edit').classList.add('d-none');
  resetForm();
}

function updateStatut(id, statut) {
  const patients = loadPatients();
  const p = patients.find(p => p.id === id);
  if (p) {
    p.statut = statut;
    p.dateStatutChange = new Date().toISOString();
    savePatients(patients);
    renderAll();
  }
}

function archivePatient(id) {
  const patients = loadPatients();
  const idx = patients.findIndex(p => p.id === id);
  if (idx === -1) return;
  const patient = { ...patients[idx], dateArchivage: new Date().toISOString() };
  const archives = loadArchives();
  archives.push(patient);
  saveArchives(archives);
  patients.splice(idx, 1);
  savePatients(patients);
  renderAll();
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAll() {
  const data = {
    exportDate: new Date().toISOString(),
    patients: loadPatients(),
    archives: loadArchives()
  };
  downloadJSON(data, `kine_backup_${todayStr()}.json`);
}

const STATUT_LABELS = {
  'en attente':    'en_attente',
  'message laissé':'message_laisse',
  'message laisse':'message_laisse',
  'refusé':        'refuse',
  'refuse':        'refuse',
  'rdv confirmé':  'rdv_confirme',
  'rdv confirme':  'rdv_confirme'
};

function normalizeStatut(val) {
  if (!val) return 'en_attente';
  if (STATUTS[val]) return val;
  return STATUT_LABELS[val.toLowerCase().trim()] || 'en_attente';
}

function normalizeDate(val) {
  if (!val) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  return '';
}

function normalizeImport(data) {
  let counter = Date.now();
  const seenIds = new Set();

  function fixBase(p) {
    let id = p.id;
    if (!id || seenIds.has(id)) id = counter++;
    seenIds.add(id);
    const nom = p.nom || '';
    return {
      ...p,
      id,
      nom,
      statut:           normalizeStatut(p.statut),
      kine:             p.kine || '',
      valide:           !!p.valide,
      dateEntree:       normalizeDate(p.dateEntree),
      dateDisponibilite:normalizeDate(p.dateDisponibilite),
      joursDisponibles: Array.isArray(p.joursDisponibles) ? p.joursDisponibles : []
    };
  }

  return {
    ...data,
    patients: data.patients.map(p => fixBase(p)),
    archives: data.archives.map(p => ({
      ...fixBase(p),
      dateArchivage: p.dateArchivage || p.dateStatutChange || new Date().toISOString()
    }))
  };
}

function importAll(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const raw = JSON.parse(e.target.result);
      if (!Array.isArray(raw.patients) || !Array.isArray(raw.archives)) {
        alert('Fichier invalide : il doit contenir les champs "patients" et "archives".');
        return;
      }
      const data = normalizeImport(raw);
      const msg = `Importer ${data.patients.length} patient(s) en attente et ${data.archives.length} archive(s) ?\n\nLes données actuelles seront remplacées.`;
      if (!confirm(msg)) return;
      savePatients(data.patients);
      saveArchives(data.archives);
      renderAll();
    } catch(err) {
      alert('Erreur import : ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function showToast(msg) {
  document.getElementById('autoexport-toast-body').textContent = msg;
  bootstrap.Toast.getOrCreateInstance(document.getElementById('autoexport-toast'), { delay: 4000 }).show();
}

function autoExportNow() {
  if (!isDirty) return;
  const data = {
    exportDate: new Date().toISOString(),
    patients: loadPatients(),
    archives: loadArchives()
  };
  localStorage.setItem(SHADOW_KEY, JSON.stringify(data));
  downloadJSON(data, `kine_backup_${todayStr()}.json`);
  isDirty = false;
  const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('autoexport-status').textContent = `Dernière sauvegarde : ${time}`;
  showToast(`Sauvegarde automatique effectuée à ${time}`);
}

function setupAutoExport() {
  if (autoExportTimer) clearInterval(autoExportTimer);
  const minutes = parseInt(document.getElementById('autoexport-interval').value) || 0;
  localStorage.setItem(AUTOEXP_KEY, minutes);
  const statusEl = document.getElementById('autoexport-status');
  if (minutes > 0) {
    autoExportTimer = setInterval(autoExportNow, minutes * 60 * 1000);
    statusEl.textContent = statusEl.textContent || 'En attente de changement…';
  } else {
    statusEl.textContent = 'Désactivé';
  }
}

function toggleSort(table, field) {
  const state = table === 'patients' ? patientSort : archiveSort;
  if (state.field === field) {
    if (state.dir === 'asc') state.dir = 'desc';
    else { state.field = null; state.dir = 'asc'; }
  } else {
    state.field = field;
    state.dir = 'asc';
  }
  renderAll();
}

function applySort(items, state) {
  if (!state.field) {
    return items.sort((a, b) => {
      const da = a.dateEntree || '', db = b.dateEntree || '';
      if (da !== db) return da > db ? -1 : 1;
      return (a.nom || '').toLowerCase() < (b.nom || '').toLowerCase() ? -1 : 1;
    });
  }
  return items.sort((a, b) => {
    let va = a[state.field] || '';
    let vb = b[state.field] || '';
    if (state.field === 'nom') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return state.dir === 'asc' ? cmp : -cmp;
  });
}

function updateSortHeaders() {
  const COLS = [
    ['date',    'dateEntree'],
    ['nom',     'nom'],
    ['dispo',   'dateDisponibilite'],
    ['archive', 'dateArchivage'],
  ];
  [
    { prefix: 'attente',  state: patientSort },
    { prefix: 'archives', state: archiveSort }
  ].forEach(({ prefix, state }) => {
    COLS.forEach(([key, field]) => {
      const th = document.getElementById(`th-${prefix}-${key}`);
      if (!th) return;
      th.classList.remove('sort-asc', 'sort-desc');
      if (state.field === field) th.classList.add(`sort-${state.dir}`);
    });
  });
}

function matchesSearch(p, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return [p.nom, p.telephone, p.motif]
    .some(v => v && v.toLowerCase().includes(q));
}

function renderTable(query) {
  const all = applySort(loadPatients(), patientSort);
  const patients = query ? all.filter(p => matchesSearch(p, query)) : all;

  document.getElementById('patient-count').textContent =
    query ? `${patients.length}/${all.length}` : all.length;

  const tbody = document.getElementById('patients-tbody');

  if (patients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">Aucun patient dans la liste d\'attente</td></tr>';
    return 0;
  }

  tbody.innerHTML = patients.map(p => {
    const options = Object.entries(STATUTS)
      .map(([key, val]) => `<option value="${key}"${p.statut === key ? ' selected' : ''}>${val.label}</option>`)
      .join('');

    const archiveBtn = p.statut !== 'en_attente'
      ? `<button class="btn btn-sm btn-outline-secondary ms-1 text-nowrap" onclick="archivePatient(${p.id})" title="Archiver ce patient">Archiver</button>`
      : '';

    return `<tr class="row-editable" onclick="startEdit(${p.id}, 'patients')">
      <td class="text-nowrap">${formatDate(p.dateEntree)}</td>
      <td><strong>${escapeHtml(p.nom)}</strong></td>
      <td class="text-center" onclick="event.stopPropagation()"><input type="checkbox" class="form-check-input" ${p.valide ? 'checked' : ''} onchange="toggleValide(${p.id}, 'patients')"></td>
      <td class="text-center">${p.kine && KINES[p.kine] ? `<span class="kine-dot" style="background:${KINES[p.kine].color}" title="${KINES[p.kine].label}"></span>` : ''}</td>
      <td class="text-nowrap">${escapeHtml(p.telephone)}</td>
      <td class="motif-cell" title="${escapeHtml(p.motif)}">${escapeHtml(p.motif)}</td>
      <td class="text-nowrap">${formatDate(p.dateDisponibilite)}</td>
      <td class="text-nowrap">${formatJours(p.joursDisponibles)}</td>
      <td onclick="event.stopPropagation()">
        <div class="d-flex align-items-center flex-nowrap">
          <select class="form-select form-select-sm statut-select" data-id="${p.id}">
            ${options}
          </select>
          ${archiveBtn}
        </div>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.statut-select').forEach(sel => {
    sel.addEventListener('change', e => updateStatut(Number(e.target.dataset.id), e.target.value));
  });

  return patients.length;
}

function unarchivePatient(id) {
  const archives = loadArchives();
  const idx = archives.findIndex(p => p.id === id);
  if (idx === -1) return;
  const patient = { ...archives[idx], statut: 'en_attente' };
  delete patient.dateArchivage;
  const patients = loadPatients();
  patients.push(patient);
  savePatients(patients);
  archives.splice(idx, 1);
  saveArchives(archives);
  renderAll();
}

function toggleValide(id, source) {
  const list = source === 'archives' ? loadArchives() : loadPatients();
  const p = list.find(p => p.id === id);
  if (!p) return;
  p.valide = !p.valide;
  source === 'archives' ? saveArchives(list) : savePatients(list);
  renderAll();
}

function updateArchiveStatut(id, statut) {
  const archives = loadArchives();
  const p = archives.find(p => p.id === id);
  if (p) {
    p.statut = statut;
    p.dateStatutChange = new Date().toISOString();
    saveArchives(archives);
    renderAll();
  }
}

function renderArchives(query) {
  const all = applySort(loadArchives(), archiveSort);
  const archives = query ? all.filter(p => matchesSearch(p, query)) : all;

  document.getElementById('archive-count').textContent =
    query ? `${archives.length}/${all.length}` : all.length;

  const tbody = document.getElementById('archives-tbody');

  if (archives.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-4">Aucune archive</td></tr>';
    return 0;
  }

  tbody.innerHTML = archives.map(p => {
    const archiveOptions = Object.entries(STATUTS)
      .filter(([key]) => key !== 'en_attente')
      .map(([key, val]) => `<option value="${key}"${p.statut === key ? ' selected' : ''}>${val.label}</option>`)
      .join('');

    return `<tr class="row-editable" onclick="startEdit(${p.id}, 'archives')">
      <td class="text-nowrap">${formatDate(p.dateEntree)}</td>
      <td><strong>${escapeHtml(p.nom)}</strong></td>
      <td class="text-center" onclick="event.stopPropagation()"><input type="checkbox" class="form-check-input" ${p.valide ? 'checked' : ''} onchange="toggleValide(${p.id}, 'archives')"></td>
      <td class="text-center">${p.kine && KINES[p.kine] ? `<span class="kine-dot" style="background:${KINES[p.kine].color}" title="${KINES[p.kine].label}"></span>` : ''}</td>
      <td class="text-nowrap">${escapeHtml(p.telephone)}</td>
      <td class="motif-cell" title="${escapeHtml(p.motif)}">${escapeHtml(p.motif)}</td>
      <td class="text-nowrap">${formatDate(p.dateDisponibilite)}</td>
      <td class="text-nowrap">${formatJours(p.joursDisponibles)}</td>
      <td onclick="event.stopPropagation()">
        <div class="d-flex align-items-center flex-nowrap gap-1">
          <select class="form-select form-select-sm archive-statut-select" data-id="${p.id}">
            ${archiveOptions}
          </select>
          <button class="btn btn-sm btn-outline-secondary text-nowrap" onclick="unarchivePatient(${p.id})" title="Remettre en liste d'attente">↩</button>
        </div>
      </td>
      <td class="text-nowrap">${formatDateTime(p.dateArchivage)}</td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.archive-statut-select').forEach(sel => {
    sel.addEventListener('change', e => updateArchiveStatut(Number(e.target.dataset.id), e.target.value));
  });

  return archives.length;
}

function renderAll() {
  const query = document.getElementById('search-global').value.trim();
  const attenteCount  = renderTable(query);
  const archivesCount = renderArchives(query);

  if (query) {
    const btnAttente  = document.getElementById('btn-tab-attente');
    const btnArchives = document.getElementById('btn-tab-archives');
    if (archivesCount > attenteCount) {
      bootstrap.Tab.getOrCreateInstance(btnArchives).show();
    } else {
      bootstrap.Tab.getOrCreateInstance(btnAttente).show();
    }
  }
  updateSortHeaders();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('date-entree').value = dateToInput(todayStr());

  document.getElementById('search-global').addEventListener('input', renderAll);
  document.getElementById('import-file').addEventListener('change', importAll);

  const savedInterval = localStorage.getItem(AUTOEXP_KEY);
  if (savedInterval !== null) {
    document.getElementById('autoexport-interval').value = savedInterval;
  }
  document.getElementById('autoexport-interval').addEventListener('change', setupAutoExport);
  setupAutoExport();

  document.getElementById('telephone').addEventListener('input', e => {
    e.target.value = formatPhone(e.target.value);
  });

  ['date-entree', 'date-disponibilite'].forEach(id => {
    document.getElementById(id).addEventListener('input', e => {
      e.target.value = formatDateInput(e.target.value);
    });
  });

  REQUIRED_FIELDS.forEach(id => {
    document.getElementById(id).addEventListener('input', () => clearFieldError(id));
  });

  document.getElementById('patient-form').addEventListener('submit', e => {
    e.preventDefault();
    hideError();

    const nom               = document.getElementById('nom').value.trim();
    const telephone         = document.getElementById('telephone').value.trim();
    const motif             = document.getElementById('motif').value.trim();
    const dateEntree        = inputToDate(document.getElementById('date-entree').value);
    const dateDisponibilite = inputToDate(document.getElementById('date-disponibilite').value);
    const joursDisponibles  = Array.from(document.querySelectorAll('.jour-check:checked')).map(cb => cb.value);
    const kine              = document.querySelector('input[name="kine"]:checked')?.value || '';
    const valide            = document.getElementById('valide').checked;

    if (!nom || !telephone || !motif || !dateEntree) {
      markErrors(['nom', 'telephone', 'motif', 'date-entree']);
      showError('Veuillez remplir tous les champs obligatoires (marqués *).');
      return;
    }

    if (editState) {
      const list = editState.source === 'archives' ? loadArchives() : loadPatients();
      const idx = list.findIndex(p => p.id === editState.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], nom, telephone, motif, dateEntree, dateDisponibilite, joursDisponibles, kine, valide };
        editState.source === 'archives' ? saveArchives(list) : savePatients(list);
      }
      cancelEdit();
      renderAll();
      return;
    }

    if (isDuplicate(nom, telephone)) {
      showError('Un patient avec ce nom/prénom ou ce numéro de téléphone existe déjà dans la liste.');
      return;
    }

    const patients = loadPatients();
    patients.push({
      id: Date.now(),
      nom, telephone, motif,
      dateEntree, dateDisponibilite, joursDisponibles, kine, valide,
      statut: 'en_attente'
    });
    savePatients(patients);
    resetForm();
    renderAll();
  });

  renderAll();
});
