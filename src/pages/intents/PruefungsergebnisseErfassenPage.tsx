import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import type { Veranstaltungen, Teilnehmer } from '@/types/app';
import {
  IconClipboardCheck,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconAlertCircle,
  IconLoader2,
} from '@tabler/icons-react';

// --- Types ---

interface TeilnehmerFormState {
  pruefungsart: string;
  stufe: string;
  verfahren: string;
  pruefungsdatum: string;
  ergebnis: string;
  bestanden: boolean;
  bemerkung: string;
  bemerkungOpen: boolean;
}

interface SavedResult {
  teilnehmerId: string;
  vorname: string;
  nachname: string;
  pruefungsart: string;
  ergebnis: string;
  bestanden: boolean;
}

const PRUEFUNGSART_OPTIONS = LOOKUP_OPTIONS['pruefungen']['pruefungsart'] ?? [];
const STUFE_OPTIONS = LOOKUP_OPTIONS['pruefungen']['stufe'] ?? [];
const VERFAHREN_OPTIONS = LOOKUP_OPTIONS['pruefungen']['verfahren'] ?? [];

function buildDefaultForm(): TeilnehmerFormState {
  return {
    pruefungsart: PRUEFUNGSART_OPTIONS[0]?.key ?? '',
    stufe: STUFE_OPTIONS[0]?.key ?? '',
    verfahren: VERFAHREN_OPTIONS[0]?.key ?? '',
    pruefungsdatum: format(new Date(), 'yyyy-MM-dd'),
    ergebnis: '',
    bestanden: false,
    bemerkung: '',
    bemerkungOpen: false,
  };
}

function formatVeranstaltungDate(dateStr?: string): string {
  if (!dateStr) return '–';
  try {
    return format(parseISO(dateStr), 'dd.MM.yyyy HH:mm', { locale: de });
  } catch {
    return dateStr;
  }
}

// --- Main Component ---

