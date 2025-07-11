
// 1) Renderer, Scene, Camera
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// 2) Uniforms 정의
const uniforms = {
  u_image: { value: null },
  u_progress: { value: 0.0 },
  u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  u_strength: { value: 1.0 } // 강도 조절용 uniform 추가
};

// 3) 쉐이더 코드
const vertexShader = `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_progress;
  uniform vec2 u_resolution;
  uniform float u_strength;

  // 8x8 Bayer 매트릭스 (0~1 정규화)
  float bayer8[64];
  void initBayer(){
    bayer8[0]=0.0/64.0;  bayer8[1]=48.0/64.0;  bayer8[2]=12.0/64.0;  bayer8[3]=60.0/64.0;  bayer8[4]=3.0/64.0;  bayer8[5]=51.0/64.0;  bayer8[6]=15.0/64.0;  bayer8[7]=63.0/64.0;
    bayer8[8]=32.0/64.0; bayer8[9]=16.0/64.0;  bayer8[10]=44.0/64.0; bayer8[11]=28.0/64.0; bayer8[12]=35.0/64.0; bayer8[13]=19.0/64.0; bayer8[14]=47.0/64.0; bayer8[15]=31.0/64.0;
    bayer8[16]=8.0/64.0; bayer8[17]=56.0/64.0; bayer8[18]=4.0/64.0;  bayer8[19]=52.0/64.0; bayer8[20]=11.0/64.0; bayer8[21]=59.0/64.0; bayer8[22]=7.0/64.0;  bayer8[23]=55.0/64.0;
    bayer8[24]=40.0/64.0; bayer8[25]=24.0/64.0; bayer8[26]=36.0/64.0; bayer8[27]=20.0/64.0; bayer8[28]=43.0/64.0; bayer8[29]=27.0/64.0; bayer8[30]=39.0/64.0; bayer8[31]=23.0/64.0;
    bayer8[32]=2.0/64.0; bayer8[33]=50.0/64.0; bayer8[34]=14.0/64.0; bayer8[35]=62.0/64.0; bayer8[36]=1.0/64.0; bayer8[37]=49.0/64.0; bayer8[38]=13.0/64.0; bayer8[39]=61.0/64.0;
    bayer8[40]=34.0/64.0; bayer8[41]=18.0/64.0; bayer8[42]=46.0/64.0; bayer8[43]=30.0/64.0; bayer8[44]=33.0/64.0; bayer8[45]=17.0/64.0; bayer8[46]=45.0/64.0; bayer8[47]=29.0/64.0;
    bayer8[48]=10.0/64.0; bayer8[49]=58.0/64.0; bayer8[50]=6.0/64.0;  bayer8[51]=54.0/64.0; bayer8[52]=9.0/64.0;  bayer8[53]=57.0/64.0; bayer8[54]=5.0/64.0;  bayer8[55]=53.0/64.0;
    bayer8[56]=42.0/64.0; bayer8[57]=26.0/64.0; bayer8[58]=38.0/64.0; bayer8[59]=22.0/64.0; bayer8[60]=41.0/64.0; bayer8[61]=25.0/64.0; bayer8[62]=37.0/64.0; bayer8[63]=21.0/64.0;
  }

  void main(){
    initBayer();

    // 픽셀 좌표 → UV
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec4 src = texture2D(u_image, uv);

    // 원본 밝기 계산 (luminance)
    float lum = dot(src.rgb, vec3(0.299, 0.587, 0.114));

    // Bayer 임계치 가져오기 (8x8)
    float scale = 1.0; // 알갱이 크기 조절
    ivec2 pix = ivec2(mod(gl_FragCoord.xy / scale, 8.0));
    int idx = pix.y * 8 + pix.x;
    float thresh = bayer8[idx];

    // progress에 따라 디더링 강도 조절
    float d = lum < pow(thresh, u_strength) * (1.0 - u_progress) ? 0.0 : 1.0;

    // 최종 컬러: 디더(d)와 원본 밝기(lum) 블렌드
    float blend = mix(d, lum, u_progress);
    gl_FragColor = vec4(vec3(blend), src.a);
  }
`;

// 4) Plane + ShaderMaterial 생성
const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader
});
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
scene.add(quad);

// 5) 이미지 로드 → uniform에 할당
new THREE.TextureLoader().load(
  './m.jpg',
  tex => {
    tex.minFilter = THREE.LinearFilter;
    uniforms.u_image.value = tex;
  }
);

// 6) 애니메이션 루프: progress 0 → 1
function animate(){
  uniforms.u_progress.value = Math.min(uniforms.u_progress.value + 0.001, 1.0);
  renderer.render(scene, camera);
  if (uniforms.u_progress.value < 1.0) {
    requestAnimationFrame(animate);
  }
}
animate();

// 7) 윈도우 리사이즈 핸들링
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
});
