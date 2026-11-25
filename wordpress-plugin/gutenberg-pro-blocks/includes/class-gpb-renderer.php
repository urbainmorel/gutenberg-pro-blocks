<?php
/**
 * Server-side block hook that injects GPB classes, data attributes, and compiled CSS
 * without altering core block save() HTML.
 *
 * @package GutenbergProBlocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class GPB_Renderer {

	/**
	 * Compiled CSS keyed by block hash class.
	 *
	 * @var array<string, string>
	 */
	private static $styles = array();

	/**
	 * Whether any block on the current request uses animations or interactive controllers.
	 *
	 * @var bool
	 */
	private static $needs_runtime = false;

	/**
	 * Register WordPress hooks.
	 */
	public static function init(): void {
		add_filter( 'render_block', array( __CLASS__, 'filter_render_block' ), 20, 2 );
		add_action( 'wp_footer', array( __CLASS__, 'print_styles_and_assets' ), 5 );
	}

	/**
	 * Process blocks that define `attrs.gpb` and attach scoped class & runtime metadata.
	 *
	 * @param string               $block_content Rendered block HTML.
	 * @param array<string, mixed> $block         Parsed block data.
	 * @return string
	 */
	public static function filter_render_block( string $block_content, array $block ): string {
		if ( '' === trim( $block_content ) || empty( $block['attrs']['gpb'] ) || ! is_array( $block['attrs']['gpb'] ) ) {
			return $block_content;
		}

		$gpb = $block['attrs']['gpb'];
		$id  = 'gpb-' . substr( md5( (string) wp_json_encode( $gpb ) ), 0, 8 );

		if ( ! isset( self::$styles[ $id ] ) ) {
			self::$styles[ $id ] = GPB_CSS_Compiler::compile( '.' . $id, $gpb );
		}

		if ( ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
			return $block_content;
		}

		$processor = new WP_HTML_Tag_Processor( $block_content );
		if ( ! $processor->next_tag() ) {
			return $block_content;
		}

		$processor->add_class( $id );

		if ( ! empty( $gpb['animation'] ) && is_array( $gpb['animation'] ) ) {
			self::$needs_runtime = true;
			$processor->add_class( 'gpb-animate' );
			$processor->set_attribute( 'data-gpb-anim', (string) wp_json_encode( $gpb['animation'] ) );
		}

		if ( ! empty( $gpb['interactive'] ) && is_array( $gpb['interactive'] ) && ! empty( $gpb['interactive']['type'] ) ) {
			self::$needs_runtime = true;
			$type                = sanitize_key( (string) $gpb['interactive']['type'] );
			$processor->add_class( 'gpb-interactive-' . $type );
			$processor->set_attribute( 'data-gpb-interactive', $type );
			$processor->set_attribute( 'data-gpb-config', (string) wp_json_encode( $gpb['interactive'] ) );
		}

		return $processor->get_updated_html();
	}

	/**
	 * Output deduplicated CSS and enqueue runtime scripts only if needed.
	 */
	public static function print_styles_and_assets(): void {
		if ( empty( self::$styles ) && ! self::$needs_runtime ) {
			return;
		}

		$combined = implode( '', array_filter( self::$styles ) );
		if ( '' !== $combined ) {
			echo '<style id="gpb-compiled-css">' . $combined . "</style>\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}

		if ( self::$needs_runtime ) {
			wp_enqueue_style( 'gpb-frontend' );
			wp_enqueue_script( 'gpb-frontend' );
		}
	}
}
