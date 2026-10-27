import React, { useState, useRef } from 'react';
import { Language, VisualDiscoveryCandidate, VisualDiscoveryResponse } from '../../types';
import { useTranslation } from '../../lib/i18n';
import { analyzeImageVisualDiscovery, analyzeVideoVisualDiscovery } from '../../lib/api';

interface VisualDiscoveryCardProps {
  language: Language;
  onSelectCandidate: (candidate: VisualDiscoveryCandidate) => void;
  onOpenDestinationDetailsBySlug: (slug: string) => void;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

export const VisualDiscoveryCard: React.FC<VisualDiscoveryCardProps> = ({
  language,
  onSelectCandidate,
  onOpenDestinationDetailsBySlug,
}) => {
  const { t } = useTranslation(language);

  const [activeTab, setActiveTab] = useState<'photo' | 'video'>('photo');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [discoveryResult, setDiscoveryResult] = useState<VisualDiscoveryResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;

    setErrorMessage(null);
    setDiscoveryResult(null);

    if (activeTab === 'photo') {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setErrorMessage(
          language === 'kn'
            ? 'ಅಮಾನ್ಯ ಚಿತ್ರ ಸ್ವರೂಪ. ದಯವಿಟ್ಟು JPEG, PNG, ಅಥವಾ WebP ಫೈಲ್ ಆಯ್ಕೆಮಾಡಿ.'
            : 'Unsupported image format. Please upload JPEG, PNG, or WebP.'
        );
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setErrorMessage(
          language === 'kn'
            ? 'ಚಿತ್ರದ ಗಾತ್ರವು ಗರಿಷ್ಠ 10MB ಮಿತಿಯನ್ನು ಮೀರಿದೆ.'
            : 'Photograph size exceeds the 10MB limit.'
        );
        return;
      }
    } else {
      if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
        setErrorMessage(
          language === 'kn'
            ? 'ಅಮಾನ್ಯ ವೀಡಿಯೊ ಸ್ವರೂಪ. ದಯವಿಟ್ಟು MP4 ಅಥವಾ WebM ಫೈಲ್ ಆಯ್ಕೆಮಾಡಿ.'
            : 'Unsupported video format. Please upload MP4 or WebM.'
        );
        return;
      }
      if (file.size > MAX_VIDEO_SIZE) {
        setErrorMessage(
          language === 'kn'
            ? 'ವೀಡಿಯೊ ಗಾತ್ರವು ಗರಿಷ್ಠ 25MB ಮಿತಿಯನ್ನು ಮೀರಿದೆ.'
            : 'Video size exceeds the 25MB limit.'
        );
        return;
      }
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const sampleVideoFrames = async (videoFile: File): Promise<Blob[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const videoUrl = URL.createObjectURL(videoFile);
      video.src = videoUrl;

      const frames: Blob[] = [];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.onloadedmetadata = async () => {
        const duration = video.duration || 10;
        const timestamps = [duration * 0.2, duration * 0.5, duration * 0.8];
        canvas.width = Math.min(video.videoWidth || 640, 1280);
        canvas.height = Math.min(video.videoHeight || 360, 720);

        try {
          for (const ts of timestamps) {
            video.currentTime = ts;
            await new Promise((r) => {
              video.onseeked = r;
            });
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              await new Promise<void>((resBlob) => {
                canvas.toBlob(
                  (blob) => {
                    if (blob) frames.push(blob);
                    resBlob();
                  },
                  'image/jpeg',
                  0.85
                );
              });
            }
          }
          URL.revokeObjectURL(videoUrl);
          resolve(frames);
        } catch (err) {
          URL.revokeObjectURL(videoUrl);
          reject(err);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(videoUrl);
        reject(new Error(language === 'kn' ? 'ವೀಡಿಯೊ ಡಿಕೋಡ್ ಮಾಡಲು ವಿಫಲವಾಗಿದೆ.' : 'Failed to decode video file in browser.'));
      };
    });
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setErrorMessage(null);
    setStatusMessage(t('analyzingVisual'));

    try {
      if (activeTab === 'photo') {
        const response = await analyzeImageVisualDiscovery(selectedFile, language);
        setDiscoveryResult(response);
      } else {
        setStatusMessage(t('extractingFrames'));
        const sampledFrames = await sampleVideoFrames(selectedFile);
        if (sampledFrames.length === 0) {
          throw new Error(language === 'kn' ? 'ವೀಡಿಯೊದಿಂದ ಮಾನ್ಯ ಕೀಫ್ರೇಮ್‌ಗಳನ್ನು ಹೊರತೆಗೆಯಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.' : 'Could not extract valid frames from video.');
        }
        setStatusMessage(t('analyzingVisual'));
        const response = await analyzeVideoVisualDiscovery(sampledFrames, language);
        setDiscoveryResult(response);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : (language === 'kn' ? 'ದೃಶ್ಯ ತಾಣ ವಿಶ್ಲೇಷಣೆ ವಿಫಲವಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ.' : 'Visual place analysis failed. Please try another media file.');
      setErrorMessage(msg);
    } finally {
      setIsAnalyzing(false);
      setStatusMessage(null);
    }
  };

  const resetSelection = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setDiscoveryResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
      className="visual-discovery-card"
      data-testid="visual-discovery-card"
      style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '12px',
        padding: '20px 24px',
        margin: '16px 0 24px 0',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        color: '#f8fafc',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <span>📷</span> {t('identifyPlaceCardHeading')}
          </h3>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: '4px 0 0 0', maxWidth: '640px' }}>
            {t('identifyPlaceCardDesc')}
          </p>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <button
            type="button"
            onClick={() => {
              setActiveTab('photo');
              resetSelection();
            }}
            data-testid="tab-photo-toggle"
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
              background: activeTab === 'photo' ? '#0284c7' : 'transparent',
              color: activeTab === 'photo' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.15s ease',
            }}
          >
            📸 {t('uploadPhotoTab')}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('video');
              resetSelection();
            }}
            data-testid="tab-video-toggle"
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
              background: activeTab === 'video' ? '#0284c7' : 'transparent',
              color: activeTab === 'video' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.15s ease',
            }}
          >
            🎬 {t('uploadVideoTab')}
          </button>
        </div>
      </div>

      {/* Ephemeral Privacy Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '0.8rem',
          color: '#bae6fd',
          marginBottom: '16px',
        }}
      >
        <span>🔒</span>
        <span>{t('privacyBadge')}</span>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div
          role="alert"
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* File Upload / Preview Area */}
      {!selectedFile ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed rgba(56, 189, 248, 0.35)',
            borderRadius: '10px',
            padding: '28px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'rgba(15, 23, 42, 0.4)',
            transition: 'border-color 0.2s ease',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>
            {activeTab === 'photo' ? '📸' : '🎥'}
          </div>
          <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: '0 0 6px 0', color: '#e2e8f0' }}>
            {activeTab === 'photo' ? t('dragDropPhoto') : t('dragDropVideo')}
          </p>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 14px 0' }}>
            {activeTab === 'photo' ? 'JPEG, PNG, WebP · Max 10MB' : 'MP4, WebM · Max 25MB'}
          </p>
          <button
            type="button"
            className="btn-secondary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              background: '#334155',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            📁 {t('selectMediaFile')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            data-testid="visual-discovery-card-input"
            accept={activeTab === 'photo' ? 'image/jpeg,image/png,image/webp' : 'video/mp4,video/webm'}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileChange(e.target.files[0]);
              }
            }}
          />
        </div>
      ) : (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            {previewUrl && activeTab === 'photo' && (
              <img
                src={previewUrl}
                alt="Selected preview"
                style={{
                  width: '120px',
                  height: '80px',
                  objectFit: 'cover',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              />
            )}
            {previewUrl && activeTab === 'video' && (
              <video
                src={previewUrl}
                controls
                style={{
                  width: '160px',
                  maxHeight: '90px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              />
            )}
            <div style={{ flex: 1, minWidth: '180px' }}>
              <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#f1f5f9', wordBreak: 'break-all' }}>
                {selectedFile.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                {formatFileSize(selectedFile.size)} • {activeTab === 'photo' ? 'Photograph' : 'Video Clip'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={resetSelection}
                disabled={isAnalyzing}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                }}
              >
                ✕ {t('removeChangeFile')}
              </button>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                data-testid="identify-place-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  background: isAnalyzing ? '#0369a1' : '#0284c7',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: isAnalyzing ? 'wait' : 'pointer',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.4)',
                }}
              >
                {isAnalyzing ? (
                  <>
                    <span className="spinner-icon">🔄</span>
                    <span>{statusMessage || t('analyzingVisual')}</span>
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    <span>{t('identifyPlaceAction')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discovery Results Section */}
      {discoveryResult && (
        <div
          data-testid="visual-discovery-results"
          style={{
            marginTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📍</span> {discoveryResult.candidates && discoveryResult.candidates.length > 0 ? (
                  `${t('candidateDestinationCount')}: ${discoveryResult.candidates.length}`
                ) : (
                  t('noVisualMatchTitle')
                )}
              </h4>
              <span
                data-testid="visual-engine-badge"
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background:
                    discoveryResult.analysis_engine === 'ai_multimodal'
                      ? 'rgba(168, 85, 247, 0.15)'
                      : discoveryResult.analysis_engine === 'visual_similarity_engine'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(56, 189, 248, 0.12)',
                  color:
                    discoveryResult.analysis_engine === 'ai_multimodal'
                      ? '#c084fc'
                      : discoveryResult.analysis_engine === 'visual_similarity_engine'
                      ? '#34d399'
                      : '#bae6fd',
                  border: `1px solid ${
                    discoveryResult.analysis_engine === 'ai_multimodal'
                      ? 'rgba(168, 85, 247, 0.3)'
                      : discoveryResult.analysis_engine === 'visual_similarity_engine'
                      ? 'rgba(16, 185, 129, 0.35)'
                      : 'rgba(56, 189, 248, 0.25)'
                  }`,
                }}
              >
                {discoveryResult.analysis_engine === 'ai_multimodal'
                  ? (language === 'kn' ? '🤖 ಎಐ ಮಲ್ಟಿಮೋಡಲ್ ವಿಶ್ಲೇಷಣೆ' : '🤖 AI-Assisted Multimodal Recognition')
                  : discoveryResult.analysis_engine === 'visual_similarity_engine'
                  ? (language === 'kn' ? '👁️ ದೃಶ್ಯ ಹೋಲಿಕೆ ಎಂಜಿನ್' : '👁️ Visual Similarity Engine')
                  : (language === 'kn' ? '🏛️ ಪರಿಶೀಲಿತ ದೃಶ್ಯ ಪ್ರೊಫೈಲ್ ಹೊಂದಾಣಿಕೆ' : '🏛️ Deterministic Profile Match')}
              </span>
            </div>
            <button
              type="button"
              onClick={resetSelection}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '0.8rem',
                textDecoration: 'underline',
              }}
            >
              {t('resetAction')}
            </button>
          </div>

          {/* Workstream 2: Path B - External Place Outside Curated Catalogue */}
          {discoveryResult.external_place && (
            <div
              data-testid="external-place-recognition"
              style={{
                background: 'rgba(30, 41, 59, 0.85)',
                border: '1px solid rgba(245, 158, 11, 0.5)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f59e0b', fontWeight: 700 }}>
                    {language === 'kn' ? '🌐 ಗುರುತಿಸಲಾದ ಸ್ಥಳ — ಪಟ್ಟಿಮಾಡಲಾದ ಜಾಗವಲ್ಲ' : '🌐 Recognised Place — Outside Curated Catalogue'}
                  </span>
                  <h4 style={{ margin: '4px 0 2px 0', fontSize: '1.2rem', color: '#f8fafc', fontWeight: 700 }}>
                    {discoveryResult.external_place.place_name}
                  </h4>
                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                    📍 {discoveryResult.external_place.location_summary || [
                      discoveryResult.external_place.city,
                      discoveryResult.external_place.district,
                      discoveryResult.external_place.state || discoveryResult.external_place.state_or_region,
                      discoveryResult.external_place.country
                    ].filter(Boolean).join(', ')}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {discoveryResult.external_place.confidence || (discoveryResult.external_place.confidence_label === 'strong_match' ? 'Strong Match' : (language === 'kn' ? 'ಸಂಭಾವ್ಯ ಗುರುತಿಸುವಿಕೆ' : 'Possible Identification'))}
                </span>
              </div>

              {discoveryResult.external_place.summary && (
                <p style={{ margin: '10px 0 8px 0', fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                  {discoveryResult.external_place.summary}
                </p>
              )}

              <div style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '6px', padding: '10px 12px', marginTop: '10px', fontSize: '0.78rem', color: '#94a3b8' }}>
                ⚠️ {discoveryResult.external_place.unverified_disclosure || discoveryResult.external_place.notes || (language === 'kn'
                  ? 'ಈ ಸ್ಥಳವು ಪ್ರಸ್ತುತ ನಮ್ಮ ಪರಿಶೀಲಿತ ಕರ್ನಾಟಕ ತಾಣಗಳ ಕ್ಯಾಟಲಾಗ್‌ನಲ್ಲಿಲ್ಲ. ಅಧಿಕೃತ ಪ್ರವಾಸ ಕಾರ್ಯಕ್ರಮ ಮತ್ತು ಬಜೆಟ್ ವಿವರಗಳು ಲಭ್ಯವಿಲ್ಲದಿರಬಹುದು.'
                  : 'This place is not currently in our verified destination catalogue. Some travel information and itinerary booking may be unavailable.')}
              </div>

              {(() => {
                const evidenceList: string[] = Array.isArray(discoveryResult.external_place.visual_evidence)
                  ? discoveryResult.external_place.visual_evidence
                  : discoveryResult.external_place.visual_evidence?.observed_features || [];
                return evidenceList.length > 0 ? (
                  <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                    <strong style={{ color: '#94a3b8' }}>{t('observedFeatures')}:</strong>
                    <ul style={{ margin: '4px 0 0 16px', padding: 0, lineHeight: 1.4 }}>
                      {evidenceList.map((ev, i) => (
                        <li key={i}>{ev}</li>
                      ))}
                    </ul>
                  </div>
                ) : null;
              })()}

              <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                {discoveryResult.external_place.source_url && (
                  <a
                    href={discoveryResult.external_place.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '7px 14px',
                      borderRadius: '6px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      color: '#38bdf8',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    🔗 {language === 'kn' ? 'ಮೂಲ ಮಾಹಿತಿ ವೀಕ್ಷಿಸಿ' : 'View Source Information'}
                  </a>
                )}
                <button
                  type="button"
                  onClick={resetSelection}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    background: 'rgba(148, 163, 184, 0.15)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    color: '#cbd5e1',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  🔍 {language === 'kn' ? 'ಕ್ಯಾಟಲಾಗ್ ತಾಣಗಳನ್ನು ಅನ್ವೇಷಿಸಿ' : 'Search Similar Destinations'}
                </button>
              </div>
            </div>
          )}

          {discoveryResult.candidates && discoveryResult.candidates.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {discoveryResult.candidates.map((cand, idx) => {
                const confPercent = Math.round(
                  cand.match_score <= 1.0 ? cand.match_score * 100 : cand.match_score
                );
                const qualLabel = cand.confidence_label
                  ? (cand.confidence_label === 'strong_match' ? 'Strong Match' : cand.confidence_label === 'possible_match' ? 'Possible Match' : 'Uncertain Suggestion')
                  : (confPercent >= 85 ? 'Strong Match' : confPercent >= 70 ? 'Possible Match' : 'Uncertain Suggestion');
                const isHigh = confPercent >= 80;
                const candName = language === 'kn' && cand.name_kn ? cand.name_kn : cand.name_en;
                const distName = language === 'kn' && cand.district_name_kn ? cand.district_name_kn : (cand.district_name_en || cand.district_code);
                const clues = cand.matching_reasons || cand.visual_evidence?.observed_features || [];

                return (
                  <div
                    key={cand.slug || idx}
                    data-testid={`visual-candidate-${cand.slug}`}
                    style={{
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: `1px solid ${isHigh ? 'rgba(52, 211, 153, 0.4)' : 'rgba(56, 189, 248, 0.3)'}`,
                      borderRadius: '8px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#f8fafc' }}>
                            {candName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                            📍 {distName} • {cand.category}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '2px', fontWeight: 600 }}>
                            ✓ {language === 'kn' ? 'ಪರಿಶೀಲಿತ ಕ್ಯಾಟಲಾಗ್ ತಾಣ' : 'Verified Catalogue Destination'}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            background: isHigh ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                            color: isHigh ? '#34d399' : '#38bdf8',
                            border: `1px solid ${isHigh ? 'rgba(16, 185, 129, 0.35)' : 'rgba(56, 189, 248, 0.35)'}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {qualLabel} ({confPercent}%)
                        </span>
                      </div>

                      {/* Visual Clues / Evidence */}
                      {clues.length > 0 && (
                        <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#cbd5e1' }}>
                          <div style={{ fontWeight: 600, color: '#94a3b8', marginBottom: '2px' }}>
                            {t('observedFeatures')}:
                          </div>
                          <ul style={{ margin: '2px 0 0 16px', padding: 0, lineHeight: 1.4 }}>
                            {clues.slice(0, 3).map((ev: string, i: number) => (
                              <li key={i}>{ev}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={() => onOpenDestinationDetailsBySlug(cand.slug)}
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          borderRadius: '6px',
                          background: 'rgba(56, 189, 248, 0.15)',
                          border: '1px solid rgba(56, 189, 248, 0.4)',
                          color: '#38bdf8',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        {t('viewDestinationDetails')}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectCandidate(cand)}
                        style={{
                          padding: '7px 12px',
                          borderRadius: '6px',
                          background: '#0284c7',
                          border: 'none',
                          color: '#ffffff',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        {t('filterToDestination')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.5)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: '0.85rem',
              }}
            >
              {language === 'kn'
                ? 'ಕರ್ನಾಟಕದ ಸಂರಕ್ಷಿತ ತಾಣಗಳ ಪಟ್ಟಿಯಲ್ಲಿ ಯಾವುದೇ ಖಚಿತ ಹೊಂದಾಣಿಕೆ ಸಿಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೊಂದು ಸ್ಪಷ್ಟ ಕೋನ ಅಥವಾ ಬೆಳಕಿನ ಚಿತ್ರದೊಂದಿಗೆ ಪ್ರಯತ್ನಿಸಿ.'
                : 'No confident match found in the verified Karnataka destination catalogue. Please try uploading a different angle or lighting.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
