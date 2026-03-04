import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
const LandingPage = lazy(() => import('./pages/LandingPage.js'));
const NewBagPage = lazy(() => import('./pages/NewBagPage.js'));
const FeaturesPage = lazy(() => import('./pages/FeaturesPage.js'));
const PricingPage = lazy(() => import('./pages/PricingPage.js'));
const ContactPage = lazy(() => import('./pages/ContactPage.js'));
const FinderPage = lazy(() => import('./pages/FinderPage.js'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.js'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.js'));
const AuthVerifyPage = lazy(() => import('./pages/AuthVerifyPage.js'));
const ConversationPage = lazy(() => import('./pages/ConversationPage.js'));
const EmailPreferencesPage = lazy(
  () => import('./pages/EmailPreferencesPage.js')
);
import Header from './components/Header.js';
import Footer from './components/Footer.js';
import ThemeToggle from './components/ThemeToggle.js';
import { ToastProvider } from './hooks/useToast.js';

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppShell() {
  const { pathname } = useLocation();
  const isFinderPage =
    pathname.startsWith('/b/') || pathname.startsWith('/finder/');

  return (
    <div className="min-h-screen flex flex-col">
      {!isFinderPage && <ThemeToggle />}
      {!isFinderPage && <Header />}
      <div className="flex-1 flex flex-col bg-regal-navy-50">
        <Suspense fallback={<div />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/new" element={<NewBagPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/b/:shortId" element={<FinderPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/dashboard/conversation/:conversationId"
              element={<ConversationPage />}
            />
            <Route
              path="/finder/conversation/:conversationId"
              element={<ConversationPage />}
            />
            <Route path="/auth/verify" element={<AuthVerifyPage />} />
            <Route
              path="/email-preferences/:token"
              element={<EmailPreferencesPage />}
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
      {!isFinderPage && <Footer />}
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <ToastProvider>
        <Router>
          <ScrollToTop />
          <AppShell />
        </Router>
      </ToastProvider>
    </HelmetProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
