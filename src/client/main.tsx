import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import HomePage from './pages/HomePage';
import FinderPage from './pages/FinderPage';
import NotFoundPage from './pages/NotFoundPage';
import DashboardPage from './pages/DashboardPage';
import AuthVerifyPage from './pages/AuthVerifyPage';
import ConversationPage from './pages/ConversationPage';
import FinderConversationPage from './pages/FinderConversationPage';

function App() {
  return (
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
            element={<FinderConversationPage />}
          />
          <Route path="/auth/verify" element={<AuthVerifyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </Router>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
