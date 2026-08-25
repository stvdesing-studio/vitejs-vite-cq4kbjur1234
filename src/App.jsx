import React, { useState, Suspense, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useLoader, useFrame } from '@react-three/fiber';
import { TextureLoader } from 'three';
import { useSpring, a } from '@react-spring/three';

// 1. CONFIGURACIÓN ESTRUCTURAL: 9 Capas de ensamble
const CAPAS_CONFIG = [
    { id: 'base', src: '/135917.webp', MathY: -1.8, Z: -0.4, delay: 0 },
    { id: 'carne1', src: '/135916.webp', MathY: -1.3, Z: -0.3, delay: 100 },
    { id: 'queso_a', src: '/135915.webp', MathY: -0.9, Z: -0.2, delay: 200 },
    { id: 'tomate', src: '/135914.webp', MathY: -0.5, Z: -0.1, delay: 300 },
    { id: 'carne2', src: '/135913.webp', MathY: -0.1, Z: 0.0, delay: 400 },
    { id: 'queso_b', src: '/135912.webp', MathY: 0.3, Z: 0.1, delay: 500 },
    { id: 'lechuga', src: '/135911.webp', MathY: 0.7, Z: 0.2, delay: 600 },
    { id: 'tocino', src: '/135910.webp', MathY: 1.0, Z: 0.3, delay: 700 },
    { id: 'tapa', src: '/135909.webp', MathY: 1.4, Z: 0.4, delay: 800 },
];

CAPAS_CONFIG.forEach((capa) => useLoader.preload(TextureLoader, capa.src));

// 2. COMPONENTE DE PARTÍCULAS: Carbón y Vapor
const EfectoTermico = ({ activo }) => {
    const virutasRef = useRef();
    const vaporRef = useRef();
    const cantidad = 35; // Optimizado para móviles

    // Generación geométrica en memoria estática
    const posiciones = useMemo(() => {
        const temp = new Float32Array(cantidad * 3);
        for (let i = 0; i < cantidad; i++) {
            temp[i * 3] = (Math.random() - 0.5) * 6;     // X spread
            temp[i * 3 + 1] = (Math.random() - 0.5) * 4; // Y spread
            temp[i * 3 + 2] = (Math.random() - 0.5) * 2; // Z spread
        }
        return temp;
    }, []);

    // Motor físico: Ascenso térmico y viento lateral
    useFrame((state, delta) => {
        if (!activo) return;

        if (virutasRef.current && vaporRef.current) {
            const posVirutas = virutasRef.current.geometry.attributes.position.array;
            const posVapor = vaporRef.current.geometry.attributes.position.array;

            for (let i = 0; i < cantidad; i++) {
                // Velocidad de ascenso (Y) y oscilación (X)
                const velocidadAscenso = delta * (0.8 + Math.random() * 0.4);
                const viento = Math.sin(state.clock.elapsedTime + i) * 0.01;

                posVirutas[i * 3 + 1] += velocidadAscenso;
                posVirutas[i * 3] += viento;

                posVapor[i * 3 + 1] += velocidadAscenso * 0.7; // El vapor sube más lento
                posVapor[i * 3] += viento * 1.5;

                // Reciclaje de partículas al salir del encuadre superior
                if (posVirutas[i * 3 + 1] > 3.5) {
                    posVirutas[i * 3 + 1] = -2.5;
                    posVirutas[i * 3] = (Math.random() - 0.5) * 5;
                }
                if (posVapor[i * 3 + 1] > 3.5) {
                    posVapor[i * 3 + 1] = -2.5;
                    posVapor[i * 3] = (Math.random() - 0.5) * 5;
                }
            }
            virutasRef.current.geometry.attributes.position.needsUpdate = true;
            vaporRef.current.geometry.attributes.position.needsUpdate = true;
        }
    });

    return (
        <group visible={activo} position={[0, -1, -1]}>
            {/* Vapor grisáceo/transparente */}
            <points ref={vaporRef}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={cantidad} array={posiciones.slice(0)} itemSize={3} />
                </bufferGeometry>
                <pointsMaterial size={1.2} color="#4a4f52" transparent opacity={0.12} depthWrite={false} />
            </points>

            {/* Virutas de carbón incandescentes */}
            <points ref={virutasRef}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={cantidad} array={posiciones.slice()} itemSize={3} />
                </bufferGeometry>
                <pointsMaterial size={0.06} color="#ff3300" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
            </points>
        </group>
    );
};

// 3. SISTEMA DE GRAVEDAD Y MONTAJE
const CapaIngrediente = ({ src, MathY, Z, delay, trigger }) => {
    const textura = useLoader(TextureLoader, src);

    const { positionY } = useSpring({
        from: { positionY: 15 }, // Altura de caída
        to: async (next) => {
            if (trigger) {
                await next({ delay: delay });
                await next({ positionY: MathY + 0.5, config: { tension: 120, friction: 20 } });
                await next({ positionY: MathY, config: { tension: 40, friction: 25, clamp: true } });
            } else {
                await next({ positionY: 15 + (MathY * 2), delay: 0, config: { tension: 100, friction: 20 } });
            }
        }
    });

    return (
        <a.mesh position-y={positionY} position-z={Z}>
            {/* Geometría 16:9 estricta */}
            <planeGeometry args={[7.11, 4]} />
            <meshStandardMaterial map={textura} transparent alphaTest={0.05} depthWrite={false} />
        </a.mesh>
    );
};

// 4. ENSAMBLAJE PRINCIPAL
export default function App() {
    const [ensamblar, setEnsamblar] = useState(false);

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            backgroundImage: 'url(/ui-background.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            overflow: 'hidden',
            position: 'relative'
        }}>

            {/* UI Overlay */}
            <div style={{ position: 'absolute', top: 30, right: 40, zIndex: 10 }}>
                <button
                    onClick={() => setEnsamblar(!ensamblar)}
                    style={{
                        padding: '12px 30px',
                        fontSize: '13px',
                        fontFamily: 'sans-serif',
                        fontWeight: 'bold',
                        letterSpacing: '2px',
                        background: 'transparent',
                        color: '#e5b33e',
                        border: '2px solid #e5b33e',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    {ensamblar ? 'Desmontar' : 'Ensamblar Orden'}
                </button>
            </div>

            <Canvas camera={{ position: [0, 0, 7.5], fov: 50 }}>
                <ambientLight intensity={1.5} />
                <directionalLight position={[5, 5, 2]} intensity={2.0} />

                <Suspense fallback={null}>
                    <group position={[-1.2, -0.2, 0]}>
                        {CAPAS_CONFIG.map((capa) => (
                            <CapaIngrediente
                                key={capa.id}
                                src={capa.src}
                                MathY={capa.MathY}
                                Z={capa.Z}
                                delay={capa.delay}
                                trigger={ensamblar}
                            />
                        ))}
                        <EfectoTermico activo={ensamblar} />
                    </group>
                </Suspense>
            </Canvas>
        </div>
    );
}
