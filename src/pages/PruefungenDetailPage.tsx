import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Pruefungen, Anmeldungen, Teilnehmer, Veranstaltungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { PruefungenDialog } from '@/components/dialogs/PruefungenDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/Pruefungen';
import { evalComputed } from '@/config/form-enhancements/types';

export default function PruefungenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<Pruefungen | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [anmeldungenList, setAnmeldungenList] = useState<Anmeldungen[]>([]);
  const [teilnehmerList, setTeilnehmerList] = useState<Teilnehmer[]>([]);
  const [veranstaltungenList, setVeranstaltungenList] = useState<Veranstaltungen[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, anmeldungenData, teilnehmerData, veranstaltungenData] = await Promise.all([
        LivingAppsService.getPruefungen(),
        LivingAppsService.getAnmeldungen(),
        LivingAppsService.getTeilnehmer(),
        LivingAppsService.getVeranstaltungen(),
      ]);
      setAnmeldungenList(anmeldungenData);
      setTeilnehmerList(teilnehmerData);
      setVeranstaltungenList(veranstaltungenData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: Pruefungen['fields']) {
    if (!record) return;
    await LivingAppsService.updatePruefungenEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deletePruefungenEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/pruefungen');
  }

  function getAnmeldungenDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return anmeldungenList.find(r => r.record_id === refId)?.fields.buchungsnummer ?? '—';
  }

  function getTeilnehmerDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return teilnehmerList.find(r => r.record_id === refId)?.fields.teilnehmer_vorname ?? '—';
  }

  function getVeranstaltungenDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return veranstaltungenList.find(r => r.record_id === refId)?.fields.veranstaltungsnummer ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title="Eintrag nicht gefunden"
        action={
          <Button variant="ghost" onClick={() => navigate('/pruefungen')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            Zurück
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/pruefungen')}
      onEdit={() => setEditing(true)}
      backLabel="Zurück"
      editLabel="Bearbeiten"
    >
      <RecordHeader title={record.fields.ergebnis ?? 'Prüfungen'} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          anmeldung: anmeldungenList,
          teilnehmer: teilnehmerList,
          veranstaltung: veranstaltungenList,
        };
        const fmtComputed = (k: string, n: number) =>
          /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k)
            ? n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
        const computedFacts = Object.entries(formEnhancements.computed)
          .map(([key, formula]) => {
            const v = evalComputed(formula, record!.fields as Record<string, unknown>, { lookupLists });
            return v != null
              ? { label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '), value: fmtComputed(key, v) }
              : null;
          })
          .filter((f): f is { label: string; value: string } => f !== null);
        return computedFacts.length > 0 ? <RecordKeyFacts items={computedFacts} /> : null;
      })()}

      <RecordSection title="Details" cols={2}>
        <RecordField label="Zugehörige Anmeldung" value={getAnmeldungenDisplayName(record.fields.anmeldung)} format="text" />
        <RecordField label="Zugehöriger Teilnehmer" value={getTeilnehmerDisplayName(record.fields.teilnehmer)} format="text" />
        <RecordField label="Zugehörige Veranstaltung" value={getVeranstaltungenDisplayName(record.fields.veranstaltung)} format="text" />
        <RecordField label="Prüfungsart" value={record.fields.pruefungsart} format="pill" />
        <RecordField label="Stufe" value={record.fields.stufe} format="pill" />
        <RecordField label="Verfahren" value={record.fields.verfahren} format="pill" />
        <RecordField label="Prüfungsdatum" value={record.fields.pruefungsdatum} format="date" />
        <RecordField label="Ergebnis" value={record.fields.ergebnis} format="text" />
        <RecordField label="Bestanden" value={record.fields.bestanden} format="bool" />
        <RecordField label="Bemerkung" value={record.fields.bemerkung} format="longtext" className="md:col-span-2" />
        <RecordField label="SPZ-ID" value={record.fields.spz_id} format="text" />
        <RecordField label="SPZ-Quelle" value={record.fields.spz_source} format="text" />
        <RecordField label="Letzter Sync-Zeitpunkt" value={record.fields.spz_last_sync} format="datetime" />
        <RecordField label="Sync-Status" value={record.fields.spz_sync_status} format="text" />
        <RecordField label="In WEBER.SPZ gelöscht" value={record.fields.spz_deleted} format="bool" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.PRUEFUNGEN} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          Löschen
        </Button>
      </div>

      <PruefungenDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        anmeldungenList={anmeldungenList}
        teilnehmerList={teilnehmerList}
        veranstaltungenList={veranstaltungenList}
        enablePhotoScan={AI_PHOTO_SCAN['Pruefungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Pruefungen']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Prüfungen löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </RecordView>
  );
}
