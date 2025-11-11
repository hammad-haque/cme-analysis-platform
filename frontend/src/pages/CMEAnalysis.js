import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const CMEAnalysis = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState({ state: '', search: '' });
  
  useEffect(() => {
    fetchSessions();
  }, []);
  
  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cme/sessions');
      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Error fetching CME sessions:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusBadge = (status) => {
    const statusConfig = {
      'created': { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
      'recording_uploaded': { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-400' },
      'processing': { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-400 animate-pulse' },
      'completed': { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-400' },
      'error': { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-400' }
    };
    
    const config = statusConfig[status] || statusConfig['created'];
    const label = status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${config.bg} ${config.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
        {label}
      </span>
    );
  };
  
  const filteredSessions = sessions.filter(session => {
    const matchesState = !filter.state || session.state === filter.state;
    const matchesSearch = !filter.search || 
      session.patient_name?.toLowerCase().includes(filter.search.toLowerCase()) ||
      session.doctor_name?.toLowerCase().includes(filter.search.toLowerCase()) ||
      session.session_id?.toLowerCase().includes(filter.search.toLowerCase());
    return matchesState && matchesSearch;
  });
  
  const stats = {
    total: sessions.length,
    completed: sessions.filter(s => s.status === 'completed').length,
    processing: sessions.filter(s => s.status === 'processing').length,
    pending: sessions.filter(s => s.status === 'created' || s.status === 'recording_uploaded').length
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200/60 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                CME Analysis Platform
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">AI-powered medical examination analysis</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="group relative inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Session
            </button>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard 
            label="Total Sessions" 
            value={stats.total} 
            icon="📊"
            gradient="from-slate-500 to-slate-600"
          />
          <StatCard 
            label="Completed" 
            value={stats.completed} 
            icon="✅"
            gradient="from-emerald-500 to-emerald-600"
          />
          <StatCard 
            label="Processing" 
            value={stats.processing} 
            icon="⚙️"
            gradient="from-blue-500 to-blue-600"
          />
          <StatCard 
            label="Pending" 
            value={stats.pending} 
            icon="⏳"
            gradient="from-amber-500 to-amber-600"
          />
        </div>
        
        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                Search
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Patient, doctor, or session ID..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white"
                  value={filter.search}
                  onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                State
              </label>
              <select
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white"
                value={filter.state}
                onChange={(e) => setFilter({ ...filter, state: e.target.value })}
              >
                <option value="">All States</option>
                <option value="FL">Florida</option>
                <option value="CA">California</option>
                <option value="TX">Texas</option>
                <option value="PA">Pennsylvania</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilter({ state: '', search: '' })}
                className="w-full px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
        
        {/* Sessions List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
            <h2 className="text-lg font-semibold text-slate-900">Sessions</h2>
          </div>
          
          {loading ? (
            <div className="p-16 text-center">
              <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-sm text-slate-600">Loading sessions...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-3xl">
                📋
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No sessions found</h3>
              <p className="text-sm text-slate-600 mb-6">Get started by creating your first CME session</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Session
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredSessions.map((session) => (
                <div
                  key={session.session_id}
                  className="px-6 py-5 hover:bg-slate-50/50 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/sessions/${session.session_id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {session.patient_name || 'Unnamed Patient'}
                        </h3>
                        {getStatusBadge(session.status)}
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {session.state}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Examiner</span>
                          <p className="font-medium text-slate-900 mt-0.5">{session.doctor_name || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Exam Date</span>
                          <p className="font-medium text-slate-900 mt-0.5">{session.exam_date || 'Not set'}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Mode</span>
                          <p className="font-medium text-slate-900 mt-0.5">{session.mode || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Session ID</span>
                          <p className="font-mono text-xs text-slate-600 mt-0.5">{session.session_id?.substring(0, 12)}...</p>
                        </div>
                      </div>
                      
                      {session.attorney_name && (
                        <div className="mt-3 text-sm">
                          <span className="text-slate-500">Attorney: </span>
                          <span className="font-medium text-slate-900">{session.attorney_name}</span>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/sessions/${session.session_id}`);
                      }}
                      className="flex-shrink-0 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      View →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {showCreateModal && (
        <CreateSessionModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchSessions();
          }}
        />
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon, gradient }) => (
  <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 p-5">
    <div className="flex items-center justify-between mb-2">
      <span className="text-2xl">{icon}</span>
      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${gradient} opacity-10`}></div>
    </div>
    <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
    <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">{label}</div>
  </div>
);

const CreateSessionModal = ({ onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    patient_id: '',
    patient_name: '',
    doctor_name: '',
    state: 'FL',
    exam_date: new Date().toISOString().split('T')[0],
    case_id: '',
    attorney_name: ''
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    
    try {
      const response = await api.post('/cme/sessions', formData);
      
      if (response.data.session_id) {
        navigate(`/sessions/${response.data.session_id}`);
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating CME session:', error);
      setError(error.response?.data?.error || 'Failed to create session');
    } finally {
      setCreating(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Create New CME Session</h2>
          <p className="text-sm text-slate-600 mt-1">Set up a new medical examination analysis session</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Patient ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                value={formData.patient_id}
                onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Patient Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                value={formData.patient_name}
                onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Examiner Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                value={formData.doctor_name}
                onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                State <span className="text-rose-500">*</span>
              </label>
              <select
                required
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              >
                <option value="FL">Florida (Full Recording)</option>
                <option value="CA">California (Full Recording)</option>
                <option value="PA">Pennsylvania (Audio Only)</option>
                <option value="TX">Texas (Ephemeral)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Exam Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                value={formData.exam_date}
                onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Case ID
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                value={formData.case_id}
                onChange={(e) => setFormData({ ...formData, case_id: e.target.value })}
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Attorney Name
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                value={formData.attorney_name}
                onChange={(e) => setFormData({ ...formData, attorney_name: e.target.value })}
              />
            </div>
          </div>
          
          {error && (
            <div className="mt-5 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              disabled={creating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50"
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CMEAnalysis;
