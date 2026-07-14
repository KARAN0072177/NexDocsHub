"use client";

import { ParticlesProvider, Particles } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Engine } from "@tsparticles/engine";

export default function ParticlesBackground() {
  const initParticles = async (engine: Engine): Promise<void> => {
    // loadSlim automatically registers the "image" shape loader natively
    await loadSlim(engine);
  };

  return (
    <ParticlesProvider init={initParticles}>
      <Particles
        id="tsparticles"
        className="absolute inset-0 z-0"
        options={{
          fpsLimit: 120,
          interactivity: {
            events: {
              onClick: {
                enable: false,
              },
              onHover: {
                enable: true,
                mode: "repulse",
                parallax: {
                  enable: true,
                  force: 60,
                  smooth: 12,
                },
              },
            },
            modes: {
              repulse: {
                distance: 120,
                duration: 0.45,
              },
            },
          },
          particles: {
            links: {
              enable: false,
            },
            move: {
              direction: "none",
              enable: true,
              outModes: {
                default: "out",
              },
              random: true,
              speed: { min: 0.4, max: 1.2 }, // Slow elegant float
              straight: false,
            },
            number: {
              density: {
                enable: true,
              },
              value: 30, // Low quantity for perfect layout breathing space
            },
            opacity: {
              value: { min: 0.45, max: 0.8 }, // Crisp monochromatic visibility
              animation: {
                enable: true,
                speed: 0.6,
                sync: false,
                startValue: "random",
              },
            },
            rotate: {
              value: { min: 0, max: 360 },
              direction: "clockwise",
              animation: {
                enable: true,
                speed: 3, // Elegant spin
                sync: false,
              },
            },
            shape: {
              type: "image", // Custom SVG vectors via base64 or inline data URLs
              options: {
                image: [
                  // 1. FileText Document Icon (Cyan)
                  {
                    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%2322D3EE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
                    width: 24,
                    height: 24,
                  },
                  // 2. FileText Document Icon (Purple)
                  {
                    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%236C5CE7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
                    width: 24,
                    height: 24,
                  },
                  // 3. Folder Icon (Cyan)
                  {
                    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%2322D3EE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
                    width: 24,
                    height: 24,
                  },
                  // 4. Folder Icon (Purple)
                  {
                    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%236C5CE7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
                    width: 24,
                    height: 24,
                  },
                  // 5. Code Brackets Icon (Cyan)
                  {
                    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%2322D3EE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
                    width: 24,
                    height: 24,
                  },
                  // 6. Code Brackets Icon (Purple)
                  {
                    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%236C5CE7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
                    width: 24,
                    height: 24,
                  },
                  // 7. Terminal Icon (Cyan)
                  {
                    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%2322D3EE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
                    width: 24,
                    height: 24,
                  },
                  // 8. Terminal Icon (Purple)
                  {
                    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%236C5CE7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
                    width: 24,
                    height: 24,
                  }
                ]
              },
            },
            size: {
              value: { min: 14, max: 24 }, // Distinct sizing for vector outline readability
              animation: {
                enable: true,
                speed: 1.0,
                sync: false,
              },
            },
            shadow: {
              enable: true,
              color: "#8B5CF6",
              blur: 8,
            },
          },
          detectRetina: true,
        }}
      />
    </ParticlesProvider>
  );
}
