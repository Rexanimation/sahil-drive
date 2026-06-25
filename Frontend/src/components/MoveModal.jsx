import React, { useState } from 'react';

const MoveModal = ({ folders, onClose, onMove, currentFolderId }) => {
  const [selectedFolderId, setSelectedFolderId] = useState(null);

  // Filter out the current folder so user can't move items to the exact same place they are already in
  const availableFolders = folders.filter(f => f._id !== currentFolderId);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Move To...</span>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '1rem' }}>
          
          <div 
            className="folder-item" 
            style={{ 
              padding: '0.75rem', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              background: selectedFolderId === 'root' ? 'var(--brand-primary)' : 'rgba(255,255,255,0.05)',
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              transition: 'all 0.2s'
            }}
            onClick={() => setSelectedFolderId('root')}
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={selectedFolderId === 'root' ? '#fff' : "currentColor"} strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span style={{ color: selectedFolderId === 'root' ? '#fff' : 'var(--text-primary)' }}>My Drive (Root)</span>
          </div>

          {availableFolders.length === 0 && (
             <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '1rem' }}>No other folders available.</p>
          )}

          {availableFolders.map(folder => (
            <div 
              key={folder._id}
              className="folder-item"
              style={{ 
                padding: '0.75rem', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                background: selectedFolderId === folder._id ? 'var(--brand-primary)' : 'rgba(255,255,255,0.05)',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'all 0.2s'
              }}
              onClick={() => setSelectedFolderId(folder._id)}
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={selectedFolderId === folder._id ? '#fff' : '#facc15'} strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span style={{ color: selectedFolderId === folder._id ? '#fff' : 'var(--text-primary)' }}>{folder.name}</span>
            </div>
          ))}

        </div>
        <div className="modal-actions" style={{ padding: '1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button className="action-btn cancel" onClick={onClose} style={{ padding: '0.5rem 1rem' }}>Cancel</button>
          <button 
            className="action-btn upload" 
            onClick={() => onMove(selectedFolderId)}
            disabled={!selectedFolderId}
            style={{ padding: '0.5rem 1rem', opacity: selectedFolderId ? 1 : 0.5, cursor: selectedFolderId ? 'pointer' : 'not-allowed' }}
          >
            Move Here
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveModal;
