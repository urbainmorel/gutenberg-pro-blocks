<?php
/**
 * Server-side Display Conditions & Dynamic Tags Engine (0 bytes on visitor frontend).
 * Supports WordPress Core, ACF, WooCommerce, User state, URL Query, and Date/Schedule.
 *
 * @package GutenbergProBlocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class GPB_Dynamic {

	/**
	 * Evaluate display conditions before rendering a block.
	 *
	 * @param array<string, mixed> $conditions Conditions map from `attrs.gpb.conditions`.
	 * @return bool True if block should render, false to omit completely from HTML.
	 */
	public static function should_render( array $conditions ): bool {
		if ( isset( $conditions['loggedIn'] ) ) {
			$expected = filter_var( $conditions['loggedIn'], FILTER_VALIDATE_BOOLEAN );
			if ( is_user_logged_in() !== $expected ) {
				return false;
			}
		}

		if ( ! empty( $conditions['userRole'] ) ) {
			if ( ! is_user_logged_in() ) {
				return false;
			}
			$allowed = is_array( $conditions['userRole'] )
				? $conditions['userRole']
				: array_map( 'trim', explode( ',', (string) $conditions['userRole'] ) );
			$user    = wp_get_current_user();
			if ( empty( array_intersect( $allowed, (array) $user->roles ) ) ) {
				return false;
			}
		}

		if ( ! empty( $conditions['postType'] ) ) {
			$allowed_types = is_array( $conditions['postType'] )
				? $conditions['postType']
				: array_map( 'trim', explode( ',', (string) $conditions['postType'] ) );
			$current_type  = (string) get_post_type();
			if ( ! in_array( $current_type, $allowed_types, true ) ) {
				return false;
			}
		}

		if ( ! empty( $conditions['wooCart'] ) && function_exists( 'WC' ) && WC()->cart ) {
			$is_empty = WC()->cart->is_empty();
			if ( 'not_empty' === $conditions['wooCart'] && $is_empty ) {
				return false;
			}
			if ( 'empty' === $conditions['wooCart'] && ! $is_empty ) {
				return false;
			}
		}

		if ( ! empty( $conditions['metaKey'] ) ) {
			$meta_val = self::get_meta_value( (string) $conditions['metaKey'] );
			$compare  = ! empty( $conditions['metaCompare'] ) ? (string) $conditions['metaCompare'] : 'exists';
			$target   = $conditions['metaValue'] ?? '';

			if ( ! self::compare_values( $meta_val, $compare, $target ) ) {
				return false;
			}
		}

		if ( ! empty( $conditions['urlParam'] ) ) {
			$param_rule = (string) $conditions['urlParam'];
			if ( false !== strpos( $param_rule, '=' ) ) {
				list( $pkey, $pval ) = explode( '=', $param_rule, 2 );
				$pkey                = trim( $pkey );
				$actual              = isset( $_GET[ $pkey ] ) ? sanitize_text_field( wp_unslash( (string) $_GET[ $pkey ] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
				if ( $actual !== trim( $pval ) ) {
					return false;
				}
			} else {
				$pkey = trim( $param_rule );
				if ( ! isset( $_GET[ $pkey ] ) || '' === $_GET[ $pkey ] ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
					return false;
				}
			}
		}

		$now_ts = (int) current_time( 'timestamp' );

		if ( ! empty( $conditions['dateFrom'] ) ) {
			$from_ts = strtotime( (string) $conditions['dateFrom'] );
			if ( false !== $from_ts && $now_ts < $from_ts ) {
				return false;
			}
		}

		if ( ! empty( $conditions['dateTo'] ) ) {
			$to_ts = strtotime( (string) $conditions['dateTo'] );
			if ( false !== $to_ts && $now_ts > $to_ts ) {
				return false;
			}
		}

		if ( ! empty( $conditions['dayOfWeek'] ) ) {
			$allowed_days = is_array( $conditions['dayOfWeek'] )
				? array_map( 'strtolower', $conditions['dayOfWeek'] )
				: array_map( 'strtolower', array_map( 'trim', explode( ',', (string) $conditions['dayOfWeek'] ) ) );
			$today        = strtolower( (string) current_time( 'D' ) );
			if ( ! in_array( $today, $allowed_days, true ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Resolve inline `{{namespace:key|fallback}}` tokens and `gpb.dynamic` link/image bindings.
	 *
	 * @param string               $html Rendered block HTML.
	 * @param array<string, mixed> $gpb  GPB config array.
	 * @return string
	 */
	public static function process_content( string $html, array $gpb ): string {
		$dynamic  = ! empty( $gpb['dynamic'] ) && is_array( $gpb['dynamic'] ) ? $gpb['dynamic'] : array();
		$fallback = isset( $dynamic['fallback'] ) ? (string) $dynamic['fallback'] : '';

		if ( false !== strpos( $html, '{{' ) ) {
			$html = (string) preg_replace_callback(
				'/\{\{([a-zA-Z0-9_]+):([a-zA-Z0-9_\/-]+)(?:\|([^}]*))?\}\}/',
				static function ( array $matches ) use ( $fallback ): string {
					$ns     = strtolower( $matches[1] );
					$key    = $matches[2];
					$fb     = isset( $matches[3] ) ? $matches[3] : $fallback;
					$val    = self::resolve_token( $ns, $key );
					$output = ( '' !== $val && null !== $val ) ? (string) $val : $fb;
					return esc_html( $output );
				},
				$html
			);
		}

		if ( ! empty( $dynamic['linkSource'] ) && class_exists( 'WP_HTML_Tag_Processor' ) ) {
			$url = self::resolve_source_string( (string) $dynamic['linkSource'] );
			if ( '' !== $url ) {
				$proc = new WP_HTML_Tag_Processor( $html );
				if ( $proc->next_tag( 'a' ) ) {
					$proc->set_attribute( 'href', esc_url( $url ) );
					$html = $proc->get_updated_html();
				}
			}
		}

		if ( ! empty( $dynamic['imageSource'] ) && class_exists( 'WP_HTML_Tag_Processor' ) ) {
			$img_url = self::resolve_image_source( (string) $dynamic['imageSource'] );
			if ( '' !== $img_url ) {
				$proc = new WP_HTML_Tag_Processor( $html );
				if ( $proc->next_tag( 'img' ) ) {
					$proc->set_attribute( 'src', esc_url( $img_url ) );
					$html = $proc->get_updated_html();
				}
			}
		}

		return $html;
	}

	/**
	 * Resolve a single `namespace:key` dynamic token.
	 *
	 * @param string $ns  Namespace (`post`, `meta`, `acf`, `woo`, `user`, `user_meta`, `site`, `date`, `query`).
	 * @param string $key Key inside namespace.
	 * @return string
	 */
	private static function resolve_token( string $ns, string $key ): string {
		$post_id = get_the_ID();

		switch ( $ns ) {
			case 'post':
				if ( ! $post_id ) {
					return '';
				}
				switch ( $key ) {
					case 'title':
						return wp_strip_all_tags( (string) get_the_title( $post_id ) );
					case 'excerpt':
						return wp_strip_all_tags( (string) get_the_excerpt( $post_id ) );
					case 'date':
						return (string) get_the_date( '', $post_id );
					case 'modified':
						return (string) get_the_modified_date( '', $post_id );
					case 'url':
						return (string) get_permalink( $post_id );
					case 'id':
						return (string) $post_id;
					case 'author':
						$author_id = (int) get_post_field( 'post_author', $post_id );
						return (string) get_the_author_meta( 'display_name', $author_id );
					case 'featured_image':
						return (string) get_the_post_thumbnail_url( $post_id, 'full' );
				}
				return '';

			case 'meta':
			case 'acf':
				$val = self::get_meta_value( $key );
				return is_scalar( $val ) ? (string) $val : '';

			case 'user':
				if ( ! is_user_logged_in() ) {
					return '';
				}
				$user = wp_get_current_user();
				switch ( $key ) {
					case 'display_name':
						return (string) $user->display_name;
					case 'first_name':
						return (string) $user->first_name;
					case 'last_name':
						return (string) $user->last_name;
					case 'email':
						return (string) $user->user_email;
					case 'role':
						return ! empty( $user->roles[0] ) ? (string) $user->roles[0] : '';
				}
				return '';

			case 'user_meta':
				if ( ! is_user_logged_in() ) {
					return '';
				}
				$val = get_user_meta( get_current_user_id(), $key, true );
				return is_scalar( $val ) ? (string) $val : '';

			case 'site':
				if ( 'name' === $key ) {
					return (string) get_bloginfo( 'name' );
				}
				if ( 'tagline' === $key ) {
					return (string) get_bloginfo( 'description' );
				}
				if ( 'url' === $key ) {
					return (string) home_url( '/' );
				}
				return '';

			case 'date':
				return (string) wp_date( $key );

			case 'query':
				return isset( $_GET[ $key ] ) ? sanitize_text_field( wp_unslash( (string) $_GET[ $key ] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

			case 'woo':
				return self::resolve_woo_token( $key, $post_id );
		}

		return '';
	}

	/**
	 * Resolve WooCommerce product & cart dynamic tokens.
	 *
	 * @param string    $key     Woo token key.
	 * @param int|false $post_id Current post ID.
	 * @return string
	 */
	private static function resolve_woo_token( string $key, $post_id ): string {
		if ( ! function_exists( 'WC' ) ) {
			return '';
		}

		if ( 'cart_count' === $key && WC()->cart ) {
			return (string) WC()->cart->get_cart_contents_count();
		}
		if ( 'cart_total' === $key && WC()->cart ) {
			return wp_strip_all_tags( html_entity_decode( (string) WC()->cart->get_cart_total(), ENT_QUOTES, 'UTF-8' ) );
		}

		if ( ! $post_id || ! function_exists( 'wc_get_product' ) ) {
			return '';
		}
		$product = wc_get_product( $post_id );
		if ( ! $product ) {
			return '';
		}

		switch ( $key ) {
			case 'price':
				return wp_strip_all_tags( html_entity_decode( wc_price( (float) $product->get_price() ), ENT_QUOTES, 'UTF-8' ) );
			case 'regular_price':
				return wp_strip_all_tags( html_entity_decode( wc_price( (float) $product->get_regular_price() ), ENT_QUOTES, 'UTF-8' ) );
			case 'sale_price':
				return $product->is_on_sale()
					? wp_strip_all_tags( html_entity_decode( wc_price( (float) $product->get_sale_price() ), ENT_QUOTES, 'UTF-8' ) )
					: '';
			case 'discount_pct':
				$reg  = (float) $product->get_regular_price();
				$sale = (float) $product->get_sale_price();
				if ( $product->is_on_sale() && $reg > 0 && $sale < $reg ) {
					return '-' . (string) round( ( ( $reg - $sale ) / $reg ) * 100 ) . '%';
				}
				return '';
			case 'sku':
				return (string) $product->get_sku();
			case 'stock_status':
				return (string) $product->get_stock_status();
			case 'stock_qty':
				return (string) $product->get_stock_quantity();
			case 'rating':
				return (string) $product->get_average_rating();
			case 'review_count':
				return (string) $product->get_review_count();
			case 'add_to_cart_url':
				return (string) $product->add_to_cart_url();
		}

		return '';
	}

	/**
	 * Resolve a `namespace:key` source string (used for linkSource / imageSource).
	 *
	 * @param string $source Source string (e.g. `post:url`).
	 * @return string
	 */
	private static function resolve_source_string( string $source ): string {
		if ( false === strpos( $source, ':' ) ) {
			return '';
		}
		list( $ns, $key ) = explode( ':', $source, 2 );
		return self::resolve_token( strtolower( trim( $ns ) ), trim( $key ) );
	}

	/**
	 * Resolve an image URL from `post:featured_image` or ACF/meta attachment ID / URL.
	 *
	 * @param string $source Image source string.
	 * @return string
	 */
	private static function resolve_image_source( string $source ): string {
		if ( 'post:featured_image' === $source ) {
			$post_id = get_the_ID();
			return $post_id ? (string) get_the_post_thumbnail_url( $post_id, 'full' ) : '';
		}
		if ( false !== strpos( $source, ':' ) ) {
			list( $ns, $key ) = explode( ':', $source, 2 );
			if ( in_array( strtolower( $ns ), array( 'meta', 'acf' ), true ) ) {
				$raw = self::get_meta_value( trim( $key ) );
				if ( is_array( $raw ) && ! empty( $raw['url'] ) ) {
					return (string) $raw['url'];
				}
				if ( is_numeric( $raw ) ) {
					return (string) wp_get_attachment_image_url( (int) $raw, 'full' );
				}
				if ( is_string( $raw ) ) {
					return $raw;
				}
			}
		}
		return '';
	}

	/**
	 * Fetch ACF field or standard Post Meta for the current post.
	 *
	 * @param string $key Field key.
	 * @return mixed
	 */
	private static function get_meta_value( string $key ) {
		$post_id = get_the_ID();
		if ( ! $post_id ) {
			return '';
		}
		if ( function_exists( 'get_field' ) ) {
			$acf = get_field( $key, $post_id );
			if ( null !== $acf && '' !== $acf ) {
				return $acf;
			}
		}
		return get_post_meta( $post_id, $key, true );
	}

	/**
	 * Compare a resolved meta value against a condition operator.
	 *
	 * @param mixed  $actual  Actual value.
	 * @param string $compare Comparison operator.
	 * @param mixed  $target  Target comparison value.
	 * @return bool
	 */
	private static function compare_values( $actual, string $compare, $target ): bool {
		$has_val = '' !== $actual && null !== $actual && false !== $actual;

		switch ( $compare ) {
			case 'exists':
				return $has_val;
			case 'not_exists':
				return ! $has_val;
			case 'equals':
				return (string) $actual === (string) $target;
			case 'not_equals':
				return (string) $actual !== (string) $target;
			case 'gt':
				return is_numeric( $actual ) && is_numeric( $target ) && (float) $actual > (float) $target;
			case 'lt':
				return is_numeric( $actual ) && is_numeric( $target ) && (float) $actual < (float) $target;
			case 'contains':
				return is_scalar( $actual ) && '' !== (string) $target && false !== stripos( (string) $actual, (string) $target );
		}

		return $has_val;
	}
}
