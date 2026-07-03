import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichTeilnehmer, enrichPruefungen } from '@/lib/enrich';
import type { EnrichedTeilnehmer, EnrichedPruefungen } from '@/types/enriched';
import type { Veranstaltungen, Anmeldungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  RecordOverlay,
  RecordHeader,
  RecordKeyFacts,
  RecordSection,
  RecordField,
  RecordAttachments,
  useRecordOverlayStack,
} from '@/components/widgets/RecordView';
import { VeranstaltungenDialog } from '@/components/dialogs/VeranstaltungenDialog';
import { AnmeldungenDialog } from '@/components/dialogs/AnmeldungenDialog';
import { TeilnehmerDialog } from '@/components/dialogs/TeilnehmerDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconCalendar,
  IconUsers,
  IconClipboardList,
  IconAlertCircle,
  IconTool,
  IconRefresh,
  IconCheck,
  IconPlus,
  IconPencil,
  IconTrash,
  IconSearch,
  IconChevronRight,
  IconMapPin,
  IconClock,
  IconAward,
} from '@tabler/icons-react';

const APPGROUP_ID = '6a477775cbbba3747e8c7b7c';
const REPAIR_ENDPOINT = '/claude/build/repair';

export default function DashboardOverview() {
  const {
    veranstaltungen, anmeldungen, teilnehmer, pruefungen,
    anmeldungenMap, teilnehmerMap, veranstaltungenMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedTeilnehmer = enrichTeilnehmer(teilnehmer, { anmeldungenMap });
  const enrichedPruefungen = enrichPruefungen(pruefungen, { anmeldungenMap, teilnehmerMap, veranstaltungenMap });

  // --- State: Veranstaltungs-Auswahl ---
  const [selectedVeranstaltungId, setSelectedVeranstaltungId] = useState<string | null>(null);
  const [searchVa, setSearchVa] = useState('');

  // --- State: Dialoge ---
  const [vaDialogOpen, setVaDialogOpen] = useState(false);
  const [vaEditRecord, setVaEditRecord] = useState<Veranstaltungen | null>(null);
  const [anmDialogOpen, setAnmDialogOpen] = useState(false);
  const [anmEditRecord, setAnmEditRecord] = useState<Anmeldungen | null>(null);
  const [tnDialogOpen, setTnDialogOpen] = useState(false);
  const [tnEditRecord, setTnEditRecord] = useState<EnrichedTeilnehmer | null>(null);

  // --- State: Löschen ---
  const [deleteVaTarget, setDeleteVaTarget] = useState<Veranstaltungen | null>(null);
  const [deleteAnmTarget, setDeleteAnmTarget] = useState<Anmeldungen | null>(null);
  const [deleteTnTarget, setDeleteTnTarget] = useState<EnrichedTeilnehmer | null>(null);

  // --- Overlay ---
  const vaOverlay = useRecordOverlayStack<Veranstaltungen>();
  const anmOverlay = useRecordOverlayStack<Anmeldungen>();
  const tnOverlay = useRecordOverlayStack<EnrichedTeilnehmer>();
  const pruefOverlay = useRecordOverlayStack<EnrichedPruefungen>();

  // --- Gefilterte Veranstaltungen ---
  const filteredVeranstaltungen = useMemo(() => {
    const q = searchVa.toLowerCase();
    return veranstaltungen.filter(v =>
      !q ||
      (v.fields.veranstaltungstitel ?? '').toLowerCase().includes(q) ||
      (v.fields.veranstaltungsnummer ?? '').toLowerCase().includes(q) ||
      (v.fields.ort ?? '').toLowerCase().includes(q)
    );
  }, [veranstaltungen, searchVa]);

  // --- Anmeldungen & Teilnehmer der ausgewählten Veranstaltung ---
  // Veranstaltungen haben keine direkte Anmeldungs-Relation → über Teilnehmer.anmeldung → dann über gebuchteLeistungen.veranstaltung
  // Einfacherer Ansatz: Teilnehmer, die über ihre gebuchten Leistungen mit dieser Veranstaltung verbunden sind
  // Aber Anmeldungen haben keine Veranstaltungs-FK. Wir zeigen alle Anmeldungen für gewählte Veranstaltung über GebuchteLeistungen.
  // Direkter Weg: Wir zeigen die Anmeldungen für die gewählte Veranstaltung über Prüfungen/gebuchteLeistungen.
  // Einfachster valider Ansatz: Anmeldungen anzeigen + Teilnehmer mit Buchungsstatus-Info
  const selectedVeranstaltung = selectedVeranstaltungId
    ? veranstaltungenMap.get(selectedVeranstaltungId) ?? null
    : null;

  // Teilnehmer der Veranstaltung: über enrichedPruefungen → veranstaltungId verknüpfen
  const pruefungenDerVeranstaltung = useMemo(() => {
    if (!selectedVeranstaltungId) return [];
    return enrichedPruefungen.filter(p => {
      const vid = extractRecordId(p.fields.veranstaltung);
      return vid === selectedVeranstaltungId;
    });
  }, [enrichedPruefungen, selectedVeranstaltungId]);

  const teilnehmerIdsDerVeranstaltung = useMemo(() => {
    return new Set(pruefungenDerVeranstaltung.map(p => extractRecordId(p.fields.teilnehmer)).filter(Boolean) as string[]);
  }, [pruefungenDerVeranstaltung]);

  const teilnehmerDerVeranstaltung = useMemo(() => {
    if (!selectedVeranstaltungId) return [];
    return enrichedTeilnehmer.filter(t => teilnehmerIdsDerVeranstaltung.has(t.record_id));
  }, [enrichedTeilnehmer, teilnehmerIdsDerVeranstaltung, selectedVeranstaltungId]);

  // KPIs
  const gesamtAnmeldungen = anmeldungen.length;
  const gesamtTeilnehmer = teilnehmer.length;
  const bestandenCount = pruefungen.filter(p => p.fields.bestanden === true).length;

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const handleDeleteVa = async () => {
    if (!deleteVaTarget) return;
    await LivingAppsService.deleteVeranstaltungenEntry(deleteVaTarget.record_id);
    if (selectedVeranstaltungId === deleteVaTarget.record_id) setSelectedVeranstaltungId(null);
    setDeleteVaTarget(null);
    fetchAll();
  };

  const handleDeleteAnm = async () => {
    if (!deleteAnmTarget) return;
    await LivingAppsService.deleteAnmeldungenEntry(deleteAnmTarget.record_id);
    setDeleteAnmTarget(null);
    fetchAll();
  };

  const handleDeleteTn = async () => {
    if (!deleteTnTarget) return;
    await LivingAppsService.deleteTeilnehmerEntry(deleteTnTarget.record_id);
    setDeleteTnTarget(null);
    fetchAll();
  };

  return (
    <div className="space-y-6">
      {/* Workflow-Schnellzugriff */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a href="#/intents/anmeldung-erfassen" className="flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group overflow-hidden">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <IconClipboardList size={20} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground truncate">Neue Anmeldung erfassen</div>
            <div className="text-sm text-muted-foreground truncate">Buchung, Teilnehmer & Leistungen in einem Workflow</div>
          </div>
          <IconChevronRight size={18} className="text-muted-foreground shrink-0" />
        </a>
        <a href="#/intents/pruefungsergebnisse-erfassen" className="flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group overflow-hidden">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <IconAward size={20} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground truncate">Prüfungsergebnisse erfassen</div>
            <div className="text-sm text-muted-foreground truncate">Ergebnisse für alle Teilnehmer einer Veranstaltung eintragen</div>
          </div>
          <IconChevronRight size={18} className="text-muted-foreground shrink-0" />
        </a>
      </div>
      {/* KPI-Zeile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Veranstaltungen"
          value={String(veranstaltungen.length)}
          description="Gesamt"
          icon={<IconCalendar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Anmeldungen"
          value={String(gesamtAnmeldungen)}
          description="Gesamt"
          icon={<IconClipboardList size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Teilnehmer"
          value={String(gesamtTeilnehmer)}
          description="Registriert"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Prüfungen bestanden"
          value={String(bestandenCount)}
          description={`von ${pruefungen.length} gesamt`}
          icon={<IconAward size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Master-Detail: Veranstaltungen + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-0">
        {/* Linke Spalte: Veranstaltungsliste */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-foreground">Veranstaltungen</h2>
            <Button
              size="sm"
              onClick={() => { setVaEditRecord(null); setVaDialogOpen(true); }}
            >
              <IconPlus size={14} className="mr-1 shrink-0" />
              <span className="hidden sm:inline">Neu</span>
            </Button>
          </div>

          <div className="relative">
            <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Suchen…"
              value={searchVa}
              onChange={e => setSearchVa(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[60vh]">
            {filteredVeranstaltungen.length === 0 && (
              <div className="text-center py-10 text-sm text-muted-foreground">
                Keine Veranstaltungen gefunden
              </div>
            )}
            {filteredVeranstaltungen.map(v => {
              const isSelected = selectedVeranstaltungId === v.record_id;
              const stufe = v.fields.stufe?.label;
              const art = v.fields.art?.label;
              const aktuell = v.fields.aktuelle_teilnehmerzahl ?? 0;
              const max = v.fields.max_teilnehmerzahl;
              const auslastung = max ? Math.round((aktuell / max) * 100) : null;

              return (
                <div
                  key={v.record_id}
                  className={`rounded-xl border p-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-card hover:border-primary/40 hover:bg-accent/40'
                  }`}
                  onClick={() => setSelectedVeranstaltungId(isSelected ? null : v.record_id)}
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {v.fields.veranstaltungsnummer && (
                          <span className="text-xs font-mono text-muted-foreground shrink-0">{v.fields.veranstaltungsnummer}</span>
                        )}
                        {stufe && <Badge variant="outline" className="text-xs px-1.5 py-0 shrink-0">{stufe}</Badge>}
                        {art && <Badge variant="secondary" className="text-xs px-1.5 py-0 shrink-0">{art}</Badge>}
                      </div>
                      <p className="font-medium text-sm mt-0.5 truncate text-foreground">
                        {v.fields.veranstaltungstitel ?? '(kein Titel)'}
                      </p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {v.fields.startdatum && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <IconClock size={11} className="shrink-0" />
                            {formatDate(v.fields.startdatum)}
                          </span>
                        )}
                        {v.fields.ort && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                            <IconMapPin size={11} className="shrink-0" />
                            {v.fields.ort}
                          </span>
                        )}
                      </div>
                      {max != null && (
                        <div className="mt-1.5">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-0.5">
                            <span>{aktuell} / {max} TN</span>
                            {auslastung != null && <span>{auslastung}%</span>}
                          </div>
                          <div className="h-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                auslastung != null && auslastung >= 90 ? 'bg-destructive' :
                                auslastung != null && auslastung >= 70 ? 'bg-amber-500' : 'bg-primary'
                              }`}
                              style={{ width: `${Math.min(auslastung ?? 0, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        onClick={e => { e.stopPropagation(); vaOverlay.replace(v); }}
                        title="Details"
                      >
                        <IconChevronRight size={14} />
                      </button>
                      <button
                        className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        onClick={e => { e.stopPropagation(); setVaEditRecord(v); setVaDialogOpen(true); }}
                        title="Bearbeiten"
                      >
                        <IconPencil size={14} />
                      </button>
                      <button
                        className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        onClick={e => { e.stopPropagation(); setDeleteVaTarget(v); }}
                        title="Löschen"
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rechte Spalte: Detail der ausgewählten Veranstaltung */}
        <div className="lg:col-span-3">
          {!selectedVeranstaltung ? (
            <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-dashed border-border text-center gap-2">
              <IconCalendar size={36} className="text-muted-foreground" stroke={1.5} />
              <p className="text-sm text-muted-foreground">Veranstaltung auswählen um Details zu sehen</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Veranstaltungs-Header */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {selectedVeranstaltung.fields.veranstaltungsnummer && (
                        <span className="text-xs font-mono text-muted-foreground">{selectedVeranstaltung.fields.veranstaltungsnummer}</span>
                      )}
                      {selectedVeranstaltung.fields.stufe?.label && (
                        <Badge variant="outline">{selectedVeranstaltung.fields.stufe.label}</Badge>
                      )}
                      {selectedVeranstaltung.fields.art?.label && (
                        <Badge variant="secondary">{selectedVeranstaltung.fields.art.label}</Badge>
                      )}
                      {selectedVeranstaltung.fields.verfahren?.label && (
                        <Badge>{selectedVeranstaltung.fields.verfahren.label}</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground text-base truncate">
                      {selectedVeranstaltung.fields.veranstaltungstitel ?? '(kein Titel)'}
                    </h3>
                    <div className="flex items-center gap-4 mt-1 flex-wrap text-sm text-muted-foreground">
                      {selectedVeranstaltung.fields.startdatum && (
                        <span className="flex items-center gap-1">
                          <IconClock size={13} className="shrink-0" />
                          {formatDate(selectedVeranstaltung.fields.startdatum)}
                          {selectedVeranstaltung.fields.enddatum && ` – ${formatDate(selectedVeranstaltung.fields.enddatum)}`}
                        </span>
                      )}
                      {selectedVeranstaltung.fields.ort && (
                        <span className="flex items-center gap-1">
                          <IconMapPin size={13} className="shrink-0" />
                          {selectedVeranstaltung.fields.ort}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => { setVaEditRecord(selectedVeranstaltung); setVaDialogOpen(true); }}>
                      <IconPencil size={13} className="mr-1 shrink-0" />Bearbeiten
                    </Button>
                  </div>
                </div>

                {selectedVeranstaltung.fields.bemerkung && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{selectedVeranstaltung.fields.bemerkung}</p>
                )}
              </div>

              {/* Teilnehmer dieser Veranstaltung */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h4 className="text-sm font-semibold text-foreground">
                    Teilnehmer ({teilnehmerDerVeranstaltung.length})
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setTnEditRecord(null); setTnDialogOpen(true); }}
                  >
                    <IconPlus size={13} className="mr-1 shrink-0" />Neu
                  </Button>
                </div>

                {teilnehmerDerVeranstaltung.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Keine Teilnehmer für diese Veranstaltung
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Name</th>
                          <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs hidden sm:table-cell">Stufe</th>
                          <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs hidden md:table-cell">Status</th>
                          <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs hidden lg:table-cell">Zertifikat</th>
                          <th className="px-4 py-2 w-24"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {teilnehmerDerVeranstaltung.map(tn => {
                          const pruef = pruefungenDerVeranstaltung.find(p => extractRecordId(p.fields.teilnehmer) === tn.record_id);
                          return (
                            <tr
                              key={tn.record_id}
                              className="border-b border-border/50 last:border-0 hover:bg-accent/30 cursor-pointer transition-colors"
                              onClick={() => tnOverlay.replace(tn)}
                            >
                              <td className="px-4 py-2.5">
                                <div className="font-medium truncate text-foreground">
                                  {[tn.fields.teilnehmer_vorname, tn.fields.teilnehmer_nachname].filter(Boolean).join(' ') || '—'}
                                </div>
                                {tn.fields.teilnehmer_email && (
                                  <div className="text-xs text-muted-foreground truncate">{tn.fields.teilnehmer_email}</div>
                                )}
                              </td>
                              <td className="px-4 py-2.5 hidden sm:table-cell">
                                {tn.fields.gebuchte_stufe?.label
                                  ? <Badge variant="outline" className="text-xs">{tn.fields.gebuchte_stufe.label}</Badge>
                                  : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className="px-4 py-2.5 hidden md:table-cell">
                                {pruef ? (
                                  <Badge variant={pruef.fields.bestanden ? 'default' : 'destructive'} className="text-xs">
                                    {pruef.fields.bestanden ? 'Bestanden' : 'Nicht bestanden'}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">{tn.fields.teilnehmerstatus ?? '—'}</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 hidden lg:table-cell">
                                <span className="text-xs text-muted-foreground">{tn.fields.zertifikats_nr ?? '—'}</span>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                                  <button
                                    className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={() => { setTnEditRecord(tn); setTnDialogOpen(true); }}
                                    title="Bearbeiten"
                                  >
                                    <IconPencil size={13} />
                                  </button>
                                  <button
                                    className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    onClick={() => setDeleteTnTarget(tn)}
                                    title="Löschen"
                                  >
                                    <IconTrash size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Anmeldungen */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h4 className="text-sm font-semibold text-foreground">
                    Anmeldungen ({anmeldungen.length})
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setAnmEditRecord(null); setAnmDialogOpen(true); }}
                  >
                    <IconPlus size={13} className="mr-1 shrink-0" />Neu
                  </Button>
                </div>
                {anmeldungen.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Keine Anmeldungen vorhanden</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Buchungsnr.</th>
                          <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs hidden sm:table-cell">Firma</th>
                          <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs hidden md:table-cell">Art</th>
                          <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs hidden lg:table-cell">Datum</th>
                          <th className="px-4 py-2 w-24"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {anmeldungen.slice(0, 20).map(anm => (
                          <tr
                            key={anm.record_id}
                            className="border-b border-border/50 last:border-0 hover:bg-accent/30 cursor-pointer transition-colors"
                            onClick={() => anmOverlay.replace(anm)}
                          >
                            <td className="px-4 py-2.5">
                              <span className="font-mono text-xs font-medium text-foreground">{anm.fields.buchungsnummer ?? '—'}</span>
                              {anm.fields.buchungsstatus && (
                                <div className="text-xs text-muted-foreground">{anm.fields.buchungsstatus}</div>
                              )}
                            </td>
                            <td className="px-4 py-2.5 hidden sm:table-cell">
                              <span className="truncate text-foreground">{anm.fields.firma ?? '—'}</span>
                            </td>
                            <td className="px-4 py-2.5 hidden md:table-cell">
                              {anm.fields.buchungsart?.label
                                ? <Badge variant="secondary" className="text-xs">{anm.fields.buchungsart.label}</Badge>
                                : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-4 py-2.5 hidden lg:table-cell">
                              <span className="text-xs text-muted-foreground">{anm.fields.buchungsdatum ? formatDate(anm.fields.buchungsdatum) : '—'}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                                <button
                                  className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                  onClick={() => { setAnmEditRecord(anm); setAnmDialogOpen(true); }}
                                  title="Bearbeiten"
                                >
                                  <IconPencil size={13} />
                                </button>
                                <button
                                  className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                  onClick={() => setDeleteAnmTarget(anm)}
                                  title="Löschen"
                                >
                                  <IconTrash size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Dialoge ── */}
      <VeranstaltungenDialog
        open={vaDialogOpen}
        onClose={() => { setVaDialogOpen(false); setVaEditRecord(null); }}
        onSubmit={async (fields) => {
          if (vaEditRecord) {
            await LivingAppsService.updateVeranstaltungenEntry(vaEditRecord.record_id, fields);
          } else {
            await LivingAppsService.createVeranstaltungenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={vaEditRecord?.fields}
        recordId={vaEditRecord?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Veranstaltungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Veranstaltungen']}
      />

      <AnmeldungenDialog
        open={anmDialogOpen}
        onClose={() => { setAnmDialogOpen(false); setAnmEditRecord(null); }}
        onSubmit={async (fields) => {
          if (anmEditRecord) {
            await LivingAppsService.updateAnmeldungenEntry(anmEditRecord.record_id, fields);
          } else {
            await LivingAppsService.createAnmeldungenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={anmEditRecord?.fields}
        recordId={anmEditRecord?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Anmeldungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Anmeldungen']}
      />

      <TeilnehmerDialog
        open={tnDialogOpen}
        onClose={() => { setTnDialogOpen(false); setTnEditRecord(null); }}
        onSubmit={async (fields) => {
          if (tnEditRecord) {
            await LivingAppsService.updateTeilnehmerEntry(tnEditRecord.record_id, fields);
          } else {
            await LivingAppsService.createTeilnehmerEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={tnEditRecord?.fields}
        recordId={tnEditRecord?.record_id}
        anmeldungenList={anmeldungen}
        enablePhotoScan={AI_PHOTO_SCAN['Teilnehmer']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Teilnehmer']}
      />

      {/* ── Löschen-Bestätigungen ── */}
      <ConfirmDialog
        open={!!deleteVaTarget}
        title="Veranstaltung löschen"
        description={`„${deleteVaTarget?.fields.veranstaltungstitel ?? ''}" wirklich löschen?`}
        onConfirm={handleDeleteVa}
        onClose={() => setDeleteVaTarget(null)}
      />
      <ConfirmDialog
        open={!!deleteAnmTarget}
        title="Anmeldung löschen"
        description={`Buchung „${deleteAnmTarget?.fields.buchungsnummer ?? ''}" wirklich löschen?`}
        onConfirm={handleDeleteAnm}
        onClose={() => setDeleteAnmTarget(null)}
      />
      <ConfirmDialog
        open={!!deleteTnTarget}
        title="Teilnehmer löschen"
        description={`${[deleteTnTarget?.fields.teilnehmer_vorname, deleteTnTarget?.fields.teilnehmer_nachname].filter(Boolean).join(' ')} wirklich löschen?`}
        onConfirm={handleDeleteTn}
        onClose={() => setDeleteTnTarget(null)}
      />

      {/* ── Overlays ── */}
      <RecordOverlay
        open={vaOverlay.open}
        onClose={vaOverlay.close}
        onEdit={() => { setVaEditRecord(vaOverlay.top ?? null); setVaDialogOpen(true); vaOverlay.close(); }}
        placement="side"
        size="md"
        ariaLabel="Veranstaltung Details"
      >
        {vaOverlay.top && (
          <>
            <RecordHeader
              title={vaOverlay.top.fields.veranstaltungstitel ?? '(kein Titel)'}
              subtitle={vaOverlay.top.fields.veranstaltungsnummer}
              badges={
                <>
                  {vaOverlay.top.fields.stufe?.label && <Badge variant="outline">{vaOverlay.top.fields.stufe.label}</Badge>}
                  {vaOverlay.top.fields.art?.label && <Badge variant="secondary">{vaOverlay.top.fields.art.label}</Badge>}
                </>
              }
            />
            <RecordKeyFacts items={[
              { label: 'Teilnehmer', value: `${vaOverlay.top.fields.aktuelle_teilnehmerzahl ?? 0} / ${vaOverlay.top.fields.max_teilnehmerzahl ?? '∞'}` },
              { label: 'Startdatum', value: vaOverlay.top.fields.startdatum ? formatDate(vaOverlay.top.fields.startdatum) : '—' },
              { label: 'Ort', value: vaOverlay.top.fields.ort ?? '—' },
            ]} />
            <RecordSection title="Details" cols={2}>
              <RecordField label="Verfahren" value={vaOverlay.top.fields.verfahren?.label} format="text" hideEmpty />
              <RecordField label="Status" value={vaOverlay.top.fields.status} format="text" hideEmpty />
              <RecordField label="Enddatum" value={vaOverlay.top.fields.enddatum} format="date" hideEmpty />
              <RecordField label="SPZ-ID" value={vaOverlay.top.fields.spz_id} format="text" hideEmpty />
              <RecordField label="Bemerkung" value={vaOverlay.top.fields.bemerkung} format="longtext" hideEmpty className="md:col-span-2" />
            </RecordSection>
            <RecordAttachments appId={APP_IDS.VERANSTALTUNGEN} recordId={vaOverlay.top.record_id} />
          </>
        )}
      </RecordOverlay>

      <RecordOverlay
        open={anmOverlay.open}
        onClose={anmOverlay.close}
        onEdit={() => { setAnmEditRecord(anmOverlay.top ?? null); setAnmDialogOpen(true); anmOverlay.close(); }}
        placement="side"
        size="md"
        ariaLabel="Anmeldung Details"
      >
        {anmOverlay.top && (
          <>
            <RecordHeader
              title={`Buchung ${anmOverlay.top.fields.buchungsnummer ?? '—'}`}
              subtitle={anmOverlay.top.fields.firma}
              badges={
                <>
                  {anmOverlay.top.fields.buchungsart?.label && <Badge variant="secondary">{anmOverlay.top.fields.buchungsart.label}</Badge>}
                  {anmOverlay.top.fields.stufe?.label && <Badge variant="outline">{anmOverlay.top.fields.stufe.label}</Badge>}
                </>
              }
            />
            <RecordKeyFacts items={[
              { label: 'Status', value: anmOverlay.top.fields.buchungsstatus ?? '—' },
              { label: 'Buchungsdatum', value: anmOverlay.top.fields.buchungsdatum ? formatDate(anmOverlay.top.fields.buchungsdatum) : '—' },
              { label: 'Gesamtstatus', value: anmOverlay.top.fields.gesamtstatus ?? '—' },
            ]} />
            <RecordSection title="Kontakt" cols={2}>
              <RecordField label="Ansprechpartner" value={[anmOverlay.top.fields.ansprechpartner_vorname, anmOverlay.top.fields.ansprechpartner_nachname].filter(Boolean).join(' ')} format="text" hideEmpty />
              <RecordField label="E-Mail" value={anmOverlay.top.fields.ansprechpartner_email} format="email" hideEmpty />
              <RecordField label="Telefon" value={anmOverlay.top.fields.ansprechpartner_telefon} format="text" hideEmpty />
              <RecordField label="Bestellnummer" value={anmOverlay.top.fields.bestellnummer} format="text" hideEmpty />
            </RecordSection>
            <RecordSection title="Adresse" cols={2}>
              <RecordField label="Straße" value={anmOverlay.top.fields.strasse} format="text" hideEmpty />
              <RecordField label="PLZ / Ort" value={[anmOverlay.top.fields.plz, anmOverlay.top.fields.ort].filter(Boolean).join(' ')} format="text" hideEmpty />
              <RecordField label="Land" value={anmOverlay.top.fields.land} format="text" hideEmpty />
            </RecordSection>
            <RecordSection title="Weitere Infos" cols={2}>
              <RecordField label="Verfahren" value={anmOverlay.top.fields.verfahren?.label} format="text" hideEmpty />
              <RecordField label="Kombipaket TT1+TT2" value={anmOverlay.top.fields.kombipaket_tt1_tt2} format="bool" hideEmpty />
              <RecordField label="Datenschutz akzeptiert" value={anmOverlay.top.fields.datenschutz_akzeptiert} format="bool" hideEmpty />
              <RecordField label="Bemerkung" value={anmOverlay.top.fields.bemerkung} format="longtext" hideEmpty className="md:col-span-2" />
            </RecordSection>
            <RecordAttachments appId={APP_IDS.ANMELDUNGEN} recordId={anmOverlay.top.record_id} />
          </>
        )}
      </RecordOverlay>

      <RecordOverlay
        open={tnOverlay.open}
        onClose={tnOverlay.close}
        onEdit={() => { setTnEditRecord(tnOverlay.top ?? null); setTnDialogOpen(true); tnOverlay.close(); }}
        placement="side"
        size="md"
        ariaLabel="Teilnehmer Details"
      >
        {tnOverlay.top && (
          <>
            <RecordHeader
              title={[tnOverlay.top.fields.teilnehmer_vorname, tnOverlay.top.fields.teilnehmer_nachname].filter(Boolean).join(' ') || '—'}
              subtitle={tnOverlay.top.fields.teilnehmer_email}
              badges={
                <>
                  {tnOverlay.top.fields.gebuchte_stufe?.label && <Badge variant="outline">{tnOverlay.top.fields.gebuchte_stufe.label}</Badge>}
                  {tnOverlay.top.fields.gebuchtes_verfahren?.label && <Badge>{tnOverlay.top.fields.gebuchtes_verfahren.label}</Badge>}
                </>
              }
            />
            <RecordKeyFacts items={[
              { label: 'Status', value: tnOverlay.top.fields.teilnehmerstatus ?? '—' },
              { label: 'Zertifikat-Nr.', value: tnOverlay.top.fields.zertifikats_nr ?? '—' },
              { label: 'Telefon', value: tnOverlay.top.fields.teilnehmer_telefon ?? '—' },
            ]} />
            <RecordSection title="Kontakt" cols={2}>
              <RecordField label="E-Mail" value={tnOverlay.top.fields.teilnehmer_email} format="email" hideEmpty />
              <RecordField label="Telefon" value={tnOverlay.top.fields.teilnehmer_telefon} format="text" hideEmpty />
              <RecordField label="Bemerkung" value={tnOverlay.top.fields.bemerkung} format="longtext" hideEmpty className="md:col-span-2" />
            </RecordSection>
            <RecordAttachments appId={APP_IDS.TEILNEHMER} recordId={tnOverlay.top.record_id} />
          </>
        )}
      </RecordOverlay>

      <RecordOverlay
        open={pruefOverlay.open}
        onClose={pruefOverlay.close}
        placement="side"
        size="md"
        ariaLabel="Prüfung Details"
      >
        {pruefOverlay.top && (
          <>
            <RecordHeader
              title={pruefOverlay.top.fields.pruefungsart?.label ?? 'Prüfung'}
              badges={
                <Badge variant={pruefOverlay.top.fields.bestanden ? 'default' : 'destructive'}>
                  {pruefOverlay.top.fields.bestanden ? 'Bestanden' : 'Nicht bestanden'}
                </Badge>
              }
            />
            <RecordKeyFacts items={[
              { label: 'Datum', value: pruefOverlay.top.fields.pruefungsdatum ? formatDate(pruefOverlay.top.fields.pruefungsdatum) : '—' },
              { label: 'Stufe', value: pruefOverlay.top.fields.stufe?.label ?? '—' },
              { label: 'Verfahren', value: pruefOverlay.top.fields.verfahren?.label ?? '—' },
            ]} />
            <RecordSection title="Details" cols={2}>
              <RecordField label="Ergebnis" value={pruefOverlay.top.fields.ergebnis} format="text" hideEmpty />
              <RecordField label="Teilnehmer" value={pruefOverlay.top.teilnehmerName} format="text" hideEmpty />
              <RecordField label="Bemerkung" value={pruefOverlay.top.fields.bemerkung} format="longtext" hideEmpty className="md:col-span-2" />
            </RecordSection>
            <RecordAttachments appId={APP_IDS.PRUEFUNGEN} recordId={pruefOverlay.top.record_id} />
          </>
        )}
      </RecordOverlay>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 space-y-2">
          <Skeleton className="h-8 w-full" />
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="lg:col-span-3">
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
