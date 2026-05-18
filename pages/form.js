import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

import AppBar from '@/components/AppBar';
import Icon   from '@/components/Icon';

import { getTablet, distinctValues } from '@/lib/db';

export async function getServerSideProps({ query }) {
  const id = query.id ? String(query.id) : null;
  let tablet = null;
  if (id) tablet = await getTablet(id);

  const tabletNames   = await distinctValues('tabletName');
  const manufacturers = await distinctValues('manufacturer');

  return {
    props: {
      editId: tablet ? tablet.id : null,
      initial: tablet || {
        clientName: '', tabletName: '', manufacturer: '', batchNumber: '',
        quantity: '', startDate: '', manufacturingDate: '', endDate: '',
      },
      tabletNames,
      manufacturers,
    },
  };
}

function validate(data) {
  const errors = {};
  if (!data.clientName.trim())   errors.clientName   = 'Client name is required.';
  if (!data.tabletName.trim())   errors.tabletName   = 'Tablet name is required.';
  if (!data.manufacturer.trim()) errors.manufacturer = 'Manufacturer is required.';
  if (!data.batchNumber.trim())  errors.batchNumber  = 'Batch number is required.';
  const qty = Number.parseInt(data.quantity, 10);
  if (!Number.isFinite(qty) || qty < 1) errors.quantity = 'Enter a quantity of 1 or more.';
  if (!data.startDate) errors.startDate = 'Start date is required.';
  if (!data.endDate)   errors.endDate   = 'Expiry date is required.';
  if (!errors.startDate && !errors.endDate && new Date(data.endDate) < new Date(data.startDate)) {
    errors.endDate = 'Expiry date cannot be earlier than the start date.';
  }
  if (data.manufacturingDate && !errors.endDate && new Date(data.manufacturingDate) > new Date(data.endDate)) {
    errors.manufacturingDate = 'Manufacturing date cannot be after the expiry date.';
  }
  return errors;
}

