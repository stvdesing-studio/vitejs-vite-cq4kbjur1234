import React, { useState, Suspense } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import { useSpring, a } from '@react-spring/three';

const CAPAS_CONFIG = [
    { id: 'panInferior', src: '/135848.webp', yInicio: 8, yFinal: -1.4, zFinal: -0.2, delay: 0 },
    { id: 'lechuga', src: '/135845.webp', yInicio: 12, yFinal: -1.2, zFinal: -0.1, delay: 100 },
    { id: 'tomate', src: '/135844.webp', yInicio: 15, yFinal: -0.9, zFinal: 0.0, delay: 200 },
    { id: 'carne', src: '/135847.webp', yInicio: 18, yFinal: -0.6, zFinal: 0.1, delay: 300 },
    { id: 'queso', src: '/135846.webp', yInicio: 21, yFinal: -0.4, zFinal: 0.2, delay: 400 },
    { id: 'panSuperior', src: '/135843.webp', yInicio: 25, yFinal: 0.3, zFinal: 0.3, delay: 500 },
];

CAPAS_CONFIG.forEach((capa) => useLoader.preload(TextureLoader, capa.src));
useLoader.preload(TextureLoader, '/135849.webp');

const CapaIngrediente = ({ src, yInicio, yFinal, zFinal, delay, trigger, onImpacto }) => {
    const textura = useLoader(TextureLoader, src);
    const isPanSuperior = src.includes('135843');

    // Animación secuencial para lograr la "cámara lenta"
    const { positionY } = useSpring({
        from: { positionY: yInicio },
        to: async (next) => {
            if (trigger) {
                await next({ delay: delay });

                // Fase 1: Caída rápida (velocidad reducida a la mitad comparada con tu original)
                await next({ positionY: yFinal + 1.2, config: { tension: 120, friction: 22 } });

                // El impacto del agua se dispara justo antes del ensamble final
                if (isPanSuperior && onImpacto) onImpacto();

                // Fase 2: Cámara lenta para el acoplamiento suave
                await next({ positionY: yFinal, config: { tension: 25, friction: 35, clamp: true } });
            } else {
                await next({ positionY: yInicio, delay: 0, config: { tension: 150, friction: 20 } });
            }
        }
    });

    return (
        <a.mesh position-y={positionY} position-z={zFinal}>
            <planeGeometry args={[4.5, 8]} />
            <meshStandardMaterial map={textura} transparent alphaTest={0.05} depthWrite={false} />
        </a.mesh>
    );
};

const SplashEfecto = ({ activo }) => {
    const texturaSplash = useLoader(TextureLoader, '/135849.webp');

    // Lógica de fluidos: Erupción, suspensión y caída por gravedad
    const { scale, opacity, posY } = useSpring({
        from: { scale: 0.8, opacity: 0, posY: -1.5 },
        to: async (next) => {
            if (activo) {
                // Fase 1: Explosión hacia arriba al impacto
                await next({ scale: 1.4, opacity: 1, posY: 0, config: { tension: 250, friction: 15 } });
                // Fase 2: Caída líquida (sale de escena hacia abajo desvaneciéndose)
                await next({ scale: 1.6, opacity: 0, posY: -3, config: { duration: 1200 } });
            } else {
                await next({ scale: 0.8, opacity: 0, posY: -1.5, config: { duration: 100 } });
            }
        }
    });

    return (
        <a.group position-y={posY}>
            {/* Splash Trasero (Alto y envuelve la espalda) */}
            <a.mesh position={[0, -0.2, -1]} scale={scale}>
                <planeGeometry args={[6.5, 6.5]} />
                <a.meshStandardMaterial map={texturaSplash} transparent opacity={opacity} alphaTest={0.05} depthWrite={false} />
            </a.mesh>

            {/* Splash Delantero (Más ancho, más bajo, envuelve el pan inferior) */}
            <a.mesh position={[0, -1.2, 1]} scale={scale}>
                <planeGeometry args={[8, 4.5]} />
                <a.meshStandardMaterial map={texturaSplash} transparent opacity={opacity} alphaTest={0.05} depthWrite={false} />
            </a.mesh>
        </a.group>
    );
};

export default function App() {
    const [caer, setCaer] = useState(false);
    const [impacto, setImpacto] = useState(false);

    return (
        <div style={{ width: '100vw', height: '100vh', background: 'radial-gradient(circle at center, #ffffff 0%, #e1e7f0 100%)', overflow: 'hidden' }}>

            <div style={{ position: 'absolute', top: 30, left: 30, zIndex: 10 }}>
                <button
                    onClick={() => { setCaer(!caer); setImpacto(false); }}
                    style={{
                        padding: '12px 24px', fontSize: '16px', fontWeight: 'bold', background: '#0a0a0a', color: 'white',
                        border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'transform 0.2s'
                    }}
                    onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
                    onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
                >
                    {caer ? 'Reiniciar' : 'Lanzar Hamburguesa'}
                </button>
            </div>

            <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
                <ambientLight intensity={2.5} />
                <directionalLight position={[5, 10, 5]} intensity={1.5} />
                <directionalLight position={[-5, 5, 2]} intensity={0.5} />

                <Suspense fallback={null}>
                    {CAPAS_CONFIG.map((capa) => (
                        <CapaIngrediente key={capa.id} {...capa} trigger={caer} onImpacto={() => setImpacto(true)} />
                    ))}
                    <SplashEfecto activo={impacto} />
                </Suspense>
            </Canvas>
        </div>
    );
}