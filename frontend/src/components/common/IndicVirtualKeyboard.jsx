import React, { useState } from 'react';
import { Delete, X, Space, Check } from 'lucide-react';

/**
 * IndicVirtualKeyboard — Touch-Friendly On-Screen Virtual Keyboard
 * Supports Indian script input (Devanagari, Bengali, Tamil, etc.) on kiosks and devices
 * without native hardware keyboard support.
 */
export default function IndicVirtualKeyboard({
  language = 'hi',
  onInsertChar,
  onBackspace,
  onClear,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('vyanjan'); // 'vyanjan' | 'swar' | 'matra' | 'num'

  // Script character sets (Devanagari default, extensible)
  const SWAR = ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए', 'ऐ', 'ओ', 'औ', 'अं', 'अः'];
  
  const VYANJAN = [
    'क', 'ख', 'ग', 'घ', 'ङ',
    'च', 'छ', 'ज', 'झ', 'ञ',
    'ट', 'ठ', 'ड', 'ढ', 'ण',
    'त', 'थ', 'द', 'ध', 'न',
    'प', 'फ', 'ब', 'भ', 'म',
    'य', 'र', 'ल', 'व',
    'श', 'ष', 'स', 'ह',
    'क्ष', 'त्र', 'ज्ञ', 'ड़', 'ढ़'
  ];

  const MATRAS = [
    { label: 'ा (आ)', char: 'ा' },
    { label: 'ि (इ)', char: 'ि' },
    { label: 'ी (ई)', char: 'ी' },
    { label: 'ु (उ)', char: 'ु' },
    { label: 'ू (ऊ)', char: 'ू' },
    { label: 'ृ (ऋ)', char: 'ृ' },
    { label: 'े (ए)', char: 'े' },
    { label: 'ै (ऐ)', char: 'ै' },
    { label: 'ो (ओ)', char: 'ो' },
    { label: 'ौ (औ)', char: 'ौ' },
    { label: 'ं (अनुस्वार)', char: 'ं' },
    { label: 'ः (विसर्ग)', char: 'ः' },
    { label: '् (हलंत)', char: '्' },
    { label: 'ँ (चन्द्रबिन्दु)', char: 'ँ' },
    { label: '़ (नुक्ता)', char: '़' }
  ];

  const NUMERALS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div 
      className="indic-keyboard-container" 
      role="region" 
      aria-label="On-Screen Indic Keyboard"
      style={{
        backgroundColor: '#FFFFFF',
        border: '2px solid var(--gov-primary)',
        borderRadius: '6px',
        boxShadow: '0 8px 24px rgba(11, 31, 58, 0.2)',
        padding: '12px 14px',
        marginTop: '10px',
        width: '100%',
        maxWidth: '680px',
        zIndex: 50,
        position: 'relative'
      }}
    >
      {/* Keyboard Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid var(--gov-border)', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--gov-primary)' }}>
            ⌨ ऑन-स्क्रीन कीबोर्ड (On-Screen Keyboard)
          </span>
          <span style={{ fontSize: '10.5px', backgroundColor: 'var(--gov-primary-light)', color: 'var(--gov-primary)', padding: '2px 8px', borderRadius: '3px', fontWeight: 600 }}>
            {language === 'hi' ? 'देवनागरी (Devanagari)' : 'Indic Keyboard'}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Virtual Keyboard"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--gov-text-muted)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('vyanjan')}
          style={{
            flex: 1,
            padding: '6px 8px',
            fontSize: '12px',
            fontWeight: 700,
            borderRadius: '4px',
            border: activeTab === 'vyanjan' ? '2px solid var(--gov-primary)' : '1px solid var(--gov-border)',
            backgroundColor: activeTab === 'vyanjan' ? 'var(--gov-primary-light)' : '#F8FAFC',
            color: activeTab === 'vyanjan' ? 'var(--gov-primary)' : 'var(--gov-text-muted)',
            cursor: 'pointer'
          }}
        >
          व्यंजन (Consonants)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('swar')}
          style={{
            flex: 1,
            padding: '6px 8px',
            fontSize: '12px',
            fontWeight: 700,
            borderRadius: '4px',
            border: activeTab === 'swar' ? '2px solid var(--gov-primary)' : '1px solid var(--gov-border)',
            backgroundColor: activeTab === 'swar' ? 'var(--gov-primary-light)' : '#F8FAFC',
            color: activeTab === 'swar' ? 'var(--gov-primary)' : 'var(--gov-text-muted)',
            cursor: 'pointer'
          }}
        >
          स्वर (Vowels)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('matra')}
          style={{
            flex: 1,
            padding: '6px 8px',
            fontSize: '12px',
            fontWeight: 700,
            borderRadius: '4px',
            border: activeTab === 'matra' ? '2px solid var(--gov-primary)' : '1px solid var(--gov-border)',
            backgroundColor: activeTab === 'matra' ? 'var(--gov-primary-light)' : '#F8FAFC',
            color: activeTab === 'matra' ? 'var(--gov-primary)' : 'var(--gov-text-muted)',
            cursor: 'pointer'
          }}
        >
          मात्राएं (Matras)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('num')}
          style={{
            flex: 0.8,
            padding: '6px 8px',
            fontSize: '12px',
            fontWeight: 700,
            borderRadius: '4px',
            border: activeTab === 'num' ? '2px solid var(--gov-primary)' : '1px solid var(--gov-border)',
            backgroundColor: activeTab === 'num' ? 'var(--gov-primary-light)' : '#F8FAFC',
            color: activeTab === 'num' ? 'var(--gov-primary)' : 'var(--gov-text-muted)',
            cursor: 'pointer'
          }}
        >
          अंक (123)
        </button>
      </div>

      {/* Keys Grid */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: activeTab === 'matra' ? 'repeat(auto-fill, minmax(80px, 1fr))' : 'repeat(auto-fill, minmax(44px, 1fr))',
          gap: '6px',
          maxHeight: '220px',
          overflowY: 'auto',
          padding: '4px 2px',
          marginBottom: '10px'
        }}
      >
        {activeTab === 'vyanjan' && VYANJAN.map((char) => (
          <button
            key={char}
            type="button"
            onClick={() => onInsertChar(char)}
            style={{
              height: '42px',
              fontSize: '18px',
              fontWeight: 700,
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              cursor: 'pointer',
              color: '#0B1F3A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.1s'
            }}
            onMouseDown={(e) => e.currentTarget.style.backgroundColor = 'var(--gov-primary-light)'}
            onMouseUp={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
          >
            {char}
          </button>
        ))}

        {activeTab === 'swar' && SWAR.map((char) => (
          <button
            key={char}
            type="button"
            onClick={() => onInsertChar(char)}
            style={{
              height: '42px',
              fontSize: '18px',
              fontWeight: 700,
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              cursor: 'pointer',
              color: '#0B1F3A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {char}
          </button>
        ))}

        {activeTab === 'matra' && MATRAS.map((m) => (
          <button
            key={m.char}
            type="button"
            onClick={() => onInsertChar(m.char)}
            style={{
              height: '42px',
              fontSize: '13.5px',
              fontWeight: 700,
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              cursor: 'pointer',
              color: '#0B1F3A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 6px'
            }}
          >
            {m.label}
          </button>
        ))}

        {activeTab === 'num' && NUMERALS.map((char) => (
          <button
            key={char}
            type="button"
            onClick={() => onInsertChar(char)}
            style={{
              height: '42px',
              fontSize: '17px',
              fontWeight: 700,
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              cursor: 'pointer',
              color: '#0B1F3A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {char}
          </button>
        ))}
      </div>

      {/* Bottom Control Actions (Space, Backspace, Clear, Done) */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={() => onInsertChar(' ')}
          style={{
            flex: 2,
            height: '40px',
            backgroundColor: '#F1F5F9',
            border: '1px solid var(--gov-border)',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontWeight: 700,
            fontSize: '13px',
            color: 'var(--gov-primary)'
          }}
        >
          <Space size={16} />
          <span>Space (स्पेस)</span>
        </button>

        <button
          type="button"
          onClick={onBackspace}
          style={{
            flex: 1.2,
            height: '40px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontWeight: 700,
            fontSize: '12px',
            color: '#B91C1C'
          }}
        >
          <Delete size={15} />
          <span>मिटाएं</span>
        </button>

        {onClear && (
          <button
            type="button"
            onClick={onClear}
            style={{
              flex: 0.8,
              height: '40px',
              backgroundColor: '#F8FAFC',
              border: '1px solid var(--gov-border)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '11.5px',
              color: 'var(--gov-text-muted)'
            }}
          >
            Clear
          </button>
        )}

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              height: '40px',
              backgroundColor: 'var(--gov-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              fontWeight: 700,
              fontSize: '12.5px'
            }}
          >
            <Check size={14} />
            <span>पूर्ण (Done)</span>
          </button>
        )}
      </div>
    </div>
  );
}
