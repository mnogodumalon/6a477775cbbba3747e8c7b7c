import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { SyncProtokoll } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { SyncProtokollDialog } from '@/components/dialogs/SyncProtokollDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/SyncProtokoll';
import { evalComputed } from '@/config/form-enhancements/types';

export default function SyncProtokollDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<SyncProtokoll | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const list = await LivingAppsService.getSyncProtokoll();
      setRecord(list.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: SyncProtokoll['fields']) {
    if (!record) return;
    await LivingAppsService.updateSyncProtokollEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteSyncProtokollEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/sync-protokoll');
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title="Eintrag nicht gefunden"
        action={
          <Button variant="ghost" onClick={() => navigate('/sync-protokoll')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            Zurück
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/sync-protokoll')}
      onEdit={() => setEditing(true)}
      backLabel="Zurück"
      editLabel="Bearbeiten"
    >
      <RecordHeader title={record.fields.spz_datensatz_id ?? 'Sync-Protokoll'} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
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
        <RecordField label="Sync-Zeitpunkt" value={record.fields.sync_zeitpunkt} format="datetime" />
        <RecordField label="Datentyp" value={record.fields.datentyp} format="pill" />
        <RecordField label="WEBER.SPZ ID" value={record.fields.spz_datensatz_id} format="text" />
        <RecordField label="Datensatz-Referenz" value={record.fields.livingapps_datensatz} format="text" />
        <RecordField label="Aktion" value={record.fields.aktion} format="pill" />
        <RecordField label="Status" value={record.fields.sync_status} format="pill" />
        <RecordField label="Fehlermeldung" value={record.fields.fehlermeldung} format="longtext" className="md:col-span-2" />
        <RecordField label="Rohdaten / Technische Details" value={record.fields.rohdaten} format="longtext" className="md:col-span-2" />
        <RecordField label="SPZ-ID" value={record.fields.spz_id} format="text" />
        <RecordField label="SPZ-Quelle" value={record.fields.spz_source} format="text" />
        <RecordField label="Letzter Sync-Zeitpunkt" value={record.fields.spz_last_sync} format="datetime" />
        <RecordField label="Sync-Status" value={record.fields.spz_sync_status} format="text" />
        <RecordField label="In WEBER.SPZ gelöscht" value={record.fields.spz_deleted} format="bool" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.SYNC_PROTOKOLL} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          Löschen
        </Button>
      </div>

      <SyncProtokollDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['SyncProtokoll']}
        enablePhotoLocation={AI_PHOTO_LOCATION['SyncProtokoll']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Sync-Protokoll löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </RecordView>
  );
}
