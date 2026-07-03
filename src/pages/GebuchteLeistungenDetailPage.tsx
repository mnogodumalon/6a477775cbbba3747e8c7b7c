import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { GebuchteLeistungen, Teilnehmer, Veranstaltungen, Anmeldungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { GebuchteLeistungenDialog } from '@/components/dialogs/GebuchteLeistungenDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/GebuchteLeistungen';
import { evalComputed } from '@/config/form-enhancements/types';

export default function GebuchteLeistungenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<GebuchteLeistungen | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [teilnehmerList, setTeilnehmerList] = useState<Teilnehmer[]>([]);
  const [veranstaltungenList, setVeranstaltungenList] = useState<Veranstaltungen[]>([]);
  const [anmeldungenList, setAnmeldungenList] = useState<Anmeldungen[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, teilnehmerData, veranstaltungenData, anmeldungenData] = await Promise.all([
        LivingAppsService.getGebuchteLeistungen(),
        LivingAppsService.getTeilnehmer(),
        LivingAppsService.getVeranstaltungen(),
        LivingAppsService.getAnmeldungen(),
      ]);
      setTeilnehmerList(teilnehmerData);
      setVeranstaltungenList(veranstaltungenData);
      setAnmeldungenList(anmeldungenData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: GebuchteLeistungen['fields']) {
    if (!record) return;
    await LivingAppsService.updateGebuchteLeistungenEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteGebuchteLeistungenEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/gebuchte-leistungen');
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

  function getAnmeldungenDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return anmeldungenList.find(r => r.record_id === refId)?.fields.buchungsnummer ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title="Eintrag nicht gefunden"
        action={
          <Button variant="ghost" onClick={() => navigate('/gebuchte-leistungen')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            Zurück
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/gebuchte-leistungen')}
      onEdit={() => setEditing(true)}
      backLabel="Zurück"
      editLabel="Bearbeiten"
    >
      <RecordHeader title={record.fields.leistungsname ?? 'Gebuchte Leistungen'} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          teilnehmer: teilnehmerList,
          veranstaltung: veranstaltungenList,
          anmeldung: anmeldungenList,
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
        <RecordField label="Zugehöriger Teilnehmer" value={getTeilnehmerDisplayName(record.fields.teilnehmer)} format="text" />
        <RecordField label="Zugehörige Veranstaltung" value={getVeranstaltungenDisplayName(record.fields.veranstaltung)} format="text" />
        <RecordField label="Leistungsname" value={record.fields.leistungsname} format="text" />
        <RecordField label="Leistungstyp" value={record.fields.leistungstyp} format="text" />
        <RecordField label="Stufe" value={record.fields.stufe} format="pill" />
        <RecordField label="Verfahren" value={record.fields.verfahren} format="pill" />
        <RecordField label="Datum von" value={record.fields.datum_von} format="date" />
        <RecordField label="Datum bis" value={record.fields.datum_bis} format="date" />
        <RecordField label="Preis netto" value={record.fields.preis_netto} format="text" />
        <RecordField label="Rabatt" value={record.fields.rabatt} format="text" />
        <RecordField label="Status" value={record.fields.status} format="text" />
        <RecordField label="SPZ-ID" value={record.fields.spz_id} format="text" />
        <RecordField label="SPZ-Quelle" value={record.fields.spz_source} format="text" />
        <RecordField label="Letzter Sync-Zeitpunkt" value={record.fields.spz_last_sync} format="datetime" />
        <RecordField label="Sync-Status" value={record.fields.spz_sync_status} format="text" />
        <RecordField label="In WEBER.SPZ gelöscht" value={record.fields.spz_deleted} format="bool" />
        <RecordField label="Zugehörige Anmeldung" value={getAnmeldungenDisplayName(record.fields.anmeldung)} format="text" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.GEBUCHTE_LEISTUNGEN} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          Löschen
        </Button>
      </div>

      <GebuchteLeistungenDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        teilnehmerList={teilnehmerList}
        veranstaltungenList={veranstaltungenList}
        anmeldungenList={anmeldungenList}
        enablePhotoScan={AI_PHOTO_SCAN['GebuchteLeistungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['GebuchteLeistungen']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Gebuchte Leistungen löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </RecordView>
  );
}
