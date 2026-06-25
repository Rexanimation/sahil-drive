import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const FileViewer = ({ asset, onClose, getFileUrl }) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const imgRef = useRef(null);

  useEffect(() => {
    if (!asset) return;
    let objectUrl = null;

    const fetchBlob = async () => {
      try {
        setLoading(true);
        setError(false);
        const url = getFileUrl(asset.url);
        
        // Fetch as blob with credentials so cookies are sent
        const response = await axios.get(url, {
          responseType: 'blob',
          withCredentials: true
        });

        objectUrl = URL.createObjectURL(response.data);
        setBlobUrl(objectUrl);
      } catch (err) {
        console.error("Failed to load file preview:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchBlob();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [asset, getFileUrl]);

  // Image Zoom & Pan Handlers
  const handleWheel = (e) => {
    if (!asset.type?.startsWith('image/')) return;
    e.preventDefault();
    const zoomFactor = -e.deltaY * 0.002;
    setScale((prevScale) => Math.min(Math.max(0.5, prevScale + zoomFactor), 10)); // Min 0.5x, Max 10x
  };

  const handleMouseDown = (e) => {
    if (!asset.type?.startsWith('image/')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !asset.type?.startsWith('image/')) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetZoom = (e) => {
    e.stopPropagation();
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    if (blobUrl) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = asset.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="spinner" style={{ border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid var(--brand-primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', marginBottom: '1rem' }}></div>
          <p>Loading secure stream...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      );
    }

    if (error || !blobUrl) {
      return (
        <div style={{ color: '#fff', textAlign: 'center', padding: '2rem' }}>
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '1rem', color: '#ef4444' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p>Failed to load file securely.</p>
        </div>
      );
    }

    if (asset.type?.startsWith('video/')) {
      return <video src={blobUrl} controls autoPlay style={{ width: '100%', maxHeight: '100%', outline: 'none' }} />;
    }

    if (asset.type?.startsWith('image/')) {
      return (
        <div 
          style={{ width: '100%', height: '100%', overflow: 'hidden', cursor: isDragging ? 'grabbing' : 'grab' }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img 
            ref={imgRef}
            src={blobUrl} 
            alt={asset.name} 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain',
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              userSelect: 'none',
              pointerEvents: 'none' // Let the container handle mouse events
            }} 
            draggable="false"
          />
        </div>
      );
    }

    if (asset.type === 'application/pdf') {
      return <iframe src={blobUrl} title={asset.name} width="100%" height="100%" frameBorder="0" style={{ backgroundColor: '#fff' }} />;
    }

    return (
      <div style={{ color: '#fff', textAlign: 'center', padding: '2rem' }}>
        <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '1rem' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p>Preview not available for this file type.</p>
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="modal-card" 
        style={{ width: '90%', maxWidth: '1200px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '90vh', background: 'var(--bg-dark)' }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{asset.name}</h3>
            {asset.type?.startsWith('image/') && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {Math.round(scale * 100)}%
              </span>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {asset.type?.startsWith('image/') && scale !== 1 && (
              <button 
                className="icon-action-btn" 
                onClick={resetZoom} 
                title="Reset Zoom"
                style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                Reset
              </button>
            )}
            
            <button 
              className="icon-action-btn" 
              onClick={handleDownload} 
              disabled={!blobUrl}
              title="Download File"
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--brand-primary)', padding: '0.3rem 0.75rem', borderRadius: '4px', border: 'none', opacity: blobUrl ? 1 : 0.5, color: '#fff', cursor: blobUrl ? 'pointer' : 'default' }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
            
            <button className="icon-action-btn" onClick={onClose} style={{ marginLeft: '1rem', border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer' }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ flex: 1, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', position: 'relative' }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default FileViewer;
