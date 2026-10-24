/**
 * VisualDiscoveryModal Component
 *
 * Provides AI-powered visual place discovery from user-uploaded travel photos
 * or short video clips, grounded strictly in the verified Namma Karnataka catalogue.
 * Implements client-side frame sampling for video, ephemeral privacy disclaimers,
 * and honest uncertainty handling.
 */

import React, { useState, useRef } from 'react';
import { Language, VisualDiscoveryCandidate, VisualDiscoveryResponse } from '../../types';
import { useTranslation } from '../../lib/i18n';
import { analyzeImageVisualDiscovery, analyzeVideoVisualDiscovery } from '../../lib/api';

interface VisualDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onSelectCandidate: (candidate: VisualDiscoveryCandidate) => void;
  onOpenDestinationDetailsBySlug: (slug: string) => void;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

export const VisualDiscoveryModal: React.FC<VisualDiscoveryModalProps> = ({
  isOpen,
  onClose,
  language,
  onSelectCandidate,
  onOpenDestinationDetailsBySlug,
}) => {
  const { t } = useTranslation(language);

  const [activeTab, setActiveTab] = useState<'photo' | 'video'>('photo');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [discoveryResult, setDiscoveryResult] = useState<VisualDiscoveryResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (file: File | null) => {
    if (!file) return;

    setErrorMessage(null);
    setDiscoveryResult(null);

    if (activeTab === 'photo') {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setErrorMessage('Unsupported image format. Please upload JPEG, PNG, or WebP.');
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setErrorMessage('Photograph size exceeds 10MB limit.');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
        setErrorMessage('Unsupported video format. Please upload MP4 or WebM.');
        return;
      }
      if (file.size > MAX_VIDEO_SIZE) {
        setErrorMessage('Video size exceeds 25MB limit.');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
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
        // Sample at 20%, 50%, and 80% marks
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
        reject(new Error('Failed to decode video file in browser.'));
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
          throw new Error('Could not extract valid frames from video.');
        }
        setStatusMessage(t('analyzingVisual'));
        const response = await analyzeVideoVisualDiscovery(sampledFrames, language);
        setDiscoveryResult(response);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Visual place analysis failed. Please try another media file.');
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
    <div className="modal-overlay" role="dialog" aria-modal="true" data-testid="visual-discovery-modal">
      <div className="modal-content visual-discovery-modal-box">
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3 className="modal-title">📷 {t('visualDiscoveryTitle')}</h3>
            <p className="modal-subtitle">{t('visualDiscoverySubtitle')}</p>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div className="visual-discovery-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'photo' ? 'active' : ''}`}
            data-testid="tab-upload-photo"
            onClick={() => {
              setActiveTab('photo');
              resetSelection();
            }}
          >
            📸 {t('uploadPhotoTab')}
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'video' ? 'active' : ''}`}
            data-testid="tab-upload-video"
            onClick={() => {
              setActiveTab('video');
              resetSelection();
            }}
          >
            🎬 {t('uploadVideoTab')}
          </button>
        </div>

        {/* Body Content */}
        <div className="modal-body">
          {/* Privacy Notice Banner */}
          <div className="privacy-badge-banner" data-testid="privacy-disclosure-notice">
            <span>{t('privacyBadge')}</span>
          </div>

          {/* Media Input / Dropzone */}
          {!selectedFile ? (
            <div
              className="dropzone-area"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="dropzone-icon">{activeTab === 'photo' ? '📸' : '🎥'}</div>
              <p className="dropzone-text">
                {activeTab === 'photo' ? t('dragDropPhoto') : t('dragDropVideo')}
              </p>
              <button type="button" className="btn-secondary btn-sm">
                📁 {t('selectMediaFile')}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden-file-input"
                data-testid="visual-file-input"
                accept={activeTab === 'photo' ? 'image/jpeg,image/png,image/webp' : 'video/mp4,video/webm'}
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div className="selected-media-preview-container">
              <div className="preview-header">
                <span className="file-name-label">📎 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                <button type="button" className="btn-text-danger" onClick={resetSelection}>
                  Remove / Replace
                </button>
              </div>

              {previewUrl && (
                <div className="media-preview-frame">
                  {activeTab === 'photo' ? (
                    <img src={previewUrl} alt="Selected preview" className="preview-img-tag" />
                  ) : (
                    <video ref={videoRef} src={previewUrl} controls className="preview-video-tag" />
                  )}
                </div>
              )}

              {!discoveryResult && !isAnalyzing && (
                <div className="analyze-action-bar">
                  <button
                    type="button"
                    className="btn-primary btn-analyze"
                    onClick={handleAnalyze}
                    data-testid="btn-analyze-media"
                  >
                    🔍 {t('analyzeAction')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Loading / Processing State */}
          {isAnalyzing && (
            <div className="visual-analyzing-indicator" data-testid="analyzing-indicator">
              <div className="spinner" />
              <p className="analyzing-text">{statusMessage || t('analyzingVisual')}</p>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="visual-error-banner" data-testid="visual-error-banner">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Candidates & Grounded Results */}
          {discoveryResult && (
            <div className="discovery-results-section" data-testid="discovery-results">
              <div className="results-header-summary">
                <h4>
                  {discoveryResult.is_confident ? '🎯 Grounded Match Found' : `ℹ️ ${t('noVisualMatchTitle')}`}
                </h4>
                <p className="summary-text">
                  {language === 'kn' ? discoveryResult.message_kn : discoveryResult.message_en}
                </p>
              </div>

              {discoveryResult.candidates.length > 0 ? (
                <div className="candidates-grid">
                  {discoveryResult.candidates.map((cand, idx) => {
                    const name = language === 'kn' && cand.name_kn ? cand.name_kn : cand.name_en;
                    const summary = language === 'kn' && cand.summary_kn ? cand.summary_kn : cand.summary_en;

                    return (
                      <div key={cand.destination_id || cand.slug || idx} className="candidate-card" data-testid={`candidate-card-${cand.slug}`}>
                        {cand.image_url && (
                          <div className="cand-thumb-wrapper">
                            <img src={cand.image_url} alt={name} className="cand-thumb" />
                            <span className={`cand-confidence-badge ${cand.confidence_label}`}>
                              {cand.confidence_label === 'strong_match' ? `🌟 ${t('strongMatch')}` : `💡 ${t('possibleMatch')}`}
                            </span>
                          </div>
                        )}

                        <div className="cand-content">
                          <div className="cand-meta-row">
                            <span className="cand-category">{cand.category}</span>
                            <span className="cand-district">📍 {cand.district_name_en || cand.district_code}</span>
                          </div>

                          <h4 className="cand-name">{name}</h4>
                          <p className="cand-summary">{summary}</p>

                          {cand.matching_reasons && cand.matching_reasons.length > 0 && (
                            <div className="matching-reasons-box">
                              <strong>Why this matches:</strong>
                              <ul>
                                {cand.matching_reasons.map((r, idx) => (
                                  <li key={idx}>✓ {r}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {cand.visual_evidence && (
                            <div className="visual-evidence-box">
                              {cand.visual_evidence.architectural_style && (
                                <p className="evidence-item">
                                  🏛️ <strong>{t('architecturalStyle')}:</strong> {cand.visual_evidence.architectural_style}
                                </p>
                              )}
                              {cand.visual_evidence.landscape_clues && (
                                <p className="evidence-item">
                                  🌄 <strong>{t('landscapeClues')}:</strong>{' '}
                                  {Array.isArray(cand.visual_evidence.landscape_clues)
                                    ? cand.visual_evidence.landscape_clues.join(', ')
                                    : String(cand.visual_evidence.landscape_clues)}
                                </p>
                              )}
                              {Array.isArray(cand.visual_evidence.observed_features) && cand.visual_evidence.observed_features.length > 0 && (
                                <p className="evidence-item">
                                  👁️ <strong>{t('observedFeatures')}:</strong> {cand.visual_evidence.observed_features.join(', ')}
                                </p>
                              )}
                              {cand.visual_evidence.detected_signage && (
                                <p className="evidence-item">
                                  🪧 <strong>{t('detectedSignage')}:</strong> {cand.visual_evidence.detected_signage}
                                </p>
                              )}
                            </div>
                          )}

                          {cand.uncertainty_notes && (
                            <p className="cand-uncertainty">⚠️ {cand.uncertainty_notes}</p>
                          )}

                          <div className="cand-actions">
                            <button
                              type="button"
                              className="btn-secondary btn-sm"
                              data-testid={`view-candidate-details-${cand.slug}`}
                              onClick={() => {
                                onClose();
                                onOpenDestinationDetailsBySlug(cand.slug);
                              }}
                            >
                              ℹ️ {t('viewDetails')}
                            </button>
                            <button
                              type="button"
                              className="btn-primary btn-sm"
                              data-testid={`plan-candidate-${cand.slug}`}
                              onClick={() => {
                                onSelectCandidate(cand);
                                onClose();
                              }}
                            >
                              ✨ {t('planWithThis')}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-match-box" data-testid="no-confident-match-alert">
                  <p className="no-match-help">
                    {language === 'kn'
                      ? 'ಈ ಫೋಟೋದಲ್ಲಿ ಪ್ರಮುಖ ಹೆಗ್ಗುರುತುಗಳು ಸ್ಪಷ್ಟವಾಗಿಲ್ಲದಿರಬಹುದು. ದಯವಿಟ್ಟು ಗೋಪುರ, ಅರಮನೆ, ಜಲಪಾತ ಅಥವಾ ನೈಸರ್ಗಿಕ ತಾಣಗಳ ಸ್ಪಷ್ಟ ಚಿತ್ರವನ್ನು ಪ್ರಯತ್ನಿಸಿ.'
                      : 'The image may not show distinctive architectural or natural landmarks. Try uploading a photo featuring prominent temple carvings, palace domes, waterfalls, or signboards.'}
                  </p>
                  <button type="button" className="btn-secondary" onClick={resetSelection}>
                    🔄 Try Another Media File
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
