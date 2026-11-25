<?php
/**
 * Compiles GPB JSON attributes into scoped, responsive, sanitized CSS (including 3D transforms).
 *
 * @package GutenbergProBlocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class GPB_CSS_Compiler {

	/**
	 * Mapping from camelCase GPB property keys to standard CSS properties.
	 *
	 * @var array<string, string>
	 */
	private static $property_map = array(
		'display'             => 'display',
		'flexDirection'       => 'flex-direction',
		'justifyContent'      => 'justify-content',
		'alignItems'          => 'align-items',
		'flexWrap'            => 'flex-wrap',
		'gap'                 => 'gap',
		'rowGap'              => 'row-gap',
		'columnGap'           => 'column-gap',
		'gridTemplateColumns' => 'grid-template-columns',
		'gridTemplateRows'    => 'grid-template-rows',
		'gridColumn'          => 'grid-column',
		'gridRow'             => 'grid-row',
		'padding'             => 'padding',
		'margin'              => 'margin',
		'width'               => 'width',
		'minWidth'            => 'min-width',
		'maxWidth'            => 'max-width',
		'height'              => 'height',
		'minHeight'           => 'min-height',
		'maxHeight'           => 'max-height',
		'position'            => 'position',
		'top'                 => 'top',
		'right'               => 'right',
		'bottom'              => 'bottom',
		'left'                => 'left',
		'zIndex'              => 'z-index',
		'overflow'            => 'overflow',
		'aspectRatio'         => 'aspect-ratio',
		'fontSize'            => 'font-size',
		'lineHeight'          => 'line-height',
		'letterSpacing'       => 'letter-spacing',
		'textAlign'           => 'text-align',
		'borderRadius'        => 'border-radius',
		'border'              => 'border',
		'borderColor'         => 'border-color',
		'outline'             => 'outline',
		'outlineOffset'       => 'outline-offset',
		'boxShadow'           => 'box-shadow',
		'background'          => 'background',
		'color'               => 'color',
		'opacity'             => 'opacity',
		'transform'           => 'transform',
		'perspective'         => 'perspective',
		'transformStyle'      => 'transform-style',
		'backfaceVisibility'  => 'backface-visibility',
		'transformOrigin'     => 'transform-origin',
		'filter'              => 'filter',
		'backdropFilter'      => 'backdrop-filter',
		'mixBlendMode'        => 'mix-blend-mode',
		'clipPath'            => 'clip-path',
		'transition'          => 'transition',
		'cursor'              => 'cursor',
		'pointerEvents'       => 'pointer-events',
		'userSelect'          => 'user-select',
		'objectFit'           => 'object-fit',
	);

	/**
	 * Compile a GPB config array into CSS rules for the given selector.
	 *
	 * @param string               $selector Scoped CSS selector (e.g. `.gpb-1a2b3c4d`).
	 * @param array<string, mixed> $gpb      GPB attribute object.
	 * @return string Compiled CSS string.
	 */
	public static function compile( string $selector, array $gpb ): string {
		$css = '';

		$base_declarations = array();

		if ( ! empty( $gpb['desktop'] ) && is_array( $gpb['desktop'] ) ) {
			$base_declarations = array_merge( $base_declarations, self::build_declarations( $gpb['desktop'] ) );
		}

		if ( ! empty( $gpb['glass'] ) && is_array( $gpb['glass'] ) ) {
			$base_declarations = array_merge( $base_declarations, self::build_glass_declarations( $gpb['glass'] ) );
		}

		$has_hover = ! empty( $gpb['hover'] ) && is_array( $gpb['hover'] );
		if ( $has_hover && ! isset( $base_declarations['transition'] ) ) {
			$transition = ! empty( $gpb['hover']['transition'] )
				? self::sanitize_value( (string) $gpb['hover']['transition'] )
				: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
			if ( '' !== $transition ) {
				$base_declarations['transition'] = $transition;
			}
		}

		if ( ! empty( $base_declarations ) ) {
			$css .= self::format_rule( $selector, $base_declarations );
		}

		if ( ! empty( $gpb['tablet'] ) && is_array( $gpb['tablet'] ) ) {
			$tablet_decl = self::build_declarations( $gpb['tablet'] );
			if ( ! empty( $tablet_decl ) ) {
				$css .= '@media (max-width: 1024px){' . self::format_rule( $selector, $tablet_decl ) . '}';
			}
		}

		if ( ! empty( $gpb['mobile'] ) && is_array( $gpb['mobile'] ) ) {
			$mobile_decl = self::build_declarations( $gpb['mobile'] );
			if ( ! empty( $mobile_decl ) ) {
				$css .= '@media (max-width: 767px){' . self::format_rule( $selector, $mobile_decl ) . '}';
			}
		}

		if ( $has_hover ) {
			$hover_decl = self::build_state_declarations( $gpb['hover'] );
			if ( ! empty( $hover_decl ) ) {
				$css .= self::format_rule( $selector . ':hover', $hover_decl );
			}
		}

		if ( ! empty( $gpb['focus'] ) && is_array( $gpb['focus'] ) ) {
			$focus_decl = self::build_state_declarations( $gpb['focus'] );
			if ( ! empty( $focus_decl ) ) {
				$css .= self::format_rule( $selector . ':focus-visible', $focus_decl );
			}
		}

		if ( ! empty( $gpb['customCss'] ) && is_string( $gpb['customCss'] ) ) {
			$scoped = str_replace( '&', $selector, $gpb['customCss'] );
			$scoped = self::sanitize_raw_css( $scoped );
			if ( '' !== $scoped ) {
				$css .= $scoped;
			}
		}

		return $css;
	}

	/**
	 * Build declarations for a responsive breakpoint block.
	 *
	 * @param array<string, mixed> $props Breakpoint properties.
	 * @return array<string, string>
	 */
	private static function build_declarations( array $props ): array {
		$decl               = array();
		$composed_transform = self::extract_transform_shorthands( $props );

		foreach ( $props as $key => $value ) {
			if ( 'hide' === $key ) {
				if ( true === $value || 'true' === $value || 1 === $value ) {
					$decl['display'] = 'none !important';
				}
				continue;
			}

			if ( 'textGradient' === $key && is_string( $value ) ) {
				$grad = self::sanitize_value( $value );
				if ( '' !== $grad ) {
					$decl['background']              = $grad;
					$decl['-webkit-background-clip'] = 'text';
					$decl['background-clip']         = 'text';
					$decl['-webkit-text-fill-color'] = 'transparent';
				}
				continue;
			}

			if ( ! isset( self::$property_map[ $key ] ) || ( ! is_string( $value ) && ! is_numeric( $value ) ) ) {
				continue;
			}

			$css_prop = self::$property_map[ $key ];
			$clean    = self::sanitize_value( (string) $value );
			if ( '' !== $clean ) {
				$decl[ $css_prop ] = $clean;
				if ( 'backdrop-filter' === $css_prop ) {
					$decl['-webkit-backdrop-filter'] = $clean;
				}
			}
		}

		if ( '' !== $composed_transform && empty( $decl['transform'] ) ) {
			$decl['transform'] = $composed_transform;
		}

		return $decl;
	}

	/**
	 * Build Glassmorphism declarations from shortcut object.
	 *
	 * @param array<string, mixed> $glass Glassmorphism config.
	 * @return array<string, string>
	 */
	private static function build_glass_declarations( array $glass ): array {
		$decl = array();

		$blur     = ! empty( $glass['blur'] ) ? self::sanitize_value( (string) $glass['blur'] ) : '16px';
		$saturate = ! empty( $glass['saturate'] ) ? self::sanitize_value( (string) $glass['saturate'] ) : '180%';
		$filter   = sprintf( 'blur(%s) saturate(%s)', $blur, $saturate );

		$decl['backdrop-filter']         = $filter;
		$decl['-webkit-backdrop-filter'] = $filter;

		if ( ! empty( $glass['bg'] ) ) {
			$bg = self::sanitize_value( (string) $glass['bg'] );
			if ( '' !== $bg ) {
				$decl['background'] = $bg;
			}
		}

		if ( ! empty( $glass['border'] ) ) {
			$border = self::sanitize_value( (string) $glass['border'] );
			if ( '' !== $border ) {
				$decl['border'] = $border;
			}
		}

		if ( ! empty( $glass['shadow'] ) ) {
			$shadow = self::sanitize_value( (string) $glass['shadow'] );
			if ( '' !== $shadow ) {
				$decl['box-shadow'] = $shadow;
			}
		}

		return $decl;
	}

	/**
	 * Build declarations for hover/focus states with 2D & 3D transform shorthands.
	 *
	 * @param array<string, mixed> $state State config.
	 * @return array<string, string>
	 */
	private static function build_state_declarations( array $state ): array {
		$copy = $state;
		unset( $copy['transition'] );
		return self::build_declarations( $copy );
	}

	/**
	 * Extract 2D/3D transform shorthand properties into a single CSS transform value.
	 *
	 * @param array<string, mixed> $props Property array (modified in place).
	 * @return string
	 */
	private static function extract_transform_shorthands( array &$props ): string {
		$transforms = array();
		$has_3d     = isset( $props['rotateX'] ) || isset( $props['rotateY'] ) || isset( $props['translateZ'] );

		if ( $has_3d && isset( $props['perspective'] ) && '' !== (string) $props['perspective'] ) {
			$transforms[] = 'perspective(' . self::sanitize_value( (string) $props['perspective'] ) . ')';
		}

		$fn_map = array(
			'translateX' => 'translateX',
			'translateY' => 'translateY',
			'translateZ' => 'translateZ',
			'scale'      => 'scale',
			'rotate'     => 'rotate',
			'rotateZ'    => 'rotateZ',
			'rotateX'    => 'rotateX',
			'rotateY'    => 'rotateY',
			'skewX'      => 'skewX',
			'skewY'      => 'skewY',
		);

		foreach ( $fn_map as $key => $css_fn ) {
			if ( isset( $props[ $key ] ) && '' !== (string) $props[ $key ] ) {
				$clean = self::sanitize_value( (string) $props[ $key ] );
				if ( '' !== $clean ) {
					$transforms[] = $css_fn . '(' . $clean . ')';
				}
			}
			unset( $props[ $key ] );
		}

		return implode( ' ', $transforms );
	}

	/**
	 * Format selector and declaration map into a CSS rule.
	 *
	 * @param string                $selector CSS selector.
	 * @param array<string, string> $decl     CSS property => value map.
	 * @return string
	 */
	private static function format_rule( string $selector, array $decl ): string {
		$pairs = array();
		foreach ( $decl as $prop => $val ) {
			$pairs[] = $prop . ':' . $val;
		}
		return $selector . '{' . implode( ';', $pairs ) . '}';
	}

	/**
	 * Sanitize a single CSS property value against injection.
	 *
	 * @param string $value Raw CSS value.
	 * @return string
	 */
	private static function sanitize_value( string $value ): string {
		$value = str_replace( array( "\r", "\n", ';', '{', '}' ), '', trim( $value ) );
		$lower = strtolower( $value );
		if ( false !== strpos( $lower, 'expression(' ) || false !== strpos( $lower, 'javascript:' ) || false !== strpos( $lower, '</style' ) ) {
			return '';
		}
		return $value;
	}

	/**
	 * Sanitize scoped raw CSS block.
	 *
	 * @param string $css Raw CSS.
	 * @return string
	 */
	private static function sanitize_raw_css( string $css ): string {
		$css = preg_replace( '#</?\s*style[^>]*>#i', '', $css );
		$css = preg_replace( '#</?\s*script[^>]*>#i', '', (string) $css );
		$css = preg_replace( '/expression\s*\(|javascript\s*:/i', '', (string) $css );
		return trim( (string) $css );
	}
}
