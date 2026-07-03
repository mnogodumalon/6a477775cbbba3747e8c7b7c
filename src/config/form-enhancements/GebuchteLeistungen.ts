import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'teilnehmer',
    'veranstaltung',
    'anmeldung',
    'leistungsname',
    'leistungstyp',
    'stufe',
    'verfahren',
    { row: ['datum_von', 'datum_bis'] },
    'preis_netto',
    'rabatt',
    'status',
    'spz_id',
    'spz_source',
    'spz_last_sync',
    'spz_sync_status',
    'spz_deleted',
  ],
  defaults: {
    'datum_von': { kind: 'today' },
    'datum_bis': { kind: 'todayOffset', days: 3 },
    'preis_netto': { kind: 'literal', value: 0 },
    'rabatt': { kind: 'literal', value: 0 },
    'status': { kind: 'lookup', key: 'bezahlt', label: 'Bezahlt' },
  },
  computed: {
    '_leistung_dauer_tage': { kind: 'dateDiff', from: 'datum_von', to: 'datum_bis', unit: 'days' },
    '_leistung_netto_nach_rabatt': { op: 'sub', left: { kind: 'field', key: 'preis_netto' }, right: { kind: 'field', key: 'rabatt' } },
  },
};

export const computedDeps: Record<string, string[]> = {};

export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
