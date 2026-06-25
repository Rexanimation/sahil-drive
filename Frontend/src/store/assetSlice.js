import { createSlice } from '@reduxjs/toolkit';

const assetSlice = createSlice({
    name: 'asset',
    initialState: {
        files: [],
        activeAssetContext: null,
        uploading: false,
        analysisProgress: 0,
        analysisStatus: 'idle', // 'idle' | 'analyzing' | 'completed' | 'failed'
        
        // Phase 1 Additions
        selectedFiles: [],
        uploadProgress: {} // { fileId: { progress: 0, status: 'uploading|completed|error', name: '' } }
    },
    reducers: {
        setFiles(state, action) {
            state.files = action.payload;
        },
        addFile(state, action) {
            state.files.unshift(action.payload);
        },
        removeFile(state, action) {
            state.files = state.files.filter(f => f._id !== action.payload);
            if (state.activeAssetContext && state.activeAssetContext._id === action.payload) {
                state.activeAssetContext = null;
                state.analysisStatus = 'idle';
                state.analysisProgress = 0;
            }
            state.selectedFiles = state.selectedFiles.filter(id => id !== action.payload);
        },
        updateFile(state, action) {
            const index = state.files.findIndex(f => f._id === action.payload._id);
            if (index !== -1) {
                state.files[index] = action.payload;
            }
            if (state.activeAssetContext && state.activeAssetContext._id === action.payload._id) {
                state.activeAssetContext = action.payload;
            }
        },
        setActiveAssetContext(state, action) {
            state.activeAssetContext = action.payload;
        },
        setUploading(state, action) {
            state.uploading = action.payload;
        },
        setAnalysisProgress(state, action) {
            state.analysisProgress = action.payload;
        },
        setAnalysisStatus(state, action) {
            state.analysisStatus = action.payload;
        },
        

        // Selection
        toggleSelection(state, action) {
            const id = action.payload;
            if (state.selectedFiles.includes(id)) {
                state.selectedFiles = state.selectedFiles.filter(fid => fid !== id);
            } else {
                state.selectedFiles.push(id);
            }
        },
        clearSelection(state) {
            state.selectedFiles = [];
        },
        
        // Uploads
        setUploadProgress(state, action) {
            const { id, progress, status, name } = action.payload;
            state.uploadProgress[id] = { ...state.uploadProgress[id], progress, status, name };
        },
        removeUpload(state, action) {
            delete state.uploadProgress[action.payload];
        }
    }
});

export const {
    setFiles,
    addFile,
    removeFile,
    updateFile,
    setActiveAssetContext,
    setUploading,
    setAnalysisProgress,
    setAnalysisStatus,
    toggleSelection,
    clearSelection,
    setUploadProgress,
    removeUpload
} = assetSlice.actions;

export default assetSlice.reducer;
