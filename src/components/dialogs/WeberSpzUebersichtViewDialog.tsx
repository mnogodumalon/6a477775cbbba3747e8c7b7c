import type { WeberSpzUebersicht, Veranstaltungen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface WeberSpzUebersichtViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: WeberSpzUebersicht | null;
  onEdit: (record: WeberSpzUebersicht) => void;
  veranstaltungenList: Veranstaltungen[];
}

export function WeberSpzUebersichtViewDialog({ open, onClose, record, onEdit, veranstaltungenList }: WeberSpzUebersichtViewDialogProps) {
  function getVeranstaltungenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return veranstaltungenList.find(r => r.record_id === id)?.fields.veranstaltungsnummer ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>WEBER.SPZ Übersicht anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anzahl aktuelle Anmeldungen</Label>
            <p className="text-sm">{record.fields.anzahl_anmeldungen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nächste Veranstaltungen</Label>
            {Array.isArray(record.fields.naechste_veranstaltungen) && record.fields.naechste_veranstaltungen.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {record.fields.naechste_veranstaltungen.map((url: any, i: number) => (
                  <span key={i} className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getVeranstaltungenDisplayName(url)}</span>
                ))}
              </div>
            ) : <p className="text-sm">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamte Teilnehmerzahl</Label>
            <p className="text-sm">{record.fields.gesamtteilnehmerzahl ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sync-Status (gesamt)</Label>
            <p className="text-sm">{record.fields.sync_status_gesamt ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fehlerhafte Synchronisationen</Label>
            <p className="text-sm">{record.fields.fehlerhafte_syncs ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Letzter Sync-Zeitpunkt</Label>
            <p className="text-sm">{formatDate(record.fields.letzter_sync)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">SPZ-ID</Label>
            <p className="text-sm">{record.fields.spz_id ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">SPZ-Quelle</Label>
            <p className="text-sm">{record.fields.spz_source ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Letzter Sync-Zeitpunkt (technisch)</Label>
            <p className="text-sm">{formatDate(record.fields.spz_last_sync)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sync-Status (technisch)</Label>
            <p className="text-sm">{record.fields.spz_sync_status ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">In WEBER.SPZ gelöscht</Label>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              record.fields.spz_deleted ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {record.fields.spz_deleted ? 'Ja' : 'Nein'}
            </span>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.WEBER.SPZ_UEBERSICHT} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}