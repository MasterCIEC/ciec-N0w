
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Modal from './Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import ChevronDownIcon from './icons/ChevronDownIcon';

export interface SelectorParticipant {
  id: string;
  name: string;
  group?: string; // New property for grouping
  isDisabled?: boolean;
}

interface ParticipantSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
  title: string;
  availableParticipants: SelectorParticipant[];
  initialSelectedIds: string[];
  extraAction?: {
    label: string;
    onClick: () => void;
  };
}

const normalizeString = (str: string): string => {
  if (!str) return '';
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const ParticipantSelectorModal: React.FC<ParticipantSelectorModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  availableParticipants,
  initialSelectedIds,
  extraAction
}) => {
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(initialSelectedIds);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTempSelectedIds(initialSelectedIds);
      setSearchTerm('');
      setExpandedGroups(new Set()); // Start collapsed or expanded based on preference.
    }
  }, [isOpen, initialSelectedIds]);

  const groupedParticipants = useMemo(() => {
    const normalizedSearch = normalizeString(searchTerm);
    const groups: Record<string, SelectorParticipant[]> = {};

    availableParticipants.forEach(p => {
        if (normalizedSearch && !normalizeString(p.name).includes(normalizedSearch)) {
            return;
        }
        const groupName = p.group || 'Sin Comisión';
        if (!groups[groupName]) {
            groups[groupName] = [];
        }
        groups[groupName].push(p);
    });

    // Sort items within groups
    Object.keys(groups).forEach(key => {
        groups[key].sort((a, b) => a.name.localeCompare(b.name));
    });

    return groups;
  }, [availableParticipants, searchTerm]);

  const sortedGroupKeys = useMemo(() => {
      return Object.keys(groupedParticipants).sort((a, b) => {
          if (a === 'Sin Comisión') return 1;
          if (b === 'Sin Comisión') return -1;
          return a.localeCompare(b);
      });
  }, [groupedParticipants]);

  // Auto-expand groups when searching
  useEffect(() => {
      if (searchTerm) {
          setExpandedGroups(new Set(Object.keys(groupedParticipants)));
      } else {
          // Optional: Open first group or keep closed
          // setExpandedGroups(new Set()); 
      }
  }, [searchTerm, groupedParticipants]);

  const handleToggleSelection = (participantId: string) => {
    setTempSelectedIds(prev =>
      prev.includes(participantId) ? prev.filter(id => id !== participantId) : [...prev, participantId]
    );
  };

  const handleToggleGroup = (groupName: string) => {
      setExpandedGroups(prev => {
          const next = new Set(prev);
          if (next.has(groupName)) next.delete(groupName);
          else next.add(groupName);
          return next;
      });
  };

  const handleSelectAllVisible = () => {
      const allVisibleIds: string[] = [];
      Object.values(groupedParticipants).forEach((group: SelectorParticipant[]) => {
          group.forEach((p) => {
              if (!p.isDisabled) allVisibleIds.push(p.id);
          });
      });
      
      const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => tempSelectedIds.includes(id));
      
      if (allSelected) {
          // Deselect visible
          setTempSelectedIds(prev => prev.filter(id => !allVisibleIds.includes(id)));
      } else {
          // Select visible
          setTempSelectedIds(prev => [...new Set([...prev, ...allVisibleIds])]);
      }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="space-y-4">
        <Input
          type="search"
          placeholder="Buscar participante por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
        />
        
        <div className="flex items-center justify-between my-2">
            <div className="flex items-center">
                <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleSelectAllVisible}
                    className="text-xs"
                >
                    Seleccionar/Deseleccionar Visibles
                </Button>
            </div>
            {extraAction && (
                <Button type="button" variant="outline" size="sm" onClick={extraAction.onClick}>
                    {extraAction.label}
                </Button>
            )}
        </div>

        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto p-1"
        >
          {sortedGroupKeys.length > 0 ? (
            sortedGroupKeys.map((groupName) => {
                const participants = groupedParticipants[groupName];
                const isExpanded = expandedGroups.has(groupName);
                
                return (
                    <div key={groupName} className="mb-3 border dark:border-gray-700 rounded-md overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
                        <button 
                            type="button"
                            onClick={() => handleToggleGroup(groupName)}
                            className="w-full flex justify-between items-center px-4 py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-left font-semibold text-gray-800 dark:text-gray-200"
                        >
                            <span className="text-sm">
                                {groupName} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({participants.length})</span>
                            </span>
                            <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isExpanded && (
                            <div className="bg-white dark:bg-slate-800 border-t dark:border-gray-700">
                                {participants.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => !p.isDisabled && handleToggleSelection(p.id)}
                                        className={`flex items-center px-4 py-2 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0 ${p.isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50 dark:hover:bg-slate-700/50'}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={tempSelectedIds.includes(p.id)}
                                            readOnly
                                            disabled={p.isDisabled}
                                            className="h-4 w-4 text-primary-600 border-gray-300 rounded pointer-events-none"
                                        />
                                        <span className={`ml-3 text-sm ${p.isDisabled ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {p.name} {p.isDisabled ? <span className="text-xs italic">(ya seleccionado)</span> : ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No se encontraron participantes.
            </p>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-200 dark:border-slate-700">
        <Button variant="secondary" onClick={onClose} className="w-32 justify-center">Cancelar</Button>
        <Button variant="primary" onClick={() => onConfirm(tempSelectedIds)} className="w-32 justify-center">Confirmar</Button>
      </div>
    </Modal>
  );
};

export default ParticipantSelectorModal;