export default function FormPage({ editId, initial, tabletNames, manufacturers }) {
  const router = useRouter();
  const [data, setData] = useState({
    clientName: initial.clientName || '',
    tabletName: initial.tabletName || '',
    manufacturer: initial.manufacturer || '',
    batchNumber: initial.batchNumber || '',
    quantity: initial.quantity ?? '',
    startDate: initial.startDate || '',
    manufacturingDate: initial.manufacturingDate || '',
    endDate: initial.endDate || '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const onChange = (k) => (e) => setData((d) => ({ ...d, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(data);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      const url = editId ? `/api/tablets/${editId}` : '/api/tablets';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrors(body.errors || { _form: 'Save failed. Please try again.' });
        setBusy(false);
        return;
      }
      router.push('/?saved=1');
    } catch (err) {
      setErrors({ _form: 'Network error. Please try again.' });
      setBusy(false);
    }
  };

  return (
    <>
      <Head><title>{editId ? 'Edit Tablet' : 'Add Tablet'} — JJ Medical</title></Head>

      <AppBar
        actions={
          <>
            <Link href="/" className="btn btn-ghost btn-sm">
              <Icon name="list-ul" /><span> All Records</span>
            </Link>
            <Link href="/grouped" className="btn btn-ghost btn-sm">
              <Icon name="collection" /><span> By Tablet</span>
            </Link>
          </>
        }
      />

      <main className="container" style={{ paddingBottom: '3rem' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <div className="page-strip">
            <div>
              <h1>{editId ? 'Edit Tablet Record' : 'Register New Tablet'}</h1>
              <p>{editId ? 'Update the tablet details below.' : 'Add a new tablet with batch, quantity and expiry information.'}</p>
            </div>
          </div>

          {errors._form && (
            <div className="alert alert--danger mb-4">
              <Icon name="exclamation-triangle-fill" style={{ color: 'var(--c-danger)' }} />
              <div>{errors._form}</div>
            </div>
          )}

          <div className="surface surface-pad">
            <form onSubmit={onSubmit} noValidate>
              <p className="section-label">Tablet Information</p>
              <div className="form-grid">
                <div className="field col-6">
                  <label htmlFor="tabletName" className="field-label"><Icon name="capsule-pill" /> Tablet Name</label>
                  <input id="tabletName" list="dl-tablets" value={data.tabletName} onChange={onChange('tabletName')}
                         className={`input ${errors.tabletName ? 'input--invalid' : ''}`} placeholder="e.g. Paracetamol 500mg" />
                  <datalist id="dl-tablets">{tabletNames.map((n) => <option key={n} value={n} />)}</datalist>
                  {errors.tabletName && <div className="error-text">{errors.tabletName}</div>}
                </div>
                <div className="field col-6">
                  <label htmlFor="manufacturer" className="field-label"><Icon name="building" /> Manufacturer</label>
                  <input id="manufacturer" list="dl-manufacturers" value={data.manufacturer} onChange={onChange('manufacturer')}
                         className={`input ${errors.manufacturer ? 'input--invalid' : ''}`} placeholder="e.g. Cipla, Sun Pharma" />
                  <datalist id="dl-manufacturers">{manufacturers.map((n) => <option key={n} value={n} />)}</datalist>
                  {errors.manufacturer && <div className="error-text">{errors.manufacturer}</div>}
                </div>
                <div className="field col-7">
                  <label htmlFor="batchNumber" className="field-label"><Icon name="upc-scan" /> Batch Number</label>
                  <div className="input-group">
                    <span className="prefix">#</span>
                    <input id="batchNumber" value={data.batchNumber} onChange={onChange('batchNumber')}
                           className={`input ${errors.batchNumber ? 'input--invalid' : ''}`} placeholder="e.g. BN-2026-00471" />
                  </div>
                  {errors.batchNumber && <div className="error-text">{errors.batchNumber}</div>}
                </div>
                <div className="field col-5">
                  <label htmlFor="quantity" className="field-label"><Icon name="stack" /> Quantity (strips / units)</label>
                  <input id="quantity" type="number" min="1" step="1" value={data.quantity} onChange={onChange('quantity')}
                         className={`input ${errors.quantity ? 'input--invalid' : ''}`} placeholder="e.g. 100" />
                  {errors.quantity && <div className="error-text">{errors.quantity}</div>}
                </div>
              </div>

              <hr className="divider" />

              <p className="section-label">Client &amp; Dates</p>
              <div className="form-grid">
                <div className="field col-12">
                  <label htmlFor="clientName" className="field-label"><Icon name="person" /> Client Name</label>
                  <input id="clientName" value={data.clientName} onChange={onChange('clientName')}
                         className={`input ${errors.clientName ? 'input--invalid' : ''}`} placeholder="e.g. John Doe" />
                  {errors.clientName && <div className="error-text">{errors.clientName}</div>}
                </div>
                <div className="field col-4">
                  <label htmlFor="manufacturingDate" className="field-label">
                    <Icon name="tools" /> Mfg. Date <small>(optional)</small>
                  </label>
                  <input id="manufacturingDate" type="date" value={data.manufacturingDate || ''}
                         onChange={onChange('manufacturingDate')}
                         className={`input ${errors.manufacturingDate ? 'input--invalid' : ''}`} />
                  {errors.manufacturingDate && <div className="error-text">{errors.manufacturingDate}</div>}
                </div>
                <div className="field col-4">
                  <label htmlFor="startDate" className="field-label"><Icon name="calendar-plus" /> Purchase / Start Date</label>
                  <input id="startDate" type="date" value={data.startDate} onChange={onChange('startDate')}
                         className={`input ${errors.startDate ? 'input--invalid' : ''}`} />
                  {errors.startDate && <div className="error-text">{errors.startDate}</div>}
                </div>
                <div className="field col-4">
                  <label htmlFor="endDate" className="field-label"><Icon name="calendar-x" /> Expiry Date</label>
                  <input id="endDate" type="date" value={data.endDate} onChange={onChange('endDate')}
                         className={`input ${errors.endDate ? 'input--invalid' : ''}`} />
                  {errors.endDate && <div className="error-text">{errors.endDate}</div>}
                </div>
              </div>

              <div className="actions-end">
                <Link href="/" className="btn btn-ghost"><Icon name="x-lg" /> Cancel</Link>
                <button type="submit" className="btn btn-brand" disabled={busy}>
                  <Icon name="check2" /> {busy ? 'Saving…' : editId ? 'Update Tablet' : 'Save Tablet'}
                </button>
              </div>
            </form>
          </div>

          <p className="footer">&copy; {new Date().getFullYear()} JJ Medical · All rights reserved</p>
        </div>
      </main>
    </>
  );
}
