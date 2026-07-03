import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { BudgetTracker } from '@/components/BudgetTracker';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import type { Veranstaltungen } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  IconCalendarEvent,
  IconUsers,
  IconPlus,
  IconCheck,
  IconTrash,
  IconUser,
  IconBuilding,
  IconCurrencyEuro,
} from '@tabler/icons-react';
import { formatDate } from '@/lib/formatters';

// --- Types ---
interface AddedTeilnehmer {
  id: string;
  vorname: string;
  nachname: string;
  email: string;
  telefon: string;
  gebuchte_stufe: string;
  gebuchtes_verfahren: string;
}

interface BookedLeistung {
  teilnehmerId: string;
  leistungsname: string;
  preis_netto: number;
  rabatt: number;
}

interface TeilnehmerFormState {
  teilnehmer_vorname: string;
  teilnehmer_nachname: string;
  teilnehmer_email: string;
  teilnehmer_telefon: string;
  selectedStufe: string;
  selectedVerfahren: string;
}

interface LeistungFormState {
  leistungsname: string;
  leistungstyp: string;
  selectedStufe: string;
  selectedVerfahren: string;
  datum_von: string;
  datum_bis: string;
  preis_netto: string;
  rabatt: string;
}

const EMPTY_TEILNEHMER_FORM: TeilnehmerFormState = {
  teilnehmer_vorname: '',
  teilnehmer_nachname: '',
  teilnehmer_email: '',
  teilnehmer_telefon: '',
  selectedStufe: '',
  selectedVerfahren: '',
};

function emptyLeistungForm(): LeistungFormState {
  return {
    leistungsname: '',
    leistungstyp: '',
    selectedStufe: '',
    selectedVerfahren: '',
    datum_von: '',
    datum_bis: '',
    preis_netto: '',
    rabatt: '0',
  };
}

const BUCHUNGSART_OPTIONS = LOOKUP_OPTIONS['anmeldungen']['buchungsart'];
const STUFE_ANMELDUNG_OPTIONS = LOOKUP_OPTIONS['anmeldungen']['stufe'];
const VERFAHREN_ANMELDUNG_OPTIONS = LOOKUP_OPTIONS['anmeldungen']['verfahren'];
const GEBUCHTE_STUFE_OPTIONS = LOOKUP_OPTIONS['teilnehmer']['gebuchte_stufe'];
const GEBUCHTES_VERFAHREN_OPTIONS = LOOKUP_OPTIONS['teilnehmer']['gebuchtes_verfahren'];
const LEISTUNG_STUFE_OPTIONS = LOOKUP_OPTIONS['gebuchte_leistungen']['stufe'];
const LEISTUNG_VERFAHREN_OPTIONS = LOOKUP_OPTIONS['gebuchte_leistungen']['verfahren'];

// --- Helper: extract record id from API response ---
function extractNewRecordId(response: unknown): string | null {
  if (!response || typeof response !== 'object') return null;
  const entries = Object.entries(response as Record<string, unknown>);
  if (entries.length === 0) return null;
  const [id] = entries[0];
  return id;
}

// --- Step 2: Anmeldedaten ---
interface Step2Props {
  selectedVeranstaltung: Veranstaltungen;
  onBack: () => void;
  onSuccess: (anmeldungId: string) => void;
}

