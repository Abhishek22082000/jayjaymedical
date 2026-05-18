import { getTablet, updateTablet, deleteTablet } from '@/lib/db';

function validate(body) {
  const errors = {};
  if (!body.clientName?.trim())   errors.clientName   = 'Client name is required.';
  if (!body.tabletName?.trim())   errors.tabletName   = 'Tablet name is required.';
  if (!body.manufacturer?.trim()) errors.manufacturer = 'Manufacturer is required.';
  if (!body.batchNumber?.trim())  errors.batchNumber  = 'Batch number is required.';
  const qty = Number.parseInt(body.quantity, 10);
  if (!Number.isFinite(qty) || qty < 1) errors.quantity = 'Enter a quantity of 1 or more.';
  if (!body.startDate) errors.startDate = 'Start date is required.';
  if (!body.endDate)   errors.endDate   = 'Expiry date is required.';
  if (!errors.startDate && !errors.endDate && new Date(body.endDate) < new Date(body.startDate)) {
    errors.endDate = 'Expiry date cannot be earlier than the start date.';
  }
  if (body.manufacturingDate && !errors.endDate && new Date(body.manufacturingDate) > new Date(body.endDate)) {
    errors.manufacturingDate = 'Manufacturing date cannot be after the expiry date.';
  }
  return errors;
}

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const tablet = await getTablet(String(id));
    if (!tablet) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json({ tablet });
  }

  if (req.method === 'PUT') {
    const errors = validate(req.body || {});
    if (Object.keys(errors).length) return res.status(400).json({ errors });
    const tablet = await updateTablet(String(id), req.body);
    if (!tablet) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json({ tablet });
  }

  if (req.method === 'DELETE') {
    const ok = await deleteTablet(String(id));
    if (!ok) return res.status(404).json({ error: 'Not found' });
    return res.status(204).end();
  }

  res.setHeader('Allow', 'GET, PUT, DELETE');
  return res.status(405).json({ error: 'Method Not Allowed' });
}
