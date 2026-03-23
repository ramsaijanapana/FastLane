import React from 'react';

import { AppShell } from './src/AppShell';
import { ThemeProvider } from './src/theme';

const App = () => (
  <ThemeProvider>
    <AppShell />
  </ThemeProvider>
);

export default App;
