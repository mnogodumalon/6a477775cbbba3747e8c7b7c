import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'anmeldung',
    'teilnehmer',
    'veranstaltung',
    'pruefungsart',
    'stufe',
    'verfahren',
    'pruefungsdatum',
    'ergebnis',
    'bestanden',
    'bemerkung',
    'spz_id',
    'spz_source',
    'spz_last_sync',
    'spz_sync_status',
    'spz_deleted',
  ],
  defaults: {
    'pruefungsdatum': { kind: 'today' },
    'pruefungsart': { kind: 'lookup', key: 'erstpruefung', label: 'Erstprüfung' },
    'bestanden': { kind: 'literal', value: false },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};

export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
