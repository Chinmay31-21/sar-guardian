import React, { useState } from 'react';
import { THEME_COLORS, ANIMATIONS } from '@/lib/theme';
import { generateSARNarrative, type InvestigationEntity, type RiskProfile } from '@/lib/intelligenceEngine';

interface SARNarrativeProps {
  entity?: InvestigationEntity;
  riskProfile?: RiskProfile;
  narrativeText?: string;
  isGenerating?: boolean;
  onApprove?: () => void;
  onEdit?: () => void;
  onSubmit?: () => void;
  onRegenerate?: () => void;
}

export const SARNarrativePanel: React.FC<SARNarrativeProps> = ({
  entity,
  riskProfile,
  narrativeText = '',
  isGenerating = false,
  onApprove,
  onEdit,
  onSubmit,
  onRegenerate,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [editedText, setEditedText] = useState(narrativeText);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(editedText);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const displayText = editMode ? editedText : narrativeText;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: THEME_COLORS.background.primary,
        borderRadius: '8px',
        border: `1px solid ${THEME_COLORS.border.glow}`,
        padding: '16px',
        boxShadow: `inset 0 0 20px ${THEME_COLORS.glow.cyber.shadow}`,
      }}
    >
      <div style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: `1px solid ${THEME_COLORS.border.primary}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ color: THEME_COLORS.text.primary, margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
            AI SAR Narrative Generator
          </h3>
          {isGenerating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: THEME_COLORS.brand.cyan }}>
              <span style={{ animation: 'spin 1s linear infinite' }}>Generating...</span>
            </div>
          )}
        </div>
        <p style={{ color: THEME_COLORS.text.tertiary, fontSize: '11px', margin: 0 }}>
          Auto-generated narrative with AI pattern analysis
        </p>
      </div>

      {entity && riskProfile && (
        <div
          style={{
            marginBottom: '12px',
            padding: '8px',
            backgroundColor: THEME_COLORS.background.secondary,
            borderRadius: '4px',
            border: `1px solid ${THEME_COLORS.border.primary}`,
            fontSize: '11px',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
            <div>
              <span style={{ color: THEME_COLORS.text.tertiary }}>Entity: </span>
              <span style={{ color: THEME_COLORS.text.primary, fontWeight: 'bold' }}>{entity.name}</span>
            </div>
            <div>
              <span style={{ color: THEME_COLORS.text.tertiary }}>Risk Score: </span>
              <span style={{ color: riskProfile.riskLevel.color, fontWeight: 'bold' }}>
                {riskProfile.overallRisk}/100
              </span>
            </div>
            <div>
              <span style={{ color: THEME_COLORS.text.tertiary }}>Status: </span>
              <span style={{ color: THEME_COLORS.brand.cyan }}>{entity.investigationStatus}</span>
            </div>
            <div>
              <span style={{ color: THEME_COLORS.text.tertiary }}>Txns: </span>
              <span style={{ color: THEME_COLORS.text.primary }}>{entity.transactionCount}</span>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          flex: 1,
          marginBottom: '12px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: THEME_COLORS.background.secondary,
          borderRadius: '4px',
          border: `1px solid ${THEME_COLORS.border.primary}`,
          padding: '10px',
          overflow: 'hidden',
        }}
      >
        {editMode ? (
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            style={{
              flex: 1,
              backgroundColor: THEME_COLORS.background.primary,
              color: THEME_COLORS.text.primary,
              border: `1px solid ${THEME_COLORS.brand.cyan}`,
              borderRadius: '3px',
              padding: '8px',
              fontSize: '12px',
              fontFamily: 'monospace',
              lineHeight: '1.4',
              resize: 'none',
            }}
          />
        ) : (
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              fontSize: '12px',
              lineHeight: '1.5',
              color: THEME_COLORS.text.secondary,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'monospace',
            }}
          >
            {displayText || (
              <span style={{ color: THEME_COLORS.text.tertiary, fontStyle: 'italic' }}>
                SAR narrative will appear here
              </span>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {editMode ? (
          <>
            <button
              onClick={() => setEditMode(false)}
              style={{
                flex: 1,
                minWidth: '90px',
                padding: '6px 10px',
                backgroundColor: THEME_COLORS.brand.emerald,
                color: THEME_COLORS.background.primary,
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: `all ${ANIMATIONS.fast} ${ANIMATIONS.easeInOut}`,
              }}
              onMouseOver={(e) => {
                (e.target as HTMLButtonElement).style.filter = 'brightness(1.1)';
              }}
              onMouseOut={(e) => {
                (e.target as HTMLButtonElement).style.filter = 'brightness(1)';
              }}
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditMode(false);
                setEditedText(narrativeText);
              }}
              style={{
                flex: 1,
                minWidth: '90px',
                padding: '6px 10px',
                backgroundColor: THEME_COLORS.risk.medium,
                color: THEME_COLORS.text.primary,
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: `all ${ANIMATIONS.fast} ${ANIMATIONS.easeInOut}`,
              }}
              onMouseOver={(e) => {
                (e.target as HTMLButtonElement).style.filter = 'brightness(1.1)';
              }}
              onMouseOut={(e) => {
                (e.target as HTMLButtonElement).style.filter = 'brightness(1)';
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditMode(true)}
              title="Edit the generated narrative"
              style={{
                flex: 1,
                minWidth: '80px',
                padding: '6px 10px',
                backgroundColor: THEME_COLORS.brand.neural,
                color: THEME_COLORS.text.primary,
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: `all ${ANIMATIONS.fast} ${ANIMATIONS.easeInOut}`,
              }}
              onMouseOver={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = THEME_COLORS.brand.cyan;
              }}
              onMouseOut={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = THEME_COLORS.brand.neural;
              }}
            >
              Edit
            </button>
            <button
              onClick={onRegenerate}
              disabled={isGenerating}
              title="Regenerate narrative using AI"
              style={{
                flex: 1,
                minWidth: '80px',
                padding: '6px 10px',
                backgroundColor: THEME_COLORS.brand.gold,
                color: THEME_COLORS.background.primary,
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                opacity: isGenerating ? 0.6 : 1,
                transition: `all ${ANIMATIONS.fast} ${ANIMATIONS.easeInOut}`,
              }}
              onMouseOver={(e) => {
                if (!isGenerating) (e.target as HTMLButtonElement).style.filter = 'brightness(1.1)';
              }}
              onMouseOut={(e) => {
                (e.target as HTMLButtonElement).style.filter = 'brightness(1)';
              }}
            >
              Regenerate
            </button>
            <button
              onClick={handleCopy}
              title="Copy narrative to clipboard"
              style={{
                flex: 1,
                minWidth: '80px',
                padding: '6px 10px',
                backgroundColor: THEME_COLORS.brand.cyan,
                color: THEME_COLORS.background.primary,
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: `all ${ANIMATIONS.fast} ${ANIMATIONS.easeInOut}`,
              }}
              onMouseOver={(e) => {
                (e.target as HTMLButtonElement).style.filter = 'brightness(1.1)';
              }}
              onMouseOut={(e) => {
                (e.target as HTMLButtonElement).style.filter = 'brightness(1)';
              }}
            >
              {copyFeedback ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={onSubmit}
              title="Submit SAR for regulatory filing"
              style={{
                flex: 1,
                minWidth: '80px',
                padding: '6px 10px',
                backgroundColor: THEME_COLORS.risk.safe,
                color: THEME_COLORS.background.primary,
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: `all ${ANIMATIONS.fast} ${ANIMATIONS.easeInOut}`,
              }}
              onMouseOver={(e) => {
                (e.target as HTMLButtonElement).style.filter = 'brightness(1.1)';
              }}
              onMouseOut={(e) => {
                (e.target as HTMLButtonElement).style.filter = 'brightness(1)';
              }}
            >
              Submit SAR
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