export default function PruefungsergebnisseErfassenPage() {
  const { veranstaltungen, teilnehmer, gebuchteLeistungen, loading, error, fetchAll } =
    useDashboardData();

  const [searchParams, setSearchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [selectedVeranstaltung, setSelectedVeranstaltung] = useState<Veranstaltungen | null>(null);

  // Per-participant form state: key = teilnehmer record_id
  const [forms, setForms] = useState<Record<string, TeilnehmerFormState>>({});
  // Participants whose results have been saved
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  // Participants currently being saved
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  // Per-participant save errors
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  // Final saved results for summary step
  const [savedResults, setSavedResults] = useState<SavedResult[]>([]);

  // Deep-link: read veranstaltungId from URL on mount
  useEffect(() => {
    const vid = searchParams.get('veranstaltungId');
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);
    if (vid && veranstaltungen.length > 0) {
      const found = veranstaltungen.find(v => v.record_id === vid);
      if (found && !selectedVeranstaltung) {
        setSelectedVeranstaltung(found);
        if (urlStep === 2) setStep(2);
        else if (urlStep === 3) setStep(3);
        else setStep(2);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [veranstaltungen]);

  // Sync step + veranstaltungId to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (selectedVeranstaltung) {
      params.set('veranstaltungId', selectedVeranstaltung.record_id);
    } else {
      params.delete('veranstaltungId');
    }
    setSearchParams(params, { replace: true });
  }, [selectedVeranstaltung, step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute participants filtered by selected Veranstaltung
  const filteredTeilnehmer: Teilnehmer[] = useMemo(() => {
    if (!selectedVeranstaltung) return [];
    const veranstaltungId = selectedVeranstaltung.record_id;
    // Find all GebuchteLeistungen for this Veranstaltung
    const teilnehmerIdsWithLeistung = new Set<string>();
    for (const gl of gebuchteLeistungen) {
      const glVeranstaltungId = extractRecordId(gl.fields.veranstaltung);
      if (glVeranstaltungId === veranstaltungId) {
        const tnId = extractRecordId(gl.fields.teilnehmer);
        if (tnId) teilnehmerIdsWithLeistung.add(tnId);
      }
    }
    return teilnehmer.filter(tn => teilnehmerIdsWithLeistung.has(tn.record_id));
  }, [selectedVeranstaltung, gebuchteLeistungen, teilnehmer]);

  // Initialize forms when step 2 starts / participants change
  useEffect(() => {
    if (step === 2 && filteredTeilnehmer.length > 0) {
      setForms(prev => {
        const next: Record<string, TeilnehmerFormState> = {};
        for (const tn of filteredTeilnehmer) {
          next[tn.record_id] = prev[tn.record_id] ?? buildDefaultForm();
        }
        return next;
      });
    }
  }, [step, filteredTeilnehmer]);

  const updateForm = useCallback(
    (id: string, patch: Partial<TeilnehmerFormState>) => {
      setForms(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    },
    []
  );

  const handleSelectVeranstaltung = useCallback(
    (id: string) => {
      const found = veranstaltungen.find(v => v.record_id === id);
      if (!found) return;
      setSelectedVeranstaltung(found);
      setSavedIds(new Set());
      setSaveErrors({});
      setSavedResults([]);
      setStep(2);
    },
    [veranstaltungen]
  );

  const handleSaveResult = useCallback(
    async (tn: Teilnehmer) => {
      if (!selectedVeranstaltung) return;
      const form = forms[tn.record_id];
      if (!form) return;

      setSavingIds(prev => new Set(prev).add(tn.record_id));
      setSaveErrors(prev => { const n = { ...prev }; delete n[tn.record_id]; return n; });

      try {
        await LivingAppsService.createPruefungenEntry({
          teilnehmer: createRecordUrl(APP_IDS.TEILNEHMER, tn.record_id),
          veranstaltung: createRecordUrl(APP_IDS.VERANSTALTUNGEN, selectedVeranstaltung.record_id),
          // Pass existing anmeldung URL directly if available
          anmeldung: tn.fields.anmeldung ?? undefined,
          pruefungsart: form.pruefungsart || undefined,
          stufe: form.stufe || undefined,
          verfahren: form.verfahren || undefined,
          pruefungsdatum: form.pruefungsdatum || undefined,
          ergebnis: form.ergebnis || undefined,
          bestanden: form.bestanden,
          bemerkung: form.bemerkung || undefined,
        });

        setSavedIds(prev => new Set(prev).add(tn.record_id));
        setSavedResults(prev => [
          ...prev.filter(r => r.teilnehmerId !== tn.record_id),
          {
            teilnehmerId: tn.record_id,
            vorname: tn.fields.teilnehmer_vorname ?? '',
            nachname: tn.fields.teilnehmer_nachname ?? '',
            pruefungsart:
              PRUEFUNGSART_OPTIONS.find(o => o.key === form.pruefungsart)?.label ??
              form.pruefungsart,
            ergebnis: form.ergebnis,
            bestanden: form.bestanden,
          },
        ]);
        void fetchAll();
      } catch (err) {
        setSaveErrors(prev => ({
          ...prev,
          [tn.record_id]:
            err instanceof Error ? err.message : 'Unbekannter Fehler beim Speichern.',
        }));
      } finally {
        setSavingIds(prev => {
          const n = new Set(prev);
          n.delete(tn.record_id);
          return n;
        });
      }
    },
    [selectedVeranstaltung, forms, fetchAll]
  );

  const allSaved =
    filteredTeilnehmer.length > 0 &&
    filteredTeilnehmer.every(tn => savedIds.has(tn.record_id));

  const handleReset = useCallback(() => {
    setSelectedVeranstaltung(null);
    setSavedIds(new Set());
    setSaveErrors({});
    setSavedResults([]);
    setForms({});
    setStep(1);
  }, []);

  // --- Render ---

  const WIZARD_STEPS = [
    { label: 'Veranstaltung' },
    { label: 'Ergebnisse' },
    { label: 'Zusammenfassung' },
  ];

  return (
    <IntentWizardShell
      title="Prüfungsergebnisse erfassen"
      subtitle="Wähle eine Veranstaltung und trage die Prüfungsergebnisse für alle Teilnehmenden ein."
      steps={WIZARD_STEPS}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── Step 1: Veranstaltung auswählen ─────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Veranstaltung auswählen</h2>
          <p className="text-sm text-muted-foreground">
            Für welche Veranstaltung möchtest du Prüfungsergebnisse erfassen?
          </p>
          <EntitySelectStep
            searchPlaceholder="Veranstaltung suchen..."
            emptyText="Keine Veranstaltungen gefunden."
            emptyIcon={<IconClipboardCheck size={32} />}
            items={veranstaltungen.map(v => ({
              id: v.record_id,
              title: v.fields.veranstaltungstitel ?? v.fields.veranstaltungsnummer ?? '(Ohne Titel)',
              subtitle: [
                v.fields.ort,
                v.fields.startdatum ? formatVeranstaltungDate(v.fields.startdatum) : undefined,
              ]
                .filter(Boolean)
                .join(' · '),
              status: v.fields.status
                ? { key: v.fields.status, label: v.fields.status }
                : undefined,
              stats: [
                {
                  label: 'Teilnehmende',
                  value: v.fields.aktuelle_teilnehmerzahl ?? 0,
                },
                ...(v.fields.max_teilnehmerzahl
                  ? [{ label: 'Max.', value: v.fields.max_teilnehmerzahl }]
                  : []),
              ],
              icon: <IconClipboardCheck size={20} className="text-primary" />,
            }))}
            onSelect={handleSelectVeranstaltung}
          />
        </div>
      )}

      {/* ── Step 2: Ergebnisse eingeben ──────────────────────────────── */}
      {step === 2 && selectedVeranstaltung && (
        <div className="space-y-5">
          {/* Context header */}
          <div className="rounded-xl border bg-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 overflow-hidden">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">Veranstaltung</p>
              <p className="font-semibold truncate">
                {selectedVeranstaltung.fields.veranstaltungstitel ??
                  selectedVeranstaltung.fields.veranstaltungsnummer ??
                  '(Ohne Titel)'}
              </p>
              {selectedVeranstaltung.fields.startdatum && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatVeranstaltungDate(selectedVeranstaltung.fields.startdatum)}
                  {selectedVeranstaltung.fields.ort
                    ? ` · ${selectedVeranstaltung.fields.ort}`
                    : ''}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(1)}
              className="shrink-0 self-start sm:self-center"
            >
              Ändern
            </Button>
          </div>

          {/* Progress counter */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                <span className="text-primary font-bold">{savedIds.size}</span>
                {' von '}
                <span className="font-bold">{filteredTeilnehmer.length}</span>
                {' Ergebnissen eingetragen'}
              </p>
              {filteredTeilnehmer.length > 0 && (
                <div className="h-1.5 mt-1.5 rounded-full bg-muted overflow-hidden w-48">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${(savedIds.size / filteredTeilnehmer.length) * 100}%`,
                    }}
                  />
                </div>
              )}
            </div>
            {allSaved && (
              <Button onClick={() => setStep(3)}>
                <IconCheck size={16} className="mr-1.5" stroke={2.5} />
                Weiter zur Zusammenfassung
              </Button>
            )}
          </div>

          {/* Empty state */}
          {filteredTeilnehmer.length === 0 && (
            <div className="text-center py-16 text-muted-foreground rounded-xl border bg-card">
              <IconClipboardCheck size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Keine Teilnehmenden gefunden</p>
              <p className="text-xs mt-1">
                Für diese Veranstaltung sind keine gebuchten Leistungen mit Teilnehmenden
                verknüpft.
              </p>
            </div>
          )}

          {/* Participant cards */}
          <div className="space-y-4">
            {filteredTeilnehmer.map(tn => {
              const form = forms[tn.record_id];
              const isSaved = savedIds.has(tn.record_id);
              const isSaving = savingIds.has(tn.record_id);
              const saveError = saveErrors[tn.record_id];
              const name = [tn.fields.teilnehmer_vorname, tn.fields.teilnehmer_nachname]
                .filter(Boolean)
                .join(' ') || '(Kein Name)';

              if (!form) return null;

              return (
                <div
                  key={tn.record_id}
                  className={`rounded-2xl border overflow-hidden ${
                    isSaved ? 'border-green-300 bg-green-50/50' : 'bg-card'
                  }`}
                >
                  {/* Card header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                        isSaved
                          ? 'bg-green-500 text-white'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {isSaved ? (
                        <IconCheck size={16} stroke={2.5} />
                      ) : (
                        (tn.fields.teilnehmer_vorname?.[0] ?? '?').toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{name}</p>
                      {tn.fields.teilnehmer_email && (
                        <p className="text-xs text-muted-foreground truncate">
                          {tn.fields.teilnehmer_email}
                        </p>
                      )}
                    </div>
                    {isSaved && (
                      <StatusBadge statusKey="bestanden" label="Gespeichert" />
                    )}
                  </div>

                  {/* Form body */}
                  {!isSaved && (
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Pruefungsart */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">
                            Prüfungsart
                          </label>
                          <select
                            value={form.pruefungsart}
                            onChange={e =>
                              updateForm(tn.record_id, { pruefungsart: e.target.value })
                            }
                            disabled={isSaving}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {PRUEFUNGSART_OPTIONS.map(o => (
                              <option key={o.key} value={o.key}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Stufe */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">
                            Stufe
                          </label>
                          <select
                            value={form.stufe}
                            onChange={e =>
                              updateForm(tn.record_id, { stufe: e.target.value })
                            }
                            disabled={isSaving}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {STUFE_OPTIONS.map(o => (
                              <option key={o.key} value={o.key}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Verfahren */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">
                            Verfahren
                          </label>
                          <select
                            value={form.verfahren}
                            onChange={e =>
                              updateForm(tn.record_id, { verfahren: e.target.value })
                            }
                            disabled={isSaving}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {VERFAHREN_OPTIONS.map(o => (
                              <option key={o.key} value={o.key}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Pruefungsdatum */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">
                            Prüfungsdatum
                          </label>
                          <Input
                            type="date"
                            value={form.pruefungsdatum}
                            onChange={e =>
                              updateForm(tn.record_id, { pruefungsdatum: e.target.value })
                            }
                            disabled={isSaving}
                          />
                        </div>

                        {/* Ergebnis */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">
                            Ergebnis
                          </label>
                          <Input
                            type="text"
                            placeholder="z. B. bestanden, 87 Punkte …"
                            value={form.ergebnis}
                            onChange={e =>
                              updateForm(tn.record_id, { ergebnis: e.target.value })
                            }
                            disabled={isSaving}
                          />
                        </div>
                      </div>

                      {/* Bestanden toggle */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={form.bestanden}
                          onClick={() =>
                            updateForm(tn.record_id, { bestanden: !form.bestanden })
                          }
                          disabled={isSaving}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                            form.bestanden ? 'bg-green-500' : 'bg-muted'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform ring-0 transition-transform ${
                              form.bestanden ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span className="text-sm font-medium">
                          {form.bestanden ? (
                            <span className="text-green-600">Bestanden</span>
                          ) : (
                            <span className="text-muted-foreground">Nicht bestanden</span>
                          )}
                        </span>
                      </div>

                      {/* Bemerkung collapsible */}
                      <div>
                        <button
                          type="button"
                          onClick={() =>
                            updateForm(tn.record_id, { bemerkungOpen: !form.bemerkungOpen })
                          }
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {form.bemerkungOpen ? (
                            <IconChevronUp size={14} />
                          ) : (
                            <IconChevronDown size={14} />
                          )}
                          Bemerkung {form.bemerkungOpen ? 'ausblenden' : 'hinzufügen'}
                        </button>
                        {form.bemerkungOpen && (
                          <textarea
                            value={form.bemerkung}
                            onChange={e =>
                              updateForm(tn.record_id, { bemerkung: e.target.value })
                            }
                            disabled={isSaving}
                            rows={3}
                            placeholder="Optionale Anmerkungen zur Prüfung …"
                            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                          />
                        )}
                      </div>

                      {/* Error message */}
                      {saveError && (
                        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          <IconAlertCircle size={15} className="mt-0.5 shrink-0" />
                          <span>{saveError}</span>
                        </div>
                      )}

                      {/* Save button */}
                      <Button
                        onClick={() => handleSaveResult(tn)}
                        disabled={isSaving}
                        className="w-full sm:w-auto"
                      >
                        {isSaving ? (
                          <>
                            <IconLoader2 size={15} className="mr-1.5 animate-spin" />
                            Wird gespeichert …
                          </>
                        ) : (
                          <>
                            <IconCheck size={15} className="mr-1.5" stroke={2.5} />
                            Ergebnis speichern
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom "Weiter" CTA (shown when all saved) */}
          {allSaved && filteredTeilnehmer.length > 0 && (
            <div className="pt-2 flex justify-end">
              <Button size="lg" onClick={() => setStep(3)}>
                <IconCheck size={16} className="mr-1.5" stroke={2.5} />
                Weiter zur Zusammenfassung
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Zusammenfassung ──────────────────────────────────── */}
      {step === 3 && selectedVeranstaltung && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Zusammenfassung</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Alle Prüfungsergebnisse wurden erfolgreich gespeichert.
            </p>
          </div>

          {/* Summary stats */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b">
              <p className="text-xs text-muted-foreground mb-0.5">Veranstaltung</p>
              <p className="font-semibold">
                {selectedVeranstaltung.fields.veranstaltungstitel ??
                  selectedVeranstaltung.fields.veranstaltungsnummer ??
                  '(Ohne Titel)'}
              </p>
              {selectedVeranstaltung.fields.startdatum && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatVeranstaltungDate(selectedVeranstaltung.fields.startdatum)}
                  {selectedVeranstaltung.fields.ort
                    ? ` · ${selectedVeranstaltung.fields.ort}`
                    : ''}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 divide-x">
              <div className="px-4 py-3 text-center">
                <p className="text-2xl font-bold">{savedResults.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Gesamt</p>
              </div>
              <div className="px-4 py-3 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {savedResults.filter(r => r.bestanden).length}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Bestanden</p>
              </div>
              <div className="px-4 py-3 text-center">
                <p className="text-2xl font-bold text-red-500">
                  {savedResults.filter(r => !r.bestanden).length}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Nicht bestanden</p>
              </div>
            </div>
          </div>

          {/* Pass rate bar */}
          {savedResults.length > 0 && (
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">Bestehensquote</span>
                <span className="font-bold text-primary">
                  {Math.round(
                    (savedResults.filter(r => r.bestanden).length / savedResults.length) * 100
                  )}
                  %
                </span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{
                    width: `${
                      (savedResults.filter(r => r.bestanden).length / savedResults.length) * 100
                    }%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {savedResults.filter(r => r.bestanden).length} bestanden
                </span>
                <span>von {savedResults.length} Teilnehmenden</span>
              </div>
            </div>
          )}

          {/* Results list */}
          {savedResults.length > 0 && (
            <div className="rounded-2xl border overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/40">
                <p className="text-sm font-semibold">Eingetragene Ergebnisse</p>
              </div>
              <div className="divide-y">
                {savedResults.map(r => (
                  <div
                    key={r.teilnehmerId}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        r.bestanden ? 'bg-green-500' : 'bg-red-400'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {[r.vorname, r.nachname].filter(Boolean).join(' ') || '(Kein Name)'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.pruefungsart}
                        {r.ergebnis ? ` · ${r.ergebnis}` : ''}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        r.bestanden
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {r.bestanden ? 'Bestanden' : 'Nicht bestanden'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button onClick={handleReset} variant="outline" className="gap-2">
              <IconRefresh size={16} />
              Neue Prüfung erfassen
            </Button>
            <a href="#/">
              <Button variant="ghost" className="w-full sm:w-auto">
                Zurück zum Dashboard
              </Button>
            </a>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
