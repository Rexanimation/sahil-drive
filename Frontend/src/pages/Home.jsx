import React, { useCallback, useEffect, useState, useRef } from 'react';
import { io } from "socket.io-client";
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { API_URL } from '../config';
import '../styles/Dashboard.css';
import AnalyticsEngine from '../components/AnalyticsEngine';
import FileViewer from '../components/FileViewer';
import MoveModal from '../components/MoveModal';

import {
  setFiles,
  addFile,
  removeFile,
  updateFile,
  setActiveAssetContext,
  setUploading,
  setAnalysisProgress,
  setAnalysisStatus
} from '../store/assetSlice.js';

import {
  startNewChat,
  selectChat,
  setInput,
  sendingStarted,
  sendingFinished,
  setChats
} from '../store/chatSlice.js';

const Home = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux state
  const chats = useSelector(state => state.chat.chats || []);
  const activeChatId = useSelector(state => state.chat.activeChatId);
  const chatInput = useSelector(state => state.chat.input);
  const isSending = useSelector(state => state.chat.isSending);

  const files = useSelector(state => state.asset.files || []);
  const activeAsset = useSelector(state => state.asset.activeAssetContext);
  const uploading = useSelector(state => state.asset.uploading);
  const analysisProgress = useSelector(state => state.asset.analysisProgress);
  const analysisStatus = useSelector(state => state.asset.analysisStatus);

  // Local state
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'all', 'image', 'video', 'favorites', 'shared'
  const [dragActive, setDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [socket, setSocket] = useState(null);
  const [storageBytes, setStorageBytes] = useState(0);
  
  // Voice interface state
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const ttsEnabledRef = useRef(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    ttsEnabledRef.current = ttsEnabled;
  }, [ttsEnabled]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        dispatch(setInput(transcript));
      };

      recognitionRef.current = rec;
    }
  }, [dispatch]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please try Google Chrome.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // General Chat Messages
  const [generalMessages, setGeneralMessages] = useState([]);
  
  // File Contextual Chat Messages (mapped by asset ID)
  const [fileChats, setFileChats] = useState({});
  const [fileChatInput, setFileChatInput] = useState('');

  // Active tags checkbox state (local overrides)
  const [checkedTags, setCheckedTags] = useState({});

  // File upload input reference
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileMessagesEndRef = useRef(null);

  // Nested directory states
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  
  // Folder Creation Modal
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState('');

  // Multi-select & Move
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  // Share Settings Modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareAsset, setShareAsset] = useState(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState('viewer');
  const [publicAccess, setPublicAccess] = useState('restricted');

  // Floating Upload Progress Monitor Queue
  const [activeUploads, setActiveUploads] = useState([]);

  // MEGA Link Modal
  const [isMegaModalOpen, setIsMegaModalOpen] = useState(false);
  const [megaEmailInput, setMegaEmailInput] = useState('');
  const [megaPasswordInput, setMegaPasswordInput] = useState('');
  const [showMegaPassword, setShowMegaPassword] = useState(false);
  const [megaLinking, setMegaLinking] = useState(false);
  const [isMegaSuccessModalOpen, setIsMegaSuccessModalOpen] = useState(false);

  // Preview Modal
  const [previewAsset, setPreviewAsset] = useState(null);

  // ─── Fetch User & Assets ───────────────────────────────────────────────────
  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
      setUser(res.data.user);
      if (res.data.user.megaError) {
        alert("Your MEGA account is deleted or disconnected. Please link it again.");
        setIsMegaModalOpen(true);
      } else if (!res.data.user.isMegaLinked) {
        setIsMegaModalOpen(true);
      }
    } catch (err) {
      navigate('/login');
    }
  };

  const handleMegaLink = async (e) => {
    e.preventDefault();
    setMegaLinking(true);
    try {
      await axios.post(`${API_URL}/api/auth/link-mega`, {
        megaEmail: megaEmailInput,
        megaPassword: megaPasswordInput
      }, { withCredentials: true });
      setIsMegaModalOpen(false);
      setUser(prev => ({ ...prev, isMegaLinked: true }));
      setIsMegaSuccessModalOpen(true);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to link MEGA account");
    } finally {
      setMegaLinking(false);
    }
  };

  const handleUnlinkMega = async () => {
    const confirmUnlink = window.confirm("Are you sure you want to disconnect your MEGA account? You will lose access to the 20GB of storage.");
    if (!confirmUnlink) return;

    try {
      await axios.post(`${API_URL}/api/auth/unlink-mega`, {}, { withCredentials: true });
      setUser(prev => ({ ...prev, isMegaLinked: false }));
      alert("MEGA account disconnected successfully.");
    } catch (err) {
      alert("Failed to disconnect MEGA account.");
    }
  };

  const fetchStorageSummary = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/assets/storage-summary`, { withCredentials: true });
      setStorageBytes(res.data.totalBytes);
    } catch (err) {
      console.error("Error fetching storage summary:", err);
    }
  };

  const fetchAssets = async (tab = 'all', search = '', folderId = null) => {
    try {
      let url;
      if (tab === 'shared') {
        url = `${API_URL}/api/shares/shared-with-me`;
      } else {
        url = `${API_URL}/api/assets`;
      }
      
      const params = [];
      if (tab === 'image') params.push('type=image');
      if (tab === 'video') params.push('type=video');
      if (tab === 'favorites') params.push('favorite=true');
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      
      // Filter by folder level if browsing files normally and not searching
      if (tab === 'all' && !search) {
        params.push(`parentFolderId=${folderId || 'null'}`);
      }

      if (params.length > 0 && tab !== 'shared') {
        url += `?${params.join('&')}`;
      }

      const res = await axios.get(url, { withCredentials: true });
      dispatch(setFiles(res.data.assets));
      // Refresh storage calculation
      fetchStorageSummary();
    } catch (err) {
      console.error("Error fetching assets:", err);
    }
  };

  // ─── Chat Messages for Active General Chat ──────────────────────────────
  const getGeneralMessages = async (chatId) => {
    try {
      const response = await axios.get(`${API_URL}/api/chat/messages/${chatId}`, { withCredentials: true });
      setGeneralMessages(response.data.messages.map(m => ({
        type: m.role === 'user' ? 'user' : 'ai',
        content: m.content
      })));
    } catch (err) {
      console.error("Error loading chat messages:", err);
    }
  };

  // ─── Sync search, folder, and tab changes ───────────────────────────────────
  useEffect(() => {
    if (user) {
      fetchAssets(activeTab, searchQuery, currentFolderId);
    }
  }, [activeTab, searchQuery, currentFolderId, user]);

  // Load User, Chats & Sockets on Mount
  useEffect(() => {
    fetchUser();
    fetchStorageSummary();

    axios.get(`${API_URL}/api/chat`, { withCredentials: true })
      .then(response => {
        const chatsList = response.data.chats.reverse();
        dispatch(setChats(chatsList));
        if (chatsList.length > 0 && !activeChatId) {
          dispatch(selectChat(chatsList[0]._id));
          getGeneralMessages(chatsList[0]._id);
        } else if (chatsList.length === 0) {
          // Auto create first chat session
          axios.post(`${API_URL}/api/chat`, { title: "Chat Session #1" }, { withCredentials: true })
            .then(res => {
              const newChat = res.data.chat || res.data;
              dispatch(startNewChat(newChat));
              dispatch(selectChat(newChat._id));
            })
            .catch(e => console.error("Auto chat creation failed", e));
        }
      })
      .catch(err => {
        if (err?.response?.status === 401) navigate('/login');
      });

    const tempSocket = io(API_URL || undefined, {
      path: "/socket.io/",
      withCredentials: true,
    });

    tempSocket.on("ai-response", (messagePayload) => {
      let displayContent = messagePayload.content;
      try {
        const parsed = JSON.parse(messagePayload.content);
        displayContent = parsed.content || "Action complete.";
        if (parsed.type === 'tool_result' && parsed.toolOutput?.updatedData?.triggerAction === "OPEN_UPLOAD_DIALOG") {
            setTimeout(() => { triggerFileUpload(); }, 500);
        }
      } catch (e) {}

      setGeneralMessages((prev) => [...prev, {
        type: 'ai',
        content: displayContent
      }]);
      dispatch(sendingFinished());

      if (window.speechSynthesis && ttsEnabledRef.current) {
        const plainText = messagePayload.content.replace(/[\#\*\_`\[\]\(\)\-\+]/g, '');
        const utterance = new SpeechSynthesisUtterance(plainText);
        window.speechSynthesis.speak(utterance);
      }
    });

    tempSocket.on("ai-error", (err) => {
      console.error("AI error:", err.message);
      dispatch(sendingFinished());
    });

    tempSocket.on("connect_error", (err) => {
      if (err.message?.includes("Authentication")) navigate('/login');
    });

    setSocket(tempSocket);

    return () => tempSocket.disconnect();
  }, []);

  // Real-time UI refresh event when the AI controller makes file changes
  useEffect(() => {
    if (!socket) return;
    const handleRefresh = () => {
      fetchAssets(activeTab, searchQuery, currentFolderId);
    };
    socket.on("refresh-assets", handleRefresh);
    return () => {
      socket.off("refresh-assets", handleRefresh);
    };
  }, [socket, activeTab, searchQuery, currentFolderId]);

  // Update messages when general chat selection changes
  useEffect(() => {
    if (activeChatId) {
      getGeneralMessages(activeChatId);
    }
  }, [activeChatId]);

  // Auto-scroll chat boxes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [generalMessages]);

  useEffect(() => {
    fileMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [fileChats, activeAsset]);

  // Initialize checked tags state when active asset loaded
  useEffect(() => {
    if (activeAsset) {
      const initialChecked = {};
      if (activeAsset.tags) {
        activeAsset.tags.forEach((tag, idx) => {
          initialChecked[tag] = idx < 2;
        });
      }
      setCheckedTags(initialChecked);
    }
  }, [activeAsset]);

  // ─── Folder Navigation Breadcrumbs Logic ──────────────────────────────────
  const navigateToFolder = (folderId, folderName) => {
    if (folderId === null || folderId === 'root') {
      setCurrentFolderId(null);
      setFolderPath([]);
    } else {
      setCurrentFolderId(folderId);
      const idx = folderPath.findIndex(p => p._id === folderId);
      if (idx !== -1) {
        setFolderPath(folderPath.slice(0, idx + 1));
      } else {
        setFolderPath([...folderPath, { _id: folderId, name: folderName }]);
      }
    }
    dispatch(setActiveAssetContext(null));
  };

  // ─── Multi-Selection & Bulk Move Logic ─────────────────────────────────────
  const toggleSelection = (assetId, e) => {
    e.stopPropagation();
    setSelectedAssets(prev => {
      if (prev.includes(assetId)) {
        return prev.filter(id => id !== assetId);
      }
      return [...prev, assetId];
    });
  };

  const handleBulkMove = async (targetFolderId) => {
    try {
      await axios.put(`${API_URL}/api/assets/move`, {
        assetIds: selectedAssets,
        targetFolderId
      }, { withCredentials: true });
      
      setSelectedAssets([]);
      setIsMoveModalOpen(false);
      // Refresh assets
      fetchAssets(activeTab, searchQuery, currentFolderId);
    } catch (err) {
      console.error("Bulk move failed:", err);
      alert(err.response?.data?.message || "Failed to move assets");
    }
  };



  // ─── Drag and Drop Logic for Folders ───────────────────────────────────────
  const handleDragStart = (e, asset) => {
    // If the dragged asset is part of the selection, drag all selected assets.
    // Otherwise, just drag this specific asset.
    let dragPayload = [];
    if (selectedAssets.includes(asset._id)) {
      dragPayload = selectedAssets;
    } else {
      dragPayload = [asset._id];
      // Automatically select it so visual styling matches the drag payload
      if (!selectedAssets.includes(asset._id)) {
        setSelectedAssets([...selectedAssets, asset._id]);
      }
    }
    e.dataTransfer.setData('text/plain', JSON.stringify(dragPayload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverFolder = (e) => {
    // Prevent default to allow dropping
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeaveFolder = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDropOnFolder = async (e, targetFolderId) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent the global drop handler from firing
    e.currentTarget.classList.remove('drag-over');
    
    // 1. Check if files were dropped from the OS
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length === 0) return;

      if (!user?.isMegaLinked) {
        setIsMegaModalOpen(true);
        return;
      }
      
      // Temporarily set currentFolderId for uploadSingleFile, or just pass it to uploadSingleFile
      // We will need to update uploadSingleFile to accept a folderId argument or we can just use a local loop
      for (const file of droppedFiles) {
        await uploadSingleFile(file, droppedFiles.length > 1, targetFolderId);
      }
      return;
    }

    // 2. Otherwise, check if it's an internal move of selected assets
    try {
      const data = e.dataTransfer.getData('text/plain');
      if (!data) return;
      const assetIdsToMove = JSON.parse(data);

      // Prevent moving a folder into itself
      if (assetIdsToMove.includes(targetFolderId)) {
        alert("Cannot move a folder into itself!");
        return;
      }

      await axios.put(`${API_URL}/api/assets/move`, {
        assetIds: assetIdsToMove,
        targetFolderId
      }, { withCredentials: true });
      
      setSelectedAssets([]);
      // Refresh assets
      fetchAssets(activeTab, searchQuery, currentFolderId);
    } catch (err) {
      console.error("Drag and drop move failed:", err);
      // alert only if it's not a parse error (e.g., dropping external files)
      if (err.response) {
        alert(err.response?.data?.message || "Failed to move assets");
      }
    }
  };

  // ─── Create New Folder ─────────────────────────────────────────────────────
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!folderNameInput.trim()) return;

    try {
      const res = await axios.post(`${API_URL}/api/assets/folder`, {
        name: folderNameInput.trim(),
        parentFolderId: currentFolderId
      }, { withCredentials: true });

      dispatch(addFile(res.data.folder));
      setFolderNameInput('');
      setIsCreateFolderOpen(false);
    } catch (err) {
      console.error("Folder creation failed:", err);
      alert(err.response?.data?.message || "Failed to create folder");
    }
  };

  // ─── File Upload Logic (Multer Standard / Chunked Pipeline) ───────────────
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const uploadSingleFile = async (file, isBulk = false, folderIdOverride = null) => {
    if (!file) return;

    const targetFolderId = folderIdOverride !== null ? folderIdOverride : currentFolderId;

    const trackingId = Math.random().toString(36).substring(7);
    const newUpload = {
      id: trackingId,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'uploading',
      chunksUploaded: 0,
      totalChunks: 1
    };

    setActiveUploads(prev => [...prev, newUpload]);

    // Check if large file needing chunk ingestion (> 10MB)
    const isChunked = file.size > 10 * 1024 * 1024;

    try {
      if (!isChunked) {
        // Standard Single File Upload Pipeline
        const formData = new FormData();
        formData.append('file', file);
        if (targetFolderId) {
          formData.append('parentFolderId', targetFolderId);
        }

        const response = await axios.post(`${API_URL}/api/assets/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          withCredentials: true,
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setActiveUploads(prev => prev.map(up => up.id === trackingId ? { ...up, progress } : up));
          }
        });

        const newAsset = response.data.asset;
        dispatch(addFile(newAsset));
        
        // Remove from upload queue
        setActiveUploads(prev => prev.filter(up => up.id !== trackingId));

        // Start progressive AI analysis overlay simulation ONLY if single file
        if (!isBulk) {
          dispatch(setActiveAssetContext(newAsset));
          dispatch(setAnalysisProgress(0));
          dispatch(setAnalysisStatus('analyzing'));
          
          let progress = 0;
          const interval = setInterval(() => {
            progress += 5;
            if (progress >= 100) {
              clearInterval(interval);
              dispatch(setAnalysisProgress(100));
              dispatch(setAnalysisStatus('completed'));
              setIsAiOpen(true);
              fetchStorageSummary();
            } else {
              dispatch(setAnalysisProgress(progress));
            }
          }, 100);
        } else {
          fetchStorageSummary();
        }

      } else {
        // Chunk Ingestion Pipeline (5MB chunks)
        const CHUNK_SIZE = 5 * 1024 * 1024;
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

        setActiveUploads(prev => prev.map(up => up.id === trackingId ? { ...up, totalChunks } : up));

        // 1. Initiate upload
        const initRes = await axios.post(`${API_URL}/api/upload/initiate`, {
          name: file.name,
          size: file.size,
          type: file.type
        }, { withCredentials: true });

        const { uploadId } = initRes.data;

        // 2. Upload chunk parts sequentially
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunkBlob = file.slice(start, end);

          const formData = new FormData();
          formData.append('uploadId', uploadId);
          formData.append('chunkIndex', i);
          formData.append('chunk', chunkBlob, file.name);

          await axios.post(`${API_URL}/api/upload/chunk`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            withCredentials: true
          });

          const progress = Math.round(((i + 1) / totalChunks) * 100);
          setActiveUploads(prev => prev.map(up => up.id === trackingId ? { ...up, progress, chunksUploaded: i + 1 } : up));
        }

        // 3. Finalize upload
        const finalizeRes = await axios.post(`${API_URL}/api/upload/finalize`, {
          uploadId,
          totalChunks,
          name: file.name,
          type: file.type,
          size: file.size,
          parentFolderId: targetFolderId
        }, { withCredentials: true });

        const newAsset = finalizeRes.data.asset;
        dispatch(addFile(newAsset));

        // Remove from upload queue
        setActiveUploads(prev => prev.filter(up => up.id !== trackingId));

        // Start progressive AI analysis overlay simulation ONLY if single file
        if (!isBulk) {
          dispatch(setActiveAssetContext(newAsset));
          dispatch(setAnalysisProgress(0));
          dispatch(setAnalysisStatus('analyzing'));

          let progress = 0;
          const interval = setInterval(() => {
            progress += 5;
            if (progress >= 100) {
              clearInterval(interval);
              dispatch(setAnalysisProgress(100));
              dispatch(setAnalysisStatus('completed'));
              setIsAiOpen(true);
              fetchStorageSummary();
            } else {
              dispatch(setAnalysisProgress(progress));
            }
          }, 100);
        } else {
          fetchStorageSummary();
        }
      }
    } catch (err) {
      console.error("Upload process failed:", err);
      setActiveUploads(prev => prev.map(up => up.id === trackingId ? { ...up, status: 'failed' } : up));
      alert(`Upload failed for ${file.name}`);
    } finally {
      // Input clearing handled in processUploadQueue
    }
  };

  // ─── General Chat Send ─────────────────────────────────────────────────────
  const handleGeneralChatSend = () => {
    const trimmed = chatInput.trim();
    if (!trimmed || !activeChatId || isSending) return;

    dispatch(sendingStarted());
    setGeneralMessages(prev => [...prev, { type: 'user', content: trimmed }]);
    dispatch(setInput(''));

    socket.emit("ai-message", {
      chat: activeChatId,
      content: trimmed,
      folderId: currentFolderId || 'root'
    });
  };

  // ─── Create New General Chat Session ──────────────────────────────────────
  const handleNewChat = async () => {
    try {
      const chatTitle = `Chat Session #${chats.length + 1}`;
      const res = await axios.post(`${API_URL}/api/chat`, { title: chatTitle }, { withCredentials: true });
      const newChat = res.data.chat || res.data;
      dispatch(startNewChat(newChat));
      setGeneralMessages([]);
      alert("New chat session started!");
    } catch (err) {
      console.error("Error creating new chat:", err);
    }
  };

  // ─── File Specific Chat Send ───────────────────────────────────────────────
  const handleFileChatSend = async () => {
    const trimmed = fileChatInput.trim();
    if (!trimmed || !activeAsset) return;

    const userMsg = { type: 'user', content: trimmed };
    const assetId = activeAsset._id;
    
    setFileChats(prev => ({
      ...prev,
      [assetId]: [...(prev[assetId] || []), userMsg]
    }));
    setFileChatInput('');

    try {
      const res = await axios.post(`${API_URL}/api/assets/${assetId}/chat`, {
        message: trimmed
      }, { withCredentials: true });

      const aiMsg = { type: 'ai', content: res.data.response };

      setFileChats(prev => ({
        ...prev,
        [assetId]: [...(prev[assetId] || []), aiMsg]
      }));
    } catch (err) {
      console.error("File chat error:", err);
      const errMsg = { type: 'ai', content: "Sorry, I couldn't process that query about this file. Please try again." };
      setFileChats(prev => ({
        ...prev,
        [assetId]: [...(prev[assetId] || []), errMsg]
      }));
    }
  };

  // ─── Contextual Action Triggers ────────────────────────────────────────────
  const triggerContextualAction = async (actionName, promptText) => {
    if (!activeAsset) return;

    const userMsg = { type: 'user', content: promptText };
    const assetId = activeAsset._id;

    setFileChats(prev => ({
      ...prev,
      [assetId]: [...(prev[assetId] || []), userMsg]
    }));

    try {
      const res = await axios.post(`${API_URL}/api/assets/${assetId}/chat`, {
        message: promptText
      }, { withCredentials: true });

      const aiMsg = { type: 'ai', content: res.data.response };
      setFileChats(prev => ({
        ...prev,
        [assetId]: [...(prev[assetId] || []), aiMsg]
      }));
    } catch (err) {
      console.error("Contextual action chat error:", err);
    }
  };

  // ─── Favorite Toggle ───────────────────────────────────────────────────────
  const toggleFavorite = async (id) => {
    try {
      const res = await axios.put(`${API_URL}/api/assets/${id}/favorite`, {}, { withCredentials: true });
      dispatch(updateFile(res.data.asset));
    } catch (err) {
      console.error("Error favoriting asset:", err);
    }
  };

  // ─── Delete Asset ─────────────────────────────────────────────────────────
  const deleteAsset = async (id) => {
    if (!window.confirm("Are you sure you want to delete this folder or file?")) return;
    try {
      await axios.delete(`${API_URL}/api/assets/${id}`, { withCredentials: true });
      dispatch(removeFile(id));
      fetchStorageSummary();
      fetchAssets(activeTab, searchQuery, currentFolderId); // Trigger full re-fetch
    } catch (err) {
      console.error("Error deleting asset:", err);
    }
  };

  // ─── Collaborator Access Delegation (Sharing Engine) ──────────────────────
  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!shareEmail.trim() || !shareAsset) return;

    try {
      const res = await axios.post(`${API_URL}/api/shares/${shareAsset._id}/share`, {
        email: shareEmail.trim(),
        role: shareRole
      }, { withCredentials: true });

      setShareAsset(res.data.asset);
      dispatch(updateFile(res.data.asset));
      setShareEmail('');
      alert(`Shared successfully with ${shareEmail}`);
    } catch (err) {
      console.error("Sharing invite failed:", err);
      alert(err.response?.data?.message || "Failed to share asset");
    }
  };

  const handleUpdateLinkAccess = async (accessType) => {
    if (!shareAsset) return;

    try {
      const res = await axios.put(`${API_URL}/api/shares/${shareAsset._id}/link-access`, {
        publicLinkAccess: accessType
      }, { withCredentials: true });

      setShareAsset(res.data.asset);
      dispatch(updateFile(res.data.asset));
      setPublicAccess(accessType);
    } catch (err) {
      console.error("Link sharing update failed:", err);
      alert("Failed to update link sharing access");
    }
  };

  // ─── Logout ────────────────────────────────────────────────────────────────
  const handleTabChange = (tabName) => {
    dispatch(setActiveAssetContext(null));
    if (tabName === 'all') navigateToFolder(null);
    setActiveTab(tabName);
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true });
      navigate('/login');
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // ─── Dynamic URL Parser ────────────────────────────────────────────────────
  const getFileUrl = (url) => {
    if (url && url.startsWith('/')) {
      return `${API_URL}${url}`;
    }
    return url;
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const formatBytes = (bytes, decimals = 1) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getStorageGBUsed = () => {
    const gb = storageBytes / (1024 * 1024 * 1024);
    if (gb < 0.1) {
      const mb = storageBytes / (1024 * 1024);
      return `${mb.toFixed(1)} MB`;
    }
    return `${gb.toFixed(2)} GB`;
  };

  const getRelativeTime = (dateString) => {
    if (!dateString) return "just now";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays === 1) return "yesterday";
    if (diffDays < 30) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStorageCategoryShares = () => {
    let mediaBytes = 0;
    let docsBytes = 0;
    let otherBytes = 0;

    (files || []).forEach(file => {
      if (!file.isFolder) {
        const type = file.type || '';
        const size = file.size || 0;
        if (type.startsWith('image/') || type.startsWith('video/') || type.startsWith('audio/')) {
          mediaBytes += size;
        } else if (
          type.startsWith('text/') ||
          type.includes('pdf') ||
          type.includes('word') ||
          type.includes('excel') ||
          type.includes('powerpoint') ||
          type.includes('officedocument')
        ) {
          docsBytes += size;
        } else {
          otherBytes += size;
        }
      }
    });

    return {
      mediaMB: (mediaBytes / (1024 * 1024)).toFixed(1),
      docsMB: (docsBytes / (1024 * 1024)).toFixed(1),
      otherMB: (otherBytes / (1024 * 1024)).toFixed(1)
    };
  };

  const processUploadQueue = (filesList) => {
    if (!filesList || filesList.length === 0) return;
    const isBulk = filesList.length > 1;
    Array.from(filesList).forEach(file => {
      uploadSingleFile(file, isBulk);
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = (e) => {
    processUploadQueue(e.target.files);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    processUploadQueue(e.dataTransfer.files);
  };

  const cleanTag = (tag) => {
    if (!tag) return "";
    return tag.startsWith('#') ? tag.substring(1) : tag;
  };

  // ─── Chat Message Filename Link Parser ────────────────────────────────────
  const renderChatMessage = (content) => {
    if (!content || typeof content !== 'string') return content;
    
    let elements = [content];
    
    files.forEach(file => {
      if (file.isFolder) return;
      const escapedName = file.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedName}\\b`, 'g');
      
      const newElements = [];
      elements.forEach(el => {
        if (typeof el !== 'string') {
          newElements.push(el);
          return;
        }
        
        const parts = el.split(regex);
        if (parts.length === 1) {
          newElements.push(el);
        } else {
          parts.forEach((part, index) => {
            newElements.push(part);
            if (index < parts.length - 1) {
              newElements.push(
                <span 
                  key={`${file._id}-${index}`} 
                  className="chat-file-badge"
                  onClick={() => {
                    dispatch(setActiveAssetContext(file));
                    dispatch(setAnalysisStatus('completed'));
                    setIsAiOpen(true);
                  }}
                >
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {file.name}
                </span>
              );
            }
          });
        }
      });
      elements = newElements;
    });
    
    return elements;
  };

  const activeFileConversation = fileChats[activeAsset?._id] || [];
  
  // Separate folder and file arrays
  const folders = (files || []).filter(f => f.isFolder);
  const items = (files || []).filter(f => !f.isFolder);

  return (
    <div className="dashboard-root">
      
      {/* ───────────────────────────────────────────────────────────────────────
         1. Global Sidebar (Left Column)
         ─────────────────────────────────────────────────────────────────────── */}
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${isMobileSidebarOpen ? 'mobile-open' : ''}`}
        onClick={() => setIsMobileSidebarOpen(false)}
      ></div>

      <aside className={`sidebar-left ${isMobileSidebarOpen ? 'mobile-open' : ''}`} aria-label="Global sidebar">
        <div>
          <div className="sidebar-header">
            <div className="logo-icon-drive">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ color: '#fff' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="sidebar-brand-name">Sahil Drive</span>
              <span className="sidebar-brand-sub">AI Cloud Storage</span>
            </div>
          </div>

          <div className="upload-btn-container">
            <button className="upload-new-btn" onClick={triggerFileUpload}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Upload New
            </button>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </div>

          <nav className="sidebar-nav">
            <button
              className={`sidebar-nav-item ${activeTab === 'dashboard' && !activeAsset ? 'active' : ''}`}
              onClick={() => handleTabChange('dashboard')}
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Dashboard
            </button>
            <button
              className={`sidebar-nav-item ${activeTab === 'analytics' && !activeAsset ? 'active' : ''}`}
              onClick={() => handleTabChange('analytics')}
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
              Analytics
            </button>
            <button
              className={`sidebar-nav-item ${activeTab === 'mega-link' && !activeAsset ? 'active' : ''}`}
              onClick={() => { dispatch(setActiveAssetContext(null)); setActiveTab('mega-link'); setIsMobileSidebarOpen(false); }}
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Mega Link
            </button>
            <button
              className={`sidebar-nav-item ${activeTab === 'all' && !activeAsset ? 'active' : ''}`}
              onClick={() => handleTabChange('all')}
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Recents
            </button>
            <button
              className={`sidebar-nav-item ${activeTab === 'favorites' && !activeAsset ? 'active' : ''}`}
              onClick={() => handleTabChange('favorites')}
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.906a1 1 0 00.95-.69l1.519-4.674z" />
              </svg>
              Starred
            </button>
            <button
              className={`sidebar-nav-item ${activeTab === 'shared' && !activeAsset ? 'active' : ''}`}
              onClick={() => { dispatch(setActiveAssetContext(null)); setActiveTab('shared'); }}
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Shared
            </button>

          </nav>
        </div>

        <div className="sidebar-footer">
          {user?.isMegaLinked && (
            <>
              <div className="storage-section" style={{ marginBottom: '0.75rem' }}>
                <div className="storage-header">
                  <span>Cloud Utilization</span>
                  <span>{getStorageGBUsed()} / 20 GB</span>
                </div>
                <div className="storage-bar-bg">
                  <div
                    className="storage-bar-fill"
                    style={{ width: `${Math.min(100, (storageBytes / (20 * 1024 * 1024 * 1024)) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <button className="gradient-btn" style={{ width: '100%', marginBottom: '1rem', borderRadius: '12px', fontSize: '0.85rem' }} onClick={() => alert("Premium upgrade under construction.")}>
                Upgrade Storage
              </button>
            </>
          )}

          <button className="sidebar-footer-btn" onClick={() => alert("Settings Integration Coming Soon!")}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
          <button className="sidebar-footer-btn" onClick={() => alert("Contact support at support@sahildrive.com")}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Support
          </button>
        </div>
      </aside>

      {/* ───────────────────────────────────────────────────────────────────────
         2. Main Canvas Explorer (Center Workspace)
         ─────────────────────────────────────────────────────────────────────── */}
      <main className="main-canvas" role="main" style={{ position: 'relative' }}>
        
        {/* Bulk Selection Sticky Bar */}
        {selectedAssets.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--brand-primary)',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '30px',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            zIndex: 100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            fontWeight: '500'
          }}>
            <span>{selectedAssets.length} item{selectedAssets.length !== 1 ? 's' : ''} selected</span>
            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.3)' }}></div>
            <button 
              onClick={() => setIsMoveModalOpen(true)}
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Move
            </button>
            <button 
              onClick={() => setSelectedAssets([])}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', marginLeft: '10px' }}
              title="Clear Selection"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Header Bar */}
        <header className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '10px', minWidth: 0 }}>
            <button 
              className="mobile-menu-btn" 
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Open menu"
              style={{ flexShrink: 0 }}
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="search-container" style={{ minWidth: '100px' }}>
              <svg className="search-icon-svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Search your digital universe…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="top-bar-actions" style={{ flexShrink: 0 }}>
            <button 
              className={`gradient-btn ${isAiOpen ? 'active' : ''}`} 
              onClick={() => setIsAiOpen(!isAiOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: isAiOpen ? 'linear-gradient(135deg, #4B5563, #374151)' : 'linear-gradient(135deg, #8B5CF6, #3B82F6)', color: '#fff', border: 'none', padding: '0 1rem', height: '36px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', marginRight: '0.5rem', whiteSpace: 'nowrap' }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Sahil GPT
            </button>

            <button className="icon-action-btn" aria-label="Notifications" onClick={() => alert("No new notifications")} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            <div style={{ position: 'relative' }}>
              <button 
                className="profile-badge-btn" 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  padding: '5px 12px 5px 5px',
                  borderRadius: '30px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                <div 
                  className="profile-initials-circle"
                  style={{
                    background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
                    color: '#fff',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '600',
                    fontSize: '0.85rem'
                  }}
                >
                  {user?.fullName?.firstName && user?.fullName?.lastName
                    ? `${user.fullName.firstName[0]}${user.fullName.lastName[0]}`.toUpperCase()
                    : "SU"}
                </div>
                <span 
                  className="profile-name-text"
                  style={{
                    color: '#E5E7EB',
                    fontWeight: '500',
                    fontSize: '0.9rem'
                  }}
                >
                  {user?.fullName?.firstName && user?.fullName?.lastName
                    ? `${user.fullName.firstName} ${user.fullName.lastName}`
                    : "Sahil User"}
                </span>
              </button>
              {profileDropdownOpen && (
                <div className="profile-dropdown">
                  <span style={{ padding: '0.6rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--glass-border)' }}>
                    {user?.fullName?.firstName && user?.fullName?.lastName
                      ? `${user.fullName.firstName} ${user.fullName.lastName}`
                      : "User Profile"}
                  </span>
                  <button className="dropdown-item" onClick={() => { setProfileDropdownOpen(false); alert("Account settings are secure."); }}>My Account</button>
                  <button className="dropdown-item" style={{ color: '#f87171' }} onClick={handleLogout}>Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Canvas Workspace */}
        <div className="canvas-content">
          
          {/* Breadcrumbs trail */}
          {activeTab !== 'dashboard' && (
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <span className="breadcrumb-item" onClick={() => navigateToFolder(null)}>My Drive</span>
              {folderPath.map((folder, index) => (
                <React.Fragment key={folder._id}>
                  <span className="breadcrumb-separator">&gt;</span>
                  <span 
                    className={`breadcrumb-item ${index === folderPath.length - 1 && !activeAsset ? 'active' : ''}`}
                    onClick={() => navigateToFolder(folder._id, folder.name)}
                  >
                    {folder.name}
                  </span>
                </React.Fragment>
              ))}
              {activeAsset && (
                <>
                  <span className="breadcrumb-separator">&gt;</span>
                  <span className="breadcrumb-item active">{activeAsset.name}</span>
                </>
              )}
            </nav>
          )}

          {/* ─── CASE A: File detail / analysis panel view ────────────────── */}
          {activeAsset ? (
            <div className="detail-view-container">
              <div className="detail-media-card">
                
                {/* Simulated AI analysis overlays */}
                {analysisStatus === 'analyzing' && (
                  <div className="ai-processing-overlay">
                    <div className="spinner-container">
                      <div className="spinner-ring"></div>
                      <div className="spinner-icon-wrapper">
                        <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="ai-processing-title">Analyzing Visual Content</h3>
                    <p className="ai-processing-desc">Sahil AI is processing objects, lighting, and metadata...</p>
                    <div className="ai-progress-bar-container">
                       <div className="ai-progress-bar-bg">
                        <div className="ai-progress-bar-fill" style={{ width: `${analysisProgress}%` }}></div>
                      </div>
                      <span className="ai-progress-percentage">{analysisProgress}% Complete</span>
                    </div>
                  </div>
                )}

                {/* Main Media Preview Render */}
                {activeAsset.type && activeAsset.type.startsWith('video/') ? (
                  <video
                    src={getFileUrl(activeAsset.url)}
                    crossOrigin="use-credentials"
                    controls
                    className="detail-video-player"
                    poster="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800"
                  />
                ) : (
                  <img src={getFileUrl(activeAsset.url)} crossOrigin="use-credentials" alt={activeAsset.name} className="detail-media" />
                )}
              </div>

              {/* Three Metadata details panels */}
              <div className="metadata-grid">
                <div className="metadata-panel">
                  <div className="metadata-panel-icon">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="metadata-panel-content">
                    <span className="metadata-panel-label">File Type</span>
                    <span className="metadata-panel-value">
                      {activeAsset.type && activeAsset.type.startsWith('video/') ? 'MP4 Video' : 'JPEG Image'}
                    </span>
                    <span className="metadata-panel-subvalue">({formatBytes(activeAsset.size)})</span>
                  </div>
                </div>

                <div className="metadata-panel">
                  <div className="metadata-panel-icon">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                    </svg>
                  </div>
                  <div className="metadata-panel-content">
                    <span className="metadata-panel-label">Resolution</span>
                    <span className="metadata-panel-value">{activeAsset.resolution || "Unknown"}</span>
                    <span className="metadata-panel-subvalue">
                      {activeAsset.type && activeAsset.type.startsWith('video/') ? '(1080p)' : '(4K)'}
                    </span>
                  </div>
                </div>

                <div className="metadata-panel">
                  <div className="metadata-panel-icon">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="metadata-panel-content">
                    <span className="metadata-panel-label">Upload Date</span>
                    <span className="metadata-panel-value">
                      {new Date(activeAsset.createdAt || Date.now()).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                    <span className="metadata-panel-subvalue">Cloud Storage Secured</span>
                  </div>
                </div>
              </div>
            </div>

          ) : activeTab === 'analytics' ? (
            /* ─── CASE C: Dynamic Analytics Workspace ─────────────────────── */
            <AnalyticsEngine socket={socket} />
          ) : activeTab === 'mega-link' ? (
            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'white' }}>
              <div style={{ background: 'var(--surface-secondary)', padding: '3rem', borderRadius: '16px', textAlign: 'center', maxWidth: '500px', width: '100%', border: '1px solid var(--border-subtle)' }}>
                {user?.isMegaLinked ? (
                  <>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(76, 175, 80, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'white' }}>MEGA Account Connected</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
                      Your Sahil Drive is actively synced with your MEGA account. Your files are securely encrypted and stored with 20GB of cloud capacity.
                    </p>
                    <button 
                      onClick={handleUnlinkMega}
                      className="action-btn"
                      style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)', width: '100%', padding: '0.8rem' }}
                    >
                      Disconnect Account
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand-primary)' }}>
                        <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                      </svg>
                    </div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'white' }}>No MEGA Account Linked</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
                      Link your MEGA account to unlock 20GB of secure cloud storage for your digital universe.
                    </p>
                    <button 
                      onClick={() => setIsMegaModalOpen(true)}
                      className="gradient-btn"
                      style={{ width: '100%', padding: '0.8rem', borderRadius: '8px' }}
                    >
                      Connect MEGA Account
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : activeTab === 'dashboard' ? (
            <div className="dashboard-view">
              <div className="dashboard-welcome-banner">
                <h2>Welcome Back, {user?.fullName?.firstName || "Explorer"}</h2>
                <p>Your digital universe is synchronized and running at peak performance.</p>
              </div>

              <div className="dashboard-widgets-grid">
                
                {/* 1. Liquid Capacity Widget */}
                <div className="liquid-capacity-card glass-card">
                  <div>
                    <h3 className="widget-title">Liquid Capacity</h3>
                    <p className="widget-desc">Your digital environment is flowing smoothly. {getStorageGBUsed()} of 20 GB used.</p>
                  </div>
                  
                  <div className="liquid-progress-bar-wrapper">
                    <div className="liquid-progress-bar-bg">
                      <div 
                        className="liquid-progress-bar-fill" 
                        style={{ width: `${Math.min(100, (storageBytes / (20 * 1024 * 1024 * 1024)) * 100)}%` }}
                      ></div>
                    </div>
                    
                    <div className="liquid-progress-labels">
                      <div className="liquid-progress-label-item">
                        <span className="liquid-progress-dot media"></span>
                        <span>Media ({getStorageCategoryShares().mediaMB || '0.0'} MB)</span>
                      </div>
                      <div className="liquid-progress-label-item">
                        <span className="liquid-progress-dot docs"></span>
                        <span>Documents ({getStorageCategoryShares().docsMB || '0.0'} MB)</span>
                      </div>
                      <div className="liquid-progress-label-item">
                        <span className="liquid-progress-dot other"></span>
                        <span>Other ({getStorageCategoryShares().otherMB || '0.0'} MB)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Sync Anything Widget */}
                <div 
                  className={`sync-anything-card glass-card ${dragActive ? 'drag-active' : ''}`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="sync-dropzone-inner" onClick={triggerFileUpload}>
                    <svg className="sync-upload-icon" width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                    </svg>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: '600', margin: '0 0 0.25rem 0', color: '#ffffff' }}>Sync Anything</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0' }}>Drag and drop files here to upload instantly</p>
                    <button type="button" className="sync-upload-btn" onClick={(e) => { e.stopPropagation(); triggerFileUpload(); }}>
                      Browse Local Files
                    </button>
                  </div>
                </div>

              </div>

              {/* 3. Suggested Activity */}
              <div className="suggested-activity-section">
                <div className="suggested-activity-header">
                  <h3>Suggested Activity</h3>
                  <a href="#all" className="suggested-activity-link" onClick={(e) => { e.preventDefault(); setActiveTab('all'); }}>
                    View all files
                  </a>
                </div>

                {([...files].filter(f => !f.isFolder).length === 0) ? (
                  <div className="empty-state" style={{ padding: '2.5rem 0', background: 'rgba(255, 255, 255, 0.01)', borderRadius: '20px', border: '1px dashed rgba(255, 255, 255, 0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifycontent: 'center' }}>
                    <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', opacity: 0.5 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                    </svg>
                    <p className="empty-desc" style={{ fontSize: '0.85rem' }}>No recent file uploads. Start uploading to see suggestions here!</p>
                  </div>
                ) : (
                  <div className="suggested-activity-grid">
                    {[...files]
                      .filter(f => !f.isFolder)
                      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                      .slice(0, 3)
                      .map(file => {
                        const isVideo = file.type?.startsWith('video/');
                        const isImage = file.type?.startsWith('image/');
                        return (
                          <div 
                            key={file._id} 
                            className="suggested-activity-card glass-card clickable"
                            onClick={() => dispatch(setActiveAssetContext(file))}
                          >
                            <div className="suggested-card-thumbnail-container">
                              {isImage ? (
                                <img src={getFileUrl(file.url)} crossOrigin="use-credentials" alt={file.name} className="suggested-card-thumbnail" />
                              ) : isVideo ? (
                                <>
                                  <img src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800" alt={file.name} className="suggested-card-thumbnail" />
                                  <div className="suggested-video-play-overlay">
                                    <div className="suggested-play-button">
                                      <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                      </svg>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="suggested-card-icon-wrapper">
                                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            
                            <div className="suggested-card-details">
                              <h4 className="suggested-card-title" title={file.name}>{file.name}</h4>
                              <span className="suggested-card-meta">
                                {getRelativeTime(file.createdAt)} • {formatBytes(file.size)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            
            /* ─── CASE B: Explorer layout of files & folders ─────────────────── */
            <>
              {/* Toolbar Section (View toggles and New Folder) */}
              <div className="toolbar-row">
                <div className="action-bar-left" style={{ display: 'flex', gap: '0.5rem' }}>
                  {activeTab === 'all' && (
                    <button className="new-folder-btn" onClick={() => setIsCreateFolderOpen(true)}>
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      New Folder
                    </button>
                  )}
                  <button className="action-btn upload" onClick={() => {
                    if (!user?.isMegaLinked) {
                      setIsMegaModalOpen(true);
                      return;
                    }
                    document.getElementById('file-upload-input').click();
                  }} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '0.35rem' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload File
                  </button>
                </div>
                
                <div className="view-toggle-btns">
                  <button 
                    className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Grid view"
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Grid
                  </button>
                  <button 
                    className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setViewMode('list')}
                    title="List view"
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    List
                  </button>
                </div>
              </div>

              {files.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <h3 className="empty-title">No assets found</h3>
                  <p className="empty-desc">Upload files or create folders to start storing and organizing media with AI power.</p>
                </div>
              ) : (
                <>
                  {viewMode === 'list' ? (
                    /* ─── List View (Table Structure) ─── */
                    <div className="list-view-container">
                      <table className="list-view-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Size</th>
                            <th>Modified</th>
                            <th>Tags</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Folders first */}
                          {folders.map(folder => (
                            <tr 
                              key={folder._id} 
                              className="list-view-row"
                              onDoubleClick={() => navigateToFolder(folder._id, folder.name)}
                            >
                              <td>
                                <div className="list-item-name-cell">
                                  <span className="list-item-icon folder">
                                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                                    </svg>
                                  </span>
                                  <span className="list-item-name-text" title={folder.name}>{folder.name}</span>
                                </div>
                              </td>
                              <td>Folder</td>
                              <td>--</td>
                              <td>{new Date(folder.updatedAt).toLocaleDateString()}</td>
                              <td>--</td>
                              <td>
                                <div className="list-action-btns">
                                  <button 
                                    className="list-action-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShareAsset(folder);
                                      setPublicAccess(folder.publicLinkAccess || 'restricted');
                                      setShareEmail('');
                                      setShareRole('viewer');
                                      setIsShareModalOpen(true);
                                    }}
                                    title="Share"
                                  >
                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742l-2.777 1.111m0 0A3.001 3.001 0 113 7.5m3.41 5.5h2.18m2.18 0l2.777-1.11m0 0a3 3 0 10-5.556-1.03l2.777 1.111M21 16.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                  </button>
                                  <button 
                                    className="list-action-btn delete"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteAsset(folder._id);
                                    }}
                                    title="Delete"
                                  >
                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          
                          {/* Files next */}
                          {items.map(file => (
                            <tr 
                              key={file._id} 
                              className="list-view-row"
                              onDoubleClick={() => {
                                dispatch(setActiveAssetContext(file));
                                dispatch(setAnalysisStatus('completed'));
                                setIsAiOpen(true);
                              }}
                            >
                              <td>
                                <div className="list-item-name-cell">
                                  <span className="list-item-icon file">
                                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </span>
                                  <span className="list-item-name-text" title={file.name}>{file.name}</span>
                                </div>
                              </td>
                              <td>{file.type ? file.type.split('/')[1]?.toUpperCase() : 'FILE'}</td>
                              <td>{formatBytes(file.size)}</td>
                              <td>{new Date(file.updatedAt).toLocaleDateString()}</td>
                              <td>
                                <div className="list-item-tags">
                                  {file.tags && file.tags.slice(0, 3).map((tag, idx) => (
                                    <span className="list-item-tag-badge" key={idx}>{cleanTag(tag)}</span>
                                  ))}
                                </div>
                              </td>
                              <td>
                                <div className="list-action-btns">
                                  <button 
                                    className="list-action-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      dispatch(setActiveAssetContext(file));
                                      dispatch(setAnalysisStatus('completed'));
                                      setIsAiOpen(true);
                                    }}
                                    title="Analyze with AI"
                                  >
                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                  </button>
                                  <a 
                                    href={getFileUrl(file.url)}
                                    download={file.name}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="list-action-btn"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Download"
                                  >
                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                  </a>
                                  <button 
                                    className="list-action-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShareAsset(file);
                                      setPublicAccess(file.publicLinkAccess || 'restricted');
                                      setShareEmail('');
                                      setShareRole('viewer');
                                      setIsShareModalOpen(true);
                                    }}
                                    title="Share"
                                  >
                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742l-2.777 1.111m0 0A3.001 3.001 0 113 7.5m3.41 5.5h2.18m2.18 0l2.777-1.11m0 0a3 3 0 10-5.556-1.03l2.777 1.111M21 16.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                  </button>
                                  <button 
                                    className="list-action-btn delete"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteAsset(file._id);
                                    }}
                                    title="Delete"
                                  >
                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* ─── Grid View (Card Structure) ─── */
                    <>
                      {folders.length > 0 && (
                        <div>
                          <h4 className="folders-section-title">Folders</h4>
                          <div className="folders-grid">
                            {folders.map(folder => (
                              <div 
                                className={`folder-card ${selectedAssets.includes(folder._id) ? 'selected' : ''}`}
                                key={folder._id}
                                onDoubleClick={() => navigateToFolder(folder._id, folder.name)}
                                style={{ position: 'relative', border: selectedAssets.includes(folder._id) ? '2px solid var(--brand-primary)' : '' }}
                                draggable="true"
                                onDragStart={(e) => handleDragStart(e, folder)}
                                onDragOver={handleDragOverFolder}
                                onDragLeave={handleDragLeaveFolder}
                                onDrop={(e) => handleDropOnFolder(e, folder._id)}
                              >
                                <input 
                                  type="checkbox" 
                                  className="bulk-select-checkbox"
                                  checked={selectedAssets.includes(folder._id)}
                                  onChange={(e) => toggleSelection(folder._id, e)}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10, transform: 'scale(1.2)', cursor: 'pointer' }}
                                />
                                <div className="folder-icon">
                                  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                                  </svg>
                                </div>
                                <span className="folder-name" title={folder.name}>{folder.name}</span>
                                <button 
                                  className="folder-action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShareAsset(folder);
                                    setPublicAccess(folder.publicLinkAccess || 'restricted');
                                    setShareEmail('');
                                    setShareRole('viewer');
                                    setIsShareModalOpen(true);
                                  }}
                                  title="Share Folder"
                                >
                                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742l-2.777 1.111m0 0A3.001 3.001 0 113 7.5m3.41 5.5h2.18m2.18 0l2.777-1.11m0 0a3 3 0 10-5.556-1.03l2.777 1.111M21 16.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                </button>
                                <button 
                                  className="folder-action-btn delete"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteAsset(folder._id);
                                  }}
                                  title="Delete Folder"
                                >
                                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {items.length > 0 && (
                        <div>
                          <h4 className="folders-section-title">Files</h4>
                          <div className="files-grid">
                            {items.map(file => (
                              <article 
                                className={`file-card ${selectedAssets.includes(file._id) ? 'selected' : ''}`}
                                key={file._id} 
                                aria-label={`File card for ${file.name}`} 
                                onClick={() => setPreviewAsset(file)}
                                style={{ position: 'relative', border: selectedAssets.includes(file._id) ? '2px solid var(--brand-primary)' : '' }}
                                draggable="true"
                                onDragStart={(e) => handleDragStart(e, file)}
                              >
                                <input 
                                  type="checkbox" 
                                  className="bulk-select-checkbox"
                                  checked={selectedAssets.includes(file._id)}
                                  onChange={(e) => toggleSelection(file._id, e)}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10, transform: 'scale(1.2)', cursor: 'pointer' }}
                                />
                                <div className="file-thumbnail-container">
                                  {file.type && file.type.startsWith('video/') ? (
                                    <>
                                      <div className="file-video-icon-wrapper">
                                        <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M8 5v14l11-7z" />
                                        </svg>
                                      </div>
                                      <span className="video-duration">Video</span>
                                    </>
                                  ) : file.type && file.type.startsWith('image/') ? (
                                    <img src={getFileUrl(file.url)} crossOrigin="use-credentials" alt={file.name} className="file-thumbnail" />
                                  ) : file.type === 'application/pdf' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                                      <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#e53935" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                      </svg>
                                      <span style={{ fontSize: '12px', marginTop: '8px' }}>PDF Document</span>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                                      <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                      </svg>
                                      <span style={{ fontSize: '12px', marginTop: '8px' }}>File</span>
                                    </div>
                                  )}

                                  <div className="file-card-overlay">
                                    <button
                                      className="overlay-action-btn ai"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        dispatch(setActiveAssetContext(file));
                                        dispatch(setAnalysisStatus('completed'));
                                        setIsAiOpen(true);
                                      }}
                                    >
                                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                      </svg>
                                      Analyze with AI
                                    </button>
                                    <a
                                      href={getFileUrl(file.url)}
                                      download={file.name}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="overlay-action-btn download"
                                      style={{ textDecoration: 'none' }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                      </svg>
                                      Download
                                    </a>
                                    <button className="overlay-action-btn delete" onClick={(e) => { e.stopPropagation(); deleteAsset(file._id); }}>
                                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      Delete
                                    </button>
                                  </div>
                                </div>

                                <div className="file-info">
                                  <div className="file-name-row">
                                    <span className="file-name-text" title={file.name}>{file.name}</span>
                                    <button
                                      className={`favorite-btn ${file.isFavorite ? 'active' : ''}`}
                                      onClick={() => toggleFavorite(file._id)}
                                      aria-label={file.isFavorite ? "Remove from favorites" : "Add to favorites"}
                                    >
                                      <svg width="16" height="16" fill={file.isFavorite ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.906a1 1 0 00.95-.69l1.519-4.674z" />
                                      </svg>
                                    </button>
                                  </div>
                                  <div className="file-tags-row">
                                    {file.tags && file.tags.slice(0, 3).map((tag, idx) => (
                                      <span className="file-tag-badge" key={idx}>{cleanTag(tag)}</span>
                                    ))}
                                  </div>
                                </div>
                              </article>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}

        </div>
      </main>

      {/* ───────────────────────────────────────────────────────────────────────
         3. Sahil AI Assistant Drawer (Right Column)
         ─────────────────────────────────────────────────────────────────────── */}
      <aside className={`sidebar-right ${!isAiOpen ? 'collapsed' : ''}`} aria-label="Sahil AI assistant drawer">
        
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-title-wrapper">
            <div className="drawer-title-icon">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ color: '#fff' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <span className="drawer-title">
                {activeAsset ? 'SAHIL AI' : 'Sahil AI'}
              </span>
              <div className="drawer-status">
                <span className="status-pulse-dot"></span>
                {activeAsset && analysisStatus === 'analyzing' ? 'Analyzing asset...' : 'ACTIVE SESSION'}
              </div>
            </div>
          </div>
          <button className="icon-action-btn" onClick={() => setIsAiOpen(false)} aria-label="Close Sahil AI">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer content conditional rendering */}
        {activeAsset && analysisStatus !== 'analyzing' ? (
          
          /* MODE A: Contextual Asset Detail View */
          <div className="drawer-chat-container">
            <div className="drawer-scroll-content">
              
              {/* Suggested Tags chips section */}
              {activeAsset.tags && activeAsset.tags.length > 0 && (
                <div>
                  <h4 className="drawer-section-title">Suggested Tags</h4>
                  <div className="drawer-chips-container">
                    {activeAsset.tags.map((tag, idx) => (
                      <button
                        key={idx}
                        className={`drawer-tag-chip ${checkedTags[tag] ? 'active-sparkle' : ''}`}
                        onClick={() => setCheckedTags(prev => ({ ...prev, [tag]: !prev[tag] }))}
                      >
                        {cleanTag(tag)}
                        {checkedTags[tag] && (
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Smart Summary card section */}
              <div>
                <h4 className="drawer-section-title">Smart Summary</h4>
                <div className="drawer-summary-card">
                  <div className="summary-card-glow"></div>
                  <div className="summary-header-row">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--color-text-cyan)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Smart Summary
                  </div>
                  <p className="summary-text">{activeAsset.summary}</p>
                </div>
              </div>

              {/* Contextual Actions section */}
              <div>
                <h4 className="drawer-section-title">Contextual Actions</h4>
                <div className="actions-list">
                  <button
                    className="action-card-btn"
                    onClick={() => triggerContextualAction("enhance", `Analyze and enhance ${activeAsset.name} to 8K resolution. Provide hex details and processing parameters.`)}
                  >
                    <span className="action-icon-wrapper">
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </span>
                    <div className="action-text-wrapper">
                      <span className="action-title">Enhance Quality</span>
                      <span className="action-desc">AI upscale to 8K resolution</span>
                    </div>
                  </button>

                  <button
                    className="action-card-btn"
                    onClick={() => triggerContextualAction("fill", `Perform Generative Fill beyond the borders of ${activeAsset.name}. Describe the aesthetic expansions.`)}
                  >
                    <span className="action-icon-wrapper">
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </span>
                    <div className="action-text-wrapper">
                      <span className="action-title">Generative Fill</span>
                      <span className="action-desc">Extend borders beyond frame</span>
                    </div>
                  </button>

                  <button
                    className="action-card-btn"
                    onClick={() => triggerContextualAction("colors", `Extract the hex codes and detailed color palette of ${activeAsset.name} for design implementation.`)}
                  >
                    <span className="action-icon-wrapper">
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    </span>
                    <div className="action-text-wrapper">
                      <span className="action-title">Color Palette</span>
                      <span className="action-desc">Extract hex codes for designers</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Contextual Chat Conversation log */}
              {activeFileConversation.length > 0 && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border-dark)', paddingTop: '1.5rem' }}>
                  <h4 className="drawer-section-title">Contextual Chat</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {activeFileConversation.map((msg, idx) => (
                      <div key={idx} className={`drawer-chat-bubble ${msg.type}`}>
                        {msg.content}
                      </div>
                    ))}
                    <div ref={fileMessagesEndRef} />
                  </div>
                </div>
              )}

            </div>

            {/* Chat message input for specific file */}
            <div className="drawer-chat-input-area">
              <div className="chat-input-box-wrapper">
                <input
                  type="text"
                  className="drawer-chat-input"
                  placeholder="Ask anything about this file..."
                  value={fileChatInput}
                  onChange={(e) => setFileChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleFileChatSend(); }}
                />
                <button className="chat-send-btn" onClick={handleFileChatSend} aria-label="Send message about file">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
              <span className="drawer-footer-branding">SAHIL GPT-4O</span>
            </div>
          </div>
        ) : (
          
          /* MODE B: General Active Session Chat */
          <div className="drawer-chat-container">
            <div className="drawer-chat-history">
              {generalMessages.length === 0 ? (
                <div className="ai-empty-state">
                  <div className="ai-empty-shield-container">
                    <div className="ai-empty-shield-glow"></div>
                    <svg className="ai-empty-shield-icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  <h3 className="ai-empty-title">How can I accelerate your workflow?</h3>
                  <p className="ai-empty-subtitle">I can analyze your cloud storage documents, generate summaries, or help you find specific files using natural language.</p>
                </div>
              ) : (
                generalMessages.map((msg, idx) => (
                  <div key={idx} className={`drawer-chat-bubble ${msg.type}`}>
                    <span className={`bubble-role-badge ${msg.type}`}>
                      {msg.type === 'user' ? 'SA' : 'Sahil AI'}
                    </span>
                    <div className="bubble-content-text">
                      {renderChatMessage(msg.content)}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick chips triggers */}
            <div className="quick-chips-wrapper">
              <button
                className="quick-chip-btn"
                onClick={() => { dispatch(setInput("Find similar visual assets inside my active folder context.")); }}
              >
                Summarize Folder
              </button>
              {items.length > 0 && (
                <button
                  className="quick-chip-btn"
                  onClick={() => { dispatch(setInput(`/summarize ${items[0].name}`)); }}
                >
                  /summarize {items[0].name}
                </button>
              )}
              <button
                className="quick-chip-btn"
                onClick={() => { dispatch(setInput("Explain what files are currently in this folder.")); }}
              >
                What's in here?
              </button>
            </div>

            {/* General chat text box input */}
            <div className="drawer-chat-input-area">
              <div className="chat-input-box-wrapper">
                <button
                  className={`mic-btn ${isListening ? 'listening' : ''}`}
                  onClick={toggleListening}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isListening ? '#ef4444' : '#a1a1aa',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.25rem'
                  }}
                  title={isListening ? "Listening... Click to stop" : "Start Voice Input"}
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </button>
                <input
                  type="text"
                  className="drawer-chat-input"
                  placeholder="Message Sahil GPT..."
                  value={chatInput}
                  onChange={(e) => dispatch(setInput(e.target.value))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleGeneralChatSend(); }}
                  disabled={isSending}
                  style={{ paddingLeft: '0.5rem', paddingRight: '0.5rem' }}
                />
                <button
                  className="tts-toggle-btn"
                  onClick={() => setTtsEnabled(!ttsEnabled)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: ttsEnabled ? '#7c3aed' : '#a1a1aa',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.25rem'
                  }}
                  title={ttsEnabled ? "Mute Voice Feedback" : "Unmute Voice Feedback"}
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    {ttsEnabled ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-3h2.24l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H6.75c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 014.5 12c0-.83.112-1.633.322-2.396C5.056 8.756 5.88 8.25 6.75 8.25z" />
                    )}
                  </svg>
                </button>
                <button
                  className="chat-send-btn"
                  onClick={handleGeneralChatSend}
                  disabled={isSending || !chatInput.trim()}
                  aria-label="Send message to assistant"
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
              <span className="chat-input-footer-hint">Enter ↵ to send • Type /summarize [filename]</span>
            </div>
          </div>
        )}

      </aside>

      {/* ───────────────────────────────────────────────────────────────────────
         Mega Connect Modal
         ─────────────────────────────────────────────────────────────────────── */}
      {isMegaModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Connect MEGA Storage</h3>
              <button 
                type="button" 
                onClick={() => setIsMegaModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: '1', padding: '0 0.5rem' }}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleMegaLink}>
              <div className="modal-body">
                <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
                  To start storing files, link your MEGA account securely. This is required for your Sahil Drive session.
                </p>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>MEGA Email</label>
                  <input
                    type="email"
                    className="modal-input"
                    value={megaEmailInput}
                    onChange={(e) => setMegaEmailInput(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: '#fff' }}
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>MEGA Password</label>
                  <input
                    type={showMegaPassword ? "text" : "password"}
                    className="modal-input"
                    value={megaPasswordInput}
                    onChange={(e) => setMegaPasswordInput(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.75rem', paddingRight: '2.5rem', borderRadius: '8px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: '#fff' }}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowMegaPassword(!showMegaPassword)}
                    style={{ position: 'absolute', right: '0.75rem', top: '2.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    {showMegaPassword ? (
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Don't have an account? </span>
                  <a href="https://mega.nz/register" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-primary)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: '500' }}>Create one here</a>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#9CA3AF', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '6px' }}>
                    <strong>Note:</strong> This opens MEGA in a new tab. Once you have created and verified your account, <strong>return to this tab</strong> and enter your credentials above to connect!
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="action-btn upload" disabled={megaLinking}>
                  {megaLinking ? "Connecting..." : "Connect Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
         Mega Success Modal
         ─────────────────────────────────────────────────────────────────────── */}
      {isMegaSuccessModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '400px', textAlign: 'center', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(76, 175, 80, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#4CAF50" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h3 style={{ marginBottom: '1rem' }}>Success!</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Your MEGA account has been linked successfully. You can now securely store and manage your files on Sahil Drive.
            </p>
            <button 
              className="action-btn upload" 
              onClick={() => setIsMegaSuccessModalOpen(false)}
              style={{ width: '100%' }}
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
         Interactive File Viewer Modal
         ─────────────────────────────────────────────────────────────────────── */}
      {previewAsset && (
        <FileViewer 
          asset={previewAsset} 
          onClose={() => setPreviewAsset(null)} 
          getFileUrl={getFileUrl} 
        />
      )}

      {/* ───────────────────────────────────────────────────────────────────────
         4. Create Folder Modal Dialog
         ─────────────────────────────────────────────────────────────────────── */}
      {isCreateFolderOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateFolderOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Create Folder</span>
              <button className="modal-close-btn" onClick={() => setIsCreateFolderOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateFolder}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="folderName">Folder Name</label>
                  <input
                    type="text"
                    id="folderName"
                    className="form-input"
                    placeholder="New Folder"
                    value={folderNameInput}
                    onChange={(e) => setFolderNameInput(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsCreateFolderOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
         5. Access Delegation (Sharing Permissions) Modal
         ─────────────────────────────────────────────────────────────────────── */}
      {isShareModalOpen && shareAsset && (
        <div className="modal-overlay" onClick={() => setIsShareModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title" style={{ maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Share "{shareAsset.name}"
              </span>
              <button className="modal-close-btn" onClick={() => setIsShareModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              {/* Invite User Form */}
              <form onSubmit={handleInviteUser} className="form-group">
                <label className="form-label">Add people by email</label>
                <div className="invite-input-row">
                  <input
                    type="email"
                    className="form-input"
                    placeholder="user@example.com"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    required
                  />
                  <select 
                    className="form-select" 
                    value={shareRole} 
                    onChange={(e) => setShareRole(e.target.value)}
                    style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="commenter">Commenter</option>
                    <option value="editor">Editor</option>
                  </select>
                  <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Invite</button>
                </div>
              </form>

              {/* Shared Users List */}
              {shareAsset.sharedUsers && shareAsset.sharedUsers.length > 0 && (
                <div className="share-section">
                  <span className="share-section-title">People with access</span>
                  <div className="shared-users-list">
                    {shareAsset.sharedUsers.map((item, idx) => (
                      <div className="shared-user-item" key={idx}>
                        <span className="shared-user-email">{item.email}</span>
                        <span className="shared-user-role">{item.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Public Link Sharing configuration */}
              <div className="share-section" style={{ borderTop: '1px solid var(--color-border-dark)', paddingTop: '1rem' }}>
                <span className="share-section-title">General Link Access</span>
                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    Anyone with the link can:
                  </span>
                  <select
                    className="form-select"
                    value={publicAccess}
                    onChange={(e) => handleUpdateLinkAccess(e.target.value)}
                    style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                  >
                    <option value="restricted">Restricted (Owner only)</option>
                    <option value="view">View</option>
                    <option value="comment">Comment</option>
                    <option value="edit">Edit</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-primary" onClick={() => setIsShareModalOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
         6. Floating Sequential Chunk Upload Progress Monitor
         ─────────────────────────────────────────────────────────────────────── */}
      {activeUploads.length > 0 && (
        <div className="upload-monitor-card">
          <div className="upload-monitor-header">
            <span>Uploading {activeUploads.length} item{activeUploads.length > 1 ? 's' : ''}</span>
            <button className="upload-monitor-close" onClick={() => setActiveUploads([])}>×</button>
          </div>
          <div className="upload-monitor-list">
            {activeUploads.map(up => (
              <div className="upload-monitor-item" key={up.id}>
                <div className="upload-monitor-item-info">
                  <span className="upload-monitor-item-name" title={up.name}>{up.name}</span>
                  <span className="upload-monitor-item-status">
                    {up.status === 'failed' ? (
                      <span className="text-red">Failed</span>
                    ) : (
                      `${up.progress}% ${up.totalChunks > 1 ? `(chunk ${up.chunksUploaded}/${up.totalChunks})` : ''}`
                    )}
                  </span>
                </div>
                <div className="upload-monitor-progress-bar-bg">
                  <div 
                    className={`upload-monitor-progress-bar-fill ${up.status === 'failed' ? 'failed' : ''}`}
                    style={{ width: `${up.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
         Move Modal
         ─────────────────────────────────────────────────────────────────────── */}
      {isMoveModalOpen && (
        <MoveModal 
          folders={files.filter(f => f.isFolder)}
          currentFolderId={currentFolderId}
          onClose={() => setIsMoveModalOpen(false)}
          onMove={handleBulkMove}
        />
      )}

    </div>
  );
};

export default Home;
