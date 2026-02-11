
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Role, Permission, RolePermission } from '../types';

export const useRoles = () => {
    return useQuery({
        queryKey: ['roles'],
        queryFn: async () => {
            const { data, error } = await supabase.from('roles').select('*').order('name');
            if (error) throw error;
            return (data || []) as Role[];
        },
        staleTime: 1000 * 60 * 30,
    });
};

export const usePermissions = () => {
    return useQuery({
        queryKey: ['permissions'],
        queryFn: async () => {
            const { data, error } = await supabase.from('permissions').select('*');
            if (error) throw error;
            return (data || []) as Permission[];
        },
        staleTime: 1000 * 60 * 60, // Permissions rarely change
    });
};

export const useRolePermissions = () => {
    return useQuery({
        queryKey: ['rolePermissions'],
        queryFn: async () => {
            const { data, error } = await supabase.from('rolepermissions').select('*');
            if (error) throw error;
            return (data || []) as RolePermission[];
        },
        staleTime: 1000 * 60 * 5,
    });
};

export const useRoleMutations = () => {
    const queryClient = useQueryClient();

    const createRole = useMutation({
        mutationFn: async (roleName: string) => {
            const { data, error } = await supabase.from('roles').insert([{ name: roleName }]).select().single();
            if (error) throw error;
            return data as Role;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
        },
    });

    const deleteRole = useMutation({
        mutationFn: async (roleId: number) => {
            const { error } = await supabase.from('roles').delete().eq('id', roleId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            queryClient.invalidateQueries({ queryKey: ['rolePermissions'] });
        },
    });

    const updateRolePermissions = useMutation({
        mutationFn: async ({ roleId, permissionIds }: { roleId: number, permissionIds: number[] }) => {
            // Transaction-like approach best handled via RPC if strict atomicity is needed, 
            // but here we do delete-then-insert.

            // 1. Delete all for role
            const { error: delError } = await supabase.from('rolepermissions').delete().eq('role_id', roleId);
            if (delError) throw delError;

            // 2. Insert new
            if (permissionIds.length > 0) {
                const toInsert = permissionIds.map(pid => ({ role_id: roleId, permission_id: pid }));
                const { error: insError } = await supabase.from('rolepermissions').insert(toInsert);
                if (insError) throw insError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rolePermissions'] });
        },
    });

    return { createRole, deleteRole, updateRolePermissions };
};
