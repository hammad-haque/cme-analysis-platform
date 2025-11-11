import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/cmeApi';

const CMESessionDetail = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  useEffect(() => {
    fetchSessionDetails();
  }, [sessionId]);
  
  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/cme/sessions/${sessionId}`);
      setSession(response.data);
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const response = await api.post('/cme/upload', {
        session_id: sessionId,
        filename: file.name,
        content_type: file.type,
        file_size: file.size
      });
      
      const { upload_url } = response.data;
      
      await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });
      
      await api.post('/cme/process', { session_id: sessionId });
      fetchSessionDetails();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload recording');
    }
  };
  
  const generateReport = async () => {
    try {
      const response = await api.get(`/cme/sessions/${sessionId}/report`);
      if (response.data.download_url) {
        window.open(response.data.download_url, '_blank');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-slate-600">Loading session...</p>
        </div>
      </div>
    );
  }
  
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-100 flex items-center justify-center text-3xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Session Not Found</h2>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-5 py-2.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            ← Back to Sessions
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200/60 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Sessions
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                {session.patient_name || 'CME Session'}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={session.status} />
                <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                  {session.state}
                </span>
                <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2.5 py-1 rounded-md">
                  {session.mode}
                </span>
              </div>
            </div>
            
            <div className="flex gap-3">
              {session.status === 'completed' && (
                <button
                  onClick={generateReport}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-semibold rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg shadow-emerald-500/25"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generate Report
                </button>
              )}
              {session.status === 'created' && (
                <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25 cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload Recording
                  <input
                    type="file"
                    accept="video/*,audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 mb-6">
          <div className="border-b border-slate-200">
            <nav className="flex -mb-px">
              {[
                { id: 'overview', label: 'Overview', icon: '📋' },
                { id: 'timeline', label: 'Timeline', icon: '⏱️' },
                { id: 'demeanor', label: 'Demeanor', icon: '🎭' },
                { id: 'recordings', label: 'Recordings', icon: '🎥' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="p-6">
            {activeTab === 'overview' && <OverviewTab session={session} />}
            {activeTab === 'timeline' && <TimelineTab session={session} />}
            {activeTab === 'demeanor' && <DemeanorTab session={session} />}
            {activeTab === 'recordings' && <RecordingsTab session={session} />}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const config = {
    'created': { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
    'recording_uploaded': { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-400' },
    'processing': { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-400 animate-pulse' },
    'completed': { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-400' },
    'error': { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-400' }
  };
  
  const statusConfig = config[status] || config['created'];
  const label = status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}></span>
      {label}
    </span>
  );
};

const OverviewTab = ({ session }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Session Information</h3>
        <dl className="space-y-4">
          <div className="pb-4 border-b border-slate-100">
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Patient ID</dt>
            <dd className="text-sm font-medium text-slate-900">{session.patient_id}</dd>
          </div>
          <div className="pb-4 border-b border-slate-100">
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Examiner</dt>
            <dd className="text-sm font-medium text-slate-900">{session.doctor_name}</dd>
          </div>
          <div className="pb-4 border-b border-slate-100">
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Exam Date</dt>
            <dd className="text-sm font-medium text-slate-900">{session.exam_date || 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Attorney</dt>
            <dd className="text-sm font-medium text-slate-900">{session.attorney_name || 'N/A'}</dd>
          </div>
        </dl>
      </div>
    </div>
    
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Recording Details</h3>
        <dl className="space-y-4">
          <div className="pb-4 border-b border-slate-100">
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Recording Mode</dt>
            <dd className="text-sm font-medium text-slate-900">{session.mode}</dd>
          </div>
          <div className="pb-4 border-b border-slate-100">
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">State</dt>
            <dd className="text-sm font-medium text-slate-900">{session.state}</dd>
          </div>
          <div className="pb-4 border-b border-slate-100">
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Legal Basis</dt>
            <dd className="text-sm font-medium text-slate-900">{session.recording_allowed?.rule || 'N/A'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Video Permitted</dt>
            <dd className="text-sm font-medium text-slate-900">
              {session.recording_allowed?.video ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Yes
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-rose-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  No
                </span>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
);

const TimelineTab = ({ session }) => (
  <div>
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-blue-900 mb-1">Processing Status</h4>
          <p className="text-sm text-blue-700">
            {session.processing_stage || 'Not started'}
          </p>
          <p className="text-xs text-blue-600 mt-2">
            Test declarations and observed actions will appear here after processing completes.
          </p>
        </div>
      </div>
    </div>
  </div>
);

const DemeanorTab = ({ session }) => (
  <div>
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-amber-900 mb-1">Demeanor Analysis</h4>
          <p className="text-sm text-amber-700">
            Analysis will detect negative tone, interruptions, dismissive behavior, and unprofessional conduct.
          </p>
          <p className="text-xs text-amber-600 mt-2">
            Results will appear here after processing completes.
          </p>
        </div>
      </div>
    </div>
  </div>
);

const RecordingsTab = ({ session }) => (
  <div>
    {session.video_uri ? (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Recording</h3>
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <p className="text-xs font-medium text-slate-500 mb-1">Video URI</p>
          <p className="text-sm font-mono text-slate-900 break-all">{session.video_uri}</p>
        </div>
      </div>
    ) : (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-3xl">
          🎥
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Recording Uploaded</h3>
        <p className="text-sm text-slate-600">Upload a recording to begin analysis</p>
      </div>
    )}
  </div>
);

export default CMESessionDetail;
