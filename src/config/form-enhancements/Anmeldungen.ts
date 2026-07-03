import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'buchungsnummer',
    'buchungsdatum',
    'buchungsstatus',
    'buchungsart',
    'stufe',
    'kombipaket_tt1_tt2',
    'verfahren',
    'bestellnummer',
    'gesamtstatus',
    'datenschutz_akzeptiert',
    'bemerkung',
    'firma',
    'strasse',
    { row: ['plz', 'ort'], cols: '1fr 2fr' },
    'land',
    { row: ['ansprechpartner_vorname', 'ansprechpartner_nachname'] },
    'ansprechpartner_email',
    'ansprechpartner_telefon',
    'spz_id',
    'spz_source',
    'spz_last_sync',
    'spz_sync_status',
    'spz_deleted',
  ],
  defaults: {
    'buchungsdatum': { kind: 'today' },
    'buchungsstatus': { kind: 'lookup', key: 'schulung', label: 'Schulung' },
    'datenschutz_akzeptiert': { kind: 'literal', value: false },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};

export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
