import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  isActive: boolean;
  onboardingComplete: boolean;
  timezone: string;
  createdAt: string;
}

export interface AdminFood {
  id: string;
  name: string;
  brand?: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Paged<T> {
  page: number;
  limit: number;
  total: number;
  users?: T[];
  foods?: T[];
}

export interface AdminStats {
  users: { total: number; active7d: number };
  logs: Record<string, { total: number; last7d: number }>;
}

export const useAdminStats = () =>
  useQuery<AdminStats>({ queryKey: ['admin', 'stats'], queryFn: async () => (await apiClient.get('/admin/stats')) as unknown as AdminStats });

export const useAdminUsers = (page: number, q: string) =>
  useQuery<Paged<AdminUser>>({
    queryKey: ['admin', 'users', page, q],
    queryFn: async () => (await apiClient.get(`/admin/users?page=${page}&limit=25${q ? `&q=${encodeURIComponent(q)}` : ''}`)) as unknown as Paged<AdminUser>,
  });

export const useUpdateAdminUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; role?: 'user' | 'admin'; isActive?: boolean }) => {
      const { id, ...body } = v;
      return apiClient.patch(`/admin/users/${id}`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
};

export const useAdminFoods = (page: number, q: string) =>
  useQuery<Paged<AdminFood>>({
    queryKey: ['admin', 'foods', page, q],
    queryFn: async () => (await apiClient.get(`/admin/foods?page=${page}&limit=25${q ? `&q=${encodeURIComponent(q)}` : ''}`)) as unknown as Paged<AdminFood>,
  });

export const useSaveAdminFood = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id?: string; food: Omit<AdminFood, 'id'> }) =>
      v.id ? apiClient.patch(`/admin/foods/${v.id}`, v.food) : apiClient.post('/admin/foods', v.food),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'foods'] }),
  });
};

export const useDeleteAdminFood = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/admin/foods/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'foods'] }),
  });
};
