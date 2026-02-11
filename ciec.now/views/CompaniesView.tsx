
// views/CompaniesView.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { Company, Participant } from '../types';
import Modal from '../components/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { useNotification } from '../contexts/NotificationContext';
// Importación individual y directa de cada icono
import EyeIcon from '../components/icons/EyeIcon';
import SearchIcon from '../components/icons/SearchIcon';
import CopyIcon from '../components/icons/CopyIcon';
import CheckIcon from '../components/icons/CheckIcon';
import GridIcon from '../components/icons/GridIcon';
import ListIcon from '../components/icons/ListIcon';
// Importación corregida de los componentes de Card
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';

import { useCompanies } from '../hooks/useCompanies';
import { useParticipants } from '../hooks/useParticipants';

interface CompaniesViewProps {
  onNavigateBack?: () => void;
}

const CompaniesView: React.FC<CompaniesViewProps> = ({
  onNavigateBack,
}) => {
  const { notify } = useNotification();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companyToView, setCompanyToView] = useState<Company | null>(null);

  // Hooks
  const { data: companies = [], isLoading: isLoadingCompanies } = useCompanies();
  const { data: participants = [] } = useParticipants();

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGremio, setSelectedGremio] = useState('');
  const [participationFilter, setParticipationFilter] = useState<'all' | 'with_participants' | 'without_participants'>('all');

  const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  const handleCopyToClipboard = (text: string | null, identifier: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedItem(identifier);
      setTimeout(() => setCopiedItem(null), 2000);
    }, (err) => {
      console.error('Error al copiar texto: ', err);
      notify.error('No se pudo copiar el texto.');
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCopiedItem(null);
  };

  const openViewModal = (company: Company) => {
    setCompanyToView(company);
    setIsModalOpen(true);
  };

  const getParticipantsCountForCompany = (establecimientoId: string): number => {
    return participants.filter(p => p.id_establecimiento === establecimientoId).length;
  };

  // Derive unique Gremios (Parent Institutions) from the companies list
  const availableGremios = useMemo(() => {
    const gremioMap = new Map<string, string>();

    companies.forEach(company => {
      if (company.rif_gremio) {
        // Try to find the name of the gremio in our companies list
        const parentCompany = companies.find(c => c.rif_compania === company.rif_gremio);
        const name = parentCompany ? parentCompany.nombre_establecimiento : `RIF: ${company.rif_gremio}`;
        gremioMap.set(company.rif_gremio, name);
      }
    });

    return Array.from(gremioMap.entries())
      .map(([id, name]) => ({ value: id, label: name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [companies]);

  const filteredCompanies = useMemo(() => companies
    .filter(c => {
      // 1. Search Filter
      const matchesSearch = (c.nombre_establecimiento || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.rif_compania || '').toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Gremio Filter
      const matchesGremio = selectedGremio === '' || c.rif_gremio === selectedGremio;

      // 3. Participation Filter
      const count = getParticipantsCountForCompany(c.id_establecimiento);
      let matchesParticipation = true;
      if (participationFilter === 'with_participants') {
        matchesParticipation = count > 0;
      } else if (participationFilter === 'without_participants') {
        matchesParticipation = count === 0;
      }

      return matchesSearch && matchesGremio && matchesParticipation;
    })
    .sort((a, b) => (a.nombre_establecimiento || '').localeCompare(b.nombre_establecimiento || '')),
    [companies, searchTerm, selectedGremio, participationFilter, participants]);

  const companiesGroupedByMunicipality = useMemo(() => {
    const grouped: Record<string, Company[]> = {};
    filteredCompanies.forEach(company => {
      const key = company.nombre_municipio || 'Sin Municipio';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(company);
    });
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      if (a === 'Sin Municipio') return 1;
      if (b === 'Sin Municipio') return -1;
      return a.localeCompare(b);
    });
    const result: Record<string, Company[]> = {};
    sortedKeys.forEach(key => result[key] = grouped[key]);
    return result;
  }, [filteredCompanies]);

  const municipalityOrder = useMemo(() => Object.keys(companiesGroupedByMunicipality), [companiesGroupedByMunicipality]);

  useEffect(() => {
    // Reset selection if current selection is empty due to filters
    if (selectedMunicipality && !companiesGroupedByMunicipality[selectedMunicipality]) {
      setSelectedMunicipality(municipalityOrder.length > 0 ? municipalityOrder[0] : null);
    }
    // Select first if nothing selected and list is available
    else if (municipalityOrder.length > 0 && !selectedMunicipality) {
      setSelectedMunicipality(municipalityOrder[0]);
    } else if (municipalityOrder.length === 0) {
      setSelectedMunicipality(null);
    }
  }, [municipalityOrder, selectedMunicipality, companiesGroupedByMunicipality]);

  const CopyableField = ({ label, value, identifier }: { label: string, value: string | null, identifier: string }) => {
    if (!value) return null;

    return (
      <div className="relative group border-b pb-2 pt-1 dark:border-gray-600">
        <p><strong>{label}:</strong> {value}</p>
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-0 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); handleCopyToClipboard(value, identifier); }}
          aria-label={`Copiar ${label}`}
        >
          {copiedItem === identifier ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
        </Button>
      </div>
    );
  };

  const renderViewCompanyContent = () => {
    if (!companyToView) return null;
    const c = companyToView;
    const associatedParticipants = participants.filter(p => p.id_establecimiento === c.id_establecimiento);

    return (
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <div className="flex items-center gap-2 mb-4">
          <h4 className="text-2xl font-bold text-primary-600 dark:text-primary-400">{c.nombre_establecimiento}</h4>
          {c.es_afiliado_ciec ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              <CheckIcon className="w-3 h-3 mr-1" /> Afiliado
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
              No Afiliado
            </span>
          )}
        </div>

        <CopyableField label="RIF" value={c.rif_compania} identifier="rif" />
        <CopyableField label="Correo Electrónico" value={c.email_principal} identifier="email" />
        <CopyableField label="Teléfono" value={c.telefono_principal_1} identifier="phone" />

        <div className="pt-2 border-t pb-2 dark:border-gray-600">
          {c.nombre_municipio && <p><strong>Municipio:</strong> {c.nombre_municipio}</p>}
          {c.rif_gremio && (
            <p className="mt-1">
              <strong>Gremio:</strong> {
                companies.find(comp => comp.rif_compania === c.rif_gremio)?.nombre_establecimiento || c.rif_gremio
              }
            </p>
          )}
        </div>

        <div className="pt-4 border-t dark:border-gray-600">
          <h5 className="font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
            Participantes Asociados
            <span className="ml-2 text-xs font-normal bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{associatedParticipants.length}</span>
          </h5>

          {associatedParticipants.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {associatedParticipants.map(p => (
                <div key={p.id} className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-md border border-gray-100 dark:border-slate-600 flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">{p.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{p.role}</div>
                  </div>
                  <div className="text-right text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                    {p.email && <div>{p.email}</div>}
                    {p.phone && <div>{p.phone}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">No se han registrado participantes para esta empresa.</p>
          )}
        </div>
      </div>
    );
  };

  const handleCopyAll = () => {
    if (!companyToView) return;
    const { nombre_establecimiento, rif_compania, email_principal, telefono_principal_1, nombre_municipio } = companyToView;
    const textToCopy = [
      `Nombre: ${nombre_establecimiento}`,
      `RIF: ${rif_compania}`,
      email_principal ? `Correo: ${email_principal}` : null,
      telefono_principal_1 ? `Teléfono: ${telefono_principal_1}` : null,
      nombre_municipio ? `Municipio: ${nombre_municipio}` : null,
    ].filter(Boolean).join('\n');

    handleCopyToClipboard(textToCopy, 'all');
  };

  if (isLoadingCompanies) {
    return <div className="p-6 text-center text-gray-500">Cargando empresas...</div>;
  }

  // Safe access using optional chaining or logical OR to prevent undefined length error
  const companiesForSelectedMunicipality = selectedMunicipality ? (companiesGroupedByMunicipality[selectedMunicipality] || []) : [];

  return (
    <div className="p-4 sm:p-6 space-y-6 flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Directorio de Empresas</h1>
        <div className="flex space-x-2">
          {onNavigateBack && (
            <Button onClick={onNavigateBack} variant="secondary">Volver al Menú</Button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 relative">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 hidden md:block">
          <div className="sticky top-6 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md flex flex-col max-h-[calc(100vh-100px)]">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Índice por Municipio</h3>
            <nav className="flex-grow overflow-y-auto custom-scrollbar">
              <ul className="space-y-1">
                {municipalityOrder.length > 0 ? (
                  municipalityOrder.map(municipality => (
                    <li key={municipality}>
                      <button
                        onClick={() => setSelectedMunicipality(municipality)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex justify-between items-center ${selectedMunicipality === municipality
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                      >
                        <span className="truncate">{municipality}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedMunicipality === municipality ? 'bg-white/20' : 'bg-gray-200 dark:bg-slate-600'}`}>
                          {companiesGroupedByMunicipality[municipality]?.length || 0}
                        </span>
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-2 text-sm text-gray-500">
                    No hay empresas para mostrar.
                  </li>
                )}
              </ul>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-grow w-full md:w-auto min-w-0">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Directorio General</CardTitle>
              <CardDescription>
                Consulta la información de contacto de las empresas (Afiliadas y No Afiliadas).
              </CardDescription>

              {/* Filters Area */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5 relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <SearchIcon className="h-5 w-5 text-gray-400" />
                  </span>
                  <Input
                    type="text"
                    placeholder="Buscar por nombre o RIF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
                <div className="md:col-span-3">
                  <Select
                    value={selectedGremio}
                    onChange={(e) => setSelectedGremio(e.target.value)}
                    options={[
                      { value: '', label: 'Todos los Gremios' },
                      ...availableGremios
                    ]}
                  />
                </div>
                <div className="md:col-span-3">
                  <Select
                    value={participationFilter}
                    onChange={(e) => setParticipationFilter(e.target.value as any)}
                    options={[
                      { value: 'all', label: 'Todos' },
                      { value: 'with_participants', label: 'Con Participantes' },
                      { value: 'without_participants', label: 'Sin Participantes' },
                    ]}
                  />
                </div>
                <div className="md:col-span-1 flex justify-end">
                  <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                      title="Vista Cuadrícula"
                    >
                      <GridIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white dark:bg-gray-700 shadow text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                      title="Vista Lista"
                    >
                      <ListIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="">
              <div className="md:hidden flex flex-wrap gap-2 mb-4 border-b pb-4 dark:border-slate-700">
                {municipalityOrder.length > 0 ? (
                  municipalityOrder.map(municipality => (
                    <button
                      key={municipality}
                      onClick={() => setSelectedMunicipality(municipality)}
                      className={`px-3 py-1 flex items-center justify-center rounded-full text-sm font-bold transition-colors ${selectedMunicipality === municipality
                        ? 'bg-primary-600 text-white shadow'
                        : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-primary-100 dark:hover:bg-primary-800'
                        }`}
                    >
                      {municipality}
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No hay empresas para mostrar.</p>
                )}
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {companiesForSelectedMunicipality.length > 0 ? (
                  companiesForSelectedMunicipality.map((company) => (
                    <div
                      key={company.id_establecimiento}
                      className="bg-slate-50 dark:bg-slate-700/50 shadow-sm rounded-md p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600"
                      onClick={() => openViewModal(company)}
                    >
                      <div className="flex justify-between items-start w-full gap-3">
                        <div className="flex-grow space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 break-words">{company.nombre_establecimiento}</h3>
                            {company.es_afiliado_ciec && <span title="Afiliado"><CheckIcon className="w-4 h-4 text-green-500" /></span>}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">RIF: {company.rif_compania}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-300">Participantes: {getParticipantsCountForCompany(company.id_establecimiento)}</p>
                        </div>
                        <div className="flex-shrink-0">
                          <Button
                            onClick={(e) => { e.stopPropagation(); openViewModal(company); }}
                            variant="ghost"
                            size="sm"
                            className="p-1.5"
                            aria-label={`Ver detalles de ${company.nombre_establecimiento}`}
                          >
                            <EyeIcon className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    {searchTerm || selectedGremio || participationFilter !== 'all' ? 'No hay empresas que coincidan con los filtros.' : 'Seleccione un municipio para ver las empresas.'}
                  </div>
                )}
              </div>

              {/* Desktop View: Grid or Table */}
              <div className="hidden md:block">
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {companiesForSelectedMunicipality.length > 0 ? (
                      companiesForSelectedMunicipality.map((company) => (
                        <div
                          key={company.id_establecimiento}
                          className="bg-slate-50 dark:bg-slate-700/50 shadow-sm rounded-md p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 border border-gray-100 dark:border-slate-600 transition-all hover:shadow-md flex flex-col h-full"
                          onClick={() => openViewModal(company)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-md font-bold text-gray-900 dark:text-gray-100 line-clamp-2" title={company.nombre_establecimiento}>{company.nombre_establecimiento}</h3>
                            {company.es_afiliado_ciec && <span title="Afiliado"><CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" /></span>}
                          </div>

                          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-3 flex-grow">
                            <p><span className="font-semibold">RIF:</span> {company.rif_compania}</p>
                            <p><span className="font-semibold">Email:</span> {company.email_principal || '-'}</p>
                            <p><span className="font-semibold">Tel:</span> {company.telefono_principal_1 || '-'}</p>
                            <p><span className="font-semibold">Participantes:</span> {getParticipantsCountForCompany(company.id_establecimiento)}</p>
                          </div>

                          <div className="pt-2 border-t dark:border-slate-600 flex justify-end">
                            <Button
                              onClick={(e) => { e.stopPropagation(); openViewModal(company); }}
                              variant="ghost"
                              size="sm"
                              className="text-primary-600 dark:text-primary-400 p-0 h-auto hover:bg-transparent hover:text-primary-800"
                            >
                              Ver Detalles <span className="ml-1">→</span>
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        {searchTerm || selectedGremio || participationFilter !== 'all' ? 'No hay empresas que coincidan con los filtros.' : 'Seleccione un municipio para ver las empresas.'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                      <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre del Establecimiento</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RIF</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Condición</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participantes</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                        {companiesForSelectedMunicipality.length > 0 ? (
                          companiesForSelectedMunicipality.map((company) => (
                            <tr
                              key={company.id_establecimiento}
                              className="hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer"
                              onClick={() => openViewModal(company)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                {company.nombre_establecimiento}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {company.rif_compania}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {company.es_afiliado_ciec ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                    Afiliado
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                    No Afiliado
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{getParticipantsCountForCompany(company.id_establecimiento)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <Button
                                  onClick={(e) => { e.stopPropagation(); openViewModal(company); }}
                                  variant="ghost"
                                  size="sm"
                                  className="py-1 px-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-700/30"
                                  aria-label={`Ver detalles de ${company.nombre_establecimiento}`}
                                >
                                  <EyeIcon className="w-4 h-4 mr-1" />
                                  Ver
                                </Button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="text-center py-10 text-gray-500 dark:text-gray-400">
                              {searchTerm || selectedGremio || participationFilter !== 'all' ? 'No hay empresas que coincidan con los filtros.' : 'Seleccione un municipio para ver las empresas.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={`Detalles de: ${companyToView?.nombre_establecimiento || ''}`}>
        {renderViewCompanyContent()}
        <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCopyAll}
            className="flex items-center text-sm"
            aria-label="Copiar toda la información de la empresa"
          >
            {copiedItem === 'all' ? <CheckIcon className="w-5 h-5 mr-2 text-green-500" /> : <CopyIcon className="w-5 h-5 mr-2" />}
            {copiedItem === 'all' ? 'Copiado' : 'Copiar Todo'}
          </Button>
          <Button type="button" variant="secondary" onClick={handleCloseModal}>Cerrar</Button>
        </div>
      </Modal>
    </div >
  );
};

export default CompaniesView;
