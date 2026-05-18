import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

function findKvCredentials() {
  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return { url, token };

  for (const key of Object.keys(process.env)) {
    if (!key.endsWith('_REST_API_URL')) continue;
    const tokenKey = key.slice(0, -'_REST_API_URL'.length) + '_REST_API_TOKEN';
    const u = process.env[key];
    const t = process.env[tokenKey];
    if (u && t && /^https?:\/\//i.test(u)) return { url: u, token: t };
  }
  return null;
}

const _creds = findKvCredentials();
const KV_URL   = _creds?.url;
const KV_TOKEN = _creds?.token;
const USE_KV   = Boolean(KV_URL && KV_TOKEN);

const DB_PATH = path.join(process.cwd(), 'data', 'database.json');
const KV_KEY  = 'tablets';

let _redis = null;
async function getRedis() {
  if (_redis) return _redis;
  const { Redis } = await import('@upstash/redis');
  _redis = new Redis({ url: KV_URL, token: KV_TOKEN });
  return _redis;
}

async function readAll() {
  if (USE_KV) {
    const redis = await getRedis();
    const data = await redis.get(KV_KEY);
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
      try { return JSON.parse(data); } catch { return []; }
    }
    return [];
  }
  try {
    const text = await fs.readFile(DB_PATH, 'utf8');
    const obj = JSON.parse(text);
    return Array.isArray(obj.tablets) ? obj.tablets : [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeAll(tablets) {
  if (USE_KV) {
    const redis = await getRedis();
    await redis.set(KV_KEY, tablets);
    return;
  }
  await fs.writeFile(DB_PATH, JSON.stringify({ tablets }, null, 2), 'utf8');
}

export async function listTablets() {
  return readAll();
}

export async function getTablet(id) {
  const tablets = await readAll();
  return tablets.find((t) => t.id === id) || null;
}

export async function createTablet(input) {
  const tablets = await readAll();
  const tablet = {
    id: crypto.randomUUID(),
    clientName: String(input.clientName || '').trim(),
    tabletName: String(input.tabletName || '').trim(),
    manufacturer: String(input.manufacturer || '').trim(),
    batchNumber: String(input.batchNumber || '').trim(),
    quantity: Number.parseInt(input.quantity, 10) || 0,
    startDate: input.startDate || '',
    manufacturingDate: input.manufacturingDate || null,
    endDate: input.endDate || '',
    createdAt: new Date().toISOString(),
  };
  tablets.push(tablet);
  await writeAll(tablets);
  return tablet;
}

export async function updateTablet(id, input) {
  const tablets = await readAll();
  const idx = tablets.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const current = tablets[idx];
  tablets[idx] = {
    ...current,
    clientName: String(input.clientName ?? current.clientName).trim(),
    tabletName: String(input.tabletName ?? current.tabletName).trim(),
    manufacturer: String(input.manufacturer ?? current.manufacturer).trim(),
    batchNumber: String(input.batchNumber ?? current.batchNumber).trim(),
    quantity: Number.parseInt(input.quantity ?? current.quantity, 10) || 0,
    startDate: input.startDate ?? current.startDate,
    manufacturingDate:
      input.manufacturingDate === '' ? null : input.manufacturingDate ?? current.manufacturingDate,
    endDate: input.endDate ?? current.endDate,
  };
  await writeAll(tablets);
  return tablets[idx];
}

export async function deleteTablet(id) {
  const tablets = await readAll();
  const before = tablets.length;
  const next = tablets.filter((t) => t.id !== id);
  if (next.length === before) return false;
  await writeAll(next);
  return true;
}

export async function distinctValues(field) {
  const tablets = await readAll();
  return [...new Set(tablets.map((t) => t[field]).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}
