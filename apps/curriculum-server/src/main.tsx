import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CurriculumServerApp from './App';
import '../../../src/index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <CurriculumServerApp />
    </StrictMode>
  );
}
