import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import {
    CommunicationLog,
    Department,
    Company,
    ViewKey
} from '../types';
import { useDepartments } from '../hooks/useDepartments';
// import { useCompanies } from '../hooks/useCompanies'; // Removed to avoid loading all companies
import Modal from '../components/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { Card, CardContent } from '../components/ui/Card';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import PlusIcon from '../components/icons/PlusIcon';
import CheckIcon from '../components/icons/CheckIcon';
import EditIcon from '../components/icons/EditIcon';

// Icons
const InboundIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
);
const OutboundIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
);

const normalizeString = (str: string): string => {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const CommunicationsView = ({ onNavigateBack }: { onNavigateBack?: () => void }) => {
    const { notify } = useNotification();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // -- State --
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [activeTab, setActiveTab] = useState<'inbound' | 'outbound'>('inbound');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDirection, setFilterDirection] = useState<'all' | 'inbound' | 'outbound'>('all');

    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<CommunicationLog>>({
        direction: 'inbound',
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        subject: '',
        reference_code: '',
        internal_dept_id: '',
        external_company_id: '',
        external_party_name: ''
    });

    // Company Search State
    const [companySearchTerm, setCompanySearchTerm] = useState('');
    // const [companySuggestions, setCompanySuggestions] = useState<Company[]>([]); // Replaced by useQuery
    const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);

    // -- Data Hooks --
    const { data: departments = [] } = useDepartments();
    // const { data: companies = [] } = useCompanies(); // Removed

    // Optimized Company Search
    const { data: companySuggestions = [] } = useQuery({
        queryKey: ['companySearch', companySearchTerm],
        queryFn: async () => {
            if (companySearchTerm.length < 2) return [];
            const { data, error } = await supabase
                .from('directorio_empresas')
                .select('*')
                .ilike('nombre_establecimiento', `%${companySearchTerm}%`)
                .limit(10);

            if (error) {
                console.error("Error searching companies", error);
                return [];
            }
            return data as Company[];
        },
        enabled: companySearchTerm.length > 2 && !formData.external_company_id
    });

    const communicationsQuery = useQuery({
        queryKey: ['communications'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('communications_logs')
                .select(`
                    *,
                    department:departments(id, name),
                    company:directorio_empresas(id_establecimiento, nombre_establecimiento)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching communications:', error);
                throw error;
            }
            return data as CommunicationLog[];
        }
    });

    const isError = communicationsQuery.isError;
    const error = communicationsQuery.error;

    // -- Mutations --
    const createMutation = useMutation({
        mutationFn: async (newLog: Partial<CommunicationLog>) => {
            const { data, error } = await supabase.from('communications_logs').insert([newLog as any]).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['communications'] });
            setIsModalOpen(false);
            notify.success('Comunicación registrada correctamente');
            resetForm();
        },
        onError: (err: any) => notify.error('Error al registrar: ' + err.message)
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: Partial<CommunicationLog> }) => {
            const { data, error } = await supabase.from('communications_logs').update(updates).eq('id', id).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['communications'] });
            setIsModalOpen(false);
            notify.success('Comunicación actualizada');
            resetForm();
        },
        onError: (err: any) => notify.error('Error al actualizar: ' + err.message)
    });

    // -- Handlers --

    const resetForm = () => {
        setFormData({
            direction: activeTab,
            status: 'pending',
            date: new Date().toISOString().split('T')[0],
            subject: '',
            reference_code: '',
            internal_dept_id: '',
            external_company_id: '',
            external_party_name: ''
        });
        setCompanySearchTerm('');
        setEditingId(null);
    };

    const handleOpenCreate = () => {
        setModalMode('create');
        resetForm();
        setFormData(prev => ({ ...prev, direction: activeTab }));
        setIsModalOpen(true);
    };

    const handleOpenEdit = (log: CommunicationLog) => {
        setModalMode('edit');
        setEditingId(log.id);
        setFormData({
            direction: log.direction,
            status: log.status,
            date: log.date,
            subject: log.subject,
            reference_code: log.reference_code || '',
            internal_dept_id: log.internal_dept_id || '',
            external_company_id: log.external_company_id || '',
            external_party_name: log.external_party_name || ''
        });

        // Set search term for company if applicable
        if (log.company) {
            // Handle array or object return from Supabase
            const comp = Array.isArray(log.company) ? log.company[0] : log.company;
            setCompanySearchTerm(comp ? comp.nombre_establecimiento : '');
        } else {
            setCompanySearchTerm(log.external_party_name || '');
        }

        setActiveTab(log.direction);
        setIsModalOpen(true);
    };

    const handleCompanySearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        setCompanySearchTerm(term);
        setFormData(prev => ({ ...prev, external_party_name: term, external_company_id: null }));
        setShowCompanySuggestions(term.length > 2);
    };

    const selectCompany = (company: Company) => {
        setFormData(prev => ({
            ...prev,
            external_company_id: company.id_establecimiento,
            external_party_name: null // Clear text if company selected
        }));
        setCompanySearchTerm(company.nombre_establecimiento);
        setShowCompanySuggestions(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validations
        if (!formData.internal_dept_id) {
            notify.error('Debe seleccionar un departamento interno');
            return;
        }
        if (!formData.external_company_id && !formData.external_party_name) {
            notify.error('Debe indicar la contraparte (Empresa o Nombre)');
            return;
        }

        const payload = {
            ...formData,
            created_by: user?.id
        };

        if (modalMode === 'create') {
            createMutation.mutate(payload);
        } else if (editingId) {
            updateMutation.mutate({ id: editingId, updates: payload });
        }
    };

    // -- Rendering --

    const filteredLogs = useMemo(() => {
        const data = communicationsQuery.data || [];
        return data.filter(log => {
            // Filter by direction tab/filter
            if (filterDirection !== 'all' && log.direction !== filterDirection) return false;

            // Search filter
            if (!searchTerm) return true;
            const term = normalizeString(searchTerm);
            const refCode = log.reference_code ? normalizeString(log.reference_code) : '';
            const subj = normalizeString(log.subject);
            const extName = log.external_party_name ? normalizeString(log.external_party_name) : '';

            const comp = Array.isArray(log.company) ? log.company[0] : log.company;
            const compName = comp ? normalizeString(comp.nombre_establecimiento) : '';

            return refCode.includes(term) || subj.includes(term) || extName.includes(term) || compName.includes(term);
        });
    }, [communicationsQuery.data, filterDirection, searchTerm]);

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Control de Comunicaciones</h1>
                <div className="flex space-x-2">
                    <Button onClick={handleOpenCreate} variant="primary">
                        <PlusIcon className="w-5 h-5 mr-2" /> Registrar Nueva
                    </Button>
                    {onNavigateBack && <Button onClick={onNavigateBack} variant="secondary">Volver</Button>}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-center">
                <Input
                    placeholder="Buscar por asunto, referencia o empresa..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="flex-grow w-full"
                />
                <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-md">
                    <button
                        onClick={() => setFilterDirection('all')}
                        className={`px-3 py-1 text-sm rounded ${filterDirection === 'all' ? 'bg-white shadow text-primary-600' : 'text-gray-500'}`}
                    >Todos</button>
                    <button
                        onClick={() => setFilterDirection('inbound')}
                        className={`px-3 py-1 text-sm rounded ${filterDirection === 'inbound' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}
                    >Entradas</button>
                    <button
                        onClick={() => setFilterDirection('outbound')}
                        className={`px-3 py-1 text-sm rounded ${filterDirection === 'outbound' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                    >Salidas</button>
                </div>
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-0 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dir</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contraparte</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asunto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Depto Interno</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                            {communicationsQuery.isLoading ? (
                                <tr><td colSpan={8} className="text-center py-4">Cargando...</td></tr>
                            ) : communicationsQuery.isError ? (
                                <tr><td colSpan={8} className="text-center py-4 text-red-500">Error cargando datos: {(communicationsQuery.error as any)?.message}</td></tr>
                            ) : (communicationsQuery.data || []).length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-4 text-gray-500">No hay registros</td></tr>
                            ) : (communicationsQuery.data || []).map(log => (
                                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-6 py-4">
                                        {log.direction === 'inbound' ? (
                                            <span title="Recibida"><InboundIcon className="text-green-500" /></span>
                                        ) : (
                                            <span title="Enviada"><OutboundIcon className="text-blue-500" /></span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{log.date}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{log.reference_code || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 font-medium">
                                        {(() => {
                                            const comp = Array.isArray(log.company) ? log.company[0] : log.company;
                                            if (comp) {
                                                return (
                                                    <span className="flex items-center gap-1">
                                                        {comp.nombre_establecimiento}
                                                    </span>
                                                );
                                            }
                                            return log.external_party_name || '-';
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={log.subject}>{log.subject}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {(() => {
                                            const dept = Array.isArray(log.department) ? log.department[0] : log.department;
                                            return dept?.name || '-';
                                        })()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${log.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                log.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'}`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleOpenEdit(log)} className="text-primary-600 hover:text-primary-900">
                                            <EditIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalMode === 'create' ? 'Registrar Comunicación' : 'Editar Comunicación'}
                size="lg"
            >
                <div className="space-y-4">
                    {/* Tabs for Direction (Only for Create mode or if editing allows changing type) */}
                    <div className="flex border-b border-gray-200 dark:border-slate-700 mb-4">
                        <button
                            className={`flex-1 py-2 text-center font-medium ${activeTab === 'inbound' ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-500'}`}
                            onClick={() => { setActiveTab('inbound'); setFormData(prev => ({ ...prev, direction: 'inbound' })); }}
                        >
                            <span className="flex items-center justify-center gap-2"><InboundIcon className="w-4 h-4" /> Recibida (Entrante)</span>
                        </button>
                        <button
                            className={`flex-1 py-2 text-center font-medium ${activeTab === 'outbound' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                            onClick={() => { setActiveTab('outbound'); setFormData(prev => ({ ...prev, direction: 'outbound' })); }}
                        >
                            <span className="flex items-center justify-center gap-2"><OutboundIcon className="w-4 h-4" /> Enviada (Saliente)</span>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Fecha"
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                            <Input
                                label="Referencia / Nro Oficio"
                                value={formData.reference_code || ''}
                                onChange={e => setFormData({ ...formData, reference_code: e.target.value })}
                            />
                        </div>

                        {/* Dynamics based on Direction */}
                        {activeTab === 'inbound' ? (
                            // INBOUND: From External TO Internal
                            <>
                                <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">De (Remitente)</label>
                                    {formData.external_company_id ? (
                                        <div className="flex gap-2">
                                            <Input readOnly value={companySearchTerm} className="bg-gray-50" />
                                            <Button type="button" variant="secondary" onClick={() => {
                                                setFormData({ ...formData, external_company_id: null });
                                                setCompanySearchTerm('');
                                            }}>Cambiar</Button>
                                        </div>
                                    ) : (
                                        <div>
                                            <Input
                                                placeholder="Buscar empresa o escribir nombre..."
                                                value={companySearchTerm}
                                                onChange={handleCompanySearch}
                                            />
                                            {showCompanySuggestions && (
                                                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                                                    {companySuggestions.map(c => (
                                                        <div
                                                            key={c.id_establecimiento}
                                                            className="px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm flex justify-between"
                                                            onClick={() => selectCompany(c)}
                                                        >
                                                            <span>{c.nombre_establecimiento}</span>
                                                            {c.es_afiliado_ciec && <CheckIcon className="w-4 h-4 text-blue-500" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <Select
                                    label="Para (Destinatario Interno)"
                                    options={departments.map(d => ({ value: d.id, label: d.name }))}
                                    value={formData.internal_dept_id || ''}
                                    onChange={e => setFormData({ ...formData, internal_dept_id: e.target.value })}
                                />
                            </>
                        ) : (
                            // OUTBOUND: From Internal TO External
                            <>
                                <Select
                                    label="De (Remitente Interno)"
                                    options={departments.map(d => ({ value: d.id, label: d.name }))}
                                    value={formData.internal_dept_id || ''}
                                    onChange={e => setFormData({ ...formData, internal_dept_id: e.target.value })}
                                />
                                <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Para (Destinatario)</label>
                                    {formData.external_company_id ? (
                                        <div className="flex gap-2">
                                            <Input readOnly value={companySearchTerm} className="bg-gray-50" />
                                            <Button type="button" variant="secondary" onClick={() => {
                                                setFormData({ ...formData, external_company_id: null });
                                                setCompanySearchTerm('');
                                            }}>Cambiar</Button>
                                        </div>
                                    ) : (
                                        <div>
                                            <Input
                                                placeholder="Buscar empresa o escribir nombre..."
                                                value={companySearchTerm}
                                                onChange={handleCompanySearch}
                                            />
                                            {showCompanySuggestions && (
                                                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                                                    {companySuggestions.map(c => (
                                                        <div
                                                            key={c.id_establecimiento}
                                                            className="px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm flex justify-between"
                                                            onClick={() => selectCompany(c)}
                                                        >
                                                            <span>{c.nombre_establecimiento}</span>
                                                            {c.es_afiliado_ciec && <CheckIcon className="w-4 h-4 text-blue-500" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        <Input
                            label="Asunto"
                            value={formData.subject || ''}
                            onChange={e => setFormData({ ...formData, subject: e.target.value })}
                            required
                        />

                        <Select
                            label="Estado"
                            options={[
                                { value: 'pending', label: 'Pendiente' },
                                { value: 'processing', label: 'En Proceso' },
                                { value: 'completed', label: 'Completado' },
                                { value: 'archived', label: 'Archivado' }
                            ]}
                            value={formData.status || 'pending'}
                            onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                        />

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button type="submit" variant="primary">Guardar</Button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
};

export default CommunicationsView;
