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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-sm text-gray-500">Loading session...</p>
        </div>
      </div>
    );
  }
  
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="mt-2 text-lg font-medium text-gray-900">Session Not Found</h2>
          <p className="mt-1 text-sm text-gray-500">The session you're looking for doesn't exist.</p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Back to Sessions
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Sessions
            </button>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{session.patient_name || 'CME Session'}</h1>
                <div className="mt-2 flex items-center space-x-3">
                  <StatusBadge status={session.status} />
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {session.state}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {session.mode}
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-3">
                {session.status === 'completed' && (
                  <button
                    onClick={generateReport}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generate Report
                  </button>
                )}
                {session.status === 'created' && (
                  <label className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer">
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: 'overview', name: 'Overview', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                { id: 'timeline', name: 'Timeline', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                { id: 'demeanor', name: 'Demeanor', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
                { id: 'recordings', name: 'Recordings', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    ${activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center
                  `}
                >
                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  {tab.name}
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
      </main>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const configs = {
    'created': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
    'recording_uploaded': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
    'processing': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500 animate-pulse' },
    'completed': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    'error': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' }
  };
  
  const config = configs[status] || configs['created'];
  const label = status.replace('_', ' ').split(' ').map(w => 
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');
  
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`}></span>
      {label}
    </span>
  );
};

const OverviewTab = ({ session }) => (
  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Session Information</h3>
      <dl className="space-y-4">
        <div>
          <dt className="text-sm font-medium text-gray-500">Patient ID</dt>
          <dd className="mt-1 text-sm text-gray-900">{session.patient_id}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">Examiner</dt>
          <dd className="mt-1 text-sm text-gray-900">{session.doctor_name}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">Exam Date</dt>
          <dd className="mt-1 text-sm text-gray-900">{session.exam_date || 'Not set'}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">Attorney</dt>
          <dd className="mt-1 text-sm text-gray-900">{session.attorney_name || 'N/A'}</dd>
        </div>
      </dl>
    </div>
    
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Recording Details</h3>
      <dl className="space-y-4">
        <div>
          <dt className="text-sm font-medium text-gray-500">Recording Mode</dt>
          <dd className="mt-1 text-sm text-gray-900">{session.mode}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">State</dt>
          <dd className="mt-1 text-sm text-gray-900">{session.state}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">Legal Basis</dt>
          <dd className="mt-1 text-sm text-gray-900">{session.recording_allowed?.rule || 'N/A'}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">Video Permitted</dt>
          <dd className="mt-1 text-sm text-gray-900">
            {session.recording_allowed?.video ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                Yes
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                No
              </span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  </div>
);

const TimelineTab = ({ session }) => (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
    <div className="flex">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-3">
        <h3 className="text-sm font-medium text-blue-800">Processing Status</h3>
        <div className="mt-2 text-sm text-blue-700">
          <p>{session.processing_stage || 'Not started'}</p>
          <p className="mt-2">Test declarations and observed actions will appear here after processing completes.</p>
        </div>
      </div>
    </div>
  </div>
);

const DemeanorTab = ({ session }) => (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
    <div className="flex">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-3">
        <h3 className="text-sm font-medium text-amber-800">Demeanor Analysis</h3>
        <div className="mt-2 text-sm text-amber-700">
          <p>Analysis will detect negative tone, interruptions, dismissive behavior, and unprofessional conduct.</p>
          <p className="mt-2">Results will appear here after processing completes.</p>
        </div>
      </div>
    </div>
  </div>
);

const RecordingsTab = ({ session }) => (
  <div>
    {session.video_uri ? (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recording</h3>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <dt className="text-sm font-medium text-gray-500 mb-1">Video URI</dt>
          <dd className="text-sm font-mono text-gray-900 break-all">{session.video_uri}</dd>
        </div>
      </div>
    ) : (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Recording Uploaded</h3>
        <p className="mt-1 text-sm text-gray-500">Upload a recording to begin analysis.</p>
      </div>
    )}
  </div>
);

export default CMESessionDetail;
