import React, { useEffect, useRef } from 'react';

const ShaderBackground = () => {
  const canvasRef = useRef(null);
  const animationFrameIdRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;

    // Clean up previous context if needed
    const cleanup = () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };

    const syncSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    window.addEventListener('resize', syncSize);
    syncSize();

    const vs = `attribute vec2 a_position;
 varying vec2 v_texCoord;
 void main() {
   v_texCoord = a_position * 0.5 + 0.5;
   gl_Position = vec4(a_position, 0.0, 1.0);
 }`;
    const fs = `precision highp float;
 varying vec2 v_texCoord;
 uniform float u_time;
 uniform vec2 u_resolution;

 void main() {
     vec2 uv = v_texCoord;
     vec3 color1 = vec3(0.02, 0.06, 0.12);   // Deep navy
     vec3 color2 = vec3(0.0, 0.72, 0.85);    // Teal cyan
     vec3 color3 = vec3(0.25, 0.05, 0.45);   // Deep purple
     
     float wave = sin(uv.x * 2.5 + u_time * 0.35) * cos(uv.y * 2.0 - u_time * 0.28);
     wave += 0.45 * sin(uv.y * 4.0 + u_time * 0.55) * cos(uv.x * 1.8 + u_time * 0.22);
     
     vec3 finalColor = mix(color1, color2, smoothstep(-0.2, 0.8, wave) * 0.55);
     finalColor = mix(finalColor, color3, smoothstep(0.3, 1.0, uv.x + wave * 0.15) * 0.65);
     finalColor = mix(finalColor, color1, uv.y * 0.25);
     
     gl_FragColor = vec4(finalColor, 1.0);
 }`;

    const compileShader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    };

    const vShader = compileShader(gl.VERTEX_SHADER, vs);
    const fShader = compileShader(gl.FRAGMENT_SHADER, fs);
    if (!vShader || !fShader) return;

    const program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return;
    }

    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, 'a_position');
    if (pos !== -1) {
      gl.enableVertexAttribArray(pos);
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    }

    const uTime = gl.getUniformLocation(program, 'u_time');
    const uRes = gl.getUniformLocation(program, 'u_resolution');

    const render = (t) => {
      if (!gl || !canvas) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program); // Re-use program each frame to be safe
      if (pos !== -1) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.enableVertexAttribArray(pos);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
      }
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameIdRef.current = requestAnimationFrame(render);
    };
    render(0);

    // Parallax for the card
    const handleMouseMove = (e) => {
      const card = document.querySelector('.glass-panel');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      card.style.transform = `perspective(1000px) rotateX(${-y * 0.005}deg) rotateY(${x * 0.005}deg)`;
    };
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      cleanup();
      window.removeEventListener('resize', syncSize);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div 
      className="shader-background" 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none'
      }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
        id="shader-canvas-ANIMATION_3"
      />
    </div>
  );
};

export default ShaderBackground;
