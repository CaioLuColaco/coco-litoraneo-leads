import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { companyMasterAPI } from '../../services/api';
import { CompanyUsersState, CreateUserData, UpdateUserData } from '../types';

// Async thunks para usuários da empresa
export const fetchCompanyUsers = createAsyncThunk(
  'companyUsers/fetchCompanyUsers',
  async (companyId: string, { rejectWithValue }) => {
    try {
      const response = await companyMasterAPI.getCompanyUsers(companyId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Erro ao carregar usuários');
    }
  }
);

export const createCompanyUser = createAsyncThunk(
  'companyUsers/createCompanyUser',
  async ({ companyId, data }: { companyId: string; data: CreateUserData }, { rejectWithValue }) => {
    try {
      const response = await companyMasterAPI.createUser(companyId, data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Erro ao criar usuário');
    }
  }
);

export const updateCompanyUser = createAsyncThunk(
  'companyUsers/updateCompanyUser',
  async ({ companyId, userId, data }: { companyId: string; userId: string; data: UpdateUserData }, { rejectWithValue }) => {
    try {
      const response = await companyMasterAPI.updateUser(companyId, userId, data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Erro ao atualizar usuário');
    }
  }
);

// Estado inicial
const initialState: CompanyUsersState = {
  users: [],
  isLoading: false,
  error: null,
};

// Slice de usuários da empresa
const companyUsersSlice = createSlice({
  name: 'companyUsers',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearUsers: (state) => {
      state.users = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Company Users
      .addCase(fetchCompanyUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCompanyUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = action.payload;
        state.error = null;
      })
      .addCase(fetchCompanyUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create Company User
      .addCase(createCompanyUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCompanyUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users.unshift(action.payload);
        state.error = null;
      })
      .addCase(createCompanyUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update Company User
      .addCase(updateCompanyUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCompanyUser.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.users.findIndex(user => user.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateCompanyUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearUsers } = companyUsersSlice.actions;
export default companyUsersSlice.reducer;
