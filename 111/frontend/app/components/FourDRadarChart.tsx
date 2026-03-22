import React from 'react';

interface FourDRadarChartProps {
  scores: { Green: number, Yellow: number, Blue: number, Orange: number };
}

export function FourDRadarChart({ scores }: FourDRadarChartProps) {
  const size = 340; 
  const center = size / 2;
  
  // Calculate Dimension Scores based on Coordinate Logic
  // 纵轴 (Y-Axis)：信息偏好 (Information Attention)
  // - Top: 抽象/未来 (Abstract/Future): Green + Blue
  // - Bottom: 具象/当下 (Concrete/Present): Orange + Yellow
  const scoreAbstract = (scores.Green || 0) + (scores.Blue || 0);
  const scoreConcrete = (scores.Orange || 0) + (scores.Yellow || 0);

  // 横轴 (X-Axis)：决策依据 (Decision Making)
  // - Right: 关注 事 (Task/Logic): Orange + Blue
  // - Left: 关注 人 (People/Emotion): Green + Yellow
  const scoreTask = (scores.Orange || 0) + (scores.Blue || 0);
  const scorePeople = (scores.Green || 0) + (scores.Yellow || 0);

  // Dynamic scaling: Max score determines the outer edge (100% radius)
  // Max possible per dimension is 8
  const maxVal = Math.max(scoreTask, scorePeople, scoreConcrete, scoreAbstract, 4);
  const radius = size * 0.35; // Use 35% of size for radius to leave room for labels
  const scale = radius / maxVal;

  // Calculate coordinates for each axis point (Data Points)
  // Top: Abstract (抽象)
  const topY = center - scoreAbstract * scale;
  
  // Right: Task (事)
  const rightX = center + scoreTask * scale;
  
  // Bottom: Concrete (具象)
  const bottomY = center + scoreConcrete * scale;
  
  // Left: People (人)
  const leftX = center - scorePeople * scale;

  // Data Polygon Points
  const polyPoints = [
    `${center},${topY}`,
    `${rightX},${center}`,
    `${center},${bottomY}`,
    `${leftX},${center}`
  ].join(" ");

  // Background Quadrant Colors
  // 核心修改：基于用户数据填充颜色，不透明度设为 0.6 以体现“重”感
  const colors = {
    topRight: "hsla(215, 95%, 55%, 0.6)", // 亮蓝
    topLeft: "hsla(150, 90%, 45%, 0.6)",  // 翠绿
    bottomLeft: "hsla(45, 95%, 55%, 0.6)", // 明黄
    bottomRight: "hsla(20, 90%, 60%, 0.6)" // 鲜橙
  };

  // Helper to render label capsule
  const renderLabel = (x: number, y: number, text: string, anchor: 'start' | 'end' | 'middle', type: 'top' | 'bottom' | 'left' | 'right') => {
    // Adjust position for connector line
    let lineEndX = x;
    let lineEndY = y;
    let textX = x;
    let textY = y;
    
    // Offset for capsule
    const offset = 25;
    
    if (type === 'top') {
        lineEndY = y - offset;
        textY = lineEndY;
    } else if (type === 'bottom') {
        lineEndY = y + offset;
        textY = lineEndY;
    } else if (type === 'left') {
        lineEndX = x - offset;
        textX = lineEndX;
    } else if (type === 'right') {
        lineEndX = x + offset;
        textX = lineEndX;
    }

    // Capsule dimensions
    const width = 90;
    const height = 30;
    
    return (
      <g>
        {/* Connector Line */}
        <line 
            x1={type === 'top' || type === 'bottom' ? x : (type === 'left' ? x - 5 : x + 5)} 
            y1={type === 'left' || type === 'right' ? y : (type === 'top' ? y - 5 : y + 5)} 
            x2={lineEndX} 
            y2={lineEndY} 
            stroke="#334155" 
            strokeWidth="1" 
        />
        
        {/* Capsule Shadow */}
        <rect 
            x={textX - width/2} 
            y={textY - height/2 + 1} 
            width={width} 
            height={height} 
            rx={15} 
            fill="rgba(0,0,0,0.1)" 
        />
        
        {/* Capsule Background */}
        <rect 
            x={textX - width/2} 
            y={textY - height/2} 
            width={width} 
            height={height} 
            rx={15} 
            fill="white" 
            stroke="#E5E7EB"
            strokeWidth="0.5"
        />
        
        {/* Text */}
        <text 
            x={textX} 
            y={textY} 
            dy="0.35em" 
            className="text-xs font-bold fill-gray-600" 
            textAnchor="middle"
        >
            {text}
        </text>
      </g>
    );
  };

  return (
    <div className="flex flex-col items-center my-6">
      <div className="relative w-[340px] h-[340px]">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          
          {/* 1. Grid (Concentric Diamonds) - Moved to bottom layer */}
          {[0.25, 0.5, 0.75, 1].map((ratio) => {
             const r = radius * ratio;
             return (
                <polygon 
                  key={ratio}
                  points={`${center},${center - r} ${center + r},${center} ${center},${center + r} ${center - r},${center}`}
                  fill="none" 
                  stroke="#CBD5E1" 
                  strokeWidth="1" 
                  strokeDasharray="4 4"
                />
             );
          })}

          {/* 2. User Data Sectors (Filled per Quadrant) */}
          {/* Top-Right Sector (Blue) */}
          <path d={`M ${center},${center} L ${center},${topY} L ${rightX},${center} Z`} fill={colors.topRight} />
          {/* Top-Left Sector (Green) */}
          <path d={`M ${center},${center} L ${center},${topY} L ${leftX},${center} Z`} fill={colors.topLeft} />
          {/* Bottom-Left Sector (Yellow) */}
          <path d={`M ${center},${center} L ${center},${bottomY} L ${leftX},${center} Z`} fill={colors.bottomLeft} />
          {/* Bottom-Right Sector (Orange) */}
          <path d={`M ${center},${center} L ${center},${bottomY} L ${rightX},${center} Z`} fill={colors.bottomRight} />

          {/* 3. Center Target (Cross) */}
          <line x1={center - 4} y1={center} x2={center + 4} y2={center} stroke="#1E293B" strokeWidth="1.5" />
          <line x1={center} y1={center - 4} x2={center} y2={center + 4} stroke="#1E293B" strokeWidth="1.5" />

          {/* 4. User Data Shape (Stroke Only) */}
          <polygon 
            points={polyPoints} 
            fill="none" 
            stroke="#1E293B" 
            strokeWidth="1.5" 
            strokeLinejoin="round" 
          />

          {/* 5. Data Points (Anchors) */}
          {/* Top */}
          <circle cx={center} cy={topY} r="3" fill="white" stroke="#1E293B" strokeWidth="1.5" />
          {/* Right */}
          <circle cx={rightX} cy={center} r="3" fill="white" stroke="#1E293B" strokeWidth="1.5" />
          {/* Bottom */}
          <circle cx={center} cy={bottomY} r="3" fill="white" stroke="#1E293B" strokeWidth="1.5" />
          {/* Left */}
          <circle cx={leftX} cy={center} r="3" fill="white" stroke="#1E293B" strokeWidth="1.5" />

          {/* 6. Labels (Capsules) */}
          {renderLabel(center, center - radius, "抽象/未来", "middle", "top")}
          {renderLabel(center, center + radius, "具象/当下", "middle", "bottom")}
          {renderLabel(center - radius, center, "关注人", "end", "left")}
          {renderLabel(center + radius, center, "关注事", "start", "right")}

        </svg>
      </div>
    </div>
  );
}
