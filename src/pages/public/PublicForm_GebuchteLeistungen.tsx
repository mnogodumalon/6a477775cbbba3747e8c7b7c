import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/DatePicker';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a477742b51cb3dccc89c848';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormGebuchteLeistungen() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Gebuchte Leistungen — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="leistungsname">Leistungsname</Label>
            <Input
              id="leistungsname"
              placeholder=""
              value={fields.leistungsname ?? ''}
              onChange={e => setFields(f => ({ ...f, leistungsname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="leistungstyp">Leistungstyp</Label>
            <Input
              id="leistungstyp"
              placeholder=""
              value={fields.leistungstyp ?? ''}
              onChange={e => setFields(f => ({ ...f, leistungstyp: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stufe">Stufe</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.stufe) === 'tt1'}
                onClick={() => setFields(f => ({ ...f, stufe: (lookupKey(f.stufe) === 'tt1' ? undefined : 'tt1') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.stufe) === 'tt1'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                TT1
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.stufe) === 'tt2'}
                onClick={() => setFields(f => ({ ...f, stufe: (lookupKey(f.stufe) === 'tt2' ? undefined : 'tt2') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.stufe) === 'tt2'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                TT2
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.stufe) === 'tt3'}
                onClick={() => setFields(f => ({ ...f, stufe: (lookupKey(f.stufe) === 'tt3' ? undefined : 'tt3') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.stufe) === 'tt3'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                TT3
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="verfahren">Verfahren</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.verfahren) === 'tt2_pb'}
                onClick={() => setFields(f => ({ ...f, verfahren: (lookupKey(f.verfahren) === 'tt2_pb' ? undefined : 'tt2_pb') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.verfahren) === 'tt2_pb'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                TT2-PB
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.verfahren) === 'tt2_pe'}
                onClick={() => setFields(f => ({ ...f, verfahren: (lookupKey(f.verfahren) === 'tt2_pe' ? undefined : 'tt2_pe') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.verfahren) === 'tt2_pe'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                TT2-PE
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.verfahren) === 'tt2_pi'}
                onClick={() => setFields(f => ({ ...f, verfahren: (lookupKey(f.verfahren) === 'tt2_pi' ? undefined : 'tt2_pi') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.verfahren) === 'tt2_pi'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                TT2-PI
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.verfahren) === 'vds'}
                onClick={() => setFields(f => ({ ...f, verfahren: (lookupKey(f.verfahren) === 'vds' ? undefined : 'vds') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.verfahren) === 'vds'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                VdS
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="datum_von">Datum von</Label>
            <DatePicker
              id="datum_von"
              placeholder=""
              mode="date"
              value={fields.datum_von ?? null}
              onChange={v => setFields(f => ({ ...f, datum_von: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="datum_bis">Datum bis</Label>
            <DatePicker
              id="datum_bis"
              placeholder=""
              mode="date"
              value={fields.datum_bis ?? null}
              onChange={v => setFields(f => ({ ...f, datum_bis: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preis_netto">Preis netto</Label>
            <Input
              id="preis_netto"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.preis_netto ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, preis_netto: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rabatt">Rabatt</Label>
            <Input
              id="rabatt"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.rabatt ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, rabatt: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Input
              id="status"
              placeholder=""
              value={fields.status ?? ''}
              onChange={e => setFields(f => ({ ...f, status: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="spz_id">SPZ-ID</Label>
            <Input
              id="spz_id"
              placeholder=""
              value={fields.spz_id ?? ''}
              onChange={e => setFields(f => ({ ...f, spz_id: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="spz_source">SPZ-Quelle</Label>
            <Input
              id="spz_source"
              placeholder=""
              value={fields.spz_source ?? ''}
              onChange={e => setFields(f => ({ ...f, spz_source: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="spz_last_sync">Letzter Sync-Zeitpunkt</Label>
            <DatePicker
              id="spz_last_sync"
              placeholder=""
              mode="datetime"
              value={fields.spz_last_sync ?? null}
              onChange={v => setFields(f => ({ ...f, spz_last_sync: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="spz_sync_status">Sync-Status</Label>
            <Input
              id="spz_sync_status"
              placeholder=""
              value={fields.spz_sync_status ?? ''}
              onChange={e => setFields(f => ({ ...f, spz_sync_status: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="spz_deleted">In WEBER.SPZ gelöscht</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="spz_deleted"
                checked={!!fields.spz_deleted}
                onCheckedChange={(v) => setFields(f => ({ ...f, spz_deleted: !!v }))}
              />
              <Label htmlFor="spz_deleted" className="font-normal">In WEBER.SPZ gelöscht</Label>
            </div>
          </div>

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
