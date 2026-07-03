import type { Pruefungen, Anmeldungen, Teilnehmer, Veranstaltungen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
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

interface PruefungenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Pruefungen | null;
  onEdit: (record: Pruefungen) => void;
  anmeldungenList: Anmeldungen[];
  teilnehmerList: Teilnehmer[];
  veranstaltungenList: Veranstaltungen[];
}

export function PruefungenViewDialog({ open, onClose, record, onEdit, anmeldungenList, teilnehmerList, veranstaltungenList }: PruefungenViewDialogProps) {
  function getAnmeldungenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return anmeldungenList.find(r => r.record_id === id)?.fields.buchungsnummer ?? '—';
  }

  function getTeilnehmerDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return teilnehmerList.find(r => r.record_id === id)?.fields.teilnehmer_vorname ?? '—';
  }

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
          <DialogTitle>Prüfungen anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zugehörige Anmeldung</Label>
            <p className="text-sm">{getAnmeldungenDisplayName(record.fields.anmeldung)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zugehöriger Teilnehmer</Label>
            <p className="text-sm">{getTeilnehmerDisplayName(record.fields.teilnehmer)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zugehörige Veranstaltung</Label>
            <p className="text-sm">{getVeranstaltungenDisplayName(record.fields.veranstaltung)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Prüfungsart</Label>
            <Badge variant="secondary">{record.fields.pruefungsart?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Stufe</Label>
            <Badge variant="secondary">{record.fields.stufe?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verfahren</Label>
            <Badge variant="secondary">{record.fields.verfahren?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Prüfungsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.pruefungsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ergebnis</Label>
            <p className="text-sm">{record.fields.ergebnis ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bestanden</Label>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              record.fields.bestanden ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {record.fields.bestanden ? 'Ja' : 'Nein'}
            </span>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bemerkung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.bemerkung ?? '—'}</p>
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
            <AttachmentsSection appId={APP_IDS.PRUEFUNGEN} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}