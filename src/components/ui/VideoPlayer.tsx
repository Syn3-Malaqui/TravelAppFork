import React from 'react';

interface VideoPlayerProps {
  src: string;
  className?: string;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  poster?: string;
  onClick?: (e: React.MouseEvent) => void;
}

// A minimal responsive wrapper around the native HTML <video> element.
// It occupies the full width/height of its container and inherits any Tailwind classes via `className`.
// All heavy custom controls have been removed per user request – the browser's default controls will be shown.
const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  className = '',
  width,
  height,
  autoPlay = false,
  muted = false,
  loop = false,
  controls = true,
  poster,
  onClick,
}) => {
  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-black ${className}`}
      style={{ width, height }}
      onClick={onClick}
    >
      <video
        src={src}
        className="w-full h-full object-contain"
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        controls={controls}
        playsInline
        poster={poster}
      />
    </div>
  );
};

export default VideoPlayer;
// Provide named export for compatibility with existing imports
export { VideoPlayer }; 