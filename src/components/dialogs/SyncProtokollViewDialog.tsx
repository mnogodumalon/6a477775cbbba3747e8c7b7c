import type { SyncProtokoll } from '@/types/app';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface SyncProtokollViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: SyncProtokoll | null;
  onEdit: (record: SyncProtokoll) => void;
}

export function SyncProtokollViewDialog({ open, onClose, record, onEdit }: SyncProtokollViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sync-Protokoll anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sync-Zeitpunkt</Label>
            <p className="text-sm">{formatDate(record.fields.sync_zeitpunkt)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datentyp</Label>
            <Badge variant="secondary">{record.fields.datentyp?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">WEBER.SPZ ID</Label>
            <p className="text-sm">{record.fields.spz_datensatz_id ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datensatz-Referenz</Label>
            <p className="text-sm">{record.fields.livingapps_datensatz ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Aktion</Label>
            <Badge variant="secondary">{record.fields.aktion?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Badge variant="secondary">{record.fields.sync_status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fehlermeldung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.fehlermeldung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rohdaten / Technische Details</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.rohdaten ?? '—'}</p>
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
            <Label className="text-xs text-muted-foreground">Letzter Sync-Zeitpunkt</Label>
            <p className="text-sm">{formatDate(record.fields.spz_last_sync)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sync-Status</Label>
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
            <AttachmentsSection appId={APP_IDS.SYNC_PROTOKOLL} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}