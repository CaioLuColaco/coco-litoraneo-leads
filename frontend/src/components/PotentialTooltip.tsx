import React, { useState, useRef, useEffect } from 'react';

interface PotentialTooltipProps {
  children: React.ReactNode;
  tooltipContent: string;
  className?: string;
}

export const PotentialTooltip: React.FC<PotentialTooltipProps> = ({
  children,
  tooltipContent,
  className = ''
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom'>('top');

  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculateTooltipPosition = () => {
    if (!containerRef.current || !tooltipRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const tooltipHeight = tooltipRef.current.offsetHeight;
    const viewportHeight = window.innerHeight;
    
    // Verifica se há espaço suficiente acima
    const spaceAbove = containerRect.top;
    const spaceBelow = viewportHeight - containerRect.bottom;
    
    // Se há mais espaço abaixo ou se não há espaço suficiente acima, posiciona abaixo
    if (spaceBelow > spaceAbove || spaceAbove < tooltipHeight + 20) {
      setTooltipPosition('bottom');
    } else {
      setTooltipPosition('top');
    }
  };

  const handleMouseEnter = () => {
    calculateTooltipPosition();
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  // Recalcula posição quando a janela é redimensionada
  useEffect(() => {
    const handleResize = () => {
      if (showTooltip) {
        calculateTooltipPosition();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showTooltip]);

  const getTooltipStyle = (): React.CSSProperties => {
    if (!containerRef.current) return {};

    const rect = containerRef.current.getBoundingClientRect();
    
    if (tooltipPosition === 'top') {
      return {
        position: 'fixed',
        bottom: window.innerHeight - rect.top + 10,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
        zIndex: 9999,
      };
    } else {
      return {
        position: 'fixed',
        top: rect.bottom + 10,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
        zIndex: 9999,
      };
    }
  };

  return (
    <>
      <div
        ref={containerRef}
        className={`potential-tooltip ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ position: 'relative' }}
      >
        {children}
      </div>
      
      {showTooltip && (
        <div
          ref={tooltipRef}
          className="potential-tooltip-content"
          style={getTooltipStyle()}
        >
          <div className="tooltip-arrow" />
          <div className="tooltip-body">
            {tooltipContent}
          </div>
        </div>
      )}
    </>
  );
};
