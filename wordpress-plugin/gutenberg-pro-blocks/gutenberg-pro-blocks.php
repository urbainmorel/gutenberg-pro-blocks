<?php
/**
 * Plugin Name:       Gutenberg Pro Blocks (GPB)
 * Plugin URI:        https://github.com/urbainmorel/gutenberg-pro-blocks
 * Description:       Extends native WordPress Gutenberg blocks with zero-recovery responsive CSS, glassmorphism, hover/focus states, GSAP/WAAPI scroll animations, and lightweight interactive components (sliders, marquees, counters, tabs, modals) via the `gpb` JSON attribute.
 * Version:           3.1.0
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Author:            Morel Urbain
 * Author URI:        https://github.com/urbainmorel
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       gutenberg-pro-blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'GPB_VERSION', '3.1.0' );
define( 'GPB_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'GPB_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once GPB_PLUGIN_DIR . 'includes/class-gpb-css-compiler.php';
require_once GPB_PLUGIN_DIR . 'includes/class-gpb-dynamic.php';
require_once GPB_PLUGIN_DIR . 'includes/class-gpb-renderer.php';
require_once GPB_PLUGIN_DIR . 'includes/class-gpb-mcp-abilities.php';

GPB_Renderer::init();
GPB_MCP_Abilities::init();

/**
 * Enqueue Block Editor enhancements (attribute registration, live canvas preview, inspector JSON/presets).
 */
add_action( 'enqueue_block_editor_assets', static function () {
	wp_enqueue_script(
		'gpb-editor',
		GPB_PLUGIN_URL . 'assets/js/editor.js',
		array(
			'wp-blocks',
			'wp-element',
			'wp-components',
			'wp-block-editor',
			'wp-compose',
			'wp-hooks',
			'wp-i18n',
		),
		GPB_VERSION,
		true
	);
} );

/**
 * Register frontend runtime assets (enqueued on demand by GPB_Renderer).
 */
add_action( 'wp_enqueue_scripts', static function () {
	wp_register_style(
		'gpb-frontend',
		GPB_PLUGIN_URL . 'assets/css/frontend.css',
		array(),
		GPB_VERSION
	);

	wp_register_script(
		'gpb-frontend',
		GPB_PLUGIN_URL . 'assets/js/frontend.js',
		array(),
		GPB_VERSION,
		true
	);
} );
