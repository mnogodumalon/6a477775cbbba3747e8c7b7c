import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'veranstaltungsnummer',
    'veranstaltungstitel',
    'stufe',
    'verfahren',
    'art',
    { row: ['startdatum', 'enddatum'] },
    'ort',
    'status',
    { row: ['max_teilnehmerzahl', 'aktuelle_teilnehmerzahl'] },
    'bemerkung',
    'spz_id',
    'spz_source',
    'spz_last_sync',
    'spz_sync_status',
    'spz_deleted',
  ],
  defaults: {
    'startdatum': { kind: 'today', withTime: true },
    'enddatum': { kind: 'todayOffset', days: 3, withTime: true },
    'max_teilnehmerzahl': { kind: 'literal', value: 1 },
    'aktuelle_teilnehmerzahl': { kind: 'literal', value: 0 },
    'art': { kind: 'lookup', key: 'schulung', label: 'Schulung' },
  },
  computed: {
    '_veranstaltung_dauer_tage': { kind: 'dateDiff', from: 'startdatum', to: 'enddatum', unit: 'days' },
  },
};

export const computedDeps: Record<string, string[]> = {};

export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
