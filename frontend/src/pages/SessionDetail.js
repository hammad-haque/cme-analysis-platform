import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/cmeApi';

export default function SessionDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/cme/sessions/${sessionId}`);
      setSession(response.data);
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const response = await api.post('/cme/upload', {
        session_id: sessionId,
        filename: file.name,
        content_type: file.type,
        file_size: file.size,
      });

      await fetch(response.data.upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      await api.post('/cme/process', { session_id: sessionId });
      loadSession();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload recording');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      const response = await api.get(`/cme/sessions/${sessionId}/report`);
      if (response.data.download_url) {
        window.open(response.data.download_url, '_blank');
      }
    } catch (error) {
      console.error('Report generation failed:', error);
      alert('Failed to generate report');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="flex items-center">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-sm text-neutral-500">Loading session...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-900 font-medium">Session not found</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'recording', label: 'Recording' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-[1400px] mx-auto px-8 py-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-sm text-neutral-500 hover:text-neutral-900 mb-4"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to dashboard
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">{session.patient_name || 'CME Session'}</h1>
              <div className="flex items-center gap-3 mt-2">
                <StatusBadge status={session.status} />
                <span className="text-sm text-neutral-500">
                  {session.state} • {session.exam_date || 'Date not set'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {session.status === 'completed' && (
                <button
                  onClick={handleGenerateReport}
                  className="h-9 px-4 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  Generate Report
                </button>
              )}
              {session.status === 'created' && (
                <label className="h-9 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center cursor-pointer">
                  {uploading ? 'Uploading...' : 'Upload Recording'}
                  <input
                    type="file"
                    accept="video/*,audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="max-w-[1400px] mx-auto px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-[1400px] mx-auto px-8 py-8">
        {activeTab === 'overview' && <OverviewTab session={session} />}
        {activeTab === 'analysis' && <AnalysisTab session={session} />}
        {activeTab === 'timeline' && <TimelineTab session={session} />}
        {activeTab === 'recording' && <RecordingTab session={session} />}
      </main>
    </div>
  );
}

function StatusBadge({ status }) {
  const configs = {
    created: { label: 'Created', color: 'bg-neutral-100 text-neutral-700' },
    recording_uploaded: { label: 'Uploaded', color: 'bg-amber-100 text-amber-700' },
    processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700' },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
    error: { label: 'Error', color: 'bg-red-100 text-red-700' },
  };

  const config = configs[status] || configs.created;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg ${config.color}`}>
      {config.label}
    </span>
  );
}

function OverviewTab({ session }) {
  return (
    <div className="grid grid-cols-2 gap-8">
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-neutral-900 mb-4">Session Information</h3>
        <dl className="space-y-3">
          <InfoRow label="Patient ID" value={session.patient_id} />
          <InfoRow label="Patient Name" value={session.patient_name} />
          <InfoRow label="Examiner" value={session.doctor_name} />
          <InfoRow label="Exam Date" value={session.exam_date} />
          <InfoRow label="Attorney" value={session.attorney_name} />
          <InfoRow label="Case ID" value={session.case_id} />
        </dl>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-neutral-900 mb-4">Recording Details</h3>
        <dl className="space-y-3">
          <InfoRow label="State" value={session.state} />
          <InfoRow label="Recording Mode" value={session.mode} />
          <InfoRow label="Legal Basis" value={session.recording_allowed?.rule} />
          <InfoRow
            label="Video Permitted"
            value={session.recording_allowed?.video ? 'Yes' : 'No'}
          />
          <InfoRow
            label="Audio Permitted"
            value={session.recording_allowed?.audio ? 'Yes' : 'No'}
          />
        </dl>
      </div>
    </div>
  );
}

function AnalysisTab({ session }) {
  if (session.status !== 'completed') {
    return (
      <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
        <div className="max-w-sm mx-auto">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-neutral-900 mb-2">Analysis Pending</h3>
          <p className="text-sm text-neutral-500">
            Analysis results will appear here once the recording has been processed.
          </p>
          {session.processing_stage && (
            <p className="text-xs text-neutral-400 mt-2">Current stage: {session.processing_stage}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-neutral-900 mb-4">Declared Tests</h3>
        <p className="text-sm text-neutral-500">Test declarations detected from audio transcript will appear here.</p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-neutral-900 mb-4">Observed Actions</h3>
        <p className="text-sm text-neutral-500">Visual analysis of performed tests will appear here.</p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-neutral-900 mb-4">Discrepancies</h3>
        <p className="text-sm text-neutral-500">Mismatches between declared and observed tests will appear here.</p>
      </div>
    </div>
  );
}

function TimelineTab({ session }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
      <div className="max-w-sm mx-auto">
        <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-neutral-900 mb-2">Timeline View</h3>
        <p className="text-sm text-neutral-500">
          A chronological timeline of the examination will be generated after processing.
        </p>
      </div>
    </div>
  );
}

function RecordingTab({ session }) {
  if (!session.video_uri) {
    return (
      <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
        <div className="max-w-sm mx-auto">
          <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-neutral-900 mb-2">No Recording</h3>
          <p className="text-sm text-neutral-500">Upload a recording to begin analysis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-neutral-900 mb-4">Recording Information</h3>
      <dl className="space-y-3">
        <InfoRow label="Video URI" value={session.video_uri} mono />
        <InfoRow label="Upload Date" value={new Date(session.updated_at * 1000).toLocaleString()} />
      </dl>
    </div>
  );
}

function InfoRow({ label, value, mono = false }) {
  return (
    <div>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className={`mt-0.5 text-sm text-neutral-900 ${mono ? 'font-mono text-xs' : ''}`}>
        {value || '—'}
      </dd>
    </div>
  );
}

