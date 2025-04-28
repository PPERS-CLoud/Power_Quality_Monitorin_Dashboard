import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSearch } from '@fortawesome/free-solid-svg-icons';

const ParameterFiltersModal = ({ 
    show, 
    onClose, 
    tempFilters, 
    handleFilterChange,
    applyFilters 
}) => {
    if (!show) return null;
    
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Parameter Filters</h3>
                    <button className="close-modal" onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
                <div className="filter-content">
                    <div className="filter-panel">
                        <div className="note-box">
                            <p><strong>Note:</strong> These filters operate on data already loaded for the selected time period.</p>
                        </div>
                        
                        <div className="filter-row">
                            <div className="filter-group">
                                <label>Anomaly Status</label>
                                <div className="checkbox-group">
                                    <input 
                                        type="checkbox" 
                                        id="anomaly-only" 
                                        checked={tempFilters.anomalyOnly}
                                        onChange={(e) => handleFilterChange('anomalyOnly', null, e.target.checked)}
                                    />
                                    <label htmlFor="anomaly-only">Show anomalies only</label>
                                </div>
                            </div>
                        </div>
                        
                        <div className="filter-row">
                            <div className="filter-group">
                                <label>Voltage Range (V)</label>
                                <div className="range-inputs">
                                    <input 
                                        type="number" 
                                        placeholder="Min" 
                                        value={tempFilters.voltage.min}
                                        onChange={(e) => handleFilterChange('voltage', 'min', e.target.value)}
                                    />
                                    <span>to</span>
                                    <input 
                                        type="number" 
                                        placeholder="Max" 
                                        value={tempFilters.voltage.max}
                                        onChange={(e) => handleFilterChange('voltage', 'max', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="filter-group">
                                <label>Current Range (A)</label>
                                <div className="range-inputs">
                                    <input 
                                        type="number" 
                                        placeholder="Min" 
                                        value={tempFilters.current.min}
                                        onChange={(e) => handleFilterChange('current', 'min', e.target.value)}
                                    />
                                    <span>to</span>
                                    <input 
                                        type="number" 
                                        placeholder="Max" 
                                        value={tempFilters.current.max}
                                        onChange={(e) => handleFilterChange('current', 'max', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="filter-row">
                            <div className="filter-group">
                                <label>Power Range (W)</label>
                                <div className="range-inputs">
                                    <input 
                                        type="number" 
                                        placeholder="Min" 
                                        value={tempFilters.power.min}
                                        onChange={(e) => handleFilterChange('power', 'min', e.target.value)}
                                    />
                                    <span>to</span>
                                    <input 
                                        type="number" 
                                        placeholder="Max" 
                                        value={tempFilters.power.max}
                                        onChange={(e) => handleFilterChange('power', 'max', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="filter-group">
                                <label>Frequency Range (Hz)</label>
                                <div className="range-inputs">
                                    <input 
                                        type="number" 
                                        placeholder="Min" 
                                        value={tempFilters.frequency.min}
                                        onChange={(e) => handleFilterChange('frequency', 'min', e.target.value)}
                                    />
                                    <span>to</span>
                                    <input 
                                        type="number" 
                                        placeholder="Max" 
                                        value={tempFilters.frequency.max}
                                        onChange={(e) => handleFilterChange('frequency', 'max', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="filter-row">
                            <div className="filter-group">
                                <label>Power Factor Range</label>
                                <div className="range-inputs">
                                    <input 
                                        type="number" 
                                        placeholder="Min" 
                                        min="0" 
                                        max="1" 
                                        step="0.01"
                                        value={tempFilters.powerFactor.min}
                                        onChange={(e) => handleFilterChange('powerFactor', 'min', e.target.value)}
                                    />
                                    <span>to</span>
                                    <input 
                                        type="number" 
                                        placeholder="Max" 
                                        min="0" 
                                        max="1" 
                                        step="0.01"
                                        value={tempFilters.powerFactor.max}
                                        onChange={(e) => handleFilterChange('powerFactor', 'max', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="cancel-btn" onClick={onClose}>Cancel</button>
                    <button className="apply-btn" onClick={applyFilters}>
                        <FontAwesomeIcon icon={faSearch} /> Apply Filters
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ParameterFiltersModal;