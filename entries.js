import { put, list } from '@vercel/blob';
import { randomUUID } from 'crypto';

const MAX_PHOTO_BYTES = 2.5 * 1024 * 1024; // decoded size safety net (stays well under Vercel's request body limit once base64-encoded)

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  }
  if (req.method === 'POST') {
    return handlePost(req, res);
  }
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Methode nicht erlaubt.' });
}

async function handleGet(req, res) {
  try {
    const { blobs } = await list({ prefix: 'entries/' });
    const jsonBlobs = blobs.filter((b) => b.pathname.endsWith('.json'));

    const entries = (
      await Promise.all(
        jsonBlobs.map(async (b) => {
          try {
            const r = await fetch(b.url);
            if (!r.ok) return null;
            return await r.json();
          } catch {
            return null;
          }
        })
      )
    ).filter(Boolean);

    entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ entries });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Einträge konnten nicht geladen werden.' });
  }
}

async function handlePost(req, res) {
  try {
    const { name, message, photo, website } = req.body || {};

    // Honeypot: real visitors never fill this hidden field.
    if (website) {
      return res.status(201).json({ entry: null });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Bitte gib deinen Namen ein.' });
    }
    const trimmedMessage = typeof message === 'string' ? message.trim() : '';
    if (!trimmedMessage && !photo) {
      return res.status(400).json({ error: 'Bitte schreib eine Nachricht oder füg ein Foto hinzu.' });
    }

    const id = randomUUID();
    let photoUrl = null;

    if (photo) {
      const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=]+)$/.exec(photo);
      if (!match) {
        return res.status(400).json({ error: 'Ungültiges Bildformat.' });
      }
      const [, contentType, base64Data] = match;
      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length > MAX_PHOTO_BYTES) {
        return res.status(400).json({ error: 'Foto ist zu gross. Bitte ein kleineres Bild wählen.' });
      }
      const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
      const photoBlob = await put(`photos/${id}.${ext}`, buffer, {
        access: 'public',
        contentType,
      });
      photoUrl = photoBlob.url;
    }

    const entry = {
      id,
      name: name.trim().slice(0, 100),
      message: trimmedMessage.slice(0, 2000),
      photoUrl,
      createdAt: new Date().toISOString(),
    };

    await put(`entries/${id}.json`, JSON.stringify(entry), {
      access: 'public',
      contentType: 'application/json',
    });

    return res.status(201).json({ entry });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Eintrag konnte nicht gespeichert werden.' });
  }
}
