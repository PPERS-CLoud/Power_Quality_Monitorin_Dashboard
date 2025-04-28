import React from 'react';
import ReadingRow from './ReadingRow';
import { formatDate, formatTime } from '../utils/powerReadingsUtils';

const DataTable = ({ readings }) => {
  if (readings.length === 0) return null;
  
  return (
    <div className="table-container">
      <table className="readings-table">
        <thead>
          <tr>
            <th>Node Code</th>
            <th>Date</th>
            <th>Time</th>
            <th>Location</th>
            <th>Voltage (V)</th>
            <th>Current (A)</th>
            <th>Power (W)</th>
            <th>Frequency (Hz)</th>
            <th>Power Factor</th>
            <th>Anomaly</th>
          </tr>
        </thead>
        <tbody>
          {readings.map((reading) => (
            <ReadingRow 
              key={reading.id}
              reading={reading}
              formatDate={formatDate}
              formatTime={formatTime}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(DataTable);