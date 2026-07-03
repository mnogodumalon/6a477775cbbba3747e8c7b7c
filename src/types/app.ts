// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Veranstaltungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    veranstaltungsnummer?: string;
    veranstaltungstitel?: string;
    stufe?: LookupValue;
    verfahren?: LookupValue;
    art?: LookupValue;
    startdatum?: string; // Format: YYYY-MM-DD oder ISO String
    enddatum?: string; // Format: YYYY-MM-DD oder ISO String
    ort?: string;
    status?: string;
    max_teilnehmerzahl?: number;
    aktuelle_teilnehmerzahl?: number;
    bemerkung?: string;
    spz_id?: string;
    spz_source?: string;
    spz_last_sync?: string; // Format: YYYY-MM-DD oder ISO String
    spz_sync_status?: string;
    spz_deleted?: boolean;
  };
}

export interface Anmeldungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    buchungsnummer?: string;
    buchungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    buchungsstatus?: string;
    buchungsart?: LookupValue;
    stufe?: LookupValue;
    kombipaket_tt1_tt2?: boolean;
    verfahren?: LookupValue;
    bestellnummer?: string;
    gesamtstatus?: string;
    datenschutz_akzeptiert?: boolean;
    bemerkung?: string;
    firma?: string;
    strasse?: string;
    plz?: string;
    ort?: string;
    land?: string;
    ansprechpartner_vorname?: string;
    ansprechpartner_nachname?: string;
    ansprechpartner_email?: string;
    ansprechpartner_telefon?: string;
    spz_id?: string;
    spz_source?: string;
    spz_last_sync?: string; // Format: YYYY-MM-DD oder ISO String
    spz_sync_status?: string;
    spz_deleted?: boolean;
  };
}

export interface Teilnehmer {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    anmeldung?: string; // applookup -> URL zu 'Anmeldungen' Record
    teilnehmer_vorname?: string;
    teilnehmer_nachname?: string;
    teilnehmer_email?: string;
    teilnehmer_telefon?: string;
    zertifikats_nr?: string;
    gebuchte_stufe?: LookupValue;
    gebuchtes_verfahren?: LookupValue;
    teilnehmerstatus?: string;
    bemerkung?: string;
    spz_id?: string;
    spz_source?: string;
    spz_last_sync?: string; // Format: YYYY-MM-DD oder ISO String
    spz_sync_status?: string;
    spz_deleted?: boolean;
  };
}

export interface GebuchteLeistungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    teilnehmer?: string; // applookup -> URL zu 'Teilnehmer' Record
    veranstaltung?: string; // applookup -> URL zu 'Veranstaltungen' Record
    leistungsname?: string;
    leistungstyp?: string;
    stufe?: LookupValue;
    verfahren?: LookupValue;
    datum_von?: string; // Format: YYYY-MM-DD oder ISO String
    datum_bis?: string; // Format: YYYY-MM-DD oder ISO String
    preis_netto?: number;
    rabatt?: number;
    status?: string;
    spz_id?: string;
    spz_source?: string;
    spz_last_sync?: string; // Format: YYYY-MM-DD oder ISO String
    spz_sync_status?: string;
    spz_deleted?: boolean;
    anmeldung?: string; // applookup -> URL zu 'Anmeldungen' Record
  };
}

export interface Pruefungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    anmeldung?: string; // applookup -> URL zu 'Anmeldungen' Record
    teilnehmer?: string; // applookup -> URL zu 'Teilnehmer' Record
    veranstaltung?: string; // applookup -> URL zu 'Veranstaltungen' Record
    pruefungsart?: LookupValue;
    stufe?: LookupValue;
    verfahren?: LookupValue;
    pruefungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    ergebnis?: string;
    bestanden?: boolean;
    bemerkung?: string;
    spz_id?: string;
    spz_source?: string;
    spz_last_sync?: string; // Format: YYYY-MM-DD oder ISO String
    spz_sync_status?: string;
    spz_deleted?: boolean;
  };
}

export interface WeberSpzUebersicht {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    anzahl_anmeldungen?: number;
    naechste_veranstaltungen?: string;
    gesamtteilnehmerzahl?: number;
    sync_status_gesamt?: string;
    fehlerhafte_syncs?: number;
    letzter_sync?: string; // Format: YYYY-MM-DD oder ISO String
    spz_id?: string;
    spz_source?: string;
    spz_last_sync?: string; // Format: YYYY-MM-DD oder ISO String
    spz_sync_status?: string;
    spz_deleted?: boolean;
  };
}

export interface SyncProtokoll {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    sync_zeitpunkt?: string; // Format: YYYY-MM-DD oder ISO String
    datentyp?: LookupValue;
    spz_datensatz_id?: string;
    livingapps_datensatz?: string;
    aktion?: LookupValue;
    sync_status?: LookupValue;
    fehlermeldung?: string;
    rohdaten?: string;
    spz_id?: string;
    spz_source?: string;
    spz_last_sync?: string; // Format: YYYY-MM-DD oder ISO String
    spz_sync_status?: string;
    spz_deleted?: boolean;
  };
}

