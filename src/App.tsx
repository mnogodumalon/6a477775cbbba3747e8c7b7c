import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import VeranstaltungenPage from '@/pages/VeranstaltungenPage';
import VeranstaltungenDetailPage from '@/pages/VeranstaltungenDetailPage';
import AnmeldungenPage from '@/pages/AnmeldungenPage';
import AnmeldungenDetailPage from '@/pages/AnmeldungenDetailPage';
import TeilnehmerPage from '@/pages/TeilnehmerPage';
import TeilnehmerDetailPage from '@/pages/TeilnehmerDetailPage';
import GebuchteLeistungenPage from '@/pages/GebuchteLeistungenPage';
import GebuchteLeistungenDetailPage from '@/pages/GebuchteLeistungenDetailPage';
import PruefungenPage from '@/pages/PruefungenPage';
import PruefungenDetailPage from '@/pages/PruefungenDetailPage';
import WeberSpzUebersichtPage from '@/pages/WeberSpzUebersichtPage';
import WeberSpzUebersichtDetailPage from '@/pages/WeberSpzUebersichtDetailPage';
import SyncProtokollPage from '@/pages/SyncProtokollPage';
import SyncProtokollDetailPage from '@/pages/SyncProtokollDetailPage';
import PublicFormVeranstaltungen from '@/pages/public/PublicForm_Veranstaltungen';
import PublicFormAnmeldungen from '@/pages/public/PublicForm_Anmeldungen';
import PublicFormTeilnehmer from '@/pages/public/PublicForm_Teilnehmer';
import PublicFormGebuchteLeistungen from '@/pages/public/PublicForm_GebuchteLeistungen';
import PublicFormPruefungen from '@/pages/public/PublicForm_Pruefungen';
import PublicFormWeberSpzUebersicht from '@/pages/public/PublicForm_WeberSpzUebersicht';
import PublicFormSyncProtokoll from '@/pages/public/PublicForm_SyncProtokoll';
// <public:imports>
// </public:imports>
// <custom:imports>
const AnmeldungErfassenPage = lazy(() => import('@/pages/intents/AnmeldungErfassenPage'));
const PruefungsergebnisseErfassenPage = lazy(() => import('@/pages/intents/PruefungsergebnisseErfassenPage'));
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6a47773b26185019573688ad" element={<PublicFormVeranstaltungen />} />
              <Route path="public/6a477740b3cd771803ae4861" element={<PublicFormAnmeldungen />} />
              <Route path="public/6a477741f6fb9c41786d3851" element={<PublicFormTeilnehmer />} />
              <Route path="public/6a477742b51cb3dccc89c848" element={<PublicFormGebuchteLeistungen />} />
              <Route path="public/6a477742468eafa84b433667" element={<PublicFormPruefungen />} />
              <Route path="public/6a477743f307ee8278c2ba93" element={<PublicFormWeberSpzUebersicht />} />
              <Route path="public/6a477743394b056d8050c84e" element={<PublicFormSyncProtokoll />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="veranstaltungen" element={<VeranstaltungenPage />} />
                <Route path="veranstaltungen/:id" element={<VeranstaltungenDetailPage />} />
                <Route path="anmeldungen" element={<AnmeldungenPage />} />
                <Route path="anmeldungen/:id" element={<AnmeldungenDetailPage />} />
                <Route path="teilnehmer" element={<TeilnehmerPage />} />
                <Route path="teilnehmer/:id" element={<TeilnehmerDetailPage />} />
                <Route path="gebuchte-leistungen" element={<GebuchteLeistungenPage />} />
                <Route path="gebuchte-leistungen/:id" element={<GebuchteLeistungenDetailPage />} />
                <Route path="pruefungen" element={<PruefungenPage />} />
                <Route path="pruefungen/:id" element={<PruefungenDetailPage />} />
                <Route path="weber.spz-uebersicht" element={<WeberSpzUebersichtPage />} />
                <Route path="weber.spz-uebersicht/:id" element={<WeberSpzUebersichtDetailPage />} />
                <Route path="sync-protokoll" element={<SyncProtokollPage />} />
                <Route path="sync-protokoll/:id" element={<SyncProtokollDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                <Route path="intents/anmeldung-erfassen" element={<Suspense fallback={null}><AnmeldungErfassenPage /></Suspense>} />
                <Route path="intents/pruefungsergebnisse-erfassen" element={<Suspense fallback={null}><PruefungsergebnisseErfassenPage /></Suspense>} />
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
