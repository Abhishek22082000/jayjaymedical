import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const DB_PATH = path.join(process.cwd(), 'data', 'database.json');

async function readRaw() {
  const text = await fs.readFile(DB_PATH, 'utf8');
  const data = JSON.parse(text);
  if (!Array.isArray(data.tablets)) data.tablets = [];
  return data;
}

async function writeRaw(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

export async function listTablets() {
  const { tablets } = await readRaw();
  return tablets;
}

export async function getTablet(id) {
  const tablets = await listTablets();
  return tablets.find((t) => t.id === id) || null;
}

export async function createTablet(input) {
  const data = await readRaw();
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
  data.tablets.push(tablet);
  await writeRaw(data);
  return tablet;
}

export async function updateTablet(id, input) {
  const data = await readRaw();
  const idx = data.tablets.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const current = data.tablets[idx];
  data.tablets[idx] = {
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
  await writeRaw(data);
  return data.tablets[idx];
}

export async function deleteTablet(id) {
  const data = await readRaw();
  const before = data.tablets.length;
  data.tablets = data.tablets.filter((t) => t.id !== id);
  if (data.tablets.length === before) return false;
  await writeRaw(data);
  return true;
}

export async function distinctValues(field) {
  const tablets = await listTablets();
  return [...new Set(tablets.map((t) => t[field]).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}
