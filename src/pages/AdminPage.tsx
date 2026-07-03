import { useState, useMemo, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Veranstaltungen, Anmeldungen, Teilnehmer, GebuchteLeistungen, Pruefungen, WeberSpzUebersicht, SyncProtokoll } from '@/types/app';
import { LivingAppsService, extractRecordId, cleanFieldsForApi } from '@/services/livingAppsService';
import { VeranstaltungenDialog } from '@/components/dialogs/VeranstaltungenDialog';
import { VeranstaltungenViewDialog } from '@/components/dialogs/VeranstaltungenViewDialog';
import { AnmeldungenDialog } from '@/components/dialogs/AnmeldungenDialog';
import { AnmeldungenViewDialog } from '@/components/dialogs/AnmeldungenViewDialog';
import { TeilnehmerDialog } from '@/components/dialogs/TeilnehmerDialog';
import { TeilnehmerViewDialog } from '@/components/dialogs/TeilnehmerViewDialog';
import { GebuchteLeistungenDialog } from '@/components/dialogs/GebuchteLeistungenDialog';
import { GebuchteLeistungenViewDialog } from '@/components/dialogs/GebuchteLeistungenViewDialog';
import { PruefungenDialog } from '@/components/dialogs/PruefungenDialog';
import { PruefungenViewDialog } from '@/components/dialogs/PruefungenViewDialog';
import { WeberSpzUebersichtDialog } from '@/components/dialogs/WeberSpzUebersichtDialog';
import { WeberSpzUebersichtViewDialog } from '@/components/dialogs/WeberSpzUebersichtViewDialog';
import { SyncProtokollDialog } from '@/components/dialogs/SyncProtokollDialog';
import { SyncProtokollViewDialog } from '@/components/dialogs/SyncProtokollViewDialog';
import { BulkEditDialog } from '@/components/dialogs/BulkEditDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconPencil, IconTrash, IconPlus, IconFilter, IconX, IconArrowsUpDown, IconArrowUp, IconArrowDown, IconSearch, IconCopy } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

