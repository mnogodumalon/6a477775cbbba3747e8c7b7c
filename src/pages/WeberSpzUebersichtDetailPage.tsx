import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { WeberSpzUebersicht, Veranstaltungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { WeberSpzUebersichtDialog } from '@/components/dialogs/WeberSpzUebersichtDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/WeberSpzUebersicht';
import { evalComputed } from '@/config/form-enhancements/types';

export default function WeberSpzUebersichtDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<WeberSpzUebersicht | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [veranstaltungenList, setVeranstaltungenList] = useState<Veranstaltungen[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, veranstaltungenData] = await Promise.all([
        LivingAppsService.getWeberSpzUebersicht(),
        LivingAppsService.getVeranstaltungen(),
      ]);
      setVeranstaltungenList(veranstaltungenData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: WeberSpzUebersicht['fields']) {
    if (!record) return;
    await LivingAppsService.updateWeberSpzUebersichtEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteWeberSpzUebersichtEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/weber.spz-uebersicht');
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
          <Button variant="ghost" onClick={() => navigate('/weber.spz-uebersicht')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            Zurück
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/weber.spz-uebersicht')}
      onEdit={() => setEditing(true)}
      backLabel="Zurück"
      editLabel="Bearbeiten"
    >
      <RecordHeader title={record.fields.sync_status_gesamt ?? 'WEBER.SPZ Übersicht'} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          naechste_veranstaltungen: veranstaltungenList,
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
        <RecordField label="Anzahl aktuelle Anmeldungen" value={record.fields.anzahl_anmeldungen} format="text" />
        <RecordField label="Nächste Veranstaltungen" value={Array.isArray(record.fields.naechste_veranstaltungen) ? record.fields.naechste_veranstaltungen.map((u: unknown) => getVeranstaltungenDisplayName(u)).join(', ') : null} format="text" />
        <RecordField label="Gesamte Teilnehmerzahl" value={record.fields.gesamtteilnehmerzahl} format="text" />
        <RecordField label="Sync-Status (gesamt)" value={record.fields.sync_status_gesamt} format="text" />
        <RecordField label="Fehlerhafte Synchronisationen" value={record.fields.fehlerhafte_syncs} format="text" />
        <RecordField label="Letzter Sync-Zeitpunkt" value={record.fields.letzter_sync} format="datetime" />
        <RecordField label="SPZ-ID" value={record.fields.spz_id} format="text" />
        <RecordField label="SPZ-Quelle" value={record.fields.spz_source} format="text" />
        <RecordField label="Letzter Sync-Zeitpunkt (technisch)" value={record.fields.spz_last_sync} format="datetime" />
        <RecordField label="Sync-Status (technisch)" value={record.fields.spz_sync_status} format="text" />
        <RecordField label="In WEBER.SPZ gelöscht" value={record.fields.spz_deleted} format="bool" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.WEBER.SPZ_UEBERSICHT} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          Löschen
        </Button>
      </div>

      <WeberSpzUebersichtDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        veranstaltungenList={veranstaltungenList}
        enablePhotoScan={AI_PHOTO_SCAN['WeberSpzUebersicht']}
        enablePhotoLocation={AI_PHOTO_LOCATION['WeberSpzUebersicht']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="WEBER.SPZ Übersicht löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </RecordView>
  );
}
