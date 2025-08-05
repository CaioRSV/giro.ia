import React, { useEffect, useRef } from 'react';
import p5 from 'p5';

type CircularVisualizerProps = {
  getAudioData: () => Float32Array | null;
  width?: number;
  height?: number;
};

const CircularVisualizer: React.FC<CircularVisualizerProps> = ({
  getAudioData,
  width = 400,
  height = 400,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);

  useEffect(() => {
    const sketch = (p: any) => {
      const baseRadius = 100;
      const pointCount = 100;
      let smoothedVolume = 0;

      p.setup = () => {
        const cnv = p.createCanvas(width, height, p.P2D);
        cnv.parent(containerRef.current!);
        p.noStroke();
      };

      p.draw = () => {
        p.background(30);

        const audioData = getAudioData();
        let volume = 0;

        if (audioData) {
          const sum = audioData.reduce((s, v) => s + v * v, 0);
          volume = Math.sqrt(sum / audioData.length);
        }

        // Smooth it
        smoothedVolume = p.lerp(smoothedVolume, volume, 0.1);

        // Draw the blob
        drawBlob(p, width / 2, height / 2, baseRadius, smoothedVolume, pointCount);
      };

      const drawBlob = (
        p: any,
        centerX: number,
        centerY: number,
        radius: number,
        volume: number,
        pointCount: number
      ) => {
        const ctx = p.drawingContext as CanvasRenderingContext2D;
        const gradient = ctx.createLinearGradient(
          centerX - radius,
          centerY - radius,
          centerX + radius,
          centerY + radius
        );
        gradient.addColorStop(0, 'black');
        gradient.addColorStop(1, 'white');
        ctx.fillStyle = gradient;

        p.beginShape();
        for (let i = 0; i < pointCount; i++) {
          const angle = (p.TWO_PI / pointCount) * i;
          const offset = p.noise(i * 0.1, p.frameCount * 0.01) * 50 * volume;
          const r = radius + offset;
          const x = centerX + r * p.cos(angle);
          const y = centerY + r * p.sin(angle);
          p.vertex(x, y);
        }
        p.endShape(p.CLOSE);
      };
    };

    p5InstanceRef.current = new p5(sketch, containerRef.current!);

    return () => {
      p5InstanceRef.current?.remove();
      p5InstanceRef.current = null;
    };
  }, [getAudioData, width, height]);

  return <div ref={containerRef} />;
};

export default CircularVisualizer;