export const APP_IDS = {
  VERANSTALTUNGEN: '6a47773b26185019573688ad',
  ANMELDUNGEN: '6a477740b3cd771803ae4861',
  TEILNEHMER: '6a477741f6fb9c41786d3851',
  GEBUCHTE_LEISTUNGEN: '6a477742b51cb3dccc89c848',
  PRUEFUNGEN: '6a477742468eafa84b433667',
  WEBER: { SPZ_UEBERSICHT: '6a477743f307ee8278c2ba93' },
  SYNC_PROTOKOLL: '6a477743394b056d8050c84e',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'veranstaltungen': {
    stufe: [{ key: "tt1", label: "TT1" }, { key: "tt2", label: "TT2" }, { key: "tt3", label: "TT3" }],
    verfahren: [{ key: "tt2_pb", label: "TT2-PB" }, { key: "tt2_pe", label: "TT2-PE" }, { key: "tt2_pi", label: "TT2-PI" }, { key: "vds", label: "VdS" }],
    art: [{ key: "schulung", label: "Schulung" }, { key: "pruefung", label: "Prüfung" }, { key: "ergaenzungsschulung", label: "Ergänzungsschulung" }, { key: "ergaenzungspruefung", label: "Ergänzungsprüfung" }, { key: "wiederholungspruefung", label: "Wiederholungsprüfung" }, { key: "erneuerungspruefung", label: "Erneuerungsprüfung" }, { key: "rezertifizierungspruefung", label: "Rezertifizierungsprüfung" }],
  },
  'anmeldungen': {
    buchungsart: [{ key: "schulung", label: "Schulung" }, { key: "schulung_pruefung", label: "Schulung + Prüfung" }, { key: "nur_pruefung", label: "Nur Prüfung" }],
    stufe: [{ key: "tt1", label: "TT1" }, { key: "tt2", label: "TT2" }, { key: "tt3", label: "TT3" }],
    verfahren: [{ key: "tt2_pb", label: "TT2-PB" }, { key: "tt2_pe", label: "TT2-PE" }, { key: "tt2_pi", label: "TT2-PI" }, { key: "vds", label: "VdS" }],
  },
  'teilnehmer': {
    gebuchte_stufe: [{ key: "tt2", label: "TT2" }, { key: "tt3", label: "TT3" }, { key: "tt1", label: "TT1" }],
    gebuchtes_verfahren: [{ key: "tt2_pb", label: "TT2-PB" }, { key: "tt2_pe", label: "TT2-PE" }, { key: "tt2_pi", label: "TT2-PI" }, { key: "vds", label: "VdS" }],
  },
  'gebuchte_leistungen': {
    stufe: [{ key: "tt1", label: "TT1" }, { key: "tt2", label: "TT2" }, { key: "tt3", label: "TT3" }],
    verfahren: [{ key: "tt2_pb", label: "TT2-PB" }, { key: "tt2_pe", label: "TT2-PE" }, { key: "tt2_pi", label: "TT2-PI" }, { key: "vds", label: "VdS" }],
  },
  'pruefungen': {
    pruefungsart: [{ key: "erstpruefung", label: "Erstprüfung" }, { key: "wiederholung_1", label: "1. Wiederholungsprüfung" }, { key: "wiederholung_2", label: "2. Wiederholungsprüfung" }, { key: "erneuerungspruefung", label: "Erneuerungsprüfung" }, { key: "rezertifizierungspruefung", label: "Rezertifizierungsprüfung" }, { key: "ergaenzungspruefung", label: "Ergänzungsprüfung" }],
    stufe: [{ key: "tt1", label: "TT1" }, { key: "tt2", label: "TT2" }, { key: "tt3", label: "TT3" }],
    verfahren: [{ key: "tt2_pb", label: "TT2-PB" }, { key: "tt2_pe", label: "TT2-PE" }, { key: "tt2_pi", label: "TT2-PI" }, { key: "vds", label: "VdS" }],
  },
  'sync_protokoll': {
    datentyp: [{ key: "anmeldung", label: "Anmeldung" }, { key: "teilnehmer", label: "Teilnehmer" }, { key: "veranstaltung", label: "Veranstaltung" }, { key: "leistung", label: "Leistung" }, { key: "pruefung", label: "Prüfung" }],
    aktion: [{ key: "erstellt", label: "erstellt" }, { key: "aktualisiert", label: "aktualisiert" }, { key: "uebersprungen", label: "übersprungen" }, { key: "fehler", label: "Fehler" }],
    sync_status: [{ key: "ok", label: "ok" }, { key: "warnung", label: "Warnung" }, { key: "fehler", label: "Fehler" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'veranstaltungen': {
    'veranstaltungsnummer': 'string/text',
    'veranstaltungstitel': 'string/text',
    'stufe': 'lookup/select',
    'verfahren': 'lookup/select',
    'art': 'lookup/select',
    'startdatum': 'date/datetimeminute',
    'enddatum': 'date/datetimeminute',
    'ort': 'string/text',
    'status': 'string/text',
    'max_teilnehmerzahl': 'number',
    'aktuelle_teilnehmerzahl': 'number',
    'bemerkung': 'string/textarea',
    'spz_id': 'string/text',
    'spz_source': 'string/text',
    'spz_last_sync': 'date/datetimeminute',
    'spz_sync_status': 'string/text',
    'spz_deleted': 'bool',
  },
  'anmeldungen': {
    'buchungsnummer': 'string/text',
    'buchungsdatum': 'date/date',
    'buchungsstatus': 'string/text',
    'buchungsart': 'lookup/select',
    'stufe': 'lookup/select',
    'kombipaket_tt1_tt2': 'bool',
    'verfahren': 'lookup/select',
    'bestellnummer': 'string/text',
    'gesamtstatus': 'string/text',
    'datenschutz_akzeptiert': 'bool',
    'bemerkung': 'string/textarea',
    'firma': 'string/text',
    'strasse': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'land': 'string/text',
    'ansprechpartner_vorname': 'string/text',
    'ansprechpartner_nachname': 'string/text',
    'ansprechpartner_email': 'string/email',
    'ansprechpartner_telefon': 'string/tel',
    'spz_id': 'string/text',
    'spz_source': 'string/text',
    'spz_last_sync': 'date/datetimeminute',
    'spz_sync_status': 'string/text',
    'spz_deleted': 'bool',
  },
  'teilnehmer': {
    'anmeldung': 'applookup/select',
    'teilnehmer_vorname': 'string/text',
    'teilnehmer_nachname': 'string/text',
    'teilnehmer_email': 'string/email',
    'teilnehmer_telefon': 'string/tel',
    'zertifikats_nr': 'string/text',
    'gebuchte_stufe': 'lookup/select',
    'gebuchtes_verfahren': 'lookup/select',
    'teilnehmerstatus': 'string/text',
    'bemerkung': 'string/textarea',
    'spz_id': 'string/text',
    'spz_source': 'string/text',
    'spz_last_sync': 'date/datetimeminute',
    'spz_sync_status': 'string/text',
    'spz_deleted': 'bool',
  },
  'gebuchte_leistungen': {
    'teilnehmer': 'applookup/select',
    'veranstaltung': 'applookup/select',
    'leistungsname': 'string/text',
    'leistungstyp': 'string/text',
    'stufe': 'lookup/select',
    'verfahren': 'lookup/select',
    'datum_von': 'date/date',
    'datum_bis': 'date/date',
    'preis_netto': 'number',
    'rabatt': 'number',
    'status': 'string/text',
    'spz_id': 'string/text',
    'spz_source': 'string/text',
    'spz_last_sync': 'date/datetimeminute',
    'spz_sync_status': 'string/text',
    'spz_deleted': 'bool',
    'anmeldung': 'applookup/select',
  },
  'pruefungen': {
    'anmeldung': 'applookup/select',
    'teilnehmer': 'applookup/select',
    'veranstaltung': 'applookup/select',
    'pruefungsart': 'lookup/select',
    'stufe': 'lookup/select',
    'verfahren': 'lookup/select',
    'pruefungsdatum': 'date/date',
    'ergebnis': 'string/text',
    'bestanden': 'bool',
    'bemerkung': 'string/textarea',
    'spz_id': 'string/text',
    'spz_source': 'string/text',
    'spz_last_sync': 'date/datetimeminute',
    'spz_sync_status': 'string/text',
    'spz_deleted': 'bool',
  },
  'weber.spz_uebersicht': {
    'anzahl_anmeldungen': 'number',
    'naechste_veranstaltungen': 'multipleapplookup/select',
    'gesamtteilnehmerzahl': 'number',
    'sync_status_gesamt': 'string/text',
    'fehlerhafte_syncs': 'number',
    'letzter_sync': 'date/datetimeminute',
    'spz_id': 'string/text',
    'spz_source': 'string/text',
    'spz_last_sync': 'date/datetimeminute',
    'spz_sync_status': 'string/text',
    'spz_deleted': 'bool',
  },
  'sync_protokoll': {
    'sync_zeitpunkt': 'date/datetimeminute',
    'datentyp': 'lookup/select',
    'spz_datensatz_id': 'string/text',
    'livingapps_datensatz': 'string/text',
    'aktion': 'lookup/select',
    'sync_status': 'lookup/select',
    'fehlermeldung': 'string/textarea',
    'rohdaten': 'string/textarea',
    'spz_id': 'string/text',
    'spz_source': 'string/text',
    'spz_last_sync': 'date/datetimeminute',
    'spz_sync_status': 'string/text',
    'spz_deleted': 'bool',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateVeranstaltungen = StripLookup<Veranstaltungen['fields']>;
export type CreateAnmeldungen = StripLookup<Anmeldungen['fields']>;
export type CreateTeilnehmer = StripLookup<Teilnehmer['fields']>;
export type CreateGebuchteLeistungen = StripLookup<GebuchteLeistungen['fields']>;
export type CreatePruefungen = StripLookup<Pruefungen['fields']>;
export type CreateWeberSpzUebersicht = StripLookup<WeberSpzUebersicht['fields']>;
export type CreateSyncProtokoll = StripLookup<SyncProtokoll['fields']>;