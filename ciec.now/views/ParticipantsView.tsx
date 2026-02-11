
// views/ParticipantsView.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Participant, MeetingCategory, Company, ParticipantMeetingCategory, UserProfile, Department, ParticipantDepartment } from '../types';
import Modal from '../components/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import PlusIcon from '../components/icons/PlusIcon';
import EditIcon from '../components/icons/EditIcon';
import TrashIcon from '../components/icons/TrashIcon';
import ExportIcon from '../components/icons/ExportIcon';
import CheckIcon from '../components/icons/CheckIcon';
import EyeIcon from '../components/icons/EyeIcon';
import PhoneIcon from '../components/icons/PhoneIcon';
import EmailIcon from '../components/icons/EmailIcon';
import DepartmentIcon from '../components/icons/DepartmentIcon';
import { Card, CardContent } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import Select from '../components/ui/Select';

// Hooks
import { useParticipants, useParticipantMutations } from '../hooks/useParticipants';
import { useMeetingCategories } from '../hooks/useMeetingCategories';
import { useParticipantMeetingCategories } from '../hooks/useParticipantMeetingCategories';
import { useDepartments } from '../hooks/useDepartments';
import { useParticipantDepartments } from '../hooks/useParticipantDepartments';
import { useCompanies } from '../hooks/useCompanies';
import { useUsers } from '../hooks/useUsers';

// Simple icons for the view toggle
const GridIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
);
const ListIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
);
const BuildingIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="9" y2="22.01"></line><line x1="15" y1="22" x2="15" y2="22.01"></line><line x1="12" y1="22" x2="12" y2="22.01"></line><line x1="12" y1="2" x2="12" y2="22"></line><line x1="4" y1="10" x2="20" y2="10"></line><line x1="4" y1="16" x2="20" y2="16"></line></svg>
);

interface ParticipantsViewProps {
  onNavigateBack?: () => void;
}

const initialParticipantFormState: Omit<Participant, 'id'> = {
  name: '',
  id_establecimiento: null,
  role: '',
  email: null,
  phone: null,
};

type ModalMode = 'add' | 'edit' | 'view';
type ViewType = 'grid' | 'list';

const normalizeString = (str: string): string => {
  if (!str) return '';
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
};

