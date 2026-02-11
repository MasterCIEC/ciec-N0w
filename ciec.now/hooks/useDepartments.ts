
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, departmentFromSupabase } from '../supabaseClient';
import { Department } from '../types';

export const useDepartments = () => {
    return useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
            const { data, error } = await supabase.from('departments').select('*');
            if (error) throw error;
            return (data || []).map(departmentFromSupabase);
        },
        staleTime: 1000 * 60 * 30,
    });
};

export const useDepartmentMutations = () => {
    const queryClient = useQueryClient();

    const createDepartment = useMutation({
        mutationFn: async (department: Omit<Department, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => {
            // Manual mapping to sneak_case for DB
            const dbDepartment = {
                name: department.name,
                description: department.description,
                is_active: department.is_active,
                // created_by etc are handled by default or triggers if set up, otherwise we might need to pass user id
            };

            const { data, error } = await supabase
                .from('departments')
                .insert([dbDepartment])
                .select()
                .single();

            if (error) throw error;
            return departmentFromSupabase(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
        },
    });

    const updateDepartment = useMutation({
        mutationFn: async (department: Department) => {
            const dbDepartment = {
                name: department.name,
                description: department.description,
                is_active: department.is_active,
            };

            const { data, error } = await supabase
                .from('departments')
                .update(dbDepartment)
                .eq('id', department.id)
                .select()
                .single();

            if (error) throw error;
            return departmentFromSupabase(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
        },
    });

    const deleteDepartment = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('departments')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
        },
    });

    return { createDepartment, updateDepartment, deleteDepartment };
};
