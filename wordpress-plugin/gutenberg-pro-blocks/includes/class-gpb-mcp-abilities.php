<?php
/**
 * WordPress Abilities API & REST API integration for Gutenberg Pro Blocks (GPB).
 * Exposes 100% of GPB capabilities to WordPress MCP Adapter (`WordPress/mcp-adapter`).
 *
 * @package GutenbergProBlocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class GPB_MCP_Abilities {

	const CATEGORY       = 'gutenberg-pro-blocks';
	const REST_NAMESPACE = 'gpb/v1';

	/**
	 * Register WordPress Abilities API & REST API hooks.
	 */
	public static function init(): void {
		add_action( 'wp_abilities_api_categories_init', array( __CLASS__, 'register_category' ) );
		add_action( 'wp_abilities_api_init', array( __CLASS__, 'register_abilities' ) );
		add_action( 'rest_api_init', array( __CLASS__, 'register_rest_routes' ) );
	}

	/**
	 * Register GPB ability category.
	 */
	public static function register_category(): void {
		if ( ! function_exists( 'wp_register_ability_category' ) ) {
			return;
		}
		wp_register_ability_category(
			self::CATEGORY,
			array(
				'label'       => __( 'Gutenberg Pro Blocks', 'gutenberg-pro-blocks' ),
				'description' => __( 'Create, inspect, and style pure Gutenberg blocks with GPB responsive, 3D, dynamic, and interactive attributes.', 'gutenberg-pro-blocks' ),
			)
		);
	}

	/**
	 * Register MCP-public abilities for WordPress MCP Adapter.
	 */
	public static function register_abilities(): void {
		if ( ! function_exists( 'wp_register_ability' ) ) {
			return;
		}

		wp_register_ability(
			'gpb/get-schema',
			array(
				'label'               => __( 'Get GPB Schema & Capabilities', 'gutenberg-pro-blocks' ),
				'description'         => __( 'Returns the GPB v3 schema: supported responsive/3D CSS properties, animation presets, 15 interactive controllers, server-side display conditions, and dynamic tags.', 'gutenberg-pro-blocks' ),
				'category'            => self::CATEGORY,
				'input_schema'        => array(
					'type'       => 'object',
					'properties' => (object) array(),
				),
				'execute_callback'    => array( __CLASS__, 'ability_get_schema' ),
				'permission_callback' => static function (): bool {
					return current_user_can( 'edit_posts' );
				},
				'meta'                => array(
					'show_in_rest' => true,
					'mcp'          => array(
						'public' => true,
						'type'   => 'tool',
					),
					'annotations'  => array(
						'readonly'    => true,
						'destructive' => false,
						'idempotent'  => true,
					),
				),
			)
		);

		wp_register_ability(
			'gpb/upsert-page',
			array(
				'label'               => __( 'Create or Update Gutenberg Pro Page', 'gutenberg-pro-blocks' ),
				'description'         => __( 'Creates or updates a WordPress page, post, or custom post type with serialized Gutenberg block markup (including GPB attributes).', 'gutenberg-pro-blocks' ),
				'category'            => self::CATEGORY,
				'input_schema'        => array(
					'type'       => 'object',
					'required'   => array( 'content' ),
					'properties' => array(
						'post_id'   => array( 'type' => 'integer' ),
						'post_type' => array( 'type' => 'string', 'default' => 'page' ),
						'title'     => array( 'type' => 'string' ),
						'slug'      => array( 'type' => 'string' ),
						'status'    => array( 'type' => 'string', 'default' => 'draft' ),
						'content'   => array( 'type' => 'string' ),
					),
				),
				'execute_callback'    => array( __CLASS__, 'ability_upsert_page' ),
				'permission_callback' => static function ( $input = array() ): bool {
					$post_id = is_array( $input ) && ! empty( $input['post_id'] ) ? (int) $input['post_id'] : 0;
					return $post_id ? current_user_can( 'edit_post', $post_id ) : current_user_can( 'edit_pages' );
				},
				'meta'                => array(
					'show_in_rest' => true,
					'mcp'          => array(
						'public' => true,
						'type'   => 'tool',
					),
					'annotations'  => array(
						'readonly'    => false,
						'destructive' => false,
						'idempotent'  => true,
					),
				),
			)
		);

		wp_register_ability(
			'gpb/upsert-template-part',
			array(
				'label'               => __( 'Create or Update FSE Template / Header / Footer', 'gutenberg-pro-blocks' ),
				'description'         => __( 'Creates or updates a Block Theme FSE wp_template_part (header, footer, etc.) or wp_template with GPB block markup.', 'gutenberg-pro-blocks' ),
				'category'            => self::CATEGORY,
				'input_schema'        => array(
					'type'       => 'object',
					'required'   => array( 'slug', 'content' ),
					'properties' => array(
						'slug'      => array( 'type' => 'string' ),
						'title'     => array( 'type' => 'string' ),
						'area'      => array( 'type' => 'string', 'default' => 'header' ),
						'post_type' => array( 'type' => 'string', 'default' => 'wp_template_part' ),
						'content'   => array( 'type' => 'string' ),
					),
				),
				'execute_callback'    => array( __CLASS__, 'ability_upsert_template_part' ),
				'permission_callback' => static function (): bool {
					return current_user_can( 'edit_theme_options' );
				},
				'meta'                => array(
					'show_in_rest' => true,
					'mcp'          => array(
						'public' => true,
						'type'   => 'tool',
					),
					'annotations'  => array(
						'readonly'    => false,
						'destructive' => false,
						'idempotent'  => true,
					),
				),
			)
		);

		wp_register_ability(
			'gpb/get-post-blocks',
			array(
				'label'               => __( 'Inspect Post Gutenberg Blocks & GPB Attributes', 'gutenberg-pro-blocks' ),
				'description'         => __( 'Parses a post/page/template and returns raw block markup plus top-level block indices and their GPB attributes.', 'gutenberg-pro-blocks' ),
				'category'            => self::CATEGORY,
				'input_schema'        => array(
					'type'       => 'object',
					'required'   => array( 'post_id' ),
					'properties' => array(
						'post_id' => array( 'type' => 'integer' ),
					),
				),
				'execute_callback'    => array( __CLASS__, 'ability_get_post_blocks' ),
				'permission_callback' => static function ( $input = array() ): bool {
					$post_id = is_array( $input ) && ! empty( $input['post_id'] ) ? (int) $input['post_id'] : 0;
					return $post_id ? current_user_can( 'edit_post', $post_id ) : current_user_can( 'edit_posts' );
				},
				'meta'                => array(
					'show_in_rest' => true,
					'mcp'          => array(
						'public' => true,
						'type'   => 'tool',
					),
					'annotations'  => array(
						'readonly'    => true,
						'destructive' => false,
						'idempotent'  => true,
					),
				),
			)
		);

		wp_register_ability(
			'gpb/update-block-gpb',
			array(
				'label'               => __( 'Update GPB Attributes on a Specific Block', 'gutenberg-pro-blocks' ),
				'description'         => __( 'Merges or replaces attrs.gpb on a top-level block by index in a post/page without altering inner content.', 'gutenberg-pro-blocks' ),
				'category'            => self::CATEGORY,
				'input_schema'        => array(
					'type'       => 'object',
					'required'   => array( 'post_id', 'block_index', 'gpb' ),
					'properties' => array(
						'post_id'     => array( 'type' => 'integer' ),
						'block_index' => array( 'type' => 'integer' ),
						'gpb'         => array( 'type' => 'object' ),
						'replace'     => array( 'type' => 'boolean', 'default' => false ),
					),
				),
				'execute_callback'    => array( __CLASS__, 'ability_update_block_gpb' ),
				'permission_callback' => static function ( $input = array() ): bool {
					$post_id = is_array( $input ) && ! empty( $input['post_id'] ) ? (int) $input['post_id'] : 0;
					return $post_id ? current_user_can( 'edit_post', $post_id ) : current_user_can( 'edit_posts' );
				},
				'meta'                => array(
					'show_in_rest' => true,
					'mcp'          => array(
						'public' => true,
						'type'   => 'tool',
					),
					'annotations'  => array(
						'readonly'    => false,
						'destructive' => false,
						'idempotent'  => true,
					),
				),
			)
		);

		wp_register_ability(
			'gpb/compile-css-preview',
			array(
				'label'               => __( 'Preview Compiled GPB CSS', 'gutenberg-pro-blocks' ),
				'description'         => __( 'Compiles a GPB attribute object into the exact scoped responsive/3D CSS produced on the frontend.', 'gutenberg-pro-blocks' ),
				'category'            => self::CATEGORY,
				'input_schema'        => array(
					'type'       => 'object',
					'required'   => array( 'gpb' ),
					'properties' => array(
						'selector' => array( 'type' => 'string', 'default' => '.gpb-preview' ),
						'gpb'      => array( 'type' => 'object' ),
					),
				),
				'execute_callback'    => array( __CLASS__, 'ability_compile_css' ),
				'permission_callback' => static function (): bool {
					return current_user_can( 'edit_posts' );
				},
				'meta'                => array(
					'show_in_rest' => true,
					'mcp'          => array(
						'public' => true,
						'type'   => 'tool',
					),
					'annotations'  => array(
						'readonly'    => true,
						'destructive' => false,
						'idempotent'  => true,
					),
				),
			)
		);
	}

	/**
	 * Mirror abilities on standard WordPress REST API (`/wp-json/gpb/v1/*`).
	 */
	public static function register_rest_routes(): void {
		register_rest_route(
			self::REST_NAMESPACE,
			'/schema',
			array(
				'methods'             => 'GET',
				'callback'            => static function () {
					return rest_ensure_response( self::ability_get_schema() );
				},
				'permission_callback' => static function (): bool {
					return current_user_can( 'edit_posts' );
				},
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/page',
			array(
				'methods'             => 'POST',
				'callback'            => static function ( WP_REST_Request $req ) {
					$res = self::ability_upsert_page( $req->get_json_params() ?: $req->get_params() );
					return is_wp_error( $res ) ? $res : rest_ensure_response( $res );
				},
				'permission_callback' => static function (): bool {
					return current_user_can( 'edit_pages' );
				},
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/template-part',
			array(
				'methods'             => 'POST',
				'callback'            => static function ( WP_REST_Request $req ) {
					$res = self::ability_upsert_template_part( $req->get_json_params() ?: $req->get_params() );
					return is_wp_error( $res ) ? $res : rest_ensure_response( $res );
				},
				'permission_callback' => static function (): bool {
					return current_user_can( 'edit_theme_options' );
				},
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/post/(?P<id>\d+)/blocks',
			array(
				'methods'             => 'GET',
				'callback'            => static function ( WP_REST_Request $req ) {
					$res = self::ability_get_post_blocks( array( 'post_id' => (int) $req['id'] ) );
					return is_wp_error( $res ) ? $res : rest_ensure_response( $res );
				},
				'permission_callback' => static function ( WP_REST_Request $req ): bool {
					return current_user_can( 'edit_post', (int) $req['id'] );
				},
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/post/(?P<id>\d+)/block-gpb',
			array(
				'methods'             => 'POST',
				'callback'            => static function ( WP_REST_Request $req ) {
					$params            = $req->get_json_params() ?: $req->get_params();
					$params['post_id'] = (int) $req['id'];
					$res               = self::ability_update_block_gpb( $params );
					return is_wp_error( $res ) ? $res : rest_ensure_response( $res );
				},
				'permission_callback' => static function ( WP_REST_Request $req ): bool {
					return current_user_can( 'edit_post', (int) $req['id'] );
				},
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/compile-css',
			array(
				'methods'             => 'POST',
				'callback'            => static function ( WP_REST_Request $req ) {
					$res = self::ability_compile_css( $req->get_json_params() ?: $req->get_params() );
					return rest_ensure_response( $res );
				},
				'permission_callback' => static function (): bool {
					return current_user_can( 'edit_posts' );
				},
			)
		);
	}

	/**
	 * Return GPB capabilities schema.
	 *
	 * @return array<string, mixed>
	 */
	public static function ability_get_schema(): array {
		return array(
			'version'              => GPB_VERSION,
			'breakpoints'          => array( 'desktop', 'tablet', 'mobile' ),
			'states'               => array( 'hover', 'focus' ),
			'animations'           => array( 'fade-up', 'fade-down', 'fade-left', 'fade-right', 'zoom-in', 'zoom-out', 'blur-in', 'flip-up', 'flip-down', 'flip-left', 'flip-right', 'rotate-3d', 'none' ),
			'interactive'          => array( 'tilt3d', 'magnetic', 'sticky-header', 'offcanvas', 'countdown', 'filter-grid', 'before-after', 'lightbox', 'scroll-progress', 'marquee', 'slider', 'counter', 'tabs', 'accordion', 'modal' ),
			'conditions'           => array( 'loggedIn', 'userRole', 'postType', 'wooCart', 'metaKey', 'metaCompare', 'metaValue', 'urlParam', 'dateFrom', 'dateTo', 'dayOfWeek' ),
			'dynamic_tokens'       => array( '{{post:title}}', '{{post:url}}', '{{acf:key}}', '{{meta:key}}', '{{woo:price}}', '{{woo:discount_pct}}', '{{woo:cart_count}}', '{{user:first_name}}', '{{query:param|fallback}}', '{{date:Y}}' ),
			'dynamic_attr_binding' => array( 'linkSource', 'imageSource', 'fallback' ),
		);
	}

	/**
	 * Create or update a post/page with Gutenberg block markup.
	 *
	 * @param array<string, mixed> $input Input parameters.
	 * @return array<string, mixed>|WP_Error
	 */
	public static function ability_upsert_page( array $input ) {
		$post_id   = ! empty( $input['post_id'] ) ? (int) $input['post_id'] : 0;
		$post_type = ! empty( $input['post_type'] ) ? sanitize_key( (string) $input['post_type'] ) : 'page';
		$content   = isset( $input['content'] ) ? (string) $input['content'] : '';

		$postarr = array(
			'post_type'    => $post_type,
			'post_content' => $content,
		);
		if ( $post_id > 0 ) {
			$postarr['ID'] = $post_id;
		}
		if ( isset( $input['title'] ) ) {
			$postarr['post_title'] = sanitize_text_field( (string) $input['title'] );
		}
		if ( isset( $input['slug'] ) ) {
			$postarr['post_name'] = sanitize_title( (string) $input['slug'] );
		}
		if ( isset( $input['status'] ) ) {
			$postarr['post_status'] = sanitize_key( (string) $input['status'] );
		} elseif ( 0 === $post_id ) {
			$postarr['post_status'] = 'draft';
		}

		$saved_id = $post_id > 0 ? wp_update_post( wp_slash( $postarr ), true ) : wp_insert_post( wp_slash( $postarr ), true );
		if ( is_wp_error( $saved_id ) ) {
			return $saved_id;
		}

		$blocks = function_exists( 'parse_blocks' ) ? parse_blocks( $content ) : array();
		$count  = count( array_filter( $blocks, static fn( $b ) => ! empty( $b['blockName'] ) ) );

		return array(
			'post_id'      => (int) $saved_id,
			'post_type'    => get_post_type( $saved_id ),
			'status'       => get_post_status( $saved_id ),
			'url'          => get_permalink( $saved_id ),
			'edit_url'     => get_edit_post_link( $saved_id, 'raw' ),
			'blocks_count' => $count,
		);
	}

	/**
	 * Create or update an FSE template or template part for the active theme.
	 *
	 * @param array<string, mixed> $input Input parameters.
	 * @return array<string, mixed>|WP_Error
	 */
	public static function ability_upsert_template_part( array $input ) {
		$slug      = sanitize_title( (string) ( $input['slug'] ?? '' ) );
		$post_type = in_array( $input['post_type'] ?? 'wp_template_part', array( 'wp_template_part', 'wp_template' ), true )
			? (string) $input['post_type']
			: 'wp_template_part';
		$content   = (string) ( $input['content'] ?? '' );
		$area      = sanitize_key( (string) ( $input['area'] ?? 'header' ) );
		$theme     = get_stylesheet();

		if ( '' === $slug ) {
			return new WP_Error( 'gpb_missing_slug', __( 'Template slug is required.', 'gutenberg-pro-blocks' ), array( 'status' => 400 ) );
		}

		$existing = get_posts(
			array(
				'post_type'      => $post_type,
				'name'           => $slug,
				'posts_per_page' => 1,
				'post_status'    => array( 'publish', 'draft', 'auto-draft' ),
				'tax_query'      => array(
					array(
						'taxonomy' => 'wp_theme',
						'field'    => 'slug',
						'terms'    => $theme,
					),
				),
			)
		);

		$postarr = array(
			'post_type'    => $post_type,
			'post_name'    => $slug,
			'post_title'   => sanitize_text_field( (string) ( $input['title'] ?? ucfirst( $slug ) ) ),
			'post_content' => $content,
			'post_status'  => 'publish',
		);

		if ( ! empty( $existing[0] ) ) {
			$postarr['ID'] = $existing[0]->ID;
			$saved_id      = wp_update_post( wp_slash( $postarr ), true );
		} else {
			$saved_id = wp_insert_post( wp_slash( $postarr ), true );
		}

		if ( is_wp_error( $saved_id ) ) {
			return $saved_id;
		}

		wp_set_object_terms( (int) $saved_id, $theme, 'wp_theme' );
		if ( 'wp_template_part' === $post_type ) {
			wp_set_object_terms( (int) $saved_id, $area, 'wp_template_part_area' );
		}

		return array(
			'post_id'   => (int) $saved_id,
			'post_type' => $post_type,
			'slug'      => $slug,
			'theme'     => $theme,
			'area'      => $area,
		);
	}

	/**
	 * Inspect top-level blocks and GPB attributes in a post.
	 *
	 * @param array<string, mixed> $input Input parameters.
	 * @return array<string, mixed>|WP_Error
	 */
	public static function ability_get_post_blocks( array $input ) {
		$post_id = (int) ( $input['post_id'] ?? 0 );
		$post    = get_post( $post_id );
		if ( ! $post ) {
			return new WP_Error( 'gpb_not_found', __( 'Post not found.', 'gutenberg-pro-blocks' ), array( 'status' => 404 ) );
		}

		$parsed  = parse_blocks( $post->post_content );
		$summary = array();
		$idx     = 0;

		foreach ( $parsed as $block ) {
			if ( empty( $block['blockName'] ) ) {
				continue;
			}
			$summary[] = array(
				'block_index' => $idx,
				'blockName'   => $block['blockName'],
				'gpb'         => $block['attrs']['gpb'] ?? null,
			);
			$idx++;
		}

		return array(
			'post_id' => $post_id,
			'title'   => $post->post_title,
			'blocks'  => $summary,
			'content' => $post->post_content,
		);
	}

	/**
	 * Surgically update attrs.gpb on a top-level block by index.
	 *
	 * @param array<string, mixed> $input Input parameters.
	 * @return array<string, mixed>|WP_Error
	 */
	public static function ability_update_block_gpb( array $input ) {
		$post_id     = (int) ( $input['post_id'] ?? 0 );
		$target_idx  = (int) ( $input['block_index'] ?? -1 );
		$gpb_patch   = is_array( $input['gpb'] ?? null ) ? $input['gpb'] : array();
		$replace     = ! empty( $input['replace'] );

		$post = get_post( $post_id );
		if ( ! $post ) {
			return new WP_Error( 'gpb_not_found', __( 'Post not found.', 'gutenberg-pro-blocks' ), array( 'status' => 404 ) );
		}

		$parsed = parse_blocks( $post->post_content );
		$idx    = 0;
		$found  = false;

		foreach ( $parsed as &$block ) {
			if ( empty( $block['blockName'] ) ) {
				continue;
			}
			if ( $idx === $target_idx ) {
				$existing            = is_array( $block['attrs']['gpb'] ?? null ) ? $block['attrs']['gpb'] : array();
				$block['attrs']['gpb'] = $replace ? $gpb_patch : array_replace_recursive( $existing, $gpb_patch );
				$found               = true;
				break;
			}
			$idx++;
		}
		unset( $block );

		if ( ! $found ) {
			return new WP_Error( 'gpb_block_not_found', __( 'Block index out of range.', 'gutenberg-pro-blocks' ), array( 'status' => 404 ) );
		}

		$serialized = serialize_blocks( $parsed );
		$res        = wp_update_post(
			wp_slash(
				array(
					'ID'           => $post_id,
					'post_content' => $serialized,
				)
			),
			true
		);

		if ( is_wp_error( $res ) ) {
			return $res;
		}

		return array(
			'post_id'     => $post_id,
			'block_index' => $target_idx,
			'updated'     => true,
		);
	}

	/**
	 * Compile GPB CSS preview.
	 *
	 * @param array<string, mixed> $input Input parameters.
	 * @return array<string, mixed>
	 */
	public static function ability_compile_css( array $input ): array {
		$selector = ! empty( $input['selector'] ) ? sanitize_text_field( (string) $input['selector'] ) : '.gpb-preview';
		$gpb      = is_array( $input['gpb'] ?? null ) ? $input['gpb'] : array();
		return array(
			'selector' => $selector,
			'css'      => GPB_CSS_Compiler::compile( $selector, $gpb ),
		);
	}
}
