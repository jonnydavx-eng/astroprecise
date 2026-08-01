( function () {

	/**
 * Gamma Correction Shader
 * http://en.wikipedia.org/wiki/gamma_correction
 */
	const GammaCorrectionShader = {
		uniforms: {
			'tDiffuse': {
				value: null
			}
		},
		vertexShader:
  /* glsl */
  `

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,
		fragmentShader:
  /* glsl */
  `

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 tex = texture2D( tDiffuse, vUv );

			// exact sRGB transfer (LinearTosRGB equivalent) with no ShaderChunk deps —
			// must compile standalone in a ShaderMaterial (ap-v780 black-screen fix)
			vec3 apC = tex.rgb;
			vec3 apS = mix( apC * 12.92, 1.055 * pow( apC, vec3( 1.0 / 2.4 ) ) - 0.055, step( vec3( 0.0031308 ), apC ) );
			gl_FragColor = vec4( apS, tex.a );

		}`
	};

	THREE.GammaCorrectionShader = GammaCorrectionShader;

} )();
