import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { GebuchteLeistungen, Teilnehmer, Veranstaltungen, Anmeldungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, getUserProfile, LivingAppsService } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ComputedContext } from '@/config/form-enhancements/types';
import { applyFieldOrder, flattenFieldOrder, applyDefaults, evalComputed, numberInputProps, clampNumberValue, classifyComputed, extractApplookupRefs, mergeApplookupRefs, resolveApplookupRef } from '@/config/form-enhancements/types';
import { formEnhancements, computedDeps, computedApplookupRefs } from '@/config/form-enhancements/GebuchteLeistungen';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/Combobox';
import { TeilnehmerDialog } from '@/components/dialogs/TeilnehmerDialog';
import { VeranstaltungenDialog } from '@/components/dialogs/VeranstaltungenDialog';
import { AnmeldungenDialog } from '@/components/dialogs/AnmeldungenDialog';
import { DatePicker } from '@/components/DatePicker';
import { Checkbox } from '@/components/ui/checkbox';
import { IconCamera, IconChevronDown, IconCircleCheck, IconClipboard, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromInput, extractPhotoMeta, reverseGeocode } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

interface GebuchteLeistungenDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: GebuchteLeistungen['fields']) => Promise<void>;
  defaultValues?: GebuchteLeistungen['fields'];
  /** Record id when editing — enables the attachments section. Omit on create. */
  recordId?: string;
  teilnehmerList: Teilnehmer[];
  veranstaltungenList: Veranstaltungen[];
  anmeldungenList: Anmeldungen[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function GebuchteLeistungenDialog({ open, onClose, onSubmit, defaultValues, recordId, teilnehmerList, veranstaltungenList, anmeldungenList, enablePhotoScan = true, enablePhotoLocation = true }: GebuchteLeistungenDialogProps) {
  const [fields, setFields] = useState<Partial<GebuchteLeistungen['fields']>>({});
  const [saving, setSaving] = useState(false);
  // Dirty-tracking: in edit-mode the Speichern button is disabled until the
  // user actually changes something. JSON.stringify is good enough for our
  // fields (plain values + LookupValue objects + string arrays).
  const isDirty = useMemo(() => {
    if (!defaultValues) return true;  // create-mode: always allow submit
    try {
      return JSON.stringify(fields) !== JSON.stringify(defaultValues);
    } catch {
      return true;
    }
  }, [fields, defaultValues]);
  // Inline-Create state for "Teilnehmer" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraTeilnehmer` list, and select it in
  // the originating Combobox via the captured `createTeilnehmerField`.
  const [createTeilnehmerOpen, setCreateTeilnehmerOpen] = useState(false);
  const [createTeilnehmerInitial, setCreateTeilnehmerInitial] = useState('');
  const [createTeilnehmerField, setCreateTeilnehmerField] = useState<string>('');
  const [extraTeilnehmer, setExtraTeilnehmer] = useState< Teilnehmer[]>([]);
  const teilnehmerListAll = useMemo(
    () => [...teilnehmerList, ...extraTeilnehmer],
    [teilnehmerList, extraTeilnehmer],
  );
  function openCreateTeilnehmer(fieldKey: string, q: string) {
    setCreateTeilnehmerField(fieldKey);
    setCreateTeilnehmerInitial(q);
    setCreateTeilnehmerOpen(true);
  }
  // Inline-Create state for "Veranstaltungen" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraVeranstaltungen` list, and select it in
  // the originating Combobox via the captured `createVeranstaltungenField`.
  const [createVeranstaltungenOpen, setCreateVeranstaltungenOpen] = useState(false);
  const [createVeranstaltungenInitial, setCreateVeranstaltungenInitial] = useState('');
  const [createVeranstaltungenField, setCreateVeranstaltungenField] = useState<string>('');
  const [extraVeranstaltungen, setExtraVeranstaltungen] = useState< Veranstaltungen[]>([]);
  const veranstaltungenListAll = useMemo(
    () => [...veranstaltungenList, ...extraVeranstaltungen],
    [veranstaltungenList, extraVeranstaltungen],
  );
  function openCreateVeranstaltungen(fieldKey: string, q: string) {
    setCreateVeranstaltungenField(fieldKey);
    setCreateVeranstaltungenInitial(q);
    setCreateVeranstaltungenOpen(true);
  }
  // Inline-Create state for "Anmeldungen" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraAnmeldungen` list, and select it in
  // the originating Combobox via the captured `createAnmeldungenField`.
  const [createAnmeldungenOpen, setCreateAnmeldungenOpen] = useState(false);
  const [createAnmeldungenInitial, setCreateAnmeldungenInitial] = useState('');
  const [createAnmeldungenField, setCreateAnmeldungenField] = useState<string>('');
  const [extraAnmeldungen, setExtraAnmeldungen] = useState< Anmeldungen[]>([]);
  const anmeldungenListAll = useMemo(
    () => [...anmeldungenList, ...extraAnmeldungen],
    [anmeldungenList, extraAnmeldungen],
  );
  function openCreateAnmeldungen(fieldKey: string, q: string) {
    setCreateAnmeldungenField(fieldKey);
    setCreateAnmeldungenInitial(q);
    setCreateAnmeldungenOpen(true);
  }
  const [aiOpen, setAiOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [aiText, setAiText] = useState('');

  // Computed-field plumbing. Pure no-op when formEnhancements.computed is {}.
  // The number renderer uses computedValues only as a fallback when the user
  // hasn't typed anything — clearing the input always restores the computation.
  // computedContext exposes applookup list props so { kind: 'applookup', ... }
  // operands can resolve to numeric fields on the target record.
  const computedContext = useMemo<ComputedContext>(() => ({
    lookupLists: {
      'teilnehmer': teilnehmerList,
      'veranstaltung': veranstaltungenList,
      'anmeldung': anmeldungenList,
    },
  }), [teilnehmerList, veranstaltungenList, anmeldungenList, ]);
  const computedValues = useMemo<Record<string, number | null>>(() => {
    let out: Record<string, number | null> = {};
    const entries = Object.entries(formEnhancements.computed);
    for (let i = 0; i < 5; i++) {
      const merged: Record<string, unknown> = { ...(fields as Record<string, unknown>) };
      for (const [k, v] of Object.entries(out)) {
        if (v === null) continue;
        const cur = merged[k];
        if (cur === undefined || cur === null || cur === '') merged[k] = v;
      }
      const next: Record<string, number | null> = {};
      let changed = false;
      for (const [key, spec] of entries) {
        const v = evalComputed(spec, merged, computedContext);
        next[key] = v;
        if (v !== out[key]) changed = true;
      }
      out = next;
      if (!changed) break;
    }
    return out;
  }, [fields, computedContext]);

  useEffect(() => {
    if (open) {
      setFields(applyDefaults((defaultValues ?? {}) as Record<string, unknown>, formEnhancements.defaults) as Partial<GebuchteLeistungen['fields']>);
      setPreview(null);
      setScanSuccess(false);
      setAiText('');
    }
  }, [open, defaultValues]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // Fill empty number slots from computed values; user-typed values always win.
      // CRITICAL: only backend-mapped keys may be backfilled. Virtual computeds
      // (sub-agent invents `_netto`, `_bestellung_gesamtbetrag` etc. for the
      // "Berechnungen" display) have no backend counterpart — writing them
      // triggers a 422 from the Living-Apps API ("field does not exist").
      const merged = { ...fields };
      for (const [key, val] of Object.entries(computedValues)) {
        if (val === null) continue;
        if (!backendFieldSet.has(key)) continue;
        const cur = (merged as Record<string, unknown>)[key];
        if (cur === undefined || cur === null || cur === '') {
          (merged as Record<string, unknown>)[key] = val;
        }
      }
      const clean = cleanFieldsForApi(merged, 'gebuchte_leistungen');
      await onSubmit(clean as GebuchteLeistungen['fields']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleAiExtract(file?: File) {
    if (!file && !aiText.trim()) return;
    setScanning(true);
    setScanSuccess(false);
    try {
      let uri: string | undefined;
      let gps: { latitude: number; longitude: number } | null = null;
      let geoAddr = '';
      const parts: string[] = [];
      if (file) {
        const [dataUri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
        uri = dataUri;
        if (file.type.startsWith('image/')) setPreview(uri);
        gps = enablePhotoLocation ? meta?.gps ?? null : null;
        if (gps) {
          geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
          parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
          if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
        }
        if (meta?.dateTime) {
          parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
        }
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      contextParts.push(`<available-records field="teilnehmer" entity="Teilnehmer">\n${JSON.stringify(teilnehmerList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="veranstaltung" entity="Veranstaltungen">\n${JSON.stringify(veranstaltungenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="anmeldung" entity="Anmeldungen">\n${JSON.stringify(anmeldungenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "teilnehmer": string | null, // Display name from Teilnehmer (see <available-records>)\n  "veranstaltung": string | null, // Display name from Veranstaltungen (see <available-records>)\n  "leistungsname": string | null, // Leistungsname\n  "leistungstyp": string | null, // Leistungstyp\n  "stufe": LookupValue | null, // Stufe (select one key: "tt1" | "tt2" | "tt3") mapping: tt1=TT1, tt2=TT2, tt3=TT3\n  "verfahren": LookupValue | null, // Verfahren (select one key: "tt2_pb" | "tt2_pe" | "tt2_pi" | "vds") mapping: tt2_pb=TT2-PB, tt2_pe=TT2-PE, tt2_pi=TT2-PI, vds=VdS\n  "datum_von": string | null, // YYYY-MM-DD\n  "datum_bis": string | null, // YYYY-MM-DD\n  "preis_netto": number | null, // Preis netto\n  "rabatt": number | null, // Rabatt\n  "status": string | null, // Status\n  "spz_id": string | null, // SPZ-ID\n  "spz_source": string | null, // SPZ-Quelle\n  "spz_last_sync": string | null, // YYYY-MM-DDTHH:MM\n  "spz_sync_status": string | null, // Sync-Status\n  "spz_deleted": boolean | null, // In WEBER.SPZ gelöscht\n  "anmeldung": string | null, // Display name from Anmeldungen (see <available-records>)\n}`;
      const raw = await extractFromInput<Record<string, unknown>>(schema, {
        dataUri: uri,
        userText: aiText.trim() || undefined,
        photoContext,
        intent: DIALOG_INTENT,
      });
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["teilnehmer", "veranstaltung", "anmeldung"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const teilnehmerName = raw['teilnehmer'] as string | null;
        if (teilnehmerName) {
          const teilnehmerMatch = teilnehmerList.find(r => matchName(teilnehmerName!, [String(r.fields.teilnehmer_vorname ?? '')]));
          if (teilnehmerMatch) merged['teilnehmer'] = createRecordUrl(APP_IDS.TEILNEHMER, teilnehmerMatch.record_id);
        }
        const veranstaltungName = raw['veranstaltung'] as string | null;
        if (veranstaltungName) {
          const veranstaltungMatch = veranstaltungenList.find(r => matchName(veranstaltungName!, [String(r.fields.veranstaltungsnummer ?? '')]));
          if (veranstaltungMatch) merged['veranstaltung'] = createRecordUrl(APP_IDS.VERANSTALTUNGEN, veranstaltungMatch.record_id);
        }
        const anmeldungName = raw['anmeldung'] as string | null;
        if (anmeldungName) {
          const anmeldungMatch = anmeldungenList.find(r => matchName(anmeldungName!, [String(r.fields.buchungsnummer ?? '')]));
          if (anmeldungMatch) merged['anmeldung'] = createRecordUrl(APP_IDS.ANMELDUNGEN, anmeldungMatch.record_id);
        }
        return merged as Partial<GebuchteLeistungen['fields']>;
      });
      setAiText('');
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error('Scan fehlgeschlagen:', err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleAiExtract(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleAiExtract(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues ? 'Gebuchte Leistungen bearbeiten' : 'Gebuchte Leistungen hinzufügen';

  const fieldBlocks: Record<string, React.ReactNode> = {
    'teilnehmer': (
      <div key="teilnehmer" className="space-y-1.5">
        <Label htmlFor="teilnehmer">Zugehöriger Teilnehmer</Label>
        <Combobox
          id="teilnehmer"
          placeholder="Welcher Teilnehmer?"
          items={teilnehmerListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.teilnehmer_vorname ?? r.record_id),
          }))}
          value={extractRecordId(fields.teilnehmer)}
          onChange={id => setFields(f => ({ ...f, teilnehmer: id ? createRecordUrl(APP_IDS.TEILNEHMER, id) : undefined }))}
          searchPlaceholder="Suchen…"
          emptyText="Kein Treffer"
          onCreateNew={(q) => openCreateTeilnehmer("teilnehmer", q)}
          createLabel="Neu in Teilnehmer"
        />
      </div>
    ),
    'veranstaltung': (
      <div key="veranstaltung" className="space-y-1.5">
        <Label htmlFor="veranstaltung">Zugehörige Veranstaltung</Label>
        <Combobox
          id="veranstaltung"
          placeholder="Zu welcher Veranstaltung?"
          items={veranstaltungenListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.veranstaltungsnummer ?? r.record_id),
          }))}
          value={extractRecordId(fields.veranstaltung)}
          onChange={id => setFields(f => ({ ...f, veranstaltung: id ? createRecordUrl(APP_IDS.VERANSTALTUNGEN, id) : undefined }))}
          searchPlaceholder="Suchen…"
          emptyText="Kein Treffer"
          onCreateNew={(q) => openCreateVeranstaltungen("veranstaltung", q)}
          createLabel="Neu in Veranstaltungen"
        />
      </div>
    ),
    'leistungsname': (
      <div key="leistungsname" className="space-y-1.5">
        <Label htmlFor="leistungsname">Leistungsname</Label>
        <Input
          id="leistungsname"
          placeholder="z. B. Schulungsgebühr TT2"
          value={fields.leistungsname ?? ''}
          onChange={e => setFields(f => ({ ...f, leistungsname: e.target.value }))}
        />
      </div>
    ),
    'leistungstyp': (
      <div key="leistungstyp" className="space-y-1.5">
        <Label htmlFor="leistungstyp">Leistungstyp</Label>
        <Input
          id="leistungstyp"
          placeholder="z. B. Schulung, Prüfung"
          value={fields.leistungstyp ?? ''}
          onChange={e => setFields(f => ({ ...f, leistungstyp: e.target.value }))}
        />
      </div>
    ),
    'stufe': (
      <div key="stufe" className="space-y-1.5">
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
    ),
    'verfahren': (
      <div key="verfahren" className="space-y-1.5">
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
    ),
    'datum_von': (
      <div key="datum_von" className="space-y-1.5">
        <Label htmlFor="datum_von">Datum von</Label>
        <DatePicker
          id="datum_von"
          placeholder="Wann startet die Leistung?"
          mode="date"
          value={fields.datum_von ?? null}
          onChange={v => setFields(f => ({ ...f, datum_von: v ?? undefined }))}
        />
      </div>
    ),
    'datum_bis': (
      <div key="datum_bis" className="space-y-1.5">
        <Label htmlFor="datum_bis">Datum bis</Label>
        <DatePicker
          id="datum_bis"
          placeholder="Wann endet die Leistung?"
          mode="date"
          value={fields.datum_bis ?? null}
          onChange={v => setFields(f => ({ ...f, datum_bis: v ?? undefined }))}
        />
      </div>
    ),
    'preis_netto': (
      <div key="preis_netto" className="space-y-1.5">
        <Label htmlFor="preis_netto">Preis netto</Label>
        <Input
          id="preis_netto"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'preis_netto')}
          placeholder="z. B. 99,00"
          value={fields.preis_netto !== undefined ? fields.preis_netto : (computedValues['preis_netto'] ?? '')}
          onChange={e => setFields(f => ({ ...f, preis_netto: clampNumberValue(formEnhancements, 'preis_netto', e.target.value) }))}
        />
      </div>
    ),
    'rabatt': (
      <div key="rabatt" className="space-y-1.5">
        <Label htmlFor="rabatt">Rabatt</Label>
        <Input
          id="rabatt"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'rabatt')}
          placeholder="z. B. 10,00"
          value={fields.rabatt !== undefined ? fields.rabatt : (computedValues['rabatt'] ?? '')}
          onChange={e => setFields(f => ({ ...f, rabatt: clampNumberValue(formEnhancements, 'rabatt', e.target.value) }))}
        />
      </div>
    ),
    'status': (
      <div key="status" className="space-y-1.5">
        <Label htmlFor="status">Status</Label>
        <Input
          id="status"
          placeholder="z. B. bezahlt, offen"
          value={fields.status ?? ''}
          onChange={e => setFields(f => ({ ...f, status: e.target.value }))}
        />
      </div>
    ),
    'spz_id': (
      <div key="spz_id" className="space-y-1.5">
        <Label htmlFor="spz_id">SPZ-ID</Label>
        <Input
          id="spz_id"
          placeholder="Externe System-ID"
          value={fields.spz_id ?? ''}
          onChange={e => setFields(f => ({ ...f, spz_id: e.target.value }))}
        />
      </div>
    ),
    'spz_source': (
      <div key="spz_source" className="space-y-1.5">
        <Label htmlFor="spz_source">SPZ-Quelle</Label>
        <Input
          id="spz_source"
          placeholder="z. B. SPZ-System"
          value={fields.spz_source ?? ''}
          onChange={e => setFields(f => ({ ...f, spz_source: e.target.value }))}
        />
      </div>
    ),
    'spz_last_sync': (
      <div key="spz_last_sync" className="space-y-1.5">
        <Label htmlFor="spz_last_sync">Letzter Sync-Zeitpunkt</Label>
        <DatePicker
          id="spz_last_sync"
          placeholder="Zeitpunkt des letzten Abgleichs"
          mode="datetime"
          value={fields.spz_last_sync ?? null}
          onChange={v => setFields(f => ({ ...f, spz_last_sync: v ?? undefined }))}
        />
      </div>
    ),
    'spz_sync_status': (
      <div key="spz_sync_status" className="space-y-1.5">
        <Label htmlFor="spz_sync_status">Sync-Status</Label>
        <Input
          id="spz_sync_status"
          placeholder="z. B. erfolgreich, Fehler"
          value={fields.spz_sync_status ?? ''}
          onChange={e => setFields(f => ({ ...f, spz_sync_status: e.target.value }))}
        />
      </div>
    ),
    'spz_deleted': (
      <div key="spz_deleted" className="space-y-1.5">
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
    ),
    'anmeldung': (
      <div key="anmeldung" className="space-y-1.5">
        <Label htmlFor="anmeldung">Zugehörige Anmeldung</Label>
        <Combobox
          id="anmeldung"
          placeholder="Zu welcher Anmeldung?"
          items={anmeldungenListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.buchungsnummer ?? r.record_id),
          }))}
          value={extractRecordId(fields.anmeldung)}
          onChange={id => setFields(f => ({ ...f, anmeldung: id ? createRecordUrl(APP_IDS.ANMELDUNGEN, id) : undefined }))}
          searchPlaceholder="Suchen…"
          emptyText="Kein Treffer"
          onCreateNew={(q) => openCreateAnmeldungen("anmeldung", q)}
          createLabel="Neu in Anmeldungen"
        />
      </div>
    ),
  };
  const orderedFields = applyFieldOrder(Object.keys(fieldBlocks), formEnhancements.fieldOrder);
  const orderedFieldsKey = orderedFields.map((it) => typeof it === 'string' ? it : it.row.join('+')).join(',');

  // Render-Modell für Computed-Felder:
  //
  //   • BACKEND-FELDER mit computed-Eintrag (z.B. gesamtpreis bei einer
  //     Katzenpension) bleiben als normales Eingabe-Feld stehen. Der Number-
  //     Input nutzt den computed-Wert als Vorschlag, der User kann jederzeit
  //     überschreiben (clearing → restore computed).
  //   • VIRTUELLE computed-Keys (Eintrag in formEnhancements.computed, ABER
  //     kein passendes Backend-Feld in orderedFields) erscheinen NICHT als
  //     Input, sondern unten als kompakte 'Berechnungen'-Übersicht oder als
  //     Inline-Hint unter dem letzten beitragenden Input.
  const FIELD_LABELS: Record<string, string> = {"teilnehmer": "Zugehöriger Teilnehmer", "veranstaltung": "Zugehörige Veranstaltung", "leistungsname": "Leistungsname", "leistungstyp": "Leistungstyp", "stufe": "Stufe", "verfahren": "Verfahren", "datum_von": "Datum von", "datum_bis": "Datum bis", "preis_netto": "Preis netto", "rabatt": "Rabatt", "status": "Status", "spz_id": "SPZ-ID", "spz_source": "SPZ-Quelle", "spz_last_sync": "Letzter Sync-Zeitpunkt", "spz_sync_status": "Sync-Status", "spz_deleted": "In WEBER.SPZ gelöscht", "anmeldung": "Zugehörige Anmeldung"};
  const CURRENCY_KEYS = new Set<string>(["preis_netto", "rabatt"]);
  // Applookup-Referenz-Labels: pro applookup-Feld in dieser Form (ownKey)
  // eine Map { lookupKey: label } für ALLE Felder des Target-Schemas. Wird
  // beim Render-Walk gefiltert auf die in der computed-Formel tatsächlich
  // referenzierten lookupKeys (siehe applookupRefs unten).
  const APPLOOKUP_LABELS: Record<string, Record<string, string>> = {"teilnehmer": {"anmeldung": "Zugehörige Anmeldung", "teilnehmer_vorname": "Teilnehmer Vorname", "teilnehmer_nachname": "Teilnehmer Nachname", "teilnehmer_email": "Teilnehmer E-Mail", "teilnehmer_telefon": "Teilnehmer Telefon", "zertifikats_nr": "Zertifikats-Nr.", "gebuchte_stufe": "Gebuchte Stufe", "gebuchtes_verfahren": "Gebuchtes Verfahren", "teilnehmerstatus": "Teilnehmerstatus", "bemerkung": "Bemerkung", "spz_id": "SPZ-ID", "spz_source": "SPZ-Quelle", "spz_last_sync": "Letzter Sync-Zeitpunkt", "spz_sync_status": "Sync-Status", "spz_deleted": "In WEBER.SPZ gelöscht"}, "veranstaltung": {"veranstaltungsnummer": "Veranstaltungsnummer", "veranstaltungstitel": "Veranstaltungstitel", "stufe": "Stufe", "verfahren": "Verfahren", "art": "Art", "startdatum": "Startdatum", "enddatum": "Enddatum", "ort": "Ort", "status": "Status", "max_teilnehmerzahl": "Maximale Teilnehmerzahl", "aktuelle_teilnehmerzahl": "Aktuelle Teilnehmerzahl", "bemerkung": "Bemerkung", "spz_id": "SPZ-ID", "spz_source": "SPZ-Quelle", "spz_last_sync": "Letzter Sync-Zeitpunkt", "spz_sync_status": "Sync-Status", "spz_deleted": "In WEBER.SPZ gelöscht"}, "anmeldung": {"buchungsnummer": "Buchungsnummer", "buchungsdatum": "Buchungsdatum", "buchungsstatus": "Buchungsstatus", "buchungsart": "Buchungsart", "stufe": "Stufe", "kombipaket_tt1_tt2": "Kombipaket TT1 + TT2", "verfahren": "Verfahren", "bestellnummer": "Bestellnummer / Auftragsnummer", "gesamtstatus": "Gesamtstatus", "datenschutz_akzeptiert": "Datenschutz akzeptiert", "bemerkung": "Bemerkung", "firma": "Firma / Organisation", "strasse": "Straße", "plz": "PLZ", "ort": "Ort", "land": "Land", "ansprechpartner_vorname": "Ansprechpartner Vorname", "ansprechpartner_nachname": "Ansprechpartner Nachname", "ansprechpartner_email": "Ansprechpartner E-Mail", "ansprechpartner_telefon": "Ansprechpartner Telefon", "spz_id": "SPZ-ID", "spz_source": "SPZ-Quelle", "spz_last_sync": "Letzter Sync-Zeitpunkt", "spz_sync_status": "Sync-Status", "spz_deleted": "In WEBER.SPZ gelöscht"}};
  const inputFields = useMemo(() => flattenFieldOrder(orderedFields), [orderedFieldsKey]);
  const backendFieldSet = useMemo(() => new Set(inputFields), [inputFields.join(',')]);
  const virtualComputed = useMemo(
    () => Object.fromEntries(
      Object.entries(formEnhancements.computed).filter(([k]) => !backendFieldSet.has(k)),
    ),
    [backendFieldSet],
  );
  const virtualFormEnhancements = useMemo(
    () => ({ ...formEnhancements, computed: virtualComputed }),
    [virtualComputed],
  );
  const computedLayout = useMemo(
    () => classifyComputed(virtualFormEnhancements, inputFields, computedDeps),
    [virtualFormEnhancements, inputFields.join(',')],
  );
  // Applookup-Referenzen: pro ownKey (Lookup-Feld im Form) die Liste der
  // lookupKeys, die in irgendeiner computed-Formel referenziert werden.
  // MODUS-1: aus dem Spec-Tree extrahiert. MODUS-2: aus dem Build-Time-
  // Export computedApplookupRefs (parse-formulas hat Regex-Pairs gesammelt).
  // Pro (ownKey, lookupKey)-Paar nur einmal; pro ownKey können aber mehrere
  // lookupKeys gleichzeitig auftauchen (z.B. einzelpreis UND karten10_preis
  // beim Yoga-Kurs), und alle werden separat als Inline-Hint gerendert.
  const applookupRefs = useMemo(
    () => mergeApplookupRefs(
      extractApplookupRefs(formEnhancements.computed),
      computedApplookupRefs,
    ),
    [],
  );
  function summaryLabel(k: string): string {
    if (FIELD_LABELS[k]) return FIELD_LABELS[k];
    // Leading underscore(s) als Virtual-Marker abstreifen; Unterstriche zu
    // Leerzeichen, jedes Wort kapitalisieren. Umlaute kommen vom Sub-Agent
    // direkt im Key (z. B. `_buchung_dauer_nächte`) — JS/TS/Vite unterstützen
    // Unicode-Identifier nativ, daher keine ASCII-Transliteration nötig.
    return k.replace(/^_+/, '')
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  function formatSummaryValue(k: string, v: unknown): string {
    if (v === undefined || v === null || v === '' || (typeof v === 'number' && !Number.isFinite(v))) return '—';
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return String(v);
    // Backend-Feld mit €-Label ODER virtueller Computed-Key, dessen Name nach Geld aussieht.
    const looksLikeCurrency = CURRENCY_KEYS.has(k) || /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k);
    if (looksLikeCurrency) {
      return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
  }

  return (
    <>
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] flex flex-col overflow-hidden p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b flex flex-row items-center gap-3 space-y-0">
          <DialogTitle className="flex-1 truncate text-left">{DIALOG_INTENT}</DialogTitle>
          {enablePhotoScan && (
            <button
              type="button"
              onClick={() => setAiOpen(o => !o)}
              aria-expanded={aiOpen}
              aria-controls="ai-fill-panel"
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all mr-7 shadow-sm ${
                aiOpen
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                  : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/15 hover:border-primary/50'
              }`}
            >
              <IconSparkles className={`h-3.5 w-3.5 ${aiOpen ? '' : 'text-primary'}`} />
              <span className="hidden sm:inline">KI-Ausfüllen</span>
              <IconChevronDown className={`h-3 w-3 transition-transform ${aiOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </DialogHeader>
        {enablePhotoScan && aiOpen && (
          <div id="ai-fill-panel" className="border-b bg-muted/20 px-6 py-4 space-y-3">
            <p className="text-xs text-muted-foreground">Versteht Fotos, Dokumente und Text und füllt alles für dich aus</p>
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  KI-Assistent darf zusätzlich Informationen zu meiner Person verwenden
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? 'Lade...' : '(mehr Infos)'}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">Folgende Infos über dich können von der KI genutzt werden:</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">Profil konnte nicht geladen werden</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">KI analysiert...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Felder werden automatisch ausgefüllt</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Felder ausgefüllt!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prüfe die Werte und passe sie ggf. an</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Foto oder Dokument hierher ziehen oder auswählen</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1" />Foto wählen
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1" />Dokument
              </Button>
            </div>

            <div className="relative">
              <Textarea
                placeholder="Text eingeben oder einfügen, z.B. Notizen, E-Mails, Beschreibungen..."
                value={aiText}
                onChange={e => {
                  setAiText(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = Math.min(Math.max(el.scrollHeight, 56), 96) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && aiText.trim() && !scanning) {
                    e.preventDefault();
                    handleAiExtract();
                  }
                }}
                disabled={scanning}
                rows={2}
                className="pr-12 resize-none text-sm overflow-y-auto"
              />
              <button
                type="button"
                className="absolute right-2 top-2 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                disabled={scanning}
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setAiText(prev => prev ? prev + '\n' + text : text);
                  } catch {}
                }}
                title="Paste"
              >
                <IconClipboard className="h-4 w-4" />
              </button>
            </div>
            {aiText.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs"
                disabled={scanning}
                onClick={() => handleAiExtract()}
              >
                <IconSparkles className="h-3.5 w-3.5 mr-1.5" />Analysieren
              </Button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0 min-w-0">
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4 min-w-0">
            {(() => {
              const renderField = (k: string) => {
                const inlineHints = computedLayout.anchors[k] ?? [];
                const refs = applookupRefs[k] ?? [];
                return (
                  <div key={k} className="space-y-1.5 min-w-0">
                    {fieldBlocks[k]}
                    {refs.map(({ lookupKey }) => {
                      // Show the live numeric value the formula will pull from
                      // the selected lookup target (e.g. "Monatspreis: 34,90 €"
                      // under the Tarif combobox). Hidden while no lookup is
                      // selected or the target field is non-numeric.
                      const v = resolveApplookupRef(k, lookupKey, fields as Record<string, unknown>, computedContext);
                      if (v === null) return null;
                      const lbl = APPLOOKUP_LABELS[k]?.[lookupKey] ?? lookupKey;
                      const text = formatSummaryValue(lookupKey, v);
                      return (
                        <div key={`alh-${k}-${lookupKey}`} className="flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
                          <span className="text-primary/70">→</span>
                          <span>{lbl}</span>
                          <span className="ml-auto font-medium tabular-nums text-foreground">{text}</span>
                        </div>
                      );
                    })}
                    {inlineHints.map((cKey) => {
                      const v = computedValues[cKey];
                      const text = formatSummaryValue(cKey, v);
                      if (text === '—') return null;
                      return (
                        <div key={cKey} className="flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
                          <span className="text-primary/70">→</span>
                          <span>{summaryLabel(cKey)}</span>
                          <span className="ml-auto font-medium tabular-nums text-foreground">{text}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              };
              return orderedFields.map((item, idx) => {
                if (typeof item === 'string') return renderField(item);
                const cols = item.cols ?? `repeat(${item.row.length}, minmax(0, 1fr))`;
                return (
                  <div key={`row-${idx}`} className="grid gap-3" style={{ gridTemplateColumns: cols }}>
                    {item.row.map(renderField)}
                  </div>
                );
              });
            })()}
            {(computedLayout.aggregates.length > 0 || computedLayout.finalTotal) && (
              <div className="mt-6 pt-4 border-t border-border space-y-1.5">
                {computedLayout.aggregates.length > 0 && (
                  <dl className="space-y-1.5 pb-2">
                    {computedLayout.aggregates.map((k) => {
                      const userVal = (fields as Record<string, unknown>)[k];
                      const computed = computedValues[k];
                      const v = userVal !== undefined && userVal !== null && userVal !== '' ? userVal : computed;
                      return (
                        <div key={k} className="flex justify-between items-baseline gap-3">
                          <dt className="text-sm text-muted-foreground truncate">{summaryLabel(k)}</dt>
                          <dd className="text-sm font-medium tabular-nums whitespace-nowrap">{formatSummaryValue(k, v)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
                {computedLayout.finalTotal && (() => {
                  const k = computedLayout.finalTotal;
                  const userVal = (fields as Record<string, unknown>)[k];
                  const computed = computedValues[k];
                  const v = userVal !== undefined && userVal !== null && userVal !== '' ? userVal : computed;
                  // Innere Border nur wenn aggregates existieren — sonst hätten wir
                  // zwei direkt aufeinanderfolgende Striche (Outer + Inner) mit nur
                  // einer Aggregat-Zeile dazwischen → zu viel visuelles Rauschen.
                  const sep = computedLayout.aggregates.length > 0 ? 'pt-3 border-t border-border' : 'pt-1';
                  return (
                    <div className={`flex justify-between items-baseline gap-3 ${sep}`}>
                      <span className="text-base font-semibold text-foreground">{summaryLabel(k)}</span>
                      <span className="text-lg font-bold tabular-nums whitespace-nowrap text-foreground">{formatSummaryValue(k, v)}</span>
                    </div>
                  );
                })()}
              </div>
            )}
            {recordId && (
              <div className="pt-2 border-t border-border">
                <AttachmentsSection appId={APP_IDS.GEBUCHTE_LEISTUNGEN} recordId={recordId} />
              </div>
            )}
          </div>
          <DialogFooter className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-6 py-3 gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button
              type="submit"
              disabled={saving || !isDirty}
            >
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {createTeilnehmerOpen && (
      <TeilnehmerDialog
        open={createTeilnehmerOpen}
        onClose={() => setCreateTeilnehmerOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createTeilnehmerEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Teilnehmer;
            setExtraTeilnehmer(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.TEILNEHMER, result.id);
            setFields(prev => ({ ...prev, [createTeilnehmerField]: url } as any));
          }
          setCreateTeilnehmerOpen(false);
        }}
        defaultValues={createTeilnehmerInitial
          ? ({ teilnehmer_vorname: createTeilnehmerInitial } as any)
          : undefined}
        anmeldungenList={anmeldungenList}
      />
    )}
    {createVeranstaltungenOpen && (
      <VeranstaltungenDialog
        open={createVeranstaltungenOpen}
        onClose={() => setCreateVeranstaltungenOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createVeranstaltungenEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Veranstaltungen;
            setExtraVeranstaltungen(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.VERANSTALTUNGEN, result.id);
            setFields(prev => ({ ...prev, [createVeranstaltungenField]: url } as any));
          }
          setCreateVeranstaltungenOpen(false);
        }}
        defaultValues={createVeranstaltungenInitial
          ? ({ veranstaltungsnummer: createVeranstaltungenInitial } as any)
          : undefined}
      />
    )}
    {createAnmeldungenOpen && (
      <AnmeldungenDialog
        open={createAnmeldungenOpen}
        onClose={() => setCreateAnmeldungenOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createAnmeldungenEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Anmeldungen;
            setExtraAnmeldungen(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.ANMELDUNGEN, result.id);
            setFields(prev => ({ ...prev, [createAnmeldungenField]: url } as any));
          }
          setCreateAnmeldungenOpen(false);
        }}
        defaultValues={createAnmeldungenInitial
          ? ({ buchungsnummer: createAnmeldungenInitial } as any)
          : undefined}
      />
    )}
    </>
  );
}