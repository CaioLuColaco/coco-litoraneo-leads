import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { companyMasterAPI } from '../../services/api';
import { CompanyRolesState, CreateRoleData, UpdateRoleData } from '../types';

// Async thunks para roles da empresa
export const fetchCompanyRoles = createAsyncThunk(
  'companyRoles/fetchCompanyRoles',
  async (companyId: string, { rejectWithValue }) => {
    try {
      const response = await companyMasterAPI.getCompanyRoles(companyId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Erro ao carregar roles');
    }
  }
);

export const createCompanyRole = createAsyncThunk(
  'companyRoles/createCompanyRole',
  async ({ companyId, data }: { companyId: string; data: CreateRoleData }, { rejectWithValue }) => {
    try {
      const response = await companyMasterAPI.createRole(companyId, data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Erro ao criar role');
    }
  }
);

export const updateCompanyRole = createAsyncThunk(
  'companyRoles/updateCompanyRole',
  async ({ companyId, roleId, data }: { companyId: string; roleId: string; data: UpdateRoleData }, { rejectWithValue }) => {
    try {
      const response = await companyMasterAPI.updateRole(companyId, roleId, data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Erro ao atualizar role');
    }
  }
);

// Estado inicial
const initialState: CompanyRolesState = {
  roles: [],
  isLoading: false,
  error: null,
};

// Slice de roles da empresa
const companyRolesSlice = createSlice({
  name: 'companyRoles',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearRoles: (state) => {
      state.roles = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Company Roles
      .addCase(fetchCompanyRoles.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCompanyRoles.fulfilled, (state, action) => {
        state.isLoading = false;
        state.roles = action.payload;
        state.error = null;
      })
      .addCase(fetchCompanyRoles.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create Company Role
      .addCase(createCompanyRole.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCompanyRole.fulfilled, (state, action) => {
        state.isLoading = false;
        state.roles.unshift(action.payload);
        state.error = null;
      })
      .addCase(createCompanyRole.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update Company Role
      .addCase(updateCompanyRole.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCompanyRole.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.roles.findIndex(role => role.id === action.payload.id);
        if (index !== -1) {
          state.roles[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateCompanyRole.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearRoles } = companyRolesSlice.actions;
export default companyRolesSlice.reducer;
