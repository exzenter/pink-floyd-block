<?php
/**
 * Plugin Name:       Pink Floyd Block
 * Description:       An interactive prism light refraction block inspired by Pink Floyd.
 * Version:           1.0.0
 * Author:            Antigravity
 * License:           GPL-2.0-or-later
 * Text Domain:       pinkfloyd-block
 *
 * @package           pinkfloyd-block
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the block using the metadata loaded from the `block.json` file.
 * Behind the scenes, it registers also all assets so they can be enqueued
 * through the block editor in the corresponding context.
 */
function pinkfloyd_block_init() {
	register_block_type_from_metadata( __DIR__ . '/build' );
}
add_action( 'init', 'pinkfloyd_block_init' );