function Step2Anmeldedaten({ selectedVeranstaltung, onBack, onSuccess }: Step2Props) {
  const [firma, setFirma] = useState('');
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [email, setEmail] = useState('');
  const [telefon, setTelefon] = useState('');
  const [buchungsart, setBuchungsart] = useState('');
  const [stufe, setStufe] = useState('');
  const [verfahren, setVerfahren] = useState('');
  const [datenschutz, setDatenschutz] = useState(false);
  const [bemerkung, setBemerkung] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!firma.trim()) { setFormError('Bitte gib einen Firmennamen ein.'); return; }
    if (!vorname.trim()) { setFormError('Bitte gib den Vornamen des Ansprechpartners ein.'); return; }
    if (!nachname.trim()) { setFormError('Bitte gib den Nachnamen des Ansprechpartners ein.'); return; }
    if (!email.trim()) { setFormError('Bitte gib eine E-Mail-Adresse ein.'); return; }
    if (!datenschutz) { setFormError('Bitte akzeptiere die Datenschutzerklärung.'); return; }
    setFormError(null);
    setSubmitting(true);
    try {
      const fields: Record<string, unknown> = {
        firma: firma.trim(),
        ansprechpartner_vorname: vorname.trim(),
        ansprechpartner_nachname: nachname.trim(),
        ansprechpartner_email: email.trim(),
        datenschutz_akzeptiert: datenschutz,
      };
      if (telefon.trim()) fields['ansprechpartner_telefon'] = telefon.trim();
      if (buchungsart) fields['buchungsart'] = buchungsart;
      if (stufe) fields['stufe'] = stufe;
      if (verfahren) fields['verfahren'] = verfahren;
      if (bemerkung.trim()) fields['bemerkung'] = bemerkung.trim();

      const response = await LivingAppsService.createAnmeldungenEntry(fields as any);
      const newId = extractNewRecordId(response);
      if (!newId) throw new Error('Anmeldung konnte nicht gespeichert werden.');
      onSuccess(newId);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Fehler beim Erstellen der Anmeldung.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Context card */}
      <div className="rounded-xl border bg-card p-4 flex items-center gap-3 overflow-hidden">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <IconCalendarEvent size={20} className="text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">
            {selectedVeranstaltung.fields.veranstaltungstitel ?? '(Veranstaltung)'}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {selectedVeranstaltung.fields.ort ?? ''}{selectedVeranstaltung.fields.startdatum ? ` · ${formatDate(selectedVeranstaltung.fields.startdatum)}` : ''}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-foreground">Firmen- und Kontaktdaten</h2>

        <div>
          <label className="block text-sm font-medium mb-1">
            Firma <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <IconBuilding size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Firmenname"
              value={firma}
              onChange={e => setFirma(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Vorname <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Vorname"
              value={vorname}
              onChange={e => setVorname(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Nachname <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Nachname"
              value={nachname}
              onChange={e => setNachname(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              E-Mail <span className="text-destructive">*</span>
            </label>
            <Input
              type="email"
              placeholder="email@firma.de"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telefon</label>
            <Input
              type="tel"
              placeholder="+49 ..."
              value={telefon}
              onChange={e => setTelefon(e.target.value)}
            />
          </div>
        </div>

        <h2 className="font-semibold text-foreground pt-2">Buchungsdetails</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Buchungsart</label>
            <select
              value={buchungsart}
              onChange={e => setBuchungsart(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Bitte wählen</option>
              {BUCHUNGSART_OPTIONS.map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Stufe</label>
            <select
              value={stufe}
              onChange={e => setStufe(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Bitte wählen</option>
              {STUFE_ANMELDUNG_OPTIONS.map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Verfahren</label>
            <select
              value={verfahren}
              onChange={e => setVerfahren(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Bitte wählen</option>
              {VERFAHREN_ANMELDUNG_OPTIONS.map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Bemerkung</label>
          <textarea
            placeholder="Optionale Anmerkungen..."
            value={bemerkung}
            onChange={e => setBemerkung(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
          />
        </div>

        <div className="flex items-start gap-3 pt-1">
          <input
            type="checkbox"
            id="datenschutz"
            checked={datenschutz}
            onChange={e => setDatenschutz(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <label htmlFor="datenschutz" className="text-sm text-foreground cursor-pointer">
            Ich habe die Datenschutzerklärung gelesen und akzeptiere sie.{' '}
            <span className="text-destructive">*</span>
          </label>
        </div>

        {formError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{formError}</p>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={submitting} className="shrink-0">
          Zurück
        </Button>
        <Button onClick={handleSubmit} disabled={submitting} className="flex-1 sm:flex-none">
          {submitting ? 'Wird gespeichert ...' : 'Anmeldung erstellen & weiter'}
        </Button>
      </div>
    </div>
  );
}

// --- Step 3: Teilnehmer ---
interface Step3Props {
  veranstaltungId: string;
  anmeldungId: string;
  addedTeilnehmer: AddedTeilnehmer[];
  onAddTeilnehmer: (t: AddedTeilnehmer) => void;
  onRemoveTeilnehmer: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}

function Step3Teilnehmer({
  anmeldungId,
  addedTeilnehmer,
  onAddTeilnehmer,
  onRemoveTeilnehmer,
  onBack,
  onNext,
}: Step3Props) {
  const [form, setForm] = useState<TeilnehmerFormState>(EMPTY_TEILNEHMER_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const updateForm = (field: keyof TeilnehmerFormState, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleAdd = async () => {
    if (!form.teilnehmer_vorname.trim()) { setFormError('Vorname ist erforderlich.'); return; }
    if (!form.teilnehmer_nachname.trim()) { setFormError('Nachname ist erforderlich.'); return; }
    setFormError(null);
    setSubmitting(true);
    try {
      const fields: Record<string, unknown> = {
        anmeldung: createRecordUrl(APP_IDS.ANMELDUNGEN, anmeldungId),
        teilnehmer_vorname: form.teilnehmer_vorname.trim(),
        teilnehmer_nachname: form.teilnehmer_nachname.trim(),
      };
      if (form.teilnehmer_email.trim()) fields['teilnehmer_email'] = form.teilnehmer_email.trim();
      if (form.teilnehmer_telefon.trim()) fields['teilnehmer_telefon'] = form.teilnehmer_telefon.trim();
      if (form.selectedStufe) fields['gebuchte_stufe'] = form.selectedStufe;
      if (form.selectedVerfahren) fields['gebuchtes_verfahren'] = form.selectedVerfahren;

      const response = await LivingAppsService.createTeilnehmerEntry(fields as any);
      const newId = extractNewRecordId(response);
      if (!newId) throw new Error('Teilnehmer konnte nicht gespeichert werden.');
      onAddTeilnehmer({
        id: newId,
        vorname: form.teilnehmer_vorname.trim(),
        nachname: form.teilnehmer_nachname.trim(),
        email: form.teilnehmer_email.trim(),
        telefon: form.teilnehmer_telefon.trim(),
        gebuchte_stufe: form.selectedStufe,
        gebuchtes_verfahren: form.selectedVerfahren,
      });
      setForm(EMPTY_TEILNEHMER_FORM);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Fehler beim Hinzufügen des Teilnehmers.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Counter */}
      <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <IconUsers size={20} className="text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm">
            {addedTeilnehmer.length} {addedTeilnehmer.length === 1 ? 'Teilnehmer' : 'Teilnehmer'} hinzugefügt
          </p>
          <p className="text-xs text-muted-foreground">Füge alle Teilnehmer der Anmeldung hinzu.</p>
        </div>
      </div>

      {/* Add form */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <IconPlus size={16} />
          Neuen Teilnehmer erfassen
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Vorname <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Vorname"
              value={form.teilnehmer_vorname}
              onChange={e => updateForm('teilnehmer_vorname', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Nachname <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Nachname"
              value={form.teilnehmer_nachname}
              onChange={e => updateForm('teilnehmer_nachname', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">E-Mail</label>
            <Input
              type="email"
              placeholder="email@beispiel.de"
              value={form.teilnehmer_email}
              onChange={e => updateForm('teilnehmer_email', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telefon</label>
            <Input
              type="tel"
              placeholder="+49 ..."
              value={form.teilnehmer_telefon}
              onChange={e => updateForm('teilnehmer_telefon', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Gebuchte Stufe</label>
            <select
              value={form.selectedStufe}
              onChange={e => updateForm('selectedStufe', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Bitte wählen</option>
              {GEBUCHTE_STUFE_OPTIONS.map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Gebuchtes Verfahren</label>
            <select
              value={form.selectedVerfahren}
              onChange={e => updateForm('selectedVerfahren', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Bitte wählen</option>
              {GEBUCHTES_VERFAHREN_OPTIONS.map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {formError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{formError}</p>
        )}

        <Button onClick={handleAdd} disabled={submitting} variant="outline" className="w-full sm:w-auto gap-2">
          <IconPlus size={16} />
          {submitting ? 'Wird hinzugefügt ...' : 'Teilnehmer hinzufügen'}
        </Button>
      </div>

      {/* Added participants list */}
      {addedTeilnehmer.length > 0 && (
        <div className="space-y-2">
          {addedTeilnehmer.map((t, idx) => (
            <div key={t.id} className="rounded-xl border bg-card p-4 flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold text-sm">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{t.vorname} {t.nachname}</p>
                <div className="flex gap-3 text-xs text-muted-foreground flex-wrap mt-0.5">
                  {t.email && <span className="truncate">{t.email}</span>}
                  {t.gebuchte_stufe && (
                    <span>{GEBUCHTE_STUFE_OPTIONS.find(o => o.key === t.gebuchte_stufe)?.label ?? t.gebuchte_stufe}</span>
                  )}
                  {t.gebuchtes_verfahren && (
                    <span>{GEBUCHTES_VERFAHREN_OPTIONS.find(o => o.key === t.gebuchtes_verfahren)?.label ?? t.gebuchtes_verfahren}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onRemoveTeilnehmer(t.id)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0"
                title="Teilnehmer entfernen"
              >
                <IconTrash size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="shrink-0">
          Zurück
        </Button>
        <Button
          onClick={onNext}
          disabled={addedTeilnehmer.length === 0}
          className="flex-1 sm:flex-none gap-2"
        >
          <IconCheck size={16} />
          Weiter zu den Leistungen
        </Button>
      </div>
    </div>
  );
}

// --- Step 4: Leistungen buchen ---
interface Step4Props {
  veranstaltungId: string;
  anmeldungId: string;
  teilnehmer: AddedTeilnehmer[];
  bookedLeistungen: BookedLeistung[];
  onBookLeistung: (l: BookedLeistung) => void;
  onBack: () => void;
  onFinish: () => void;
}

function Step4Leistungen({
  veranstaltungId,
  anmeldungId,
  teilnehmer,
  bookedLeistungen,
  onBookLeistung,
  onBack,
  onFinish,
}: Step4Props) {
  const [forms, setForms] = useState<Record<string, LeistungFormState>>(() => {
    const init: Record<string, LeistungFormState> = {};
    teilnehmer.forEach(t => { init[t.id] = emptyLeistungForm(); });
    return init;
  });
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [finishing, setFinishing] = useState(false);

  const updateForm = (teilnehmerId: string, field: keyof LeistungFormState, value: string) =>
    setForms(prev => ({ ...prev, [teilnehmerId]: { ...prev[teilnehmerId], [field]: value } }));

  const handleBook = async (t: AddedTeilnehmer) => {
    const form = forms[t.id];
    if (!form) return;
    setErrors(prev => ({ ...prev, [t.id]: '' }));
    setSubmitting(prev => ({ ...prev, [t.id]: true }));
    try {
      const fields: Record<string, unknown> = {
        teilnehmer: createRecordUrl(APP_IDS.TEILNEHMER, t.id),
        veranstaltung: createRecordUrl(APP_IDS.VERANSTALTUNGEN, veranstaltungId),
        anmeldung: createRecordUrl(APP_IDS.ANMELDUNGEN, anmeldungId),
      };
      if (form.leistungsname.trim()) fields['leistungsname'] = form.leistungsname.trim();
      if (form.leistungstyp.trim()) fields['leistungstyp'] = form.leistungstyp.trim();
      if (form.selectedStufe) fields['stufe'] = form.selectedStufe;
      if (form.selectedVerfahren) fields['verfahren'] = form.selectedVerfahren;
      if (form.datum_von) fields['datum_von'] = form.datum_von;
      if (form.datum_bis) fields['datum_bis'] = form.datum_bis;
      const preisNetto = parseFloat(form.preis_netto);
      if (!isNaN(preisNetto)) fields['preis_netto'] = preisNetto;
      const rabatt = parseFloat(form.rabatt);
      if (!isNaN(rabatt)) fields['rabatt'] = rabatt;

      await LivingAppsService.createGebuchteLeistungenEntry(fields as any);
      onBookLeistung({
        teilnehmerId: t.id,
        leistungsname: form.leistungsname.trim(),
        preis_netto: isNaN(preisNetto) ? 0 : preisNetto,
        rabatt: isNaN(rabatt) ? 0 : rabatt,
      });
      setBooked(prev => new Set(prev).add(t.id));
      setForms(prev => ({ ...prev, [t.id]: emptyLeistungForm() }));
    } catch (err) {
      setErrors(prev => ({
        ...prev,
        [t.id]: err instanceof Error ? err.message : 'Fehler beim Buchen der Leistung.',
      }));
    } finally {
      setSubmitting(prev => ({ ...prev, [t.id]: false }));
    }
  };

  const totalNetto = useMemo(() =>
    bookedLeistungen.reduce((sum, l) => sum + (l.preis_netto - l.rabatt), 0),
  [bookedLeistungen]);

  const handleFinish = async () => {
    setFinishing(true);
    onFinish();
  };

  return (
    <div className="space-y-5">
      {/* Running total */}
      <BudgetTracker
        budget={0}
        booked={totalNetto}
        label="Gesamtbetrag (netto)"
        showRemaining={false}
      />

      {totalNetto > 0 && (
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <IconCurrencyEuro size={20} className="text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">
              {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(totalNetto)}
            </p>
            <p className="text-xs text-muted-foreground">Gesamtbetrag aller gebuchten Leistungen (inkl. Rabatt)</p>
          </div>
        </div>
      )}

      {/* Per-participant leistung forms */}
      {teilnehmer.map(t => {
        const form = forms[t.id] ?? emptyLeistungForm();
        const isBooked = booked.has(t.id);
        return (
          <div key={t.id} className={`rounded-xl border p-5 space-y-4 overflow-hidden ${isBooked ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <IconUser size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{t.vorname} {t.nachname}</p>
                {t.email && <p className="text-xs text-muted-foreground truncate">{t.email}</p>}
              </div>
              {isBooked && (
                <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                  <IconCheck size={12} />
                  Gebucht
                </span>
              )}
            </div>

            {isBooked ? (
              <p className="text-sm text-muted-foreground">
                Leistung wurde erfolgreich gebucht.{' '}
                <button
                  onClick={() => setBooked(prev => { const s = new Set(prev); s.delete(t.id); return s; })}
                  className="text-primary underline text-xs"
                >
                  Weitere Leistung hinzufügen
                </button>
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Leistungsname</label>
                    <Input
                      placeholder="z.B. TT2-Schulung"
                      value={form.leistungsname}
                      onChange={e => updateForm(t.id, 'leistungsname', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Leistungstyp</label>
                    <Input
                      placeholder="z.B. Schulung"
                      value={form.leistungstyp}
                      onChange={e => updateForm(t.id, 'leistungstyp', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Stufe</label>
                    <select
                      value={form.selectedStufe}
                      onChange={e => updateForm(t.id, 'selectedStufe', e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="">Bitte wählen</option>
                      {LEISTUNG_STUFE_OPTIONS.map(o => (
                        <option key={o.key} value={o.key}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Verfahren</label>
                    <select
                      value={form.selectedVerfahren}
                      onChange={e => updateForm(t.id, 'selectedVerfahren', e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="">Bitte wählen</option>
                      {LEISTUNG_VERFAHREN_OPTIONS.map(o => (
                        <option key={o.key} value={o.key}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Datum von</label>
                    <Input
                      type="date"
                      value={form.datum_von}
                      onChange={e => updateForm(t.id, 'datum_von', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Datum bis</label>
                    <Input
                      type="date"
                      value={form.datum_bis}
                      onChange={e => updateForm(t.id, 'datum_bis', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Preis netto (€)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      value={form.preis_netto}
                      onChange={e => updateForm(t.id, 'preis_netto', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Rabatt (€)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      value={form.rabatt}
                      onChange={e => updateForm(t.id, 'rabatt', e.target.value)}
                    />
                  </div>
                </div>

                {errors[t.id] && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{errors[t.id]}</p>
                )}

                <Button
                  onClick={() => handleBook(t)}
                  disabled={submitting[t.id]}
                  variant="outline"
                  className="w-full sm:w-auto gap-2"
                >
                  <IconCheck size={16} />
                  {submitting[t.id] ? 'Wird gebucht ...' : 'Leistung buchen'}
                </Button>
              </>
            )}
          </div>
        );
      })}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={finishing} className="shrink-0">
          Zurück
        </Button>
        <Button onClick={handleFinish} disabled={finishing} className="flex-1 sm:flex-none gap-2">
          <IconCheck size={16} />
          {finishing ? 'Wird abgeschlossen ...' : 'Anmeldung abschließen'}
        </Button>
      </div>
    </div>
  );
}

// --- Success state ---
interface SuccessProps {
  onReset: () => void;
}

function SuccessView({ onReset }: SuccessProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <IconCheck size={28} className="text-primary" stroke={2.5} />
      </div>
      <div>
        <h2 className="text-xl font-bold mb-2">Anmeldung erfolgreich erfasst!</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Die Anmeldung wurde erstellt, alle Teilnehmer und Leistungen wurden gespeichert.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={onReset} variant="outline">
          Neue Anmeldung erfassen
        </Button>
        <a href="#/">
          <Button>Zurück zum Dashboard</Button>
        </a>
      </div>
    </div>
  );
}

// --- Main page ---
export default function AnmeldungErfassenPage() {
  const { veranstaltungen, loading, error, fetchAll } = useDashboardData();
  const [searchParams, setSearchParams] = useSearchParams();

  const [step, setStep] = useState(1);
  const [selectedVeranstaltung, setSelectedVeranstaltung] = useState<Veranstaltungen | null>(null);
  const [anmeldungId, setAnmeldungId] = useState<string | null>(null);
  const [addedTeilnehmer, setAddedTeilnehmer] = useState<AddedTeilnehmer[]>([]);
  const [bookedLeistungen, setBookedLeistungen] = useState<BookedLeistung[]>([]);
  const [finished, setFinished] = useState(false);

  // Deep-link: if veranstaltungId is in URL, pre-select and jump to step 2
  useEffect(() => {
    const vid = searchParams.get('veranstaltungId');
    if (vid && veranstaltungen.length > 0 && !selectedVeranstaltung) {
      const found = veranstaltungen.find(v => v.record_id === vid);
      if (found) {
        setSelectedVeranstaltung(found);
        setStep(2);
      }
    }
  }, [searchParams, veranstaltungen, selectedVeranstaltung]);

  const handleSelectVeranstaltung = (id: string) => {
    const v = veranstaltungen.find(x => x.record_id === id);
    if (!v) return;
    setSelectedVeranstaltung(v);
    const params = new URLSearchParams(searchParams);
    params.set('veranstaltungId', id);
    setSearchParams(params, { replace: true });
    setStep(2);
  };

  const handleAnmeldungCreated = (id: string) => {
    setAnmeldungId(id);
    setStep(3);
  };

  const handleAddTeilnehmer = (t: AddedTeilnehmer) => {
    setAddedTeilnehmer(prev => [...prev, t]);
  };

  const handleRemoveTeilnehmer = (id: string) => {
    setAddedTeilnehmer(prev => prev.filter(t => t.id !== id));
  };

  const handleBookLeistung = (l: BookedLeistung) => {
    setBookedLeistungen(prev => [...prev, l]);
  };

  const handleReset = () => {
    setStep(1);
    setSelectedVeranstaltung(null);
    setAnmeldungId(null);
    setAddedTeilnehmer([]);
    setBookedLeistungen([]);
    setFinished(false);
    const params = new URLSearchParams();
    setSearchParams(params, { replace: true });
    void fetchAll();
  };

  if (finished) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <a href="#/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Zurück zum Dashboard
          </a>
        </div>
        <SuccessView onReset={handleReset} />
      </div>
    );
  }

  return (
    <IntentWizardShell
      title="Anmeldung erfassen"
      subtitle="Schritt-für-Schritt eine neue Schulungsanmeldung anlegen"
      steps={[
        { label: 'Veranstaltung' },
        { label: 'Anmeldedaten' },
        { label: 'Teilnehmer' },
        { label: 'Leistungen' },
      ]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {step === 1 && (
        <EntitySelectStep
          items={veranstaltungen.map(v => ({
            id: v.record_id,
            title: v.fields.veranstaltungstitel ?? '(Ohne Titel)',
            subtitle: [
              v.fields.ort,
              v.fields.startdatum ? formatDate(v.fields.startdatum) : undefined,
            ].filter(Boolean).join(' · '),
            status: v.fields.status
              ? { key: v.fields.status, label: v.fields.status }
              : undefined,
            stats: [
              {
                label: 'Teilnehmer',
                value: v.fields.max_teilnehmerzahl
                  ? `${v.fields.aktuelle_teilnehmerzahl ?? 0} / ${v.fields.max_teilnehmerzahl}`
                  : `${v.fields.aktuelle_teilnehmerzahl ?? 0}`,
              },
            ],
            icon: <IconCalendarEvent size={20} className="text-primary" />,
          }))}
          onSelect={handleSelectVeranstaltung}
          searchPlaceholder="Veranstaltung suchen ..."
          emptyIcon={<IconCalendarEvent size={32} />}
          emptyText="Keine Veranstaltungen gefunden."
        />
      )}

      {step === 2 && selectedVeranstaltung && (
        <Step2Anmeldedaten
          selectedVeranstaltung={selectedVeranstaltung}
          onBack={() => setStep(1)}
          onSuccess={handleAnmeldungCreated}
        />
      )}

      {step === 3 && selectedVeranstaltung && anmeldungId && (
        <Step3Teilnehmer
          veranstaltungId={selectedVeranstaltung.record_id}
          anmeldungId={anmeldungId}
          addedTeilnehmer={addedTeilnehmer}
          onAddTeilnehmer={handleAddTeilnehmer}
          onRemoveTeilnehmer={handleRemoveTeilnehmer}
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
        />
      )}

      {step === 4 && selectedVeranstaltung && anmeldungId && (
        <Step4Leistungen
          veranstaltungId={selectedVeranstaltung.record_id}
          anmeldungId={anmeldungId}
          teilnehmer={addedTeilnehmer}
          bookedLeistungen={bookedLeistungen}
          onBookLeistung={handleBookLeistung}
          onBack={() => setStep(3)}
          onFinish={() => setFinished(true)}
        />
      )}
    </IntentWizardShell>
  );
}
