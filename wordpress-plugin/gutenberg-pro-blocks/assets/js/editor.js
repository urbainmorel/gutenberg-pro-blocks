( function ( wp ) {
	'use strict';

	const { addFilter } = wp.hooks;
	const { createHigherOrderComponent } = wp.compose;
	const { createElement: el, Fragment, useState, useEffect } = wp.element;
	const { InspectorControls } = wp.blockEditor;
	const {
		PanelBody,
		TabPanel,
		RangeControl,
		SelectControl,
		ToggleControl,
		TextControl,
		TextareaControl,
		Button,
		Notice,
	} = wp.components;
	const { __ } = wp.i18n;

	const PROP_MAP = {
		display: 'display',
		flexDirection: 'flex-direction',
		justifyContent: 'justify-content',
		alignItems: 'align-items',
		flexWrap: 'flex-wrap',
		gap: 'gap',
		rowGap: 'row-gap',
		columnGap: 'column-gap',
		gridTemplateColumns: 'grid-template-columns',
		gridTemplateRows: 'grid-template-rows',
		gridColumn: 'grid-column',
		gridRow: 'grid-row',
		padding: 'padding',
		margin: 'margin',
		width: 'width',
		minWidth: 'min-width',
		maxWidth: 'max-width',
		height: 'height',
		minHeight: 'min-height',
		maxHeight: 'max-height',
		position: 'position',
		top: 'top',
		right: 'right',
		bottom: 'bottom',
		left: 'left',
		zIndex: 'z-index',
		overflow: 'overflow',
		aspectRatio: 'aspect-ratio',
		fontSize: 'font-size',
		lineHeight: 'line-height',
		letterSpacing: 'letter-spacing',
		textAlign: 'text-align',
		borderRadius: 'border-radius',
		border: 'border',
		borderColor: 'border-color',
		outline: 'outline',
		outlineOffset: 'outline-offset',
		boxShadow: 'box-shadow',
		background: 'background',
		color: 'color',
		opacity: 'opacity',
		transform: 'transform',
		perspective: 'perspective',
		transformStyle: 'transform-style',
		backfaceVisibility: 'backface-visibility',
		transformOrigin: 'transform-origin',
		filter: 'filter',
		backdropFilter: 'backdrop-filter',
		mixBlendMode: 'mix-blend-mode',
		clipPath: 'clip-path',
		transition: 'transition',
		cursor: 'cursor',
		pointerEvents: 'pointer-events',
		userSelect: 'user-select',
		objectFit: 'object-fit',
	};

	const TRANSFORM_FNS = [
		'translateX',
		'translateY',
		'translateZ',
		'scale',
		'rotate',
		'rotateZ',
		'rotateX',
		'rotateY',
		'skewX',
		'skewY',
	];

	function parseUnit( val, fallback ) {
		if ( val === undefined || val === null || val === '' ) return fallback;
		const num = parseFloat( String( val ) );
		return Number.isNaN( num ) ? fallback : num;
	}

	function compileDeclarations( obj ) {
		if ( ! obj || typeof obj !== 'object' ) return '';
		const rules = [];
		const transforms = [];
		const has3d = obj.rotateX || obj.rotateY || obj.translateZ;

		if ( has3d && obj.perspective ) {
			transforms.push( `perspective(${ obj.perspective })` );
		}

		for ( const fn of TRANSFORM_FNS ) {
			if ( obj[ fn ] !== undefined && obj[ fn ] !== '' ) {
				transforms.push( `${ fn }(${ obj[ fn ] })` );
			}
		}

		for ( const [ key, value ] of Object.entries( obj ) ) {
			if ( TRANSFORM_FNS.includes( key ) ) continue;
			if ( key === 'hide' && value === true ) {
				rules.push( 'opacity:0.35;outline:1px dashed #94a3b8' );
				continue;
			}
			if ( key === 'textGradient' && typeof value === 'string' && value.trim() ) {
				rules.push(
					`background:${ value }`,
					'-webkit-background-clip:text',
					'background-clip:text',
					'-webkit-text-fill-color:transparent'
				);
				continue;
			}
			if ( PROP_MAP[ key ] && ( typeof value === 'string' || typeof value === 'number' ) && String( value ) !== '' ) {
				rules.push( `${ PROP_MAP[ key ] }:${ value }` );
				if ( key === 'backdropFilter' ) {
					rules.push( `-webkit-backdrop-filter:${ value }` );
				}
			}
		}

		if ( transforms.length && ! obj.transform ) {
			rules.push( `transform:${ transforms.join( ' ' ) }` );
		}

		return rules.join( ';' );
	}

	function compileEditorCss( selector, gpb ) {
		if ( ! gpb || typeof gpb !== 'object' ) return '';
		let css = '';
		let base = compileDeclarations( gpb.desktop );

		if ( gpb.glass && typeof gpb.glass === 'object' ) {
			const blur = gpb.glass.blur || '16px';
			const sat = gpb.glass.saturate || '180%';
			const glassRules = [
				`backdrop-filter:blur(${ blur }) saturate(${ sat })`,
				`-webkit-backdrop-filter:blur(${ blur }) saturate(${ sat })`,
			];
			if ( gpb.glass.bg ) glassRules.push( `background:${ gpb.glass.bg }` );
			if ( gpb.glass.border ) glassRules.push( `border:${ gpb.glass.border }` );
			if ( gpb.glass.shadow ) glassRules.push( `box-shadow:${ gpb.glass.shadow }` );
			base = [ base, glassRules.join( ';' ) ].filter( Boolean ).join( ';' );
		}

		if ( gpb.hover ) {
			const tr = gpb.hover.transition || 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
			base = [ base, `transition:${ tr }` ].filter( Boolean ).join( ';' );
		}

		if ( base ) css += `${ selector }{${ base }}`;

		if ( gpb.hover ) {
			const hoverRest = { ...gpb.hover };
			delete hoverRest.transition;
			const hoverCss = compileDeclarations( hoverRest );
			if ( hoverCss ) css += `${ selector }:hover{${ hoverCss }}`;
		}

		if ( typeof gpb.customCss === 'string' && gpb.customCss.trim() ) {
			css += gpb.customCss.replace( /&/g, selector );
		}
		return css;
	}

	// 1. Register `gpb` attribute on all core/* blocks without changing save().
	addFilter(
		'blocks.registerBlockType',
		'gpb/register-attributes',
		function ( settings, name ) {
			if ( ! name || ! name.startsWith( 'core/' ) ) {
				return settings;
			}
			return {
				...settings,
				attributes: {
					...settings.attributes,
					gpb: {
						type: 'object',
						default: {},
					},
				},
			};
		}
	);

	// 2. Live CSS preview on the Block Editor canvas.
	const withEditorPreview = createHigherOrderComponent( function ( BlockListBlock ) {
		return function ( props ) {
			const gpb = props.attributes && props.attributes.gpb;
			const hasGpb = gpb && typeof gpb === 'object' && Object.keys( gpb ).length > 0;
			const previewClass = hasGpb ? `gpb-ed-${ props.clientId.slice( 0, 8 ) }` : '';

			useEffect(
				function () {
					if ( ! hasGpb ) return;
					const styleId = `style-${ previewClass }`;
					let styleEl = document.getElementById( styleId );
					if ( ! styleEl ) {
						styleEl = document.createElement( 'style' );
						styleEl.id = styleId;
						document.head.appendChild( styleEl );
					}
					styleEl.textContent = compileEditorCss( `.${ previewClass }`, gpb );
					return function () {
						if ( styleEl && styleEl.parentNode ) {
							styleEl.parentNode.removeChild( styleEl );
						}
					};
				},
				[ hasGpb, previewClass, JSON.stringify( gpb ) ]
			);

			if ( ! hasGpb ) {
				return el( BlockListBlock, props );
			}

			const mergedClass = [ props.className, previewClass ].filter( Boolean ).join( ' ' );
			return el( BlockListBlock, { ...props, className: mergedClass } );
		};
	}, 'withEditorPreview' );

	addFilter( 'editor.BlockListBlock', 'gpb/with-editor-preview', withEditorPreview );

	// 3. Complete Visual Inspector UI (0 bytes on visitor frontend).
	const withInspectorControls = createHigherOrderComponent( function ( BlockEdit ) {
		return function ( props ) {
			if ( ! props.name || ! props.name.startsWith( 'core/' ) ) {
				return el( BlockEdit, props );
			}

			const gpb = ( props.attributes && props.attributes.gpb ) || {};
			const [ rawJson, setRawJson ] = useState( JSON.stringify( gpb, null, 2 ) );
			const [ jsonError, setJsonError ] = useState( '' );

			useEffect(
				function () {
					setRawJson( JSON.stringify( gpb, null, 2 ) );
					setJsonError( '' );
				},
				[ props.clientId, JSON.stringify( gpb ) ]
			);

			function updateSection( section, key, value ) {
				const next = { ...gpb };
				const secObj = { ...( next[ section ] || {} ) };
				const isEmpty =
					value === undefined ||
					value === null ||
					value === '' ||
					value === false;

				if ( isEmpty ) {
					delete secObj[ key ];
				} else {
					secObj[ key ] = value;
				}

				if ( Object.keys( secObj ).length === 0 ) {
					delete next[ section ];
				} else {
					next[ section ] = secObj;
				}
				props.setAttributes( { gpb: next } );
			}

			function updateTop( key, value ) {
				const next = { ...gpb };
				if ( ! value ) {
					delete next[ key ];
				} else {
					next[ key ] = value;
				}
				props.setAttributes( { gpb: next } );
			}

			function applyPreset( patch ) {
				props.setAttributes( { gpb: { ...gpb, ...patch } } );
			}

			function applyJson( nextText ) {
				setRawJson( nextText );
				try {
					const parsed = nextText.trim() ? JSON.parse( nextText ) : {};
					setJsonError( '' );
					props.setAttributes( { gpb: parsed } );
				} catch ( e ) {
					setJsonError( e.message );
				}
			}

			function renderResponsiveForm( bp ) {
				const d = gpb[ bp ] || {};
				return el(
					'div',
					{ style: { paddingTop: '10px' } },
					el( ToggleControl, {
						label: __( 'Masquer sur cet écran', 'gutenberg-pro-blocks' ),
						checked: Boolean( d.hide ),
						onChange: ( val ) => updateSection( bp, 'hide', val ? true : undefined ),
					} ),
					el( SelectControl, {
						label: __( 'Display / Layout', 'gutenberg-pro-blocks' ),
						value: d.display || '',
						options: [
							{ label: 'Par défaut', value: '' },
							{ label: 'Flex', value: 'flex' },
							{ label: 'Grid', value: 'grid' },
							{ label: 'Block', value: 'block' },
							{ label: 'Inline Flex', value: 'inline-flex' },
						],
						onChange: ( v ) => updateSection( bp, 'display', v ),
					} ),
					( d.display === 'grid' || d.gridTemplateColumns ) &&
						el(
							Fragment,
							null,
							el( TextControl, {
								label: __( 'Colonnes Grid (gridTemplateColumns)', 'gutenberg-pro-blocks' ),
								value: d.gridTemplateColumns || '',
								placeholder: 'repeat(3, minmax(0, 1fr))',
								onChange: ( v ) => updateSection( bp, 'gridTemplateColumns', v ),
							} ),
							el( TextControl, {
								label: __( 'Span colonne (gridColumn)', 'gutenberg-pro-blocks' ),
								value: d.gridColumn || '',
								placeholder: 'span 2',
								onChange: ( v ) => updateSection( bp, 'gridColumn', v ),
							} )
						),
					( d.display === 'flex' || d.display === 'inline-flex' || d.flexDirection ) &&
						el( SelectControl, {
							label: __( 'Direction Flex', 'gutenberg-pro-blocks' ),
							value: d.flexDirection || '',
							options: [
								{ label: 'Par défaut', value: '' },
								{ label: 'Row (ligne)', value: 'row' },
								{ label: 'Column (colonne)', value: 'column' },
								{ label: 'Row Reverse', value: 'row-reverse' },
								{ label: 'Column Reverse', value: 'column-reverse' },
							],
							onChange: ( v ) => updateSection( bp, 'flexDirection', v ),
						} ),
					el( TextControl, {
						label: __( 'Gap (espacement interne)', 'gutenberg-pro-blocks' ),
						value: d.gap || '',
						placeholder: '24px',
						onChange: ( v ) => updateSection( bp, 'gap', v ),
					} ),
					el( TextControl, {
						label: __( 'Padding', 'gutenberg-pro-blocks' ),
						value: d.padding || '',
						placeholder: '32px 24px',
						onChange: ( v ) => updateSection( bp, 'padding', v ),
					} ),
					el( TextControl, {
						label: __( 'Margin', 'gutenberg-pro-blocks' ),
						value: d.margin || '',
						placeholder: '0 auto',
						onChange: ( v ) => updateSection( bp, 'margin', v ),
					} ),
					el( TextControl, {
						label: __( 'Border Radius', 'gutenberg-pro-blocks' ),
						value: d.borderRadius || '',
						placeholder: '24px',
						onChange: ( v ) => updateSection( bp, 'borderRadius', v ),
					} ),
					el( SelectControl, {
						label: __( 'Positionnement', 'gutenberg-pro-blocks' ),
						value: d.position || '',
						options: [
							{ label: 'Static (normal)', value: '' },
							{ label: 'Relative', value: 'relative' },
							{ label: 'Absolute', value: 'absolute' },
							{ label: 'Sticky', value: 'sticky' },
							{ label: 'Fixed', value: 'fixed' },
						],
						onChange: ( v ) => updateSection( bp, 'position', v ),
					} ),
					d.position &&
						el(
							Fragment,
							null,
							el( TextControl, {
								label: 'Top / Right / Bottom / Left (top)',
								value: d.top || '',
								placeholder: '0px',
								onChange: ( v ) => updateSection( bp, 'top', v ),
							} ),
							el( TextControl, {
								label: 'Left',
								value: d.left || '',
								placeholder: '0px',
								onChange: ( v ) => updateSection( bp, 'left', v ),
							} ),
							el( RangeControl, {
								label: 'Z-Index',
								value: parseUnit( d.zIndex, 0 ),
								min: -10,
								max: 100,
								onChange: ( v ) => updateSection( bp, 'zIndex', v === 0 ? undefined : v ),
							} )
						),
					el( TextControl, {
						label: __( 'Taille Police (fontSize)', 'gutenberg-pro-blocks' ),
						value: d.fontSize || '',
						placeholder: 'clamp(1.5rem, 3vw, 2.5rem)',
						onChange: ( v ) => updateSection( bp, 'fontSize', v ),
					} ),
					el( TextControl, {
						label: __( 'Dégradé Texte (textGradient)', 'gutenberg-pro-blocks' ),
						value: d.textGradient || '',
						placeholder: 'linear-gradient(135deg,#fff,#38bdf8)',
						onChange: ( v ) => updateSection( bp, 'textGradient', v ),
					} )
				);
			}

			function renderHoverAnd3dTab() {
				const h = gpb.hover || {};
				const d = gpb.desktop || {};
				return el(
					'div',
					{ style: { paddingTop: '10px' } },
					el( 'strong', { style: { display: 'block', marginBottom: '8px' } }, 'Effets au Survol (:hover)' ),
					el( RangeControl, {
						label: 'Rotation Z (deg)',
						value: parseUnit( h.rotate, 0 ),
						min: -180,
						max: 180,
						step: 1,
						onChange: ( v ) => updateSection( 'hover', 'rotate', v === 0 ? undefined : `${ v }deg` ),
					} ),
					el( RangeControl, {
						label: 'Rotation 3D X (deg)',
						value: parseUnit( h.rotateX, 0 ),
						min: -90,
						max: 90,
						step: 1,
						onChange: ( v ) => updateSection( 'hover', 'rotateX', v === 0 ? undefined : `${ v }deg` ),
					} ),
					el( RangeControl, {
						label: 'Rotation 3D Y (deg)',
						value: parseUnit( h.rotateY, 0 ),
						min: -90,
						max: 90,
						step: 1,
						onChange: ( v ) => updateSection( 'hover', 'rotateY', v === 0 ? undefined : `${ v }deg` ),
					} ),
					el( RangeControl, {
						label: 'Élévation Y (px)',
						value: parseUnit( h.translateY, 0 ),
						min: -100,
						max: 100,
						step: 1,
						onChange: ( v ) => updateSection( 'hover', 'translateY', v === 0 ? undefined : `${ v }px` ),
					} ),
					el( RangeControl, {
						label: 'Décalage X (px)',
						value: parseUnit( h.translateX, 0 ),
						min: -100,
						max: 100,
						step: 1,
						onChange: ( v ) => updateSection( 'hover', 'translateX', v === 0 ? undefined : `${ v }px` ),
					} ),
					el( RangeControl, {
						label: 'Profondeur 3D Z (px)',
						value: parseUnit( h.translateZ, 0 ),
						min: -200,
						max: 200,
						step: 2,
						onChange: ( v ) => updateSection( 'hover', 'translateZ', v === 0 ? undefined : `${ v }px` ),
					} ),
					el( RangeControl, {
						label: 'Zoom / Scale',
						value: parseUnit( h.scale, 1 ),
						min: 0.5,
						max: 1.5,
						step: 0.01,
						onChange: ( v ) => updateSection( 'hover', 'scale', v === 1 ? undefined : v ),
					} ),
					el( TextControl, {
						label: 'Ombre au survol (boxShadow)',
						value: h.boxShadow || '',
						placeholder: '0 24px 48px rgba(0,0,0,0.25)',
						onChange: ( v ) => updateSection( 'hover', 'boxShadow', v ),
					} ),
					el( TextControl, {
						label: 'Fond au survol (background)',
						value: h.background || '',
						onChange: ( v ) => updateSection( 'hover', 'background', v ),
					} ),
					el( TextControl, {
						label: 'Bordure au survol (borderColor)',
						value: h.borderColor || '',
						onChange: ( v ) => updateSection( 'hover', 'borderColor', v ),
					} ),
					el( TextControl, {
						label: 'Transition CSS',
						value: h.transition || '',
						placeholder: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
						onChange: ( v ) => updateSection( 'hover', 'transition', v ),
					} ),
					el( 'hr', { style: { margin: '14px 0' } } ),
					el( 'strong', { style: { display: 'block', marginBottom: '8px' } }, 'Orientation 3D de Base (Desktop)' ),
					el( RangeControl, {
						label: 'Perspective 3D (px)',
						value: parseUnit( d.perspective, 1000 ),
						min: 200,
						max: 2500,
						step: 50,
						onChange: ( v ) => updateSection( 'desktop', 'perspective', v === 1000 && ! d.perspective ? undefined : `${ v }px` ),
					} ),
					el( SelectControl, {
						label: 'Transform Style',
						value: d.transformStyle || '',
						options: [
							{ label: 'Par défaut (flat)', value: '' },
							{ label: 'Preserve 3D', value: 'preserve-3d' },
						],
						onChange: ( v ) => updateSection( 'desktop', 'transformStyle', v ),
					} ),
					el( RangeControl, {
						label: 'Base Rotate X (deg)',
						value: parseUnit( d.rotateX, 0 ),
						min: -90,
						max: 90,
						step: 1,
						onChange: ( v ) => updateSection( 'desktop', 'rotateX', v === 0 ? undefined : `${ v }deg` ),
					} ),
					el( RangeControl, {
						label: 'Base Rotate Y (deg)',
						value: parseUnit( d.rotateY, 0 ),
						min: -90,
						max: 90,
						step: 1,
						onChange: ( v ) => updateSection( 'desktop', 'rotateY', v === 0 ? undefined : `${ v }deg` ),
					} ),
					el( RangeControl, {
						label: 'Base Rotate Z (deg)',
						value: parseUnit( d.rotate, 0 ),
						min: -180,
						max: 180,
						step: 1,
						onChange: ( v ) => updateSection( 'desktop', 'rotate', v === 0 ? undefined : `${ v }deg` ),
					} )
				);
			}

			function renderGlassTab() {
				const gl = gpb.glass || {};
				const d = gpb.desktop || {};
				return el(
					'div',
					{ style: { paddingTop: '10px' } },
					el( 'strong', { style: { display: 'block', marginBottom: '8px' } }, 'Glassmorphism (Backdrop Blur)' ),
					el( RangeControl, {
						label: 'Flou Glass (px)',
						value: parseUnit( gl.blur, 0 ),
						min: 0,
						max: 60,
						step: 1,
						onChange: ( v ) => updateSection( 'glass', 'blur', v === 0 ? undefined : `${ v }px` ),
					} ),
					el( RangeControl, {
						label: 'Saturation (%)',
						value: parseUnit( gl.saturate, 180 ),
						min: 50,
						max: 300,
						step: 10,
						onChange: ( v ) => updateSection( 'glass', 'saturate', v === 180 && ! gl.saturate ? undefined : `${ v }%` ),
					} ),
					el( TextControl, {
						label: 'Fond Glass (rgba)',
						value: gl.bg || '',
						placeholder: 'rgba(255,255,255,0.08)',
						onChange: ( v ) => updateSection( 'glass', 'bg', v ),
					} ),
					el( TextControl, {
						label: 'Bordure Glass',
						value: gl.border || '',
						placeholder: '1px solid rgba(255,255,255,0.18)',
						onChange: ( v ) => updateSection( 'glass', 'border', v ),
					} ),
					el( TextControl, {
						label: 'Ombre Glass',
						value: gl.shadow || '',
						placeholder: '0 24px 48px rgba(0,0,0,0.28)',
						onChange: ( v ) => updateSection( 'glass', 'shadow', v ),
					} ),
					el( 'hr', { style: { margin: '14px 0' } } ),
					el( TextControl, {
						label: 'Background / Gradient (Desktop)',
						value: d.background || '',
						onChange: ( v ) => updateSection( 'desktop', 'background', v ),
					} ),
					el( TextControl, {
						label: 'Box Shadow (Desktop)',
						value: d.boxShadow || '',
						onChange: ( v ) => updateSection( 'desktop', 'boxShadow', v ),
					} ),
					el( TextControl, {
						label: 'Clip-Path (Formes avancées)',
						value: d.clipPath || '',
						placeholder: 'polygon(0 0, 100% 0, 100% 88%, 0 100%)',
						onChange: ( v ) => updateSection( 'desktop', 'clipPath', v ),
					} )
				);
			}

			function renderAnimTab() {
				const anim = gpb.animation || {};
				const inter = gpb.interactive || {};
				return el(
					'div',
					{ style: { paddingTop: '10px' } },
					el( 'strong', { style: { display: 'block', marginBottom: '8px' } }, 'Animation au Défilement' ),
					el( SelectControl, {
						label: 'Type Animation',
						value: anim.type || '',
						options: [
							{ label: 'Aucune', value: '' },
							{ label: 'Fade Up', value: 'fade-up' },
							{ label: 'Fade Down', value: 'fade-down' },
							{ label: 'Fade Left', value: 'fade-left' },
							{ label: 'Fade Right', value: 'fade-right' },
							{ label: 'Zoom In', value: 'zoom-in' },
							{ label: 'Zoom Out', value: 'zoom-out' },
							{ label: 'Blur In', value: 'blur-in' },
							{ label: '3D Flip Up', value: 'flip-up' },
							{ label: '3D Flip Down', value: 'flip-down' },
							{ label: '3D Flip Left', value: 'flip-left' },
							{ label: '3D Flip Right', value: 'flip-right' },
							{ label: '3D Rotate Reveal', value: 'rotate-3d' },
						],
						onChange: ( v ) => updateSection( 'animation', 'type', v ),
					} ),
					anim.type &&
						el(
							Fragment,
							null,
							el( RangeControl, {
								label: 'Durée (ms)',
								value: anim.duration || 650,
								min: 100,
								max: 3000,
								step: 50,
								onChange: ( v ) => updateSection( 'animation', 'duration', v ),
							} ),
							el( RangeControl, {
								label: 'Délai (ms)',
								value: anim.delay || 0,
								min: 0,
								max: 2000,
								step: 50,
								onChange: ( v ) => updateSection( 'animation', 'delay', v === 0 ? undefined : v ),
							} ),
							el( RangeControl, {
								label: 'Stagger enfants (ms)',
								value: anim.stagger || 0,
								min: 0,
								max: 500,
								step: 20,
								onChange: ( v ) => updateSection( 'animation', 'stagger', v === 0 ? undefined : v ),
							} )
						),
					el( RangeControl, {
						label: 'Parallaxe au scroll',
						value: anim.parallax || 0,
						min: -0.5,
						max: 0.5,
						step: 0.02,
						onChange: ( v ) => updateSection( 'animation', 'parallax', v === 0 ? undefined : v ),
					} ),
					el( 'hr', { style: { margin: '14px 0' } } ),
					el( 'strong', { style: { display: 'block', marginBottom: '8px' } }, 'Moteur Interactif & 3D Souris' ),
					el( SelectControl, {
						label: 'Composant Interactif',
						value: inter.type || '',
						options: [
							{ label: 'Aucun', value: '' },
							{ label: 'Carte 3D Interactive + Reflet (tilt3d)', value: 'tilt3d' },
							{ label: 'Bouton Magnétique Souris (magnetic)', value: 'magnetic' },
							{ label: 'Header Sticky Intelligent (sticky-header)', value: 'sticky-header' },
							{ label: 'Tiroir Off-Canvas (offcanvas)', value: 'offcanvas' },
							{ label: 'Compte à rebours Promo (countdown)', value: 'countdown' },
							{ label: 'Grille Filtrable Instantanée (filter-grid)', value: 'filter-grid' },
							{ label: 'Comparateur Avant / Après (before-after)', value: 'before-after' },
							{ label: 'Lightbox Zoom Image (lightbox)', value: 'lightbox' },
							{ label: 'Barre Progression Scroll (scroll-progress)', value: 'scroll-progress' },
							{ label: 'Marquee Défilement Infini (marquee)', value: 'marquee' },
							{ label: 'Slider / Carrousel Tactile (slider)', value: 'slider' },
							{ label: 'Compteur Animé (counter)', value: 'counter' },
							{ label: 'Accordéon (accordion)', value: 'accordion' },
							{ label: 'Onglets (tabs)', value: 'tabs' },
							{ label: 'Modale / Popup (modal)', value: 'modal' },
						],
						onChange: ( v ) => updateSection( 'interactive', 'type', v ),
					} ),
					inter.type === 'sticky-header' &&
						el(
							Fragment,
							null,
							el( RangeControl, {
								label: 'Décalage Scroll (px)',
								value: inter.scrollOffset || 50,
								min: 10,
								max: 300,
								onChange: ( v ) => updateSection( 'interactive', 'scrollOffset', v ),
							} ),
							el( ToggleControl, {
								label: 'Masquer quand on descend',
								checked: Boolean( inter.hideOnScrollDown ),
								onChange: ( v ) => updateSection( 'interactive', 'hideOnScrollDown', v || undefined ),
							} ),
							el( TextControl, {
								label: 'Fond au scroll (scrolledBg)',
								value: inter.scrolledBg || '',
								placeholder: 'rgba(15,23,42,0.85)',
								onChange: ( v ) => updateSection( 'interactive', 'scrolledBg', v ),
							} ),
							el( TextControl, {
								label: 'Flou au scroll (scrolledBlur)',
								value: inter.scrolledBlur || '',
								placeholder: '16px',
								onChange: ( v ) => updateSection( 'interactive', 'scrolledBlur', v ),
							} )
						),
					inter.type === 'offcanvas' &&
						el(
							Fragment,
							null,
							el( SelectControl, {
								label: 'Position du tiroir',
								value: inter.position || 'right',
								options: [
									{ label: 'Droite', value: 'right' },
									{ label: 'Gauche', value: 'left' },
									{ label: 'Bas', value: 'bottom' },
								],
								onChange: ( v ) => updateSection( 'interactive', 'position', v ),
							} ),
							el( TextControl, {
								label: 'Sélecteur déclencheur (trigger)',
								value: inter.trigger || '',
								placeholder: '.btn-ouvrir-tiroir',
								onChange: ( v ) => updateSection( 'interactive', 'trigger', v ),
							} )
						),
					inter.type === 'countdown' &&
						el(
							Fragment,
							null,
							el( TextControl, {
								label: 'Date cible ISO (targetDate)',
								value: inter.targetDate || '',
								placeholder: '2026-12-31T23:59:59',
								onChange: ( v ) => updateSection( 'interactive', 'targetDate', v ),
							} ),
							el( RangeControl, {
								label: 'Ou Evergreen (minutes)',
								value: inter.evergreenMinutes || 0,
								min: 0,
								max: 1440,
								step: 15,
								onChange: ( v ) => updateSection( 'interactive', 'evergreenMinutes', v === 0 ? undefined : v ),
							} )
						),
					inter.type === 'tilt3d' &&
						el(
							Fragment,
							null,
							el( RangeControl, {
								label: 'Inclinaison Max (deg)',
								value: inter.maxTilt || 12,
								min: 2,
								max: 35,
								onChange: ( v ) => updateSection( 'interactive', 'maxTilt', v ),
							} ),
							el( RangeControl, {
								label: 'Perspective 3D (px)',
								value: inter.perspective || 1000,
								min: 300,
								max: 2000,
								step: 50,
								onChange: ( v ) => updateSection( 'interactive', 'perspective', v ),
							} ),
							el( RangeControl, {
								label: 'Scale au survol',
								value: inter.scale || 1.03,
								min: 1,
								max: 1.2,
								step: 0.01,
								onChange: ( v ) => updateSection( 'interactive', 'scale', v ),
							} ),
							el( ToggleControl, {
								label: 'Reflet spéculaire dynamique (Glare)',
								checked: inter.glare !== false,
								onChange: ( v ) => updateSection( 'interactive', 'glare', v ),
							} )
						),
					inter.type === 'magnetic' &&
						el( RangeControl, {
							label: 'Force magnétique',
							value: inter.strength || 0.32,
							min: 0.1,
							max: 0.8,
							step: 0.02,
							onChange: ( v ) => updateSection( 'interactive', 'strength', v ),
						} ),
					inter.type === 'marquee' &&
						el( RangeControl, {
							label: 'Durée boucle (s)',
							value: inter.speed || 28,
							min: 5,
							max: 90,
							onChange: ( v ) => updateSection( 'interactive', 'speed', v ),
						} )
				);
			}

			function renderDynamicTab() {
				const cond = gpb.conditions || {};
				const dyn = gpb.dynamic || {};
				const loggedVal =
					cond.loggedIn === true ? 'true' : cond.loggedIn === false ? 'false' : '';

				return el(
					'div',
					{ style: { paddingTop: '10px' } },
					el( 'strong', { style: { display: 'block', marginBottom: '8px' } }, "Conditions d'Affichage Serveur" ),
					el( SelectControl, {
						label: 'État Utilisateur',
						value: loggedVal,
						options: [
							{ label: 'Tous les visiteurs', value: '' },
							{ label: 'Utilisateurs connectés uniquement', value: 'true' },
							{ label: 'Visiteurs déconnectés uniquement', value: 'false' },
						],
						onChange: ( v ) =>
							updateSection(
								'conditions',
								'loggedIn',
								v === 'true' ? true : v === 'false' ? false : undefined
							),
					} ),
					el( TextControl, {
						label: 'Rôle(s) Utilisateur',
						value: cond.userRole || '',
						placeholder: 'administrator, customer',
						onChange: ( v ) => updateSection( 'conditions', 'userRole', v ),
					} ),
					el( SelectControl, {
						label: 'Panier WooCommerce',
						value: cond.wooCart || '',
						options: [
							{ label: 'Toujours afficher', value: '' },
							{ label: 'Panier non vide uniquement', value: 'not_empty' },
							{ label: 'Panier vide uniquement', value: 'empty' },
						],
						onChange: ( v ) => updateSection( 'conditions', 'wooCart', v ),
					} ),
					el( TextControl, {
						label: 'Champ Meta / ACF (metaKey)',
						value: cond.metaKey || '',
						placeholder: 'prix_promo',
						onChange: ( v ) => updateSection( 'conditions', 'metaKey', v ),
					} ),
					cond.metaKey &&
						el(
							Fragment,
							null,
							el( SelectControl, {
								label: 'Opérateur',
								value: cond.metaCompare || 'exists',
								options: [
									{ label: 'Existe (non vide)', value: 'exists' },
									{ label: "N'existe pas", value: 'not_exists' },
									{ label: 'Égal à (=)', value: 'equals' },
									{ label: 'Différent de (!=)', value: 'not_equals' },
									{ label: 'Supérieur à (>)', value: 'gt' },
									{ label: 'Inférieur à (<)', value: 'lt' },
									{ label: 'Contient', value: 'contains' },
								],
								onChange: ( v ) => updateSection( 'conditions', 'metaCompare', v ),
							} ),
							el( TextControl, {
								label: 'Valeur attendue (metaValue)',
								value: cond.metaValue || '',
								onChange: ( v ) => updateSection( 'conditions', 'metaValue', v ),
							} )
						),
					el( TextControl, {
						label: 'Paramètre URL (urlParam)',
						value: cond.urlParam || '',
						placeholder: 'utm_source=vip',
						onChange: ( v ) => updateSection( 'conditions', 'urlParam', v ),
					} ),
					el( TextControl, {
						label: 'Date Début (dateFrom)',
						value: cond.dateFrom || '',
						placeholder: '2026-11-25 00:00',
						onChange: ( v ) => updateSection( 'conditions', 'dateFrom', v ),
					} ),
					el( TextControl, {
						label: 'Date Fin (dateTo)',
						value: cond.dateTo || '',
						placeholder: '2026-12-31 23:59',
						onChange: ( v ) => updateSection( 'conditions', 'dateTo', v ),
					} ),
					el( 'hr', { style: { margin: '14px 0' } } ),
					el( 'strong', { style: { display: 'block', marginBottom: '8px' } }, 'Liaisons Dynamiques' ),
					el( TextControl, {
						label: 'Lien Dynamique (linkSource)',
						value: dyn.linkSource || '',
						placeholder: 'post:url | woo:add_to_cart_url | meta:lien',
						onChange: ( v ) => updateSection( 'dynamic', 'linkSource', v ),
					} ),
					el( TextControl, {
						label: 'Image Dynamique (imageSource)',
						value: dyn.imageSource || '',
						placeholder: 'post:featured_image | meta:photo',
						onChange: ( v ) => updateSection( 'dynamic', 'imageSource', v ),
					} ),
					el(
						'p',
						{ style: { fontSize: '11px', color: '#64748b', marginTop: '8px' } },
						'Tags disponibles dans les textes : {{post:title}}, {{acf:champ}}, {{woo:price}}, {{woo:discount_pct}}, {{woo:cart_count}}, {{user:first_name}}, {{query:param|Défaut}}, {{date:Y}}'
					)
				);
			}

			return el(
				Fragment,
				null,
				el( BlockEdit, props ),
				el(
					InspectorControls,
					null,
					el(
						PanelBody,
						{
							title: __( 'Gutenberg Pro Design (GPB v3)', 'gutenberg-pro-blocks' ),
							initialOpen: Object.keys( gpb ).length > 0,
						},
						el(
							'div',
							{ style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' } },
							el(
								Button,
								{
									variant: 'secondary',
									size: 'small',
									onClick: () =>
										applyPreset( {
											glass: {
												blur: '16px',
												bg: 'rgba(255,255,255,0.08)',
												border: '1px solid rgba(255,255,255,0.18)',
												shadow: '0 20px 40px rgba(0,0,0,0.2)',
											},
										} ),
								},
								'+ Glass'
							),
							el(
								Button,
								{
									variant: 'secondary',
									size: 'small',
									onClick: () =>
										applyPreset( {
											interactive: {
												type: 'tilt3d',
												maxTilt: 14,
												perspective: 1000,
												scale: 1.03,
												glare: true,
											},
										} ),
								},
								'+ 3D Tilt'
							),
							el(
								Button,
								{
									variant: 'secondary',
									size: 'small',
									onClick: () =>
										applyPreset( {
											hover: {
												translateY: '-6px',
												rotate: '2deg',
												boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
											},
										} ),
								},
								'+ Hover'
							),
							el(
								Button,
								{
									variant: 'secondary',
									size: 'small',
									onClick: () =>
										applyPreset( {
											animation: { type: 'fade-up', duration: 650, once: true },
										} ),
								},
								'+ Anim'
							)
						),
						el(
							TabPanel,
							{
								className: 'gpb-inspector-tabs',
								tabs: [
									{ name: 'responsive', title: 'Resp.' },
									{ name: 'hover3d', title: 'Hover/3D' },
									{ name: 'glass', title: 'Glass' },
									{ name: 'anim', title: 'Anim/Int' },
									{ name: 'dynamic', title: 'Dyn.' },
									{ name: 'code', title: 'CSS/JSON' },
								],
							},
							function ( tab ) {
								if ( tab.name === 'responsive' ) {
									return el(
										TabPanel,
										{
											tabs: [
												{ name: 'desktop', title: 'Desktop' },
												{ name: 'tablet', title: 'Tablette' },
												{ name: 'mobile', title: 'Mobile' },
											],
										},
										( bpTab ) => renderResponsiveForm( bpTab.name )
									);
								}
								if ( tab.name === 'hover3d' ) return renderHoverAnd3dTab();
								if ( tab.name === 'glass' ) return renderGlassTab();
								if ( tab.name === 'anim' ) return renderAnimTab();
								if ( tab.name === 'dynamic' ) return renderDynamicTab();
								return el(
									'div',
									{ style: { paddingTop: '10px' } },
									el( TextareaControl, {
										label: __( 'CSS Scopé (& = ce bloc)', 'gutenberg-pro-blocks' ),
										value: gpb.customCss || '',
										rows: 4,
										placeholder: '&:hover .wp-block-heading{color:#38bdf8}',
										onChange: ( v ) => updateTop( 'customCss', v ),
									} ),
									jsonError && el( Notice, { status: 'error', isDismissible: false }, jsonError ),
									el( TextareaControl, {
										label: __( 'JSON GPB brut', 'gutenberg-pro-blocks' ),
										value: rawJson,
										rows: 8,
										onChange: applyJson,
									} )
								);
							}
						),
						Object.keys( gpb ).length > 0 &&
							el(
								'div',
								{ style: { marginTop: '10px' } },
								el(
									Button,
									{
										isDestructive: true,
										variant: 'link',
										onClick: () => props.setAttributes( { gpb: {} } ),
									},
									__( 'Réinitialiser tout GPB', 'gutenberg-pro-blocks' )
								)
							)
					)
				)
			);
		};
	}, 'withInspectorControls' );

	addFilter( 'editor.BlockEdit', 'gpb/with-inspector-controls', withInspectorControls );
} )( window.wp );
