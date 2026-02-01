import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import HomePage from './pages/HomePage.js';
import FinderPage from './pages/FinderPage.js';
import NotFoundPage from './pages/NotFoundPage.js';
import DashboardPage from './pages/DashboardPage.js';
import AuthVerifyPage from './pages/AuthVerifyPage.js';
import ConversationPage from './pages/ConversationPage.js';
import EmailPreferencesPage from './pages/EmailPreferencesPage.js';

function App() {
  return (
    <HelmetProvider>
      <Router>
        <div className="min-h-screen">
          <Routes>
            <Route path="/" element={<HomePage />} />
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
        </div>
      </Router>
    </HelmetProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
