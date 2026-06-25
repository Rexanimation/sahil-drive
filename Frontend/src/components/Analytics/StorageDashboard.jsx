import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import axios from 'axios';
import { API_URL } from '../../config';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658', '#999999'];

const StorageDashboard = () => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/analytics`, { withCredentials: true });
                setAnalytics(res.data);
            } catch (err) {
                console.error("Failed to fetch analytics", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading || !analytics) {
        return <div className="p-4">Loading analytics...</div>;
    }

    const { storage, fileTypes, largestFiles, recentUploads, storageTrend } = analytics;

    const pieData = Object.entries(fileTypes).map(([name, data]) => ({
        name,
        value: data.size
    })).filter(d => d.value > 0);

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="analytics-dashboard" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '20px' }}>
            {/* Storage Summary */}
            <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <h3>Storage Overview</h3>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{formatBytes(storage.used)} / {formatBytes(storage.total)}</div>
                <div style={{ marginTop: '10px', background: '#e0e0e0', borderRadius: '5px', height: '10px', width: '100%' }}>
                    <div style={{ background: '#4CAF50', height: '100%', borderRadius: '5px', width: `${storage.percentage}%` }}></div>
                </div>
                <p>{storage.percentage}% used</p>
                <p>Trash Size: {formatBytes(storage.trashSize)}</p>
            </div>

            {/* File Types Breakdown (Pie Chart) */}
            <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', height: '300px' }}>
                <h3>Storage Breakdown</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label={({ name }) => name}>
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatBytes(value)} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Storage Trend (Bar Chart) */}
            <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', height: '300px' }}>
                <h3>Storage Trend</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={storageTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value) => formatBytes(value)} width={80} />
                        <Tooltip formatter={(value) => formatBytes(value)} />
                        <Bar dataKey="usage" fill="#8884d8" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Largest Files */}
            <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <h3>Largest Files</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {largestFiles.map((f, i) => (
                        <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{f.name}</span>
                            <span>{formatBytes(f.size)}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default StorageDashboard;
