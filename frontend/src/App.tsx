import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { AuthProvider } from './contexts/AuthContext';
import AppRouter from './components/AppRouter';
import './App.css';
import './styles/layout.css';

function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </Provider>
  );
}

export default App;