// Field metadata per entity for bulk edit and column filters
const VERANSTALTUNGEN_FIELDS = [
  { key: 'veranstaltungsnummer', label: 'Veranstaltungsnummer', type: 'string/text' },
  { key: 'veranstaltungstitel', label: 'Veranstaltungstitel', type: 'string/text' },
  { key: 'stufe', label: 'Stufe', type: 'lookup/select', options: [{ key: 'tt1', label: 'TT1' }, { key: 'tt2', label: 'TT2' }, { key: 'tt3', label: 'TT3' }] },
  { key: 'verfahren', label: 'Verfahren', type: 'lookup/select', options: [{ key: 'tt2_pb', label: 'TT2-PB' }, { key: 'tt2_pe', label: 'TT2-PE' }, { key: 'tt2_pi', label: 'TT2-PI' }, { key: 'vds', label: 'VdS' }] },
  { key: 'art', label: 'Art', type: 'lookup/select', options: [{ key: 'schulung', label: 'Schulung' }, { key: 'pruefung', label: 'Prüfung' }, { key: 'ergaenzungsschulung', label: 'Ergänzungsschulung' }, { key: 'ergaenzungspruefung', label: 'Ergänzungsprüfung' }, { key: 'wiederholungspruefung', label: 'Wiederholungsprüfung' }, { key: 'erneuerungspruefung', label: 'Erneuerungsprüfung' }, { key: 'rezertifizierungspruefung', label: 'Rezertifizierungsprüfung' }] },
  { key: 'startdatum', label: 'Startdatum', type: 'date/datetimeminute' },
  { key: 'enddatum', label: 'Enddatum', type: 'date/datetimeminute' },
  { key: 'ort', label: 'Ort', type: 'string/text' },
  { key: 'status', label: 'Status', type: 'string/text' },
  { key: 'max_teilnehmerzahl', label: 'Maximale Teilnehmerzahl', type: 'number' },
  { key: 'aktuelle_teilnehmerzahl', label: 'Aktuelle Teilnehmerzahl', type: 'number' },
  { key: 'bemerkung', label: 'Bemerkung', type: 'string/textarea' },
  { key: 'spz_id', label: 'SPZ-ID', type: 'string/text' },
  { key: 'spz_source', label: 'SPZ-Quelle', type: 'string/text' },
  { key: 'spz_last_sync', label: 'Letzter Sync-Zeitpunkt', type: 'date/datetimeminute' },
  { key: 'spz_sync_status', label: 'Sync-Status', type: 'string/text' },
  { key: 'spz_deleted', label: 'In WEBER.SPZ gelöscht', type: 'bool' },
];
const ANMELDUNGEN_FIELDS = [
  { key: 'buchungsnummer', label: 'Buchungsnummer', type: 'string/text' },
  { key: 'buchungsdatum', label: 'Buchungsdatum', type: 'date/date' },
  { key: 'buchungsstatus', label: 'Buchungsstatus', type: 'string/text' },
  { key: 'buchungsart', label: 'Buchungsart', type: 'lookup/select', options: [{ key: 'schulung', label: 'Schulung' }, { key: 'schulung_pruefung', label: 'Schulung + Prüfung' }, { key: 'nur_pruefung', label: 'Nur Prüfung' }] },
  { key: 'stufe', label: 'Stufe', type: 'lookup/select', options: [{ key: 'tt1', label: 'TT1' }, { key: 'tt2', label: 'TT2' }, { key: 'tt3', label: 'TT3' }] },
  { key: 'kombipaket_tt1_tt2', label: 'Kombipaket TT1 + TT2', type: 'bool' },
  { key: 'verfahren', label: 'Verfahren', type: 'lookup/select', options: [{ key: 'tt2_pb', label: 'TT2-PB' }, { key: 'tt2_pe', label: 'TT2-PE' }, { key: 'tt2_pi', label: 'TT2-PI' }, { key: 'vds', label: 'VdS' }] },
  { key: 'bestellnummer', label: 'Bestellnummer / Auftragsnummer', type: 'string/text' },
  { key: 'gesamtstatus', label: 'Gesamtstatus', type: 'string/text' },
  { key: 'datenschutz_akzeptiert', label: 'Datenschutz akzeptiert', type: 'bool' },
  { key: 'bemerkung', label: 'Bemerkung', type: 'string/textarea' },
  { key: 'firma', label: 'Firma / Organisation', type: 'string/text' },
  { key: 'strasse', label: 'Straße', type: 'string/text' },
  { key: 'plz', label: 'PLZ', type: 'string/text' },
  { key: 'ort', label: 'Ort', type: 'string/text' },
  { key: 'land', label: 'Land', type: 'string/text' },
  { key: 'ansprechpartner_vorname', label: 'Ansprechpartner Vorname', type: 'string/text' },
  { key: 'ansprechpartner_nachname', label: 'Ansprechpartner Nachname', type: 'string/text' },
  { key: 'ansprechpartner_email', label: 'Ansprechpartner E-Mail', type: 'string/email' },
  { key: 'ansprechpartner_telefon', label: 'Ansprechpartner Telefon', type: 'string/tel' },
  { key: 'spz_id', label: 'SPZ-ID', type: 'string/text' },
  { key: 'spz_source', label: 'SPZ-Quelle', type: 'string/text' },
  { key: 'spz_last_sync', label: 'Letzter Sync-Zeitpunkt', type: 'date/datetimeminute' },
  { key: 'spz_sync_status', label: 'Sync-Status', type: 'string/text' },
  { key: 'spz_deleted', label: 'In WEBER.SPZ gelöscht', type: 'bool' },
];
const TEILNEHMER_FIELDS = [
  { key: 'anmeldung', label: 'Zugehörige Anmeldung', type: 'applookup/select', targetEntity: 'anmeldungen', targetAppId: 'ANMELDUNGEN', displayField: 'buchungsnummer' },
  { key: 'teilnehmer_vorname', label: 'Teilnehmer Vorname', type: 'string/text' },
  { key: 'teilnehmer_nachname', label: 'Teilnehmer Nachname', type: 'string/text' },
  { key: 'teilnehmer_email', label: 'Teilnehmer E-Mail', type: 'string/email' },
  { key: 'teilnehmer_telefon', label: 'Teilnehmer Telefon', type: 'string/tel' },
  { key: 'zertifikats_nr', label: 'Zertifikats-Nr.', type: 'string/text' },
  { key: 'gebuchte_stufe', label: 'Gebuchte Stufe', type: 'lookup/select', options: [{ key: 'tt2', label: 'TT2' }, { key: 'tt3', label: 'TT3' }, { key: 'tt1', label: 'TT1' }] },
  { key: 'gebuchtes_verfahren', label: 'Gebuchtes Verfahren', type: 'lookup/select', options: [{ key: 'tt2_pb', label: 'TT2-PB' }, { key: 'tt2_pe', label: 'TT2-PE' }, { key: 'tt2_pi', label: 'TT2-PI' }, { key: 'vds', label: 'VdS' }] },
  { key: 'teilnehmerstatus', label: 'Teilnehmerstatus', type: 'string/text' },
  { key: 'bemerkung', label: 'Bemerkung', type: 'string/textarea' },
  { key: 'spz_id', label: 'SPZ-ID', type: 'string/text' },
  { key: 'spz_source', label: 'SPZ-Quelle', type: 'string/text' },
  { key: 'spz_last_sync', label: 'Letzter Sync-Zeitpunkt', type: 'date/datetimeminute' },
  { key: 'spz_sync_status', label: 'Sync-Status', type: 'string/text' },
  { key: 'spz_deleted', label: 'In WEBER.SPZ gelöscht', type: 'bool' },
];
const GEBUCHTELEISTUNGEN_FIELDS = [
  { key: 'teilnehmer', label: 'Zugehöriger Teilnehmer', type: 'applookup/select', targetEntity: 'teilnehmer', targetAppId: 'TEILNEHMER', displayField: 'teilnehmer_vorname' },
  { key: 'veranstaltung', label: 'Zugehörige Veranstaltung', type: 'applookup/select', targetEntity: 'veranstaltungen', targetAppId: 'VERANSTALTUNGEN', displayField: 'veranstaltungsnummer' },
  { key: 'leistungsname', label: 'Leistungsname', type: 'string/text' },
  { key: 'leistungstyp', label: 'Leistungstyp', type: 'string/text' },
  { key: 'stufe', label: 'Stufe', type: 'lookup/select', options: [{ key: 'tt1', label: 'TT1' }, { key: 'tt2', label: 'TT2' }, { key: 'tt3', label: 'TT3' }] },
  { key: 'verfahren', label: 'Verfahren', type: 'lookup/select', options: [{ key: 'tt2_pb', label: 'TT2-PB' }, { key: 'tt2_pe', label: 'TT2-PE' }, { key: 'tt2_pi', label: 'TT2-PI' }, { key: 'vds', label: 'VdS' }] },
  { key: 'datum_von', label: 'Datum von', type: 'date/date' },
  { key: 'datum_bis', label: 'Datum bis', type: 'date/date' },
  { key: 'preis_netto', label: 'Preis netto', type: 'number' },
  { key: 'rabatt', label: 'Rabatt', type: 'number' },
  { key: 'status', label: 'Status', type: 'string/text' },
  { key: 'spz_id', label: 'SPZ-ID', type: 'string/text' },
  { key: 'spz_source', label: 'SPZ-Quelle', type: 'string/text' },
  { key: 'spz_last_sync', label: 'Letzter Sync-Zeitpunkt', type: 'date/datetimeminute' },
  { key: 'spz_sync_status', label: 'Sync-Status', type: 'string/text' },
  { key: 'spz_deleted', label: 'In WEBER.SPZ gelöscht', type: 'bool' },
  { key: 'anmeldung', label: 'Zugehörige Anmeldung', type: 'applookup/select', targetEntity: 'anmeldungen', targetAppId: 'ANMELDUNGEN', displayField: 'buchungsnummer' },
];
const PRUEFUNGEN_FIELDS = [
  { key: 'anmeldung', label: 'Zugehörige Anmeldung', type: 'applookup/select', targetEntity: 'anmeldungen', targetAppId: 'ANMELDUNGEN', displayField: 'buchungsnummer' },
  { key: 'teilnehmer', label: 'Zugehöriger Teilnehmer', type: 'applookup/select', targetEntity: 'teilnehmer', targetAppId: 'TEILNEHMER', displayField: 'teilnehmer_vorname' },
  { key: 'veranstaltung', label: 'Zugehörige Veranstaltung', type: 'applookup/select', targetEntity: 'veranstaltungen', targetAppId: 'VERANSTALTUNGEN', displayField: 'veranstaltungsnummer' },
  { key: 'pruefungsart', label: 'Prüfungsart', type: 'lookup/select', options: [{ key: 'erstpruefung', label: 'Erstprüfung' }, { key: 'wiederholung_1', label: '1. Wiederholungsprüfung' }, { key: 'wiederholung_2', label: '2. Wiederholungsprüfung' }, { key: 'erneuerungspruefung', label: 'Erneuerungsprüfung' }, { key: 'rezertifizierungspruefung', label: 'Rezertifizierungsprüfung' }, { key: 'ergaenzungspruefung', label: 'Ergänzungsprüfung' }] },
  { key: 'stufe', label: 'Stufe', type: 'lookup/select', options: [{ key: 'tt1', label: 'TT1' }, { key: 'tt2', label: 'TT2' }, { key: 'tt3', label: 'TT3' }] },
  { key: 'verfahren', label: 'Verfahren', type: 'lookup/select', options: [{ key: 'tt2_pb', label: 'TT2-PB' }, { key: 'tt2_pe', label: 'TT2-PE' }, { key: 'tt2_pi', label: 'TT2-PI' }, { key: 'vds', label: 'VdS' }] },
  { key: 'pruefungsdatum', label: 'Prüfungsdatum', type: 'date/date' },
  { key: 'ergebnis', label: 'Ergebnis', type: 'string/text' },
  { key: 'bestanden', label: 'Bestanden', type: 'bool' },
  { key: 'bemerkung', label: 'Bemerkung', type: 'string/textarea' },
  { key: 'spz_id', label: 'SPZ-ID', type: 'string/text' },
  { key: 'spz_source', label: 'SPZ-Quelle', type: 'string/text' },
  { key: 'spz_last_sync', label: 'Letzter Sync-Zeitpunkt', type: 'date/datetimeminute' },
  { key: 'spz_sync_status', label: 'Sync-Status', type: 'string/text' },
  { key: 'spz_deleted', label: 'In WEBER.SPZ gelöscht', type: 'bool' },
];
const WEBERSPZUEBERSICHT_FIELDS = [
  { key: 'anzahl_anmeldungen', label: 'Anzahl aktuelle Anmeldungen', type: 'number' },
  { key: 'naechste_veranstaltungen', label: 'Nächste Veranstaltungen', type: 'multipleapplookup/select', targetEntity: 'veranstaltungen', targetAppId: 'VERANSTALTUNGEN', displayField: 'veranstaltungsnummer' },
  { key: 'gesamtteilnehmerzahl', label: 'Gesamte Teilnehmerzahl', type: 'number' },
  { key: 'sync_status_gesamt', label: 'Sync-Status (gesamt)', type: 'string/text' },
  { key: 'fehlerhafte_syncs', label: 'Fehlerhafte Synchronisationen', type: 'number' },
  { key: 'letzter_sync', label: 'Letzter Sync-Zeitpunkt', type: 'date/datetimeminute' },
  { key: 'spz_id', label: 'SPZ-ID', type: 'string/text' },
  { key: 'spz_source', label: 'SPZ-Quelle', type: 'string/text' },
  { key: 'spz_last_sync', label: 'Letzter Sync-Zeitpunkt (technisch)', type: 'date/datetimeminute' },
  { key: 'spz_sync_status', label: 'Sync-Status (technisch)', type: 'string/text' },
  { key: 'spz_deleted', label: 'In WEBER.SPZ gelöscht', type: 'bool' },
];
const SYNCPROTOKOLL_FIELDS = [
  { key: 'sync_zeitpunkt', label: 'Sync-Zeitpunkt', type: 'date/datetimeminute' },
  { key: 'datentyp', label: 'Datentyp', type: 'lookup/select', options: [{ key: 'anmeldung', label: 'Anmeldung' }, { key: 'teilnehmer', label: 'Teilnehmer' }, { key: 'veranstaltung', label: 'Veranstaltung' }, { key: 'leistung', label: 'Leistung' }, { key: 'pruefung', label: 'Prüfung' }] },
  { key: 'spz_datensatz_id', label: 'WEBER.SPZ ID', type: 'string/text' },
  { key: 'livingapps_datensatz', label: 'Datensatz-Referenz', type: 'string/text' },
  { key: 'aktion', label: 'Aktion', type: 'lookup/select', options: [{ key: 'erstellt', label: 'erstellt' }, { key: 'aktualisiert', label: 'aktualisiert' }, { key: 'uebersprungen', label: 'übersprungen' }, { key: 'fehler', label: 'Fehler' }] },
  { key: 'sync_status', label: 'Status', type: 'lookup/select', options: [{ key: 'ok', label: 'ok' }, { key: 'warnung', label: 'Warnung' }, { key: 'fehler', label: 'Fehler' }] },
  { key: 'fehlermeldung', label: 'Fehlermeldung', type: 'string/textarea' },
  { key: 'rohdaten', label: 'Rohdaten / Technische Details', type: 'string/textarea' },
  { key: 'spz_id', label: 'SPZ-ID', type: 'string/text' },
  { key: 'spz_source', label: 'SPZ-Quelle', type: 'string/text' },
  { key: 'spz_last_sync', label: 'Letzter Sync-Zeitpunkt', type: 'date/datetimeminute' },
  { key: 'spz_sync_status', label: 'Sync-Status', type: 'string/text' },
  { key: 'spz_deleted', label: 'In WEBER.SPZ gelöscht', type: 'bool' },
];

