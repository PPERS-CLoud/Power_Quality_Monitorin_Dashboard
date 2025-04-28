import { useState } from 'react';
import { isAnomalyByThresholds } from '../utils/powerReadingsUtils';

export default function useFilters() {
  const defaultFilters = {
    node: 'all',
    dateRange: { startDate: '', endDate: '' },
    voltage: { min: '', max: '' },
    current: { min: '', max: '' },
    power: { min: '', max: '' },
    powerFactor: { min: '', max: '' },
    frequency: { min: '', max: '' },
    anomalyOnly: false
  };

  const [filters, setFilters] = useState(defaultFilters);
  const [tempFilters, setTempFilters] = useState(defaultFilters);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const openFilterModal = () => {
    setTempFilters({...filters});
    setShowFilterModal(true);
  };

  const closeFilterModal = () => {
    setShowFilterModal(false);
  };

  const handleFilterChange = (category, field, value) => {
    setTempFilters(prev => ({
      ...prev,
      [category]: field ? {...prev[category], [field]: value} : value
    }));
  };

  const applyFilters = () => {
    const nodeChanged = filters.node !== tempFilters.node;
    setFilters({...tempFilters});
    closeFilterModal();
    return nodeChanged;
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const resetParameterFilters = () => {
    setFilters(prev => ({
      ...prev,
      voltage: { min: '', max: '' },
      current: { min: '', max: '' },
      power: { min: '', max: '' },
      powerFactor: { min: '', max: '' },
      frequency: { min: '', max: '' },
      anomalyOnly: false
    }));
  };

  const hasActiveParameterFilters = Object.keys(filters).some(k => 
    k !== 'node' && k !== 'dateRange' && 
    (k === 'anomalyOnly' ? filters[k] : (filters[k].min || filters[k].max))
  );

  const applyFiltersToData = (readings) => {
    return readings.filter(reading => {
      // Filter by voltage
      if (filters.voltage.min && reading.voltage < parseFloat(filters.voltage.min)) return false;
      if (filters.voltage.max && reading.voltage > parseFloat(filters.voltage.max)) return false;
      
      // Filter by current
      if (filters.current.min && reading.current < parseFloat(filters.current.min)) return false;
      if (filters.current.max && reading.current > parseFloat(filters.current.max)) return false;
      
      // Filter by power
      if (filters.power.min && reading.power < parseFloat(filters.power.min)) return false;
      if (filters.power.max && reading.power > parseFloat(filters.power.max)) return false;
      
      // Filter by power factor
      if (filters.powerFactor.min && reading.power_factor < parseFloat(filters.powerFactor.min)) return false;
      if (filters.powerFactor.max && reading.power_factor > parseFloat(filters.powerFactor.max)) return false;
      
      // Filter by frequency
      if (filters.frequency.min && reading.frequency < parseFloat(filters.frequency.min)) return false;
      if (filters.frequency.max && reading.frequency > parseFloat(filters.frequency.max)) return false;
      
      // Filter by anomaly flag
      if (filters.anomalyOnly) {
        const isAnomaly = reading.is_anomaly || isAnomalyByThresholds(reading);
        if (!isAnomaly) return false;
      }
      
      return true;
    });
  };

  return {
    filters,
    setFilters,
    tempFilters,
    showFilterModal,
    openFilterModal,
    closeFilterModal,
    handleFilterChange,
    applyFilters,
    resetFilters,
    resetParameterFilters,
    hasActiveParameterFilters,
    applyFiltersToData
  };
}