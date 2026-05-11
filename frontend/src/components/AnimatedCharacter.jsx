import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// 19x13 grid
const idleMap = [
  "0000011000001100000",
  "0000122100012210000",
  "0001222211122221000",
  "0012222222222222100",
  "0012212222222122100",
  "0122222222222222210",
  "0122221111122222210", // closed mouth
  "0122222222222222210",
  "0012222222222222100",
  "0001122222222211000",
  "0000012210012210000",
  "0000011100001110000",
  "0000000000000000000"
];

const hoverMap = [
  "0000011000001100000",
  "0000122100012210000",
  "0001222211122221000",
  "0012222222222222100",
  "0012212222222122100",
  "0122222222222222210",
  "0122211111112222210",
  "0122210000012222210", // open mouth
  "0012211111112222100",
  "0001122222222211000",
  "0000012210012210000",
  "0000011100001110000",
  "0000000000000000000"
];

// Spitting map - wide mouth, slightly squished body
const spittingMap = [
  "0000011000001100000",
  "0000122100012210000",
  "0001222211122221000",
  "0012222222222222100",
  "0012212222222122100",
  "0122222222222222210",
  "0122111111111222210",
  "0122100000001222210", // wide open mouth
  "0012111111111222100",
  "0001122222222211000",
  "0000012210012210000",
  "0000011100001110000",
  "0000000000000000000"
];

const renderPixels = (map) => {
  return map.map((row, y) => 
    row.split('').map((char, x) => {
      if (char === '0') return null;
      const fill = char === '1' ? '#111' : '#f0f0f0';
      return <rect key={`${x}-${y}`} x={x} y={y} width="1.05" height="1.05" fill={fill} />
    })
  );
};

export default function AnimatedCharacter({ state }) {
  // Chewing toggle — only needed for the 'eating' interval, not for other states
  const [chewToggle, setChewToggle] = useState(false);
  const [isJumping, setIsJumping] = useState(false);

  // Derive currentMap directly from state (and chewToggle for eating)
  // No setState inside an effect for non-interval states
  const currentMap =
    state === 'eating'  ? (chewToggle ? hoverMap : idleMap) :
    state === 'hover'   ? hoverMap :
    state === 'spitting'? spittingMap :
    idleMap;

  // Chewing interval — only runs during 'eating'
  useEffect(() => {
    if (state !== 'eating') return;
    const interval = setInterval(() => {
      setChewToggle(t => !t);
    }, 200);
    return () => {
      clearInterval(interval);
      setChewToggle(false); // reset toggle when eating stops
    };
  }, [state]);

  // Occasional random idle jump
  useEffect(() => {
    if (state !== 'idle') return;
    const interval = setInterval(() => {
      setIsJumping(true);
      setTimeout(() => setIsJumping(false), 500);
    }, 4000);
    return () => clearInterval(interval);
  }, [state]);

  return (
    <div className="relative flex flex-col items-center justify-center">
      <motion.div 
        className="relative w-full max-w-[320px] sm:max-w-[400px] h-auto flex items-center justify-center"
        style={{ aspectRatio: '418 / 596' }}
        animate={{ y: state === 'idle' ? [-5, 5, -5] : 0 }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Frame Image (Requires user to save the image as public/frame.png) */}
        <img 
          src="/frame.png" 
          alt="Unfollowtchi Frame" 
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-0 drop-shadow-xl"
        />

        {/* Screen Area — centered at 50% horizontal, 60% vertical of the container,
             which maps exactly to the transparent hole in frame.png (pixel-analysed:
             hole center = 49.5% x, 59.9% y of the 418×596 source image). */}
        <div className="absolute z-10 top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[44%] h-[32%] bg-[#9da88a] rounded-xl overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center border-2 border-zinc-500/50">
          
          {/* Checkerboard Background Pattern */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" 
               style={{ 
                 backgroundImage: 'conic-gradient(#5a6649 90deg, transparent 90deg 180deg, #5a6649 180deg 270deg, transparent 270deg)',
                 backgroundSize: '20px 20px'
               }}>
          </div>
          
          {/* LCD Pixel Grid Overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none"
               style={{
                 backgroundImage: 'linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)',
                 backgroundSize: '4px 4px'
               }}>
          </div>

          {/* The 8-bit Pet */}
          <motion.div 
            className="relative w-[80%] h-[80%] flex items-center justify-center z-10"
            animate={
              state === 'eating' ? { y: [0, -5, 0], scale: [1, 1.05, 1] } 
              : state === 'spitting' ? { scale: [1, 1.2, 1], y: [0, -10, 0] }
              : isJumping ? { y: [0, -15, 0] }
              : { y: 0 }
            }
            transition={
              state === 'eating' ? { duration: 0.4, repeat: Infinity } 
              : state === 'spitting' ? { duration: 0.3 }
              : isJumping ? { duration: 0.5 }
              : { type: "spring" }
            }
          >
            <svg viewBox="0 0 19 13" className="w-full h-full drop-shadow-md" shapeRendering="crispEdges">
              {renderPixels(currentMap)}
              
              {/* Data bits dropping into mouth when eating */}
              {state === 'eating' && (
                <motion.g
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: [ -5, 3, 5 ], opacity: [0, 1, 0] }}
                  transition={{ duration: 0.4, repeat: Infinity, ease: "linear" }}
                >
                   <rect x="7" y="5" width="2" height="2" fill="#111" />
                   <rect x="10" y="3" width="2" height="2" fill="#111" />
                </motion.g>
              )}
            </svg>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