const ParticipantsView: React.FC<ParticipantsViewProps> = ({
  onNavigateBack,
}) => {
  const { can } = useAuth();
  const { notify } = useNotification();

  // Data Hooks
  const { data: participants = [] } = useParticipants();
  const { data: meetingCategories = [] } = useMeetingCategories();
  const { data: participantMeetingCategories = [] } = useParticipantMeetingCategories();
  const { data: departments = [] } = useDepartments();
  const { data: participantDepartments = [] } = useParticipantDepartments();
  const { data: companies = [] } = useCompanies();
  const { data: users = [] } = useUsers();

  // Mutations
  const { createParticipant, updateParticipant, deleteParticipant } = useParticipantMutations();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [viewType, setViewType] = useState<ViewType>('grid');

  const [participantToViewOrEdit, setParticipantToViewOrEdit] = useState<Participant | null>(null);
  const [participantToDelete, setParticipantToDelete] = useState<Participant | null>(null);
  const [formData, setFormData] = useState<Omit<Participant, 'id'>>(initialParticipantFormState);
  const [selectedCategoryIdsInModal, setSelectedCategoryIdsInModal] = useState<string[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [searchTermEst, setSearchTermEst] = useState('');
  const [establecimientoSugeridos, setEstablecimientoSugeridos] = useState<Company[]>([]);
  const [isLoadingSugerencias, setIsLoadingSugerencias] = useState(false);

  const CIEC_COMPANY_ID = 'internal-ciec';
  const CIEC_COMPANY_NAME = 'CIEC (Cámara de Industriales)';
  const CIEC_COMPANY_OBJECT: Company = {
    id_establecimiento: CIEC_COMPANY_ID,
    nombre_establecimiento: CIEC_COMPANY_NAME,
    rif_compania: 'J075109112',
    email_principal: null,
    telefono_principal_1: null,
    nombre_municipio: null
  };

  const companyMap = useMemo(() => {
    return new Map(companies.map(c => [c.id_establecimiento, c.nombre_establecimiento]));
  }, [companies]);

  const getParticipantAffiliationDetails = useCallback((participant: Participant): string => {
    if (participant.id_establecimiento === CIEC_COMPANY_ID) {
      return CIEC_COMPANY_NAME;
    }
    if (participant.id_establecimiento == null) {
      return "Sin Empresa Asignada";
    }
    const companyName = companyMap.get(participant.id_establecimiento);
    return companyName || `Establecimiento Desconocido`;
  }, [companyMap, CIEC_COMPANY_ID, CIEC_COMPANY_NAME]);

  useEffect(() => {
    if (participantToViewOrEdit && (modalMode === 'edit' || modalMode === 'view')) {
      setFormData({
        name: participantToViewOrEdit.name,
        id_establecimiento: participantToViewOrEdit.id_establecimiento,
        role: participantToViewOrEdit.role,
        email: participantToViewOrEdit.email || null,
        phone: participantToViewOrEdit.phone || null,
      });

      if (participantToViewOrEdit.id_establecimiento === CIEC_COMPANY_ID) {
        setSearchTermEst(CIEC_COMPANY_NAME);
      } else {
        setSearchTermEst(participantToViewOrEdit.id_establecimiento ? companyMap.get(participantToViewOrEdit.id_establecimiento) || '' : '');
      }

      if (modalMode === 'edit') {
        const currentCategories = participantMeetingCategories
          .filter(pc => pc.participant_id === participantToViewOrEdit.id)
          .map(pc => pc.meeting_category_id);
        setSelectedCategoryIdsInModal(currentCategories);
      } else {
        setSelectedCategoryIdsInModal([]);
      }
    } else {
      setFormData(initialParticipantFormState);
      setSelectedCategoryIdsInModal([]);
      setSearchTermEst('');
    }
  }, [participantToViewOrEdit, modalMode, participantMeetingCategories, companyMap, CIEC_COMPANY_ID, CIEC_COMPANY_NAME]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryCheckboxChange = (categoryId: string, isChecked: boolean) => {
    setSelectedCategoryIdsInModal(prev => isChecked ? [...new Set([...prev, categoryId])] : prev.filter(id => id !== categoryId));
  };

  const handleSearchEstablecimiento = (term: string) => {
    setSearchTermEst(term);
    setEstablecimientoSugeridos([]);
    setIsLoadingSugerencias(true);

    if (term.trim().length > 0) {
      const filtered = companies.filter(c =>
        normalizeString(c.nombre_establecimiento).includes(normalizeString(term))
      ).slice(0, 10);
      setEstablecimientoSugeridos(filtered);
    }
    setIsLoadingSugerencias(false);
  };

  const handleSelectEstablecimiento = (est: Company) => {
    setFormData(prev => ({ ...prev, id_establecimiento: est.id_establecimiento }));
    setSearchTermEst(est.nombre_establecimiento);
    setEstablecimientoSugeridos([]);
  };

  const handleClearEstablecimiento = () => {
    setFormData(prev => ({ ...prev, id_establecimiento: null }));
    setSearchTermEst('');
    setEstablecimientoSugeridos([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.role) {
      notify.error("Por favor, complete todos los campos obligatorios: Nombre y Rol.");
      return;
    }
    const participantDataToSave: Omit<Participant, 'id'> = {
      name: formData.name.trim(),
      id_establecimiento: formData.id_establecimiento,
      role: formData.role.trim(),
      email: formData.email?.trim() || null,
      phone: formData.phone?.trim() || null,
    };
    if (modalMode === 'edit' && participantToViewOrEdit) {
      updateParticipant.mutate({
        id: participantToViewOrEdit.id,
        participant: participantDataToSave,
        categoryIds: selectedCategoryIdsInModal,
        departmentIds: [] // TODO: Add department selection if needed later
      }, {
        onSuccess: () => { notify.success('Participante actualizado.'); setIsModalOpen(false); },
        onError: (err) => notify.error(`Error actualizando participante: ${err.message}`)
      });
    } else if (modalMode === 'add') {
      createParticipant.mutate({
        participant: participantDataToSave,
        categoryIds: selectedCategoryIdsInModal,
        departmentIds: []
      }, {
        onSuccess: () => { notify.success('Participante creado.'); setIsModalOpen(false); },
        onError: (err) => notify.error(`Error creando participante: ${err.message}`)
      });
    }
  };

  const handleDelete = () => {
    if (!participantToDelete) return;
    deleteParticipant.mutate(participantToDelete.id, {
      onSuccess: () => { notify.success('Participante eliminado.'); setParticipantToDelete(null); },
      onError: (err) => notify.error(`Error eliminando participante: ${err.message}`)
    });
  };

  const openAddModal = () => { setParticipantToViewOrEdit(null); setModalMode('add'); setIsModalOpen(true); };
  const openViewModal = (participant: Participant) => { setParticipantToViewOrEdit(participant); setModalMode('view'); setIsModalOpen(true); };
  const openEditModal = (participant: Participant) => { setParticipantToViewOrEdit(participant); setModalMode('edit'); setIsModalOpen(true); };
  const switchToEditModeFromView = () => { if (participantToViewOrEdit) setModalMode('edit'); };

  const getCommissionsArrayForParticipant = useCallback((participantId: string) => {
    return participantMeetingCategories
      .filter(pc => pc.participant_id === participantId)
      .map(pc => meetingCategories.find(mc => mc.id === pc.meeting_category_id)?.name)
      .filter((name): name is string => !!name);
  }, [participantMeetingCategories, meetingCategories]);

  const filteredParticipants = useMemo(() => {
    const normalizedSearch = normalizeString(searchTerm);
    const participantIdsInSelectedCategory = selectedCategoryId
      ? new Set(participantMeetingCategories
        .filter(pc => pc.meeting_category_id === selectedCategoryId)
        .map(pc => pc.participant_id))
      : null;

    return participants
      .filter(p => {
        const matchesSearch = normalizedSearch === '' ||
          normalizeString(p.name || '').includes(normalizedSearch) ||
          normalizeString(p.email || '').includes(normalizedSearch) ||
          normalizeString(getParticipantAffiliationDetails(p)).includes(normalizedSearch);
        const matchesCategory = !participantIdsInSelectedCategory || participantIdsInSelectedCategory.has(p.id);
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [participants, searchTerm, selectedCategoryId, participantMeetingCategories, getParticipantAffiliationDetails]);

  const handleExportParticipants = () => {
    const headers = ['Nombre', 'Empresa', 'Cargo', 'Email', 'Telefono', 'Comisiones'];
    const rows = filteredParticipants.map(p => {
      const commissions = getCommissionsArrayForParticipant(p.id).join(' - ');
      return [
        p.name,
        getParticipantAffiliationDetails(p),
        p.role,
        p.email || '',
        p.phone || '',
        commissions
      ].map(val => `"${val}"`).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'participantes.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Grid View Component ---
  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredParticipants.map(participant => {
        const commissions = getCommissionsArrayForParticipant(participant.id);
        const isCiec = participant.id_establecimiento === CIEC_COMPANY_ID;
        const affiliation = getParticipantAffiliationDetails(participant);

        return (
          <div
            key={participant.id}
            className={`bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden border-t-4 ${isCiec ? 'border-t-primary-600' : 'border-t-gray-200 dark:border-t-gray-600'} cursor-pointer group`}
            onClick={() => openViewModal(participant)}
          >
            <div className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 group-hover:text-primary-600 transition-colors line-clamp-1">{participant.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium line-clamp-1">{participant.role}</p>
                </div>
                {isCiec ? (
                  <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold px-2 py-1 rounded">CIEC</span>
                ) : (
                  <BuildingIcon className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                )}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <BuildingIcon className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                  <span className="truncate" title={affiliation}>{affiliation}</span>
                </div>
                {participant.email && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <EmailIcon className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{participant.email}</span>
                  </div>
                )}
                {participant.phone && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <PhoneIcon className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{participant.phone}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex flex-wrap gap-1">
                  {commissions.length > 0 ? (
                    <>
                      {commissions.slice(0, 2).map((c, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200">
                          {c}
                        </span>
                      ))}
                      {commissions.length > 2 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          +{commissions.length - 2}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Sin comisiones</span>
                  )}
                </div>
              </div>
            </div>
            {/* Quick Actions - Always visible */}
            <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-2 flex justify-end space-x-2 border-t dark:border-slate-700">
              {can('update', 'Participant') && (
                <Button
                  size="sm"
                  variant="accent"
                  onClick={(e) => { e.stopPropagation(); openEditModal(participant); }}
                  title="Editar"
                >
                  <EditIcon className="w-4 h-4" />
                </Button>
              )}
              {can('delete', 'Participant') && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={(e) => { e.stopPropagation(); setParticipantToDelete(participant); }}
                  title="Eliminar"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // --- Table View Component ---
  const renderTableView = () => (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre / Contacto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa & Cargo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comisiones</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
              {filteredParticipants.map(participant => (
                <tr key={participant.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer group" onClick={() => openViewModal(participant)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{participant.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-0.5">
                      {participant.email && <span>{participant.email}</span>}
                      {participant.phone && <span>{participant.phone}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">{getParticipantAffiliationDetails(participant)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{participant.role}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {getCommissionsArrayForParticipant(participant.id).map((c, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200 border border-blue-100 dark:border-blue-800">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {can('update', 'Participant') && (
                        <Button variant="accent" size="sm" onClick={(e) => { e.stopPropagation(); openEditModal(participant); }}>
                          <EditIcon className="w-4 h-4" />
                        </Button>
                      )}
                      {can('delete', 'Participant') && (
                        <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); setParticipantToDelete(participant); }}>
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  // --- Profile Detail View (for Modal) ---
  const renderProfileDetail = () => {
    if (!participantToViewOrEdit) return null;
    const p = participantToViewOrEdit;
    const isCiec = p.id_establecimiento === CIEC_COMPANY_ID;
    const commissions = getCommissionsArrayForParticipant(p.id);

    return (
      <div className="space-y-6">
        {/* Header Info */}
        <div className="flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-slate-700">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white ${isCiec ? 'bg-primary-600' : 'bg-gray-400'}`}>
            {p.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{p.name}</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">{p.role}</p>
            <div className="flex items-center mt-1 text-sm text-gray-500 dark:text-gray-400">
              <BuildingIcon className="w-4 h-4 mr-1.5" />
              {getParticipantAffiliationDetails(p)}
            </div>
          </div>
        </div>

        {/* Contact Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg border dark:border-slate-600">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Correo Electrónico</label>
            <div className="flex items-center text-gray-800 dark:text-gray-200">
              <EmailIcon className="w-4 h-4 mr-2 text-primary-500" />
              {p.email ? <a href={`mailto:${p.email}`} className="hover:underline">{p.email}</a> : <span className="italic text-gray-400">No registrado</span>}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg border dark:border-slate-600">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Teléfono</label>
            <div className="flex items-center text-gray-800 dark:text-gray-200">
              <PhoneIcon className="w-4 h-4 mr-2 text-green-500" />
              {p.phone ? <a href={`tel:${p.phone}`} className="hover:underline">{p.phone}</a> : <span className="italic text-gray-400">No registrado</span>}
            </div>
          </div>
        </div>

        {/* Commissions Section */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Comisiones Asignadas</h3>
          {commissions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {commissions.map((c, idx) => (
                <div key={idx} className="flex items-center px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-200 rounded-full border border-blue-100 dark:border-blue-800 text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                  {c}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic text-sm">Este participante no está asignado a ninguna comisión.</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Directorio de Participantes</h1>
          <div className="flex space-x-2 w-full sm:w-auto">
            {can('create', 'Participant') && (
              <Button onClick={openAddModal} variant="primary" className="flex-1 sm:flex-none justify-center"><PlusIcon className="w-5 h-5 mr-2" /> Nuevo</Button>
            )}
            {can('read', 'Participant') && (
              <Button onClick={handleExportParticipants} variant="secondary" className="flex-1 sm:flex-none justify-center"><ExportIcon className="w-5 h-5 mr-2" /> Exportar</Button>
            )}
            {onNavigateBack && <Button onClick={onNavigateBack} variant="secondary">Volver</Button>}
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-grow w-full">
            <Input
              placeholder="Buscar por nombre, correo o empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="w-full md:w-64">
            <Select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              options={[
                { value: '', label: 'Todas las Comisiones' },
                ...meetingCategories.map(c => ({ value: c.id, label: c.name }))
              ]}
            />
          </div>
          {/* View Toggles */}
          <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-md flex-shrink-0">
            <button
              onClick={() => setViewType('grid')}
              className={`p-2 rounded ${viewType === 'grid' ? 'bg-white dark:bg-slate-600 shadow text-primary-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
              title="Vista de Cuadrícula"
            >
              <GridIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewType('list')}
              className={`p-2 rounded ${viewType === 'list' ? 'bg-white dark:bg-slate-600 shadow text-primary-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
              title="Vista de Lista"
            >
              <ListIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {filteredParticipants.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-slate-700">
          <p className="text-gray-500 dark:text-gray-400">No se encontraron participantes con los filtros actuales.</p>
        </div>
      ) : (
        viewType === 'grid' ? renderGridView() : renderTableView()
      )}

      {/* Modal - Add/Edit Form or Profile View */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'add' ? 'Añadir Participante' : (modalMode === 'edit' ? 'Editar Participante' : 'Perfil del Participante')}
        size={modalMode === 'view' ? 'lg' : 'md'}
      >
        {modalMode === 'view' ? (
          <>
            {renderProfileDetail()}
            <div className="flex justify-end space-x-3 pt-6 mt-2 border-t border-gray-100 dark:border-slate-700">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cerrar</Button>
              {can('update', 'Participant') && (
                <Button type="button" variant="accent" onClick={switchToEditModeFromView}>
                  <EditIcon className="w-4 h-4 mr-2" /> Editar Perfil
                </Button>
              )}
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <Input
              label="Nombre Completo"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Cargo / Rol"
              name="role"
              value={formData.role || ''}
              onChange={handleInputChange}
              required
            />

            {/* Establishment Search/Select */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Empresa / Afiliación</label>
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <Input
                    placeholder="Buscar empresa..."
                    value={searchTermEst}
                    onChange={(e) => handleSearchEstablecimiento(e.target.value)}
                  />
                  {establecimientoSugeridos.length > 0 && (
                    <div className="absolute z-10 w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                      {establecimientoSugeridos.map(est => (
                        <div
                          key={est.id_establecimiento}
                          className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer text-sm flex items-center justify-between"
                          onClick={() => handleSelectEstablecimiento(est)}
                        >
                          <span>{est.nombre_establecimiento}</span>
                          {est.es_afiliado_ciec && (
                            <span title="Afiliado">
                              <CheckIcon className="w-4 h-4 text-green-500 ml-2" />
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {formData.id_establecimiento ? (
                  <Button type="button" variant="secondary" onClick={handleClearEstablecimiento}>Limpiar</Button>
                ) : (
                  <Button type="button" variant="secondary" onClick={() => handleSelectEstablecimiento(CIEC_COMPANY_OBJECT)}>Es CIEC</Button>
                )}
              </div>
              {isLoadingSugerencias && <p className="text-xs text-gray-500 mt-1">Buscando...</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Correo Electrónico"
                name="email"
                type="email"
                value={formData.email || ''}
                onChange={handleInputChange}
              />
              <Input
                label="Teléfono"
                name="phone"
                value={formData.phone || ''}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Comisiones Asignadas</label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-slate-600 rounded-md p-2 bg-gray-50 dark:bg-slate-800">
                {meetingCategories.map(cat => (
                  <div key={cat.id} className="flex items-center mb-1">
                    <input
                      type="checkbox"
                      id={`cat-${cat.id}`}
                      checked={selectedCategoryIdsInModal.includes(cat.id)}
                      onChange={(e) => handleCategoryCheckboxChange(cat.id, e.target.checked)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor={`cat-${cat.id}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                      {cat.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t dark:border-slate-700 mt-4">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="primary">Guardar</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={!!participantToDelete} onClose={() => setParticipantToDelete(null)} title="Confirmar Eliminación">
        {participantToDelete && (
          <div className="text-sm">
            <p className="mb-4">¿Está seguro de que desea eliminar al participante <strong>"{participantToDelete.name}"</strong>?</p>
            <p className="text-red-600 dark:text-red-400 mb-4">Esta acción eliminará también su historial de asistencia y asignaciones.</p>
            <div className="flex justify-end space-x-2">
              <Button variant="secondary" onClick={() => setParticipantToDelete(null)}>Cancelar</Button>
              <Button variant="danger" onClick={handleDelete}>Sí, Eliminar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ParticipantsView;
