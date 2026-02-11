
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { UserDepartment } from '../types';

export const useUserDepartments = () => {
    return useQuery({
        queryKey: ['userDepartments'],
        queryFn: async () => {
            const { data, error } = await supabase.from('user_departments').select('*');
            if (error) throw error;
            return (data || []) as UserDepartment[];
        },
        staleTime: 1000 * 60 * 10,
    });
};

export const useUserDepartmentMutations = () => {
    const queryClient = useQueryClient();

    const updateUserDepartments = useMutation({
        mutationFn: async ({ userId, departmentIds }: { userId: string, departmentIds: string[] }) => {
            // 1. Delete existing for user
            const { error: delError } = await supabase
                .from('user_departments')
                .delete()
                .eq('user_id', userId);

            if (delError) throw delError;

            // 2. Insert new
            if (departmentIds.length > 0) {
                const toInsert = departmentIds.map(deptId => ({
                    user_id: userId,
                    department_id: deptId
                }));
                const { error: insError } = await supabase
                    .from('user_departments')
                    .insert(toInsert);

                if (insError) throw insError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userDepartments'] });
        },
    });

    return { updateUserDepartments };
};
