
// views/AssistanceLogView.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AssistanceLog, Company } from '../types';
import Modal from '../components/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import PlusIcon from '../components/icons/PlusIcon';
import EditIcon from '../components/icons/EditIcon';
import TrashIcon from '../components/icons/TrashIcon';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import CheckIcon from '../components/icons/CheckIcon';
import UserIcon from '../components/icons/UserIcon';
import PhoneIcon from '../components/icons/PhoneIcon';
import EmailIcon from '../components/icons/EmailIcon';

// Hooks
import { useAssistanceLogs, useAssistanceLogMutations } from '../hooks/useAssistanceLogs';
import { useCompanies } from '../hooks/useCompanies';
import { useUsers } from '../hooks/useUsers';

interface AssistanceLogViewProps {
  onNavigateBack?: () => void;
}

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const initialLogFormState: Omit<AssistanceLog, 'id'> = {
  subject: '',
  date: getTodayDateString(),
  startTime: '',
  endTime: '',
  client_name: '',
  company_id: null,
  institution_text: '',
  phone: '',
  email: '',
  channel: 'Presencial',
  outcome: '',
  responsible_id: '',
};

type ModalMode = 'add' | 'edit' | 'view';

const normalizeString = (str: string): string => {
  if (!str) return '';
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
};

const formatTo12Hour = (timeString: string | null): string => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const h = parseInt(hours, 10);
  if (isNaN(h) || !minutes) return timeString;
  const ampm = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${minutes} ${ampm}`;
};

const EMPTY_ARRAY: any[] = [];

const AssistanceLogView: React.FC<AssistanceLogViewProps> = ({
  onNavigateBack,
}) => {
  const { user } = useAuth(); // profile is accessed if needed for logic, but mainly user.id for default responsible
  const { notify } = useNotification();

  // Hooks
  const { data: assistanceLogsData } = useAssistanceLogs();
  const { data: companiesData } = useCompanies();
  const { data: usersData } = useUsers();
  const { createAssistanceLog, updateAssistanceLog, deleteAssistanceLog } = useAssistanceLogMutations();

  const assistanceLogs = assistanceLogsData || EMPTY_ARRAY;
  const companies = companiesData || EMPTY_ARRAY;
  const users = usersData || EMPTY_ARRAY;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [logToViewOrEdit, setLogToViewOrEdit] = useState<AssistanceLog | null>(null);
  const [logToDelete, setLogToDelete] = useState<AssistanceLog | null>(null);
  const [formData, setFormData] = useState<Omit<AssistanceLog, 'id'>>(initialLogFormState);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermEst, setSearchTermEst] = useState('');
  const [establecimientoSugeridos, setEstablecimientoSugeridos] = useState<Company[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoadingSugerencias, setIsLoadingSugerencias] = useState(false);

  const companyMap = useMemo(() => {
    return new Map(companies.map((c: Company) => [c.id_establecimiento, c]));
  }, [companies]);

  const getUserName = useCallback((userId: string | null | undefined) => {
    if (!userId) return 'Sistema';
    return users.find((u: any) => u.id === userId)?.full_name || 'Usuario Desconocido';
  }, [users]);

  useEffect(() => {
    if (logToViewOrEdit && (modalMode === 'edit' || modalMode === 'view')) {
      setFormData({
        subject: logToViewOrEdit.subject,
        date: logToViewOrEdit.date,
        startTime: logToViewOrEdit.startTime,
        endTime: logToViewOrEdit.endTime,
        client_name: logToViewOrEdit.client_name,
        company_id: logToViewOrEdit.company_id,
        institution_text: logToViewOrEdit.institution_text,
        phone: logToViewOrEdit.phone || '',
        email: logToViewOrEdit.email || '',
        channel: logToViewOrEdit.channel,
        outcome: logToViewOrEdit.outcome || '',
        responsible_id: logToViewOrEdit.responsible_id,
      });

      if (logToViewOrEdit.company_id) {
        setSearchTermEst(companyMap.get(logToViewOrEdit.company_id)?.nombre_establecimiento || '');
      } else {
        setSearchTermEst('');
      }
    } else {
      setFormData({
        ...initialLogFormState,
        responsible_id: user?.id || ''
      });
      setSearchTermEst('');
    }
  }, [logToViewOrEdit, modalMode, companyMap, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSearchEstablecimiento = (term: string) => {
    setSearchTermEst(term);
    setEstablecimientoSugeridos([]);
    setIsLoadingSugerencias(true);

    if (term.trim().length > 0) {
      const filtered = companies.filter((c: Company) =>
        normalizeString(c.nombre_establecimiento).includes(normalizeString(term))
      ).slice(0, 10);
      setEstablecimientoSugeridos(filtered);
    }
    setIsLoadingSugerencias(false);
  };

  const handleSelectEstablecimiento = (est: Company) => {
    setFormData(prev => ({
      ...prev,
      company_id: est.id_establecimiento,
      institution_text: '' // Clear custom text if company selected
    }));
    setSearchTermEst(est.nombre_establecimiento);
    setEstablecimientoSugeridos([]);
  };

  const handleClearEstablecimiento = () => {
    setFormData(prev => ({ ...prev, company_id: null }));
    setSearchTermEst('');
    setEstablecimientoSugeridos([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.client_name.trim()) {
      notify.error("Por favor, complete los campos obligatorios: Asunto y Nombre del Cliente.");
      return;
    }

    // If no company selected and no custom text, warn
    if (!formData.company_id && !formData.institution_text && !searchTermEst) {
      notify.warning("Se recomienda asociar una empresa o escribir el nombre de la institución.");
    }

    // If user typed in search box but didn't select, use that as custom text if no ID
    let finalInstitutionText = formData.institution_text;
    if (!formData.company_id && searchTermEst && !formData.institution_text) {
      finalInstitutionText = searchTermEst;
    }

    const logDataToSave: Omit<AssistanceLog, 'id'> = {
      ...formData,
      institution_text: finalInstitutionText,
      responsible_id: formData.responsible_id || user?.id || ''
    };

    if (modalMode === 'edit' && logToViewOrEdit) {
      updateAssistanceLog.mutate({ ...logToViewOrEdit, ...logDataToSave }, {
        onSuccess: () => { notify.success('Registro actualizado'); setIsModalOpen(false); },
        onError: (err) => notify.error(`Error: ${err.message}`)
      });
    } else if (modalMode === 'add') {
      createAssistanceLog.mutate(logDataToSave, {
        onSuccess: () => { notify.success('Atención registrada'); setIsModalOpen(false); },
        onError: (err) => notify.error(`Error: ${err.message}`)
      });
    }
  };

  const handleDelete = () => {
    if (!logToDelete) return;
    deleteAssistanceLog.mutate(logToDelete.id, {
      onSuccess: () => { notify.success('Registro eliminado'); setLogToDelete(null); setIsModalOpen(false); },
      onError: (err) => notify.error(`Error: ${err.message}`)
    });
  };

  const openAddModal = () => { setLogToViewOrEdit(null); setModalMode('add'); setIsModalOpen(true); };
  const openViewModal = (log: AssistanceLog) => { setLogToViewOrEdit(log); setModalMode('view'); setIsModalOpen(true); };
  const switchToEditModeFromView = () => { if (logToViewOrEdit) setModalMode('edit'); };

  const getCompanyDisplay = (log: AssistanceLog) => {
    if (log.company_id) {
      const company = companyMap.get(log.company_id);
      return company ? company.nombre_establecimiento : 'Empresa Desconocida';
    }
    return log.institution_text || 'Sin Institución';
  };

  const getAffiliationBadge = (companyId: string | null | undefined) => {
    if (!companyId) return null;
    const company = companyMap.get(companyId);
    if (!company) return null;

    if (company.es_afiliado_ciec) {
      return <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
        <span title="Afiliado"><CheckIcon className="w-3 h-3 mr-1" /></span> Afiliado
      </span>;
    } else {
      return <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
        No Afiliado
      </span>;
    }
  };

  const filteredLogs = useMemo(() => {
    const normalizedSearch = normalizeString(searchTerm);
    return assistanceLogs
      .filter((l: AssistanceLog) => {
        const matchesSearch = normalizedSearch === '' ||
          normalizeString(l.subject).includes(normalizedSearch) ||
          normalizeString(l.client_name).includes(normalizedSearch) ||
          normalizeString(getCompanyDisplay(l)).includes(normalizedSearch);
        return matchesSearch;
      })
      .sort((a: AssistanceLog, b: AssistanceLog) => new Date(b.date).getTime() - new Date(a.date).getTime() || (b.startTime || '').localeCompare(a.startTime || ''));
  }, [assistanceLogs, searchTerm, companyMap]);

  const renderViewLogContent = () => {
    if (!logToViewOrEdit) return null;
    const log = logToViewOrEdit;
    const companyName = getCompanyDisplay(log);
    const affiliationBadge = getAffiliationBadge(log.company_id);

    return (
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <div className="border-b pb-4 dark:border-slate-700">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{log.client_name}</h3>
          <div className="flex items-center mt-1 flex-wrap gap-2">
            <span className="text-lg text-primary-600 dark:text-primary-400 font-medium">{companyName}</span>
            {affiliationBadge}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Asunto de la Atención</label>
            <p className="text-gray-800 dark:text-gray-200 font-medium text-lg">{log.subject}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha y Hora</label>
            <p className="text-gray-800 dark:text-gray-200">
              {new Date(log.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
              {log.startTime && <span className="block text-sm text-gray-600 dark:text-gray-400">{formatTo12Hour(log.startTime)} {log.endTime ? `- ${formatTo12Hour(log.endTime)}` : ''}</span>}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Canal de Comunicación</label>
            <p className="text-gray-800 dark:text-gray-200">{log.channel}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Teléfono</label>
            <div className="flex items-center text-gray-800 dark:text-gray-200">
              {log.phone ? <><PhoneIcon className="w-4 h-4 mr-2 text-gray-400" /> {log.phone}</> : <span className="text-gray-400 italic">No registrado</span>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Correo Electrónico</label>
            <div className="flex items-center text-gray-800 dark:text-gray-200">
              {log.email ? <><EmailIcon className="w-4 h-4 mr-2 text-gray-400" /> {log.email}</> : <span className="text-gray-400 italic">No registrado</span>}
            </div>
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Responsable de la Atención</label>
            <div className="flex items-center text-gray-800 dark:text-gray-200">
              <UserIcon className="w-4 h-4 mr-2 text-gray-400" /> {getUserName(log.responsible_id)}
            </div>
          </div>
        </div>

        {log.outcome && (
          <div className="mt-4 pt-4 border-t dark:border-slate-700">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Resultado / Observaciones</label>
            <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-md text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap border dark:border-slate-600">
              {log.outcome}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFormContent = () => (
    <form id="log-form" onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <Input
        label="Asunto / Motivo"
        name="subject"
        value={formData.subject}
        onChange={handleInputChange}
        required
        autoFocus
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Fecha"
          name="date"
          type="date"
          value={formData.date}
          onChange={handleInputChange}
          required
          className="dark:[color-scheme:dark]"
        />
        <div className="flex gap-2">
          <Input
            label="Inicio"
            name="startTime"
            type="time"
            value={formData.startTime || ''}
            onChange={handleInputChange}
            className="dark:[color-scheme:dark]"
            containerClassName="flex-1"
          />
          <Input
            label="Fin"
            name="endTime"
            type="time"
            value={formData.endTime || ''}
            onChange={handleInputChange}
            className="dark:[color-scheme:dark]"
            containerClassName="flex-1"
          />
        </div>
      </div>

      <Input
        label="Nombre del Cliente / Contacto"
        name="client_name"
        value={formData.client_name}
        onChange={handleInputChange}
        required
      />

      {/* Empresa / Institución Search */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Empresa / Institución</label>
        <div className="flex gap-2">
          <div className="relative flex-grow">
            <Input
              placeholder="Buscar empresa o escribir nombre..."
              value={searchTermEst || formData.institution_text || ''}
              onChange={(e) => {
                setSearchTermEst(e.target.value);
                setFormData(prev => ({ ...prev, institution_text: e.target.value, company_id: null }));
                if (e.target.value.length > 2) handleSearchEstablecimiento(e.target.value);
                else setEstablecimientoSugeridos([]);
              }}
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
                      <span title="Afiliado"><CheckIcon className="w-4 h-4 text-green-500 ml-2" /></span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          {formData.company_id && (
            <Button type="button" variant="secondary" onClick={handleClearEstablecimiento} title="Desvincular empresa">Limpiar</Button>
          )}
        </div>
        {formData.company_id && <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center"><CheckIcon className="w-3 h-3 mr-1" /> Empresa vinculada del directorio</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Teléfono"
          name="phone"
          value={formData.phone || ''}
          onChange={handleInputChange}
        />
        <Input
          label="Correo Electrónico"
          name="email"
          type="email"
          value={formData.email || ''}
          onChange={handleInputChange}
        />
      </div>

      <Select
        label="Canal de Atención"
        name="channel"
        value={formData.channel}
        onChange={handleInputChange}
        options={[
          { value: 'Presencial', label: 'Presencial' },
          { value: 'Llamada', label: 'Llamada Telefónica' },
          { value: 'Whatsapp', label: 'WhatsApp' },
          { value: 'Correo', label: 'Correo Electrónico' },
          { value: 'Redes Sociales', label: 'Redes Sociales' },
          { value: 'Otro', label: 'Otro' },
        ]}
      />

      <Textarea
        label="Resultado / Observaciones"
        name="outcome"
        value={formData.outcome || ''}
        onChange={handleInputChange}
        rows={4}
      />
    </form>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Bitácora de Atención</h1>
        <div className="flex space-x-2">
          <Button onClick={openAddModal} variant="primary"><PlusIcon className="w-5 h-5 mr-2" /> Registrar Atención</Button>
          {onNavigateBack && <Button onClick={onNavigateBack} variant="secondary">Volver al Menú</Button>}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Atenciones</CardTitle>
          <CardDescription>Registro de interacciones con clientes y afiliados.</CardDescription>
          <div className="mt-4">
            <Input
              placeholder="Buscar por cliente, asunto o empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente / Empresa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asunto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Canal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log: AssistanceLog) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => openViewModal(log)}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {new Date(log.date).toLocaleDateString()}
                        {log.startTime && <span className="block text-xs text-gray-400">{formatTo12Hour(log.startTime)}</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{log.client_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{getCompanyDisplay(log)}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                        {log.subject}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                          {log.channel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Button variant="accent" size="sm" onClick={(e) => { e.stopPropagation(); setLogToViewOrEdit(log); setModalMode('edit'); setIsModalOpen(true); }}>
                            <EditIcon className="w-4 h-4" />
                          </Button>
                          <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); setLogToDelete(log); }}>
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      No se encontraron registros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalMode === 'add' ? 'Registrar Atención' : (modalMode === 'edit' ? 'Editar Registro' : 'Detalles de Atención')}>
        {modalMode === 'view' ? renderViewLogContent() : renderFormContent()}

        <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-200 dark:border-slate-700">
          {modalMode === 'view' ? (
            <>
              <Button type="button" variant="danger" onClick={() => { if (logToViewOrEdit) { setIsModalOpen(false); setLogToDelete(logToViewOrEdit); } }} className="mr-auto">
                <TrashIcon className="w-4 h-4 mr-1" />Eliminar
              </Button>
              <div className="space-x-2">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cerrar</Button>
                <Button type="button" variant="accent" onClick={switchToEditModeFromView}>
                  <EditIcon className="w-4 h-4 mr-1" />Editar
                </Button>
              </div>
            </>
          ) : (
            <div className="flex justify-end space-x-3 w-full">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" form="log-form" variant="primary">Guardar</Button>
            </div>
          )}
        </div>
      </Modal>

      <Modal isOpen={!!logToDelete} onClose={() => setLogToDelete(null)} title="Confirmar Eliminación">
        {logToDelete && (
          <div className="text-sm">
            <p className="mb-4">¿Está seguro de que desea eliminar el registro de atención de <strong>"{logToDelete.client_name}"</strong>?</p>
            <p className="text-red-600 dark:text-red-400 mb-4">Esta acción no se puede deshacer.</p>
            <div className="flex justify-end space-x-2">
              <Button variant="secondary" onClick={() => setLogToDelete(null)}>Cancelar</Button>
              <Button variant="danger" onClick={handleDelete}>Sí, Eliminar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AssistanceLogView;
