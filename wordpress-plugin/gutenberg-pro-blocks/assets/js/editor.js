( function ( wp ) {
	'use strict';

	const { addFilter } = wp.hooks;
	const { createHigherOrderComponent } = wp.compose;
	const { createElement: el, Fragment, useState, useEffect } = wp.element;
	const { InspectorControls } = wp.blockEditor;
	const { PanelBody, TextareaControl, Button, Notice } = wp.components;
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
		boxShadow: 'box-shadow',
		background: 'background',
		color: 'color',
		opacity: 'opacity',
		transform: 'transform',
		filter: 'filter',
		backdropFilter: 'backdrop-filter',
		mixBlendMode: 'mix-blend-mode',
		clipPath: 'clip-path',
		transition: 'transition',
		cursor: 'cursor',
	};

	function compileDeclarations( obj ) {
		if ( ! obj || typeof obj !== 'object' ) return '';
		const rules = [];
		for ( const [ key, value ] of Object.entries( obj ) ) {
			if ( key === 'hide' && value === true ) {
				rules.push( 'opacity:0.35;outline:1px dashed #94a3b8' );
				continue;
			}
			if ( key === 'textGradient' && typeof value === 'string' ) {
				rules.push(
					`background:${ value }`,
					'-webkit-background-clip:text',
					'background-clip:text',
					'-webkit-text-fill-color:transparent'
				);
				continue;
			}
			if ( PROP_MAP[ key ] && ( typeof value === 'string' || typeof value === 'number' ) ) {
				rules.push( `${ PROP_MAP[ key ] }:${ value }` );
			}
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
			const transforms = [];
			if ( gpb.hover.translateX ) transforms.push( `translateX(${ gpb.hover.translateX })` );
			if ( gpb.hover.translateY ) transforms.push( `translateY(${ gpb.hover.translateY })` );
			if ( gpb.hover.scale ) transforms.push( `scale(${ gpb.hover.scale })` );
			if ( gpb.hover.rotate ) transforms.push( `rotate(${ gpb.hover.rotate })` );
			const hoverRest = { ...gpb.hover };
			delete hoverRest.transition;
			delete hoverRest.translateX;
			delete hoverRest.translateY;
			delete hoverRest.scale;
			delete hoverRest.rotate;
			let hoverCss = compileDeclarations( hoverRest );
			if ( transforms.length && ! hoverRest.transform ) {
				hoverCss = [ hoverCss, `transform:${ transforms.join( ' ' ) }` ].filter( Boolean ).join( ';' );
			}
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

	// 3. Inspector panel for editing/inspecting GPB JSON and applying quick presets.
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

			function applyPreset( patch ) {
				const next = { ...gpb, ...patch };
				props.setAttributes( { gpb: next } );
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
							title: __( 'Gutenberg Pro Design (GPB)', 'gutenberg-pro-blocks' ),
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
									onClick: function () {
										applyPreset( {
											glass: {
												blur: '16px',
												bg: 'rgba(255,255,255,0.08)',
												border: '1px solid rgba(255,255,255,0.18)',
												shadow: '0 20px 40px rgba(0,0,0,0.2)',
											},
										} );
									},
								},
								'+ Glass'
							),
							el(
								Button,
								{
									variant: 'secondary',
									size: 'small',
									onClick: function () {
										applyPreset( {
											hover: {
												translateY: '-6px',
												boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
												transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
											},
										} );
									},
								},
								'+ Hover Lift'
							),
							el(
								Button,
								{
									variant: 'secondary',
									size: 'small',
									onClick: function () {
										applyPreset( {
											animation: { type: 'fade-up', duration: 650, delay: 0, once: true },
										} );
									},
								},
								'+ Fade Up'
							)
						),
						jsonError &&
							el(
								Notice,
								{ status: 'error', isDismissible: false },
								jsonError
							),
						el( TextareaControl, {
							label: __( 'GPB Attributes (JSON)', 'gutenberg-pro-blocks' ),
							value: rawJson,
							rows: 10,
							onChange: applyJson,
							help: __(
								'Supports desktop, tablet, mobile, glass, hover, focus, animation, interactive, customCss.',
								'gutenberg-pro-blocks'
							),
						} ),
						Object.keys( gpb ).length > 0 &&
							el(
								Button,
								{
									isDestructive: true,
									variant: 'link',
									onClick: function () {
										props.setAttributes( { gpb: {} } );
									},
								},
								__( 'Reset GPB styles', 'gutenberg-pro-blocks' )
							)
					)
				)
			);
		};
	}, 'withInspectorControls' );

	addFilter( 'editor.BlockEdit', 'gpb/with-inspector-controls', withInspectorControls );
} )( window.wp );
