
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Company } from '../types';

export const useCompanies = () => {
    return useQuery({
        queryKey: ['companies'],
        queryFn: async () => {
            const { data, error } = await supabase.from('directorio_empresas').select('*');
            if (error) throw error;
            return (data || []) as Company[];
        },
        staleTime: 1000 * 60 * 30, // 30 minutes
    });
};

export const useCompanyMutations = () => {
    const queryClient = useQueryClient();

    const createCompany = useMutation({
        mutationFn: async (company: Omit<Company, 'id_establecimiento'>) => {
            const { data, error } = await supabase
                .from('directorio_empresas')
                .insert([company])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companies'] });
        },
    });

    const updateCompany = useMutation({
        mutationFn: async ({ id, company }: { id: string; company: Partial<Company> }) => {
            const { data, error } = await supabase
                .from('directorio_empresas')
                .update(company)
                .eq('id_establecimiento', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companies'] });
        },
    });

    const deleteCompany = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('directorio_empresas')
                .delete()
                .eq('id_establecimiento', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companies'] });
        },
    });

    return {
        createCompany,
        updateCompany,
        deleteCompany,
    };
};
