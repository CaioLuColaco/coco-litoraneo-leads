import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import companiesReducer from './slices/companiesSlice';
import companyUsersReducer from './slices/companyUsersSlice';
import companyRolesReducer from './slices/companyRolesSlice';
import modulesReducer from './slices/modulesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    companies: companiesReducer,
    companyUsers: companyUsersReducer,
    companyRoles: companyRolesReducer,
    modules: modulesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