const ENTITY_TABS = [
  { key: 'veranstaltungen', label: 'Veranstaltungen', pascal: 'Veranstaltungen' },
  { key: 'anmeldungen', label: 'Anmeldungen', pascal: 'Anmeldungen' },
  { key: 'teilnehmer', label: 'Teilnehmer', pascal: 'Teilnehmer' },
  { key: 'gebuchte_leistungen', label: 'Gebuchte Leistungen', pascal: 'GebuchteLeistungen' },
  { key: 'pruefungen', label: 'Prüfungen', pascal: 'Pruefungen' },
  { key: 'weber.spz_uebersicht', label: 'WEBER.SPZ Übersicht', pascal: 'WeberSpzUebersicht' },
  { key: 'sync_protokoll', label: 'Sync-Protokoll', pascal: 'SyncProtokoll' },
] as const;

type EntityKey = typeof ENTITY_TABS[number]['key'];

export default function AdminPage() {
  const data = useDashboardData();
  const { loading, error, fetchAll } = data;

  const [activeTab, setActiveTab] = useState<EntityKey>('veranstaltungen');
  const [selectedIds, setSelectedIds] = useState<Record<EntityKey, Set<string>>>(() => ({
    'veranstaltungen': new Set(),
    'anmeldungen': new Set(),
    'teilnehmer': new Set(),
    'gebuchte_leistungen': new Set(),
    'pruefungen': new Set(),
    'weber.spz_uebersicht': new Set(),
    'sync_protokoll': new Set(),
  }));
  const [filters, setFilters] = useState<Record<EntityKey, Record<string, string>>>(() => ({
    'veranstaltungen': {},
    'anmeldungen': {},
    'teilnehmer': {},
    'gebuchte_leistungen': {},
    'pruefungen': {},
    'weber.spz_uebersicht': {},
    'sync_protokoll': {},
  }));
  const [showFilters, setShowFilters] = useState(false);
  const [dialogState, setDialogState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [createEntity, setCreateEntity] = useState<EntityKey | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<{ entity: EntityKey; ids: string[] } | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState<EntityKey | null>(null);
  const [viewState, setViewState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');

  const getRecords = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'veranstaltungen': return (data as any).veranstaltungen as Veranstaltungen[] ?? [];
      case 'anmeldungen': return (data as any).anmeldungen as Anmeldungen[] ?? [];
      case 'teilnehmer': return (data as any).teilnehmer as Teilnehmer[] ?? [];
      case 'gebuchte_leistungen': return (data as any).gebuchteLeistungen as GebuchteLeistungen[] ?? [];
      case 'pruefungen': return (data as any).pruefungen as Pruefungen[] ?? [];
      case 'weber.spz_uebersicht': return (data as any).weberSpzUebersicht as WeberSpzUebersicht[] ?? [];
      case 'sync_protokoll': return (data as any).syncProtokoll as SyncProtokoll[] ?? [];
      default: return [];
    }
  }, [data]);

  const getLookupLists = useCallback((entity: EntityKey) => {
    const lists: Record<string, any[]> = {};
    switch (entity) {
      case 'teilnehmer':
        lists.anmeldungenList = (data as any).anmeldungen ?? [];
        break;
      case 'gebuchte_leistungen':
        lists.teilnehmerList = (data as any).teilnehmer ?? [];
        lists.veranstaltungenList = (data as any).veranstaltungen ?? [];
        lists.anmeldungenList = (data as any).anmeldungen ?? [];
        break;
      case 'pruefungen':
        lists.anmeldungenList = (data as any).anmeldungen ?? [];
        lists.teilnehmerList = (data as any).teilnehmer ?? [];
        lists.veranstaltungenList = (data as any).veranstaltungen ?? [];
        break;
      case 'weber.spz_uebersicht':
        lists.veranstaltungenList = (data as any).veranstaltungen ?? [];
        break;
    }
    return lists;
  }, [data]);

  const getApplookupDisplay = useCallback((entity: EntityKey, fieldKey: string, url?: unknown) => {
    if (!url) return '—';
    const id = extractRecordId(url);
    if (!id) return '—';
    const lists = getLookupLists(entity);
    void fieldKey; // ensure used for noUnusedParameters
    if (entity === 'teilnehmer' && fieldKey === 'anmeldung') {
      const match = (lists.anmeldungenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.buchungsnummer ?? '—';
    }
    if (entity === 'gebuchte_leistungen' && fieldKey === 'teilnehmer') {
      const match = (lists.teilnehmerList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.teilnehmer_vorname ?? '—';
    }
    if (entity === 'gebuchte_leistungen' && fieldKey === 'veranstaltung') {
      const match = (lists.veranstaltungenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.veranstaltungsnummer ?? '—';
    }
    if (entity === 'gebuchte_leistungen' && fieldKey === 'anmeldung') {
      const match = (lists.anmeldungenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.buchungsnummer ?? '—';
    }
    if (entity === 'pruefungen' && fieldKey === 'anmeldung') {
      const match = (lists.anmeldungenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.buchungsnummer ?? '—';
    }
    if (entity === 'pruefungen' && fieldKey === 'teilnehmer') {
      const match = (lists.teilnehmerList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.teilnehmer_vorname ?? '—';
    }
    if (entity === 'pruefungen' && fieldKey === 'veranstaltung') {
      const match = (lists.veranstaltungenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.veranstaltungsnummer ?? '—';
    }
    if (entity === 'weber.spz_uebersicht' && fieldKey === 'naechste_veranstaltungen') {
      const match = (lists.veranstaltungenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.veranstaltungsnummer ?? '—';
    }
    return String(url);
  }, [getLookupLists]);

  const getFieldMeta = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'veranstaltungen': return VERANSTALTUNGEN_FIELDS;
      case 'anmeldungen': return ANMELDUNGEN_FIELDS;
      case 'teilnehmer': return TEILNEHMER_FIELDS;
      case 'gebuchte_leistungen': return GEBUCHTELEISTUNGEN_FIELDS;
      case 'pruefungen': return PRUEFUNGEN_FIELDS;
      case 'weber.spz_uebersicht': return WEBERSPZUEBERSICHT_FIELDS;
      case 'sync_protokoll': return SYNCPROTOKOLL_FIELDS;
      default: return [];
    }
  }, []);

  const getFilteredRecords = useCallback((entity: EntityKey) => {
    const records = getRecords(entity);
    const s = search.toLowerCase();
    const searched = !s ? records : records.filter((r: any) => {
      return Object.values(r.fields).some((v: any) => {
        if (v == null) return false;
        if (Array.isArray(v)) return v.some((item: any) => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
        if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
        return String(v).toLowerCase().includes(s);
      });
    });
    const entityFilters = filters[entity] ?? {};
    const fieldMeta = getFieldMeta(entity);
    return searched.filter((r: any) => {
      return fieldMeta.every((fm: any) => {
        const fv = entityFilters[fm.key];
        if (!fv || fv === '') return true;
        const val = r.fields?.[fm.key];
        if (fm.type === 'bool') {
          if (fv === 'true') return val === true;
          if (fv === 'false') return val !== true;
          return true;
        }
        if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
          const label = val && typeof val === 'object' && 'label' in val ? val.label : '';
          return String(label).toLowerCase().includes(fv.toLowerCase());
        }
        if (fm.type.includes('multiplelookup')) {
          if (!Array.isArray(val)) return false;
          return val.some((item: any) => String(item?.label ?? '').toLowerCase().includes(fv.toLowerCase()));
        }
        if (fm.type.includes('applookup')) {
          const display = getApplookupDisplay(entity, fm.key, val);
          return String(display).toLowerCase().includes(fv.toLowerCase());
        }
        return String(val ?? '').toLowerCase().includes(fv.toLowerCase());
      });
    });
  }, [getRecords, filters, getFieldMeta, getApplookupDisplay, search]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(''); setSortDir('asc'); }
    } else { setSortKey(key); setSortDir('asc'); }
  }

  function sortRecords<T extends { fields: Record<string, any> }>(recs: T[]): T[] {
    if (!sortKey) return recs;
    return [...recs].sort((a, b) => {
      let va: any = a.fields[sortKey], vb: any = b.fields[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'object' && 'label' in va) va = va.label;
      if (typeof vb === 'object' && 'label' in vb) vb = vb.label;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }

  const toggleSelect = useCallback((entity: EntityKey, id: string) => {
    setSelectedIds(prev => {
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (next[entity].has(id)) next[entity].delete(id);
      else next[entity].add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((entity: EntityKey) => {
    const filtered = getFilteredRecords(entity);
    setSelectedIds(prev => {
      const allSelected = filtered.every((r: any) => prev[entity].has(r.record_id));
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (allSelected) {
        filtered.forEach((r: any) => next[entity].delete(r.record_id));
      } else {
        filtered.forEach((r: any) => next[entity].add(r.record_id));
      }
      return next;
    });
  }, [getFilteredRecords]);

  const clearSelection = useCallback((entity: EntityKey) => {
    setSelectedIds(prev => ({ ...prev, [entity]: new Set() }));
  }, []);

  const getServiceMethods = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'veranstaltungen': return {
        create: (fields: any) => LivingAppsService.createVeranstaltungenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateVeranstaltungenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteVeranstaltungenEntry(id),
      };
      case 'anmeldungen': return {
        create: (fields: any) => LivingAppsService.createAnmeldungenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateAnmeldungenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteAnmeldungenEntry(id),
      };
      case 'teilnehmer': return {
        create: (fields: any) => LivingAppsService.createTeilnehmerEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateTeilnehmerEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteTeilnehmerEntry(id),
      };
      case 'gebuchte_leistungen': return {
        create: (fields: any) => LivingAppsService.createGebuchteLeistungenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateGebuchteLeistungenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteGebuchteLeistungenEntry(id),
      };
      case 'pruefungen': return {
        create: (fields: any) => LivingAppsService.createPruefungenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updatePruefungenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deletePruefungenEntry(id),
      };
      case 'weber.spz_uebersicht': return {
        create: (fields: any) => LivingAppsService.createWeberSpzUebersichtEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateWeberSpzUebersichtEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteWeberSpzUebersichtEntry(id),
      };
      case 'sync_protokoll': return {
        create: (fields: any) => LivingAppsService.createSyncProtokollEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateSyncProtokollEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteSyncProtokollEntry(id),
      };
      default: return null;
    }
  }, []);

  async function handleCreate(entity: EntityKey, fields: any) {
    const svc = getServiceMethods(entity);
    if (!svc) return;
    await svc.create(fields);
    fetchAll();
    setCreateEntity(null);
  }

  async function handleUpdate(fields: any) {
    if (!dialogState) return;
    const svc = getServiceMethods(dialogState.entity);
    if (!svc) return;
    await svc.update(dialogState.record.record_id, fields);
    fetchAll();
    setDialogState(null);
  }

  async function handleBulkDelete() {
    if (!deleteTargets) return;
    const svc = getServiceMethods(deleteTargets.entity);
    if (!svc) return;
    setBulkLoading(true);
    try {
      for (const id of deleteTargets.ids) {
        await svc.remove(id);
      }
      clearSelection(deleteTargets.entity);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setDeleteTargets(null);
    }
  }

  async function handleBulkClone() {
    const svc = getServiceMethods(activeTab);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const records = getRecords(activeTab);
      const ids = Array.from(selectedIds[activeTab]);
      for (const id of ids) {
        const rec = records.find((r: any) => r.record_id === id);
        if (!rec) continue;
        const clean = cleanFieldsForApi(rec.fields, activeTab);
        await svc.create(clean as any);
      }
      clearSelection(activeTab);
      fetchAll();
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkEdit(fieldKey: string, value: any) {
    if (!bulkEditOpen) return;
    const svc = getServiceMethods(bulkEditOpen);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds[bulkEditOpen]);
      for (const id of ids) {
        await svc.update(id, { [fieldKey]: value });
      }
      clearSelection(bulkEditOpen);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setBulkEditOpen(null);
    }
  }

  function updateFilter(entity: EntityKey, fieldKey: string, value: string) {
    setFilters(prev => ({
      ...prev,
      [entity]: { ...prev[entity], [fieldKey]: value },
    }));
  }

  function clearEntityFilters(entity: EntityKey) {
    setFilters(prev => ({ ...prev, [entity]: {} }));
  }

  const activeFilterCount = useMemo(() => {
    const f = filters[activeTab] ?? {};
    return Object.values(f).filter(v => v && v !== '').length;
  }, [filters, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-destructive">{error.message}</p>
        <Button onClick={fetchAll}>Erneut versuchen</Button>
      </div>
    );
  }

  const filtered = getFilteredRecords(activeTab);
  const sel = selectedIds[activeTab];
  const allFiltered = filtered.every((r: any) => sel.has(r.record_id)) && filtered.length > 0;
  const fieldMeta = getFieldMeta(activeTab);

  return (
    <PageShell
      title="Verwaltung"
      subtitle="Alle Daten verwalten"
      action={
        <Button onClick={() => setCreateEntity(activeTab)} className="shrink-0">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="flex gap-2 flex-wrap">
        {ENTITY_TABS.map(tab => {
          const count = getRecords(tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(''); setSortKey(''); setSortDir('asc'); fetchAll(); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
              <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(f => !f)} className="gap-2">
            <IconFilter className="h-4 w-4" />
            Filtern
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => clearEntityFilters(activeTab)}>
              Filter zurücksetzen
            </Button>
          )}
        </div>
        {sel.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap bg-muted/60 rounded-lg px-3 py-1.5">
            <span className="text-sm font-medium">{sel.size} ausgewählt</span>
            <Button variant="outline" size="sm" onClick={() => setBulkEditOpen(activeTab)}>
              <IconPencil className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Feld bearbeiten</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkClone()}>
              <IconCopy className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Kopieren</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteTargets({ entity: activeTab, ids: Array.from(sel) })}>
              <IconTrash className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Ausgewählte löschen</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => clearSelection(activeTab)}>
              <IconX className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Auswahl aufheben</span>
            </Button>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 rounded-lg border bg-muted/30">
          {fieldMeta.map((fm: any) => (
            <div key={fm.key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{fm.label}</label>
              {fm.type === 'bool' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="true">Ja</SelectItem>
                    <SelectItem value="false">Nein</SelectItem>
                  </SelectContent>
                </Select>
              ) : fm.type === 'lookup/select' || fm.type === 'lookup/radio' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {fm.options?.map((o: any) => (
                      <SelectItem key={o.key} value={o.label}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-8 text-xs"
                  placeholder="Filtern..."
                  value={filters[activeTab]?.[fm.key] ?? ''}
                  onChange={e => updateFilter(activeTab, fm.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[27px] bg-card shadow-lg overflow-x-auto">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="w-10 px-6">
                <Checkbox
                  checked={allFiltered}
                  onCheckedChange={() => toggleSelectAll(activeTab)}
                />
              </TableHead>
              {fieldMeta.map((fm: any) => (
                <TableHead key={fm.key} className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort(fm.key)}>
                  <span className="inline-flex items-center gap-1">
                    {fm.label}
                    {sortKey === fm.key ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                  </span>
                </TableHead>
              ))}
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map((record: any) => (
              <TableRow key={record.record_id} className={`transition-colors cursor-pointer ${sel.has(record.record_id) ? "bg-primary/5" : "hover:bg-muted/50"}`} onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewState({ entity: activeTab, record }); }}>
                <TableCell>
                  <Checkbox
                    checked={sel.has(record.record_id)}
                    onCheckedChange={() => toggleSelect(activeTab, record.record_id)}
                  />
                </TableCell>
                {fieldMeta.map((fm: any) => {
                  const val = record.fields?.[fm.key];
                  if (fm.type === 'bool') {
                    return (
                      <TableCell key={fm.key}>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          val ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {val ? 'Ja' : 'Nein'}
                        </span>
                      </TableCell>
                    );
                  }
                  if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{val?.label ?? '—'}</span></TableCell>;
                  }
                  if (fm.type.startsWith('multiplelookup')) {
                    return <TableCell key={fm.key}>{Array.isArray(val) ? val.map((v: any) => v?.label ?? v).join(', ') : '—'}</TableCell>;
                  }
                  if (fm.type.startsWith('multipleapplookup')) {
                    return (
                      <TableCell key={fm.key}>
                        {Array.isArray(val) && val.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {val.map((url: any, i: number) => (
                              <span key={i} className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getApplookupDisplay(activeTab, fm.key, url)}</span>
                            ))}
                          </div>
                        ) : '—'}
                      </TableCell>
                    );
                  }
                  if (fm.type.startsWith('applookup')) {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getApplookupDisplay(activeTab, fm.key, val)}</span></TableCell>;
                  }
                  if (fm.type.includes('date')) {
                    return <TableCell key={fm.key} className="text-muted-foreground">{fmtDate(val)}</TableCell>;
                  }
                  if (fm.type.startsWith('file')) {
                    return (
                      <TableCell key={fm.key}>
                        {val ? (
                          <div className="relative h-8 w-8 rounded bg-muted overflow-hidden">
                            <img src={val} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        ) : '—'}
                      </TableCell>
                    );
                  }
                  if (fm.type === 'string/textarea') {
                    return <TableCell key={fm.key} className="max-w-xs"><span className="truncate block">{val ?? '—'}</span></TableCell>;
                  }
                  if (fm.type === 'geo') {
                    return (
                      <TableCell key={fm.key} className="max-w-[200px]">
                        <span className="truncate block" title={val ? `${val.lat}, ${val.long}` : undefined}>
                          {val?.info ?? (val ? `${val.lat?.toFixed(4)}, ${val.long?.toFixed(4)}` : '—')}
                        </span>
                      </TableCell>
                    );
                  }
                  return <TableCell key={fm.key}>{val ?? '—'}</TableCell>;
                })}
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setDialogState({ entity: activeTab, record })}>
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTargets({ entity: activeTab, ids: [record.record_id] })}>
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={fieldMeta.length + 2} className="text-center py-16 text-muted-foreground">
                  Keine Ergebnisse gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(createEntity === 'veranstaltungen' || dialogState?.entity === 'veranstaltungen') && (
        <VeranstaltungenDialog
          open={createEntity === 'veranstaltungen' || dialogState?.entity === 'veranstaltungen'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'veranstaltungen' ? handleUpdate : (fields: any) => handleCreate('veranstaltungen', fields)}
          defaultValues={dialogState?.entity === 'veranstaltungen' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Veranstaltungen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Veranstaltungen']}
        />
      )}
      {(createEntity === 'anmeldungen' || dialogState?.entity === 'anmeldungen') && (
        <AnmeldungenDialog
          open={createEntity === 'anmeldungen' || dialogState?.entity === 'anmeldungen'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'anmeldungen' ? handleUpdate : (fields: any) => handleCreate('anmeldungen', fields)}
          defaultValues={dialogState?.entity === 'anmeldungen' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Anmeldungen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Anmeldungen']}
        />
      )}
      {(createEntity === 'teilnehmer' || dialogState?.entity === 'teilnehmer') && (
        <TeilnehmerDialog
          open={createEntity === 'teilnehmer' || dialogState?.entity === 'teilnehmer'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'teilnehmer' ? handleUpdate : (fields: any) => handleCreate('teilnehmer', fields)}
          defaultValues={dialogState?.entity === 'teilnehmer' ? dialogState.record?.fields : undefined}
          anmeldungenList={(data as any).anmeldungen ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Teilnehmer']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Teilnehmer']}
        />
      )}
      {(createEntity === 'gebuchte_leistungen' || dialogState?.entity === 'gebuchte_leistungen') && (
        <GebuchteLeistungenDialog
          open={createEntity === 'gebuchte_leistungen' || dialogState?.entity === 'gebuchte_leistungen'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'gebuchte_leistungen' ? handleUpdate : (fields: any) => handleCreate('gebuchte_leistungen', fields)}
          defaultValues={dialogState?.entity === 'gebuchte_leistungen' ? dialogState.record?.fields : undefined}
          teilnehmerList={(data as any).teilnehmer ?? []}
          veranstaltungenList={(data as any).veranstaltungen ?? []}
          anmeldungenList={(data as any).anmeldungen ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['GebuchteLeistungen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['GebuchteLeistungen']}
        />
      )}
      {(createEntity === 'pruefungen' || dialogState?.entity === 'pruefungen') && (
        <PruefungenDialog
          open={createEntity === 'pruefungen' || dialogState?.entity === 'pruefungen'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'pruefungen' ? handleUpdate : (fields: any) => handleCreate('pruefungen', fields)}
          defaultValues={dialogState?.entity === 'pruefungen' ? dialogState.record?.fields : undefined}
          anmeldungenList={(data as any).anmeldungen ?? []}
          teilnehmerList={(data as any).teilnehmer ?? []}
          veranstaltungenList={(data as any).veranstaltungen ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Pruefungen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Pruefungen']}
        />
      )}
      {(createEntity === 'weber.spz_uebersicht' || dialogState?.entity === 'weber.spz_uebersicht') && (
        <WeberSpzUebersichtDialog
          open={createEntity === 'weber.spz_uebersicht' || dialogState?.entity === 'weber.spz_uebersicht'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'weber.spz_uebersicht' ? handleUpdate : (fields: any) => handleCreate('weber.spz_uebersicht', fields)}
          defaultValues={dialogState?.entity === 'weber.spz_uebersicht' ? dialogState.record?.fields : undefined}
          veranstaltungenList={(data as any).veranstaltungen ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['WeberSpzUebersicht']}
          enablePhotoLocation={AI_PHOTO_LOCATION['WeberSpzUebersicht']}
        />
      )}
      {(createEntity === 'sync_protokoll' || dialogState?.entity === 'sync_protokoll') && (
        <SyncProtokollDialog
          open={createEntity === 'sync_protokoll' || dialogState?.entity === 'sync_protokoll'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'sync_protokoll' ? handleUpdate : (fields: any) => handleCreate('sync_protokoll', fields)}
          defaultValues={dialogState?.entity === 'sync_protokoll' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['SyncProtokoll']}
          enablePhotoLocation={AI_PHOTO_LOCATION['SyncProtokoll']}
        />
      )}
      {viewState?.entity === 'veranstaltungen' && (
        <VeranstaltungenViewDialog
          open={viewState?.entity === 'veranstaltungen'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'veranstaltungen', record: r }); }}
        />
      )}
      {viewState?.entity === 'anmeldungen' && (
        <AnmeldungenViewDialog
          open={viewState?.entity === 'anmeldungen'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'anmeldungen', record: r }); }}
        />
      )}
      {viewState?.entity === 'teilnehmer' && (
        <TeilnehmerViewDialog
          open={viewState?.entity === 'teilnehmer'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'teilnehmer', record: r }); }}
          anmeldungenList={(data as any).anmeldungen ?? []}
        />
      )}
      {viewState?.entity === 'gebuchte_leistungen' && (
        <GebuchteLeistungenViewDialog
          open={viewState?.entity === 'gebuchte_leistungen'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'gebuchte_leistungen', record: r }); }}
          teilnehmerList={(data as any).teilnehmer ?? []}
          veranstaltungenList={(data as any).veranstaltungen ?? []}
          anmeldungenList={(data as any).anmeldungen ?? []}
        />
      )}
      {viewState?.entity === 'pruefungen' && (
        <PruefungenViewDialog
          open={viewState?.entity === 'pruefungen'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'pruefungen', record: r }); }}
          anmeldungenList={(data as any).anmeldungen ?? []}
          teilnehmerList={(data as any).teilnehmer ?? []}
          veranstaltungenList={(data as any).veranstaltungen ?? []}
        />
      )}
      {viewState?.entity === 'weber.spz_uebersicht' && (
        <WeberSpzUebersichtViewDialog
          open={viewState?.entity === 'weber.spz_uebersicht'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'weber.spz_uebersicht', record: r }); }}
          veranstaltungenList={(data as any).veranstaltungen ?? []}
        />
      )}
      {viewState?.entity === 'sync_protokoll' && (
        <SyncProtokollViewDialog
          open={viewState?.entity === 'sync_protokoll'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'sync_protokoll', record: r }); }}
        />
      )}

      <BulkEditDialog
        open={!!bulkEditOpen}
        onClose={() => setBulkEditOpen(null)}
        onApply={handleBulkEdit}
        fields={bulkEditOpen ? getFieldMeta(bulkEditOpen) : []}
        selectedCount={bulkEditOpen ? selectedIds[bulkEditOpen].size : 0}
        loading={bulkLoading}
        lookupLists={bulkEditOpen ? getLookupLists(bulkEditOpen) : {}}
      />

      <ConfirmDialog
        open={!!deleteTargets}
        onClose={() => setDeleteTargets(null)}
        onConfirm={handleBulkDelete}
        title="Ausgewählte löschen"
        description={`Sollen ${deleteTargets?.ids.length ?? 0} Einträge wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
      />
    </PageShell>
  );
}