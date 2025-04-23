import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ApiTest = () => {
  const [connectionStatus, setConnectionStatus] = useState('Not tested');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  
  const apiUrl = import.meta.env.VITE_API_URL;
  
  const testConnection = async () => {
    setLoading(true);
    setConnectionStatus('Testing...');
    setError(null);
    
    try {
      const response = await axios.get(apiUrl);
      setData(response.data);
      setConnectionStatus('Connected successfully');
    } catch (error) {
      setError(error.message);
      setConnectionStatus('Connection failed');
      console.error('API Connection Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>API Connection Test</h2>
      <div style={{ marginBottom: '20px' }}>
        <p><strong>API URL:</strong> {apiUrl || 'Not configured'}</p>
        <p><strong>Status:</strong> {connectionStatus}</p>
        {error && <p style={{ color: 'red' }}><strong>Error:</strong> {error}</p>}
      </div>
      
      <button 
        onClick={testConnection} 
        disabled={loading}
        style={{
          padding: '10px 15px',
          backgroundColor: '#2f855a',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Testing...' : 'Test API Connection'}
      </button>
      
      {data && (
        <div style={{ marginTop: '20px' }}>
          <h3>Response Data:</h3>
          <pre style={{ 
            backgroundColor: '#f0fdf4', 
            padding: '15px', 
            borderRadius: '5px',
            overflow: 'auto',
            maxHeight: '400px'
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ApiTest;