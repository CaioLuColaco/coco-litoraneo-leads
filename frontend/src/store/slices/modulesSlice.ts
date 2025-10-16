import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ModulesState } from '../types';

// Async thunks para módulos
export const fetchModules = createAsyncThunk(
  'modules/fetchModules',
  async (_, { rejectWithValue }) => {
    try {
      // Por enquanto, retornamos módulos estáticos
      // Futuramente isso pode vir de uma API
      const modules = [
        { id: '1', key: 'COMMERCIAL', name: 'Comercial' },
        { id: '2', key: 'FINANCE', name: 'Financeiro' },
        { id: '3', key: 'USERS', name: 'Usuários' },
        { id: '4', key: 'ROLES', name: 'Permissões' },
      ];
      return modules;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Erro ao carregar módulos');
    }
  }
);

// Estado inicial
const initialState: ModulesState = {
  modules: [],
  isLoading: false,
  error: null,
};

// Slice de módulos
const modulesSlice = createSlice({
  name: 'modules',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearModules: (state) => {
      state.modules = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Modules
      .addCase(fetchModules.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchModules.fulfilled, (state, action) => {
        state.isLoading = false;
        state.modules = action.payload;
        state.error = null;
      })
      .addCase(fetchModules.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearModules } = modulesSlice.actions;
export default modulesSlice.reducer;
