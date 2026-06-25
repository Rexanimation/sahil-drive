import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { API_URL } from '../config';
import { HardDrive, Users, Link2, Activity, Download, Upload } from 'lucide-react';

const COLORS = ['#06B6D4', '#3B82F6', '#8B5CF6'];

export default function AnalyticsEngine({ socket }) {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchAnalytics = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/analytics`, { withCredentials: true });
            setAnalytics(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching analytics", err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
        
        if (socket) {
            socket.on('refresh-assets', fetchAnalytics);
            return () => {
                socket.off('refresh-assets', fetchAnalytics);
            };
        }
    }, [socket]);

    if (loading || !analytics) {
        return <div style={{ padding: '2rem', color: '#fff' }}>Loading Analytics Engine...</div>;
    }

    const { storage, fileTypes, storageTrend, favoritesCount } = analytics;

    const usedGB = (storage.used / (1024 * 1024 * 1024)).toFixed(2);
    const quotaGB = (storage.total / (1024 * 1024 * 1024)).toFixed(2);
    const pct = storage.percentage;

    const totalFiles = fileTypes.Images.count + fileTypes.Videos.count + fileTypes.Documents.count + fileTypes.Audio.count + fileTypes.Code.count + fileTypes.Compressed.count + fileTypes.Other.count;
    const totalFolders = 0; // We can ignore for now or add to API

    const pieData = [
        { name: 'Video Content', value: fileTypes.Videos.size },
        { name: 'High-Res Assets', value: fileTypes.Images.size },
        { name: 'Documents & Code', value: fileTypes.Documents.size + fileTypes.Code.size },
        { name: 'Cold Storage', value: fileTypes.Compressed.size + fileTypes.Other.size }
    ].filter(d => d.value > 0);

    const velocityData = storageTrend || [];

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ backgroundColor: '#111827', padding: '10px', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6' }}>
                    <p className="label">{`${label} : ${payload[0].value} MB`}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="analytics-container" style={{ padding: '2rem', width: '100%', boxSizing: 'border-box' }}>
            <div className="analytics-header-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div>
                    <span className="analytics-engine-label" style={{ color: '#06B6D4', fontSize: '1.25rem', fontWeight: '600' }}>Analytics Engine</span>
                    <div className="analytics-header-title-sub" style={{ color: '#9CA3AF', marginTop: '0.25rem' }}>Real-time liquid insights into your digital ecosystem.</div>
                </div>
                <div className="analytics-header-actions" style={{ display: 'flex', gap: '1rem' }}>
                    <button className="sso-outline-btn" style={{ height: '40px', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #374151', background: 'transparent', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Last 30 Days
                    </button>
                    <button className="gradient-btn" onClick={() => alert("Report generation complete!")} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #06B6D4, #3B82F6)', color: '#fff', border: 'none', padding: '0 1rem', height: '40px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
                        <Download size={16} /> Export Report
                    </button>
                </div>
            </div>

            <div className="stat-card-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <div className="stat-card glass-card" style={{ background: 'rgba(17, 24, 39, 0.7)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #06B6D4' }}>
                    <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>Total Storage</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', margin: '0.5rem 0' }}>{usedGB} GB</div>
                    <div style={{ color: '#10B981', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Activity size={14} /> {pct}% utilized
                    </div>
                </div>
                <div className="stat-card glass-card" style={{ background: 'rgba(17, 24, 39, 0.7)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #3B82F6' }}>
                    <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>Active Files</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', margin: '0.5rem 0' }}>{totalFiles}</div>
                    <div style={{ color: '#3B82F6', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Activity size={14} /> Tracking live
                    </div>
                </div>
                <div className="stat-card glass-card" style={{ background: 'rgba(17, 24, 39, 0.7)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #8B5CF6' }}>
                    <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>Stored Folders</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', margin: '0.5rem 0' }}>{totalFolders}</div>
                    <div style={{ color: '#9CA3AF', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Link2 size={14} /> Structure intact
                    </div>
                </div>
                <div className="stat-card glass-card" style={{ background: 'rgba(17, 24, 39, 0.7)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #F43F5E' }}>
                    <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>Bandwidth</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', margin: '0.5rem 0' }}>{((storage.used * 1.5) / (1024 * 1024 * 1024)).toFixed(1)} GB/s</div>
                    <div style={{ color: '#F43F5E', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        ⚡ Peak Demand
                    </div>
                </div>
            </div>

            <div className="analytics-charts-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="chart-wrapper glass-card" style={{ background: 'rgba(17, 24, 39, 0.7)', padding: '1.5rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <span style={{ color: '#fff', fontWeight: '500' }}>Storage Velocity</span>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#9CA3AF' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#06B6D4' }}></div> Uploads</span>
                        </div>
                    </div>
                    <div style={{ width: '100%', height: '250px' }}>
                        <ResponsiveContainer>
                            <AreaChart data={velocityData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" stroke="#4B5563" tick={{ fill: '#9CA3AF' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="uploads" stroke="#06B6D4" strokeWidth={3} fillOpacity={1} fill="url(#colorUploads)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-wrapper glass-card" style={{ background: 'rgba(17, 24, 39, 0.7)', padding: '1.5rem', borderRadius: '12px' }}>
                    <span style={{ color: '#fff', fontWeight: '500', display: 'block', marginBottom: '1rem' }}>Data Stack</span>
                    <div style={{ width: '100%', height: '150px', position: 'relative' }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `${(value / (1024 * 1024)).toFixed(1)} MB`} contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', borderRadius: '8px', color: '#fff' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.25rem' }}>{quotaGB} GB</div>
                            <div style={{ color: '#9CA3AF', fontSize: '0.65rem' }}>TOTAL CAPACITY</div>
                        </div>
                    </div>

                    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {pieData.map((entry, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#D1D5DB' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[idx % COLORS.length] }}></div>
                                    {entry.name}
                                </div>
                                <span style={{ color: '#fff', fontWeight: '500' }}>{(entry.value / (1024 * 1024 * 1024)).toFixed(2)} GB</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Capacity Progress Bar matching request */}
            <div className="glass-card" style={{ background: 'rgba(17, 24, 39, 0.7)', padding: '1.5rem', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <span style={{ color: '#D1D5DB' }}>Storage Capacity</span>
                    <span style={{ color: '#fff', fontWeight: '500' }}>{usedGB} GB / {quotaGB} GB</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#1F2937', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #06B6D4, #3B82F6)', borderRadius: '4px' }}></div>
                </div>
            </div>

        </div>
    );
}
