import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

function makeGeometry(shape) {
  if (shape === 'sphere') return new THREE.SphereGeometry(1.3, 48, 48);
  if (shape === 'torus') return new THREE.TorusGeometry(0.95, 0.38, 32, 80);
  if (shape === 'cone') return new THREE.ConeGeometry(1.2, 2, 48);
  if (shape === 'torusKnot') return new THREE.TorusKnotGeometry(0.85, 0.3, 128, 24);
  return new THREE.BoxGeometry(1.7, 1.7, 1.7);
}

/**
 * A self-contained Three.js viewport mounted into the (iframe) DOM. Renders a
 * parametric primitive with lighting + orbit controls. In edit mode the host
 * stylesheet sets `canvas { pointer-events: none }` so the element stays
 * selectable; in preview the controls are interactive.
 */
export default function ThreeBox({ config = {} }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const w = el.clientWidth || 320;
    const h = el.clientHeight || 280;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(config.fov || 50, w / h, 0.1, 100);
    camera.position.set(3, 2, 4.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(5, 6, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.5);
    rim.position.set(-4, 2, -3);
    scene.add(rim);

    const geometry = makeGeometry(config.shape);
    const material = new THREE.MeshStandardMaterial({
      color: config.color || '#6366f1',
      metalness: config.metalness ?? 0.35,
      roughness: config.roughness ?? 0.4,
      wireframe: !!config.wireframe,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.autoRotate = config.autoRotate !== false;
    controls.autoRotateSpeed = 2.2;

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver(() => {
      const W = el.clientWidth;
      const H = el.clientHeight;
      if (W && H) {
        renderer.setSize(W, H);
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
      }
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, [config.shape, config.color, config.metalness, config.roughness, config.wireframe, config.autoRotate, config.fov]);

  return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
}
