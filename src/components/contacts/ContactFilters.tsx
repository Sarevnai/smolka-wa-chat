import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { X, Filter, User, Star, Activity, Calendar, FileText } from 'lucide-react';
import { useDepartment } from '@/contexts/DepartmentContext';
import { getContactTypesForDepartment, getContactTypeLabel } from '@/lib/departmentConfig';
import { ContactType } from '@/types/contact';

export interface ContactFiltersState {
  status?: 'ativo' | 'inativo' | 'bloqueado';
  contactType?: ContactType;
  hasContracts?: boolean;
  rating?: number;
  hasRecentActivity?: boolean;
}

interface ContactFiltersProps {
  filters: ContactFiltersState;
  onFiltersChange: (filters: ContactFiltersState) => void;
  contactCount?: number;
}

export function ContactFilters({ filters, onFiltersChange, contactCount }: ContactFiltersProps) {
  const { activeDepartment } = useDepartment();
  const departmentConfig = getContactTypesForDepartment(activeDepartment || undefined);

  const updateFilter = (key: keyof ContactFiltersState, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' ? undefined : value
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  // Get contact type label for badge display
  const getTypeLabel = () => {
    if (!filters.contactType || !activeDepartment) return null;
    const typeConfig = getContactTypeLabel(filters.contactType, activeDepartment);
    return typeConfig ? typeConfig.label : filters.contactType;
  };

  // Get icon for contact type badge
  const getTypeIcon = () => {
    if (!filters.contactType || !activeDepartment) return User;
    const typeConfig = getContactTypeLabel(filters.contactType, activeDepartment);
    return typeConfig ? typeConfig.icon : User;
  };

  const filterBadges = [
    { key: 'status', value: filters.status, label: filters.status, icon: Activity },
    { key: 'contactType', value: filters.contactType, label: getTypeLabel(), icon: getTypeIcon() },
    { key: 'hasContracts', value: filters.hasContracts, label: filters.hasContracts ? 'Com Contratos' : 'Sem Contratos', icon: FileText },
    { key: 'rating', value: filters.rating, label: `${filters.rating}+ estrelas`, icon: Star },
    { key: 'hasRecentActivity', value: filters.hasRecentActivity, label: 'Atividade Recente', icon: Calendar }
  ].filter(badge => badge.value !== undefined);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Filter Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filtros</span>
              {contactCount !== undefined && (
                <Badge variant="outline">{contactCount} contatos</Badge>
              )}
            </div>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar Filtros ({activeFiltersCount})
              </Button>
            )}
          </div>

          {/* Active Filter Badges */}
          {filterBadges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filterBadges.map((badge) => {
                const IconComponent = badge.icon;
                return (
                  <Badge key={badge.key} variant="secondary" className="flex items-center gap-1">
                    <IconComponent className="h-3 w-3" />
                    {badge.label}
                    <button
                      onClick={() => updateFilter(badge.key as keyof ContactFiltersState, undefined)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filters.status || 'all'} onValueChange={(value) => updateFilter('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-green-600" />
                      Ativo
                    </div>
                  </SelectItem>
                  <SelectItem value="inativo">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-600" />
                      Inativo
                    </div>
                  </SelectItem>
                  <SelectItem value="bloqueado">
                    <div className="flex items-center gap-2">
                      <X className="h-4 w-4 text-red-600" />
                      Bloqueado
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contact Type Filter - Dynamic based on department */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select 
                value={filters.contactType || 'all'} 
                onValueChange={(value) => updateFilter('contactType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {departmentConfig?.types.map((type) => {
                    const typeConfig = departmentConfig.labels[type];
                    const TypeIcon = typeConfig.icon;
                    return (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <TypeIcon className={`h-4 w-4 ${typeConfig.color}`} />
                          {typeConfig.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Contracts Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Contratos</label>
              <Select value={filters.hasContracts === undefined ? 'all' : filters.hasContracts ? 'with' : 'without'} onValueChange={(value) => updateFilter('hasContracts', value === 'all' ? undefined : value === 'with')}>
                <SelectTrigger>
                  <SelectValue placeholder="Contratos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="with">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-600" />
                      Com Contratos
                    </div>
                  </SelectItem>
                  <SelectItem value="without">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-600" />
                      Sem Contratos
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rating Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Classificação</label>
              <Select value={filters.rating?.toString() || 'all'} onValueChange={(value) => updateFilter('rating', value === 'all' ? undefined : parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Estrelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <SelectItem key={rating} value={rating.toString()}>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        {rating}+ estrelas
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Activity Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Atividade</label>
              <Select value={filters.hasRecentActivity === undefined ? 'all' : filters.hasRecentActivity ? 'recent' : 'old'} onValueChange={(value) => updateFilter('hasRecentActivity', value === 'all' ? undefined : value === 'recent')}>
                <SelectTrigger>
                  <SelectValue placeholder="Atividade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="recent">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-green-600" />
                      Atividade Recente
                    </div>
                  </SelectItem>
                  <SelectItem value="old">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-600" />
                      Sem Atividade Recente
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
