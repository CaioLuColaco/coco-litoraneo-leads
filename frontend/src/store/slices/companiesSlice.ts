import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { superAdminAPI } from '../../services/api';
import { CompaniesState, CreateCompanyData } from '../types';

// Async thunks para empresas
export const fetchCompanies = createAsyncThunk(
  'companies/fetchCompanies',
  async (_, { rejectWithValue }) => {
    try {
      const response = await superAdminAPI.getCompanies();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Erro ao carregar empresas');
    }
  }
);

export const createCompany = createAsyncThunk(
  'companies/createCompany',
  async (data: CreateCompanyData, { rejectWithValue }) => {
    try {
      const response = await superAdminAPI.createCompany(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Erro ao criar empresa');
    }
  }
);

export const updateCompany = createAsyncThunk(
  'companies/updateCompany',
  async ({ id, data }: { id: string; data: CreateCompanyData }, { rejectWithValue }) => {
    try {
      const response = await superAdminAPI.updateCompany(id, data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Erro ao atualizar empresa');
    }
  }
);

// Estado inicial
const initialState: CompaniesState = {
  companies: [],
  isLoading: false,
  error: null,
  selectedCompanyId: null,
};

// Slice de empresas
const companiesSlice = createSlice({
  name: 'companies',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedCompany: (state, action: PayloadAction<string | null>) => {
      state.selectedCompanyId = action.payload;
    },
    clearCompanies: (state) => {
      state.companies = [];
      state.selectedCompanyId = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Companies
      .addCase(fetchCompanies.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCompanies.fulfilled, (state, action) => {
        state.isLoading = false;
        state.companies = action.payload;
        state.error = null;
      })
      .addCase(fetchCompanies.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create Company
      .addCase(createCompany.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCompany.fulfilled, (state, action) => {
        state.isLoading = false;
        state.companies.push(action.payload);
        state.error = null;
      })
      .addCase(createCompany.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update Company
      .addCase(updateCompany.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCompany.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.companies.findIndex(company => company.id === action.payload.id);
        if (index !== -1) {
          state.companies[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateCompany.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setSelectedCompany, clearCompanies } = companiesSlice.actions;
export default companiesSlice.reducer;
