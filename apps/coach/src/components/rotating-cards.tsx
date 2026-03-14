'use client';

import React from 'react';

const cardColors = [
  '142, 249, 252',
  '142, 252, 204',
  '142, 252, 157',
  '215, 252, 142',
  '252, 252, 142',
  '252, 208, 142',
  '252, 142, 142',
  '252, 142, 239',
  '204, 142, 252',
  '142, 202, 252',
];

export function RotatingCards() {
  return (
    <div className="rotating-wrapper">
      <div className="rotating-inner" style={{ '--quantity': cardColors.length } as React.CSSProperties}>
        {cardColors.map((color, idx) => (
          <div
            key={idx}
            className="rotating-card"
            style={{
              '--index': idx,
              '--color-card': color,
            } as React.CSSProperties}
          >
            <div className="rotating-card-img" />
          </div>
        ))}
      </div>
    </div>
  );
}
