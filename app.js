const form = document.getElementById('entry-form');
const nameInput = document.getElementById('name-input');
const messageInput = document.getElementById('message-input');
const photoInput = document.getElementById('photo-input');
const preview = document.getElementById('photo-preview');
const statusEl = document.getElementById('form-status');
const submitBtn = document.getElementById('submit-btn');
const entriesList = document.getElementById('entries-list');

let compressedPhotoDataUrl = null;

photoInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) {
    compressedPhotoDataUrl = null;
    preview.hidden = true;
    return;
  }
  try {
    setStatus('Foto wird verarbeitet…', false);
    compressedPhotoDataUrl = await compressImage(file);
    preview.src = compressedPhotoDataUrl;
    preview.hidden = false;
    setStatus('', false);
  } catch (err) {
    console.error(err);
    setStatus('Dieses Foto ist zu gross oder konnte nicht gelesen werden. Bitte ein anderes wählen.', true);
    photoInput.value = '';
    compressedPhotoDataUrl = null;
    preview.hidden = true;
  }
});

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'));
      img.onload = () => {
        const maxDim = 1600;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          } else {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.8;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        let attempts = 0;
        while (dataUrl.length > 1_500_000 && attempts < 5) {
          quality = Math.max(0.3, quality - 0.15);
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          attempts++;
        }
        if (dataUrl.length > 3_000_000) {
          reject(new Error('Bild bleibt zu gross.'));
          return;
        }
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = nameInput.value.trim();
  const message = messageInput.value.trim();
  const website = document.getElementById('website-input').value;

  if (!name) {
    setStatus('Bitte gib deinen Namen ein.', true);
    return;
  }
  if (!message && !compressedPhotoDataUrl) {
    setStatus('Bitte schreib eine Nachricht oder füg ein Foto hinzu.', true);
    return;
  }

  setSubmitting(true);
  try {
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, message, photo: compressedPhotoDataUrl, website }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Unbekannter Fehler.');
    }

    form.reset();
    preview.hidden = true;
    compressedPhotoDataUrl = null;
    setStatus('Danke für deinen Eintrag! 💛', false);
    await loadEntries();
  } catch (err) {
    setStatus(err.message || 'Eintrag konnte nicht gespeichert werden.', true);
  } finally {
    setSubmitting(false);
  }
});

function setSubmitting(isSubmitting) {
  submitBtn.disabled = isSubmitting;
  submitBtn.textContent = isSubmitting ? 'Wird gespeichert…' : 'Eintragen';
}

function setStatus(text, isError) {
  statusEl.textContent = text;
  statusEl.className = 'status' + (text ? (isError ? ' error' : ' success') : '');
}

async function loadEntries() {
  try {
    const res = await fetch('/api/entries');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Fehler beim Laden.');
    renderEntries(data.entries || []);
  } catch (err) {
    console.error(err);
    entriesList.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Einträge konnten nicht geladen werden.';
    entriesList.appendChild(p);
  }
}

function renderEntries(entries) {
  entriesList.innerHTML = '';

  if (!entries.length) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Noch keine Einträge. Sei der/die Erste! ✨';
    entriesList.appendChild(p);
    return;
  }

  const frag = document.createDocumentFragment();
  entries.forEach((entry) => frag.appendChild(buildEntryCard(entry)));
  entriesList.appendChild(frag);
}

function buildEntryCard(entry) {
  const article = document.createElement('article');
  article.className = 'entry-card';

  if (entry.photoUrl) {
    const img = document.createElement('img');
    img.className = 'entry-photo';
    img.src = entry.photoUrl;
    img.alt = `Foto von ${entry.name}`;
    img.loading = 'lazy';
    article.appendChild(img);
  }

  const body = document.createElement('div');
  body.className = 'entry-body';

  const header = document.createElement('div');
  header.className = 'entry-header';

  const nameEl = document.createElement('span');
  nameEl.className = 'entry-name';
  nameEl.textContent = entry.name;

  const dateEl = document.createElement('span');
  dateEl.className = 'entry-date';
  dateEl.textContent = new Date(entry.createdAt).toLocaleDateString('de-CH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  header.appendChild(nameEl);
  header.appendChild(dateEl);
  body.appendChild(header);

  if (entry.message) {
    const msgEl = document.createElement('p');
    msgEl.className = 'entry-message';
    msgEl.textContent = entry.message;
    body.appendChild(msgEl);
  }

  article.appendChild(body);
  return article;
}

loadEntries();
