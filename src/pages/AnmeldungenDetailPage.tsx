import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Anmeldungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { AnmeldungenDialog } from '@/components/dialogs/AnmeldungenDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/Anmeldungen';
import { evalComputed } from '@/config/form-enhancements/types';

export default function AnmeldungenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<Anmeldungen | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const list = await LivingAppsService.getAnmeldungen();
      setRecord(list.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: Anmeldungen['fields']) {
    if (!record) return;
    await LivingAppsService.updateAnmeldungenEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteAnmeldungenEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/anmeldungen');
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title="Eintrag nicht gefunden"
        action={
          <Button variant="ghost" onClick={() => navigate('/anmeldungen')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            Zurück
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/anmeldungen')}
      onEdit={() => setEditing(true)}
      backLabel="Zurück"
      editLabel="Bearbeiten"
    >
      <RecordHeader title={record.fields.buchungsnummer ?? 'Anmeldungen'} />

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
        <RecordField label="Buchungsnummer" value={record.fields.buchungsnummer} format="text" />
        <RecordField label="Buchungsdatum" value={record.fields.buchungsdatum} format="date" />
        <RecordField label="Buchungsstatus" value={record.fields.buchungsstatus} format="text" />
        <RecordField label="Buchungsart" value={record.fields.buchungsart} format="pill" />
        <RecordField label="Stufe" value={record.fields.stufe} format="pill" />
        <RecordField label="Kombipaket TT1 + TT2" value={record.fields.kombipaket_tt1_tt2} format="bool" />
        <RecordField label="Verfahren" value={record.fields.verfahren} format="pill" />
        <RecordField label="Bestellnummer / Auftragsnummer" value={record.fields.bestellnummer} format="text" />
        <RecordField label="Gesamtstatus" value={record.fields.gesamtstatus} format="text" />
        <RecordField label="Datenschutz akzeptiert" value={record.fields.datenschutz_akzeptiert} format="bool" />
        <RecordField label="Bemerkung" value={record.fields.bemerkung} format="longtext" className="md:col-span-2" />
        <RecordField label="Firma / Organisation" value={record.fields.firma} format="text" />
        <RecordField label="Straße" value={record.fields.strasse} format="text" />
        <RecordField label="PLZ" value={record.fields.plz} format="text" />
        <RecordField label="Ort" value={record.fields.ort} format="text" />
        <RecordField label="Land" value={record.fields.land} format="text" />
        <RecordField label="Ansprechpartner Vorname" value={record.fields.ansprechpartner_vorname} format="text" />
        <RecordField label="Ansprechpartner Nachname" value={record.fields.ansprechpartner_nachname} format="text" />
        <RecordField label="Ansprechpartner E-Mail" value={record.fields.ansprechpartner_email} format="email" />
        <RecordField label="Ansprechpartner Telefon" value={record.fields.ansprechpartner_telefon} format="text" />
        <RecordField label="SPZ-ID" value={record.fields.spz_id} format="text" />
        <RecordField label="SPZ-Quelle" value={record.fields.spz_source} format="text" />
        <RecordField label="Letzter Sync-Zeitpunkt" value={record.fields.spz_last_sync} format="datetime" />
        <RecordField label="Sync-Status" value={record.fields.spz_sync_status} format="text" />
        <RecordField label="In WEBER.SPZ gelöscht" value={record.fields.spz_deleted} format="bool" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.ANMELDUNGEN} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          Löschen
        </Button>
      </div>

      <AnmeldungenDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Anmeldungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Anmeldungen']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Anmeldungen löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </RecordView>
  );
}
