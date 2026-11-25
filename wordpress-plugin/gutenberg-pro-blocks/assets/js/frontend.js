( function () {
	'use strict';

	const prefersReduced =
		typeof window.matchMedia === 'function' &&
		window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

	const ANIM_KEYFRAMES = {
		'fade-up': [
			{ opacity: 0, transform: 'translate3d(0, 28px, 0)' },
			{ opacity: 1, transform: 'translate3d(0, 0, 0)' },
		],
		'fade-down': [
			{ opacity: 0, transform: 'translate3d(0, -28px, 0)' },
			{ opacity: 1, transform: 'translate3d(0, 0, 0)' },
		],
		'fade-left': [
			{ opacity: 0, transform: 'translate3d(32px, 0, 0)' },
			{ opacity: 1, transform: 'translate3d(0, 0, 0)' },
		],
		'fade-right': [
			{ opacity: 0, transform: 'translate3d(-32px, 0, 0)' },
			{ opacity: 1, transform: 'translate3d(0, 0, 0)' },
		],
		'zoom-in': [
			{ opacity: 0, transform: 'scale(0.92)' },
			{ opacity: 1, transform: 'scale(1)' },
		],
		'zoom-out': [
			{ opacity: 0, transform: 'scale(1.08)' },
			{ opacity: 1, transform: 'scale(1)' },
		],
		'blur-in': [
			{ opacity: 0, filter: 'blur(12px)', transform: 'translate3d(0, 14px, 0)' },
			{ opacity: 1, filter: 'blur(0px)', transform: 'translate3d(0, 0, 0)' },
		],
		'flip-up': [
			{ opacity: 0, transform: 'perspective(800px) rotateX(18deg) translate3d(0, 20px, 0)' },
			{ opacity: 1, transform: 'perspective(800px) rotateX(0deg) translate3d(0, 0, 0)' },
		],
	};

	function parseJsonAttr( el, attr, fallback ) {
		try {
			const raw = el.getAttribute( attr );
			return raw ? JSON.parse( raw ) : fallback;
		} catch ( _ ) {
			return fallback;
		}
	}

	function initAnimations() {
		const nodes = document.querySelectorAll( '[data-gpb-anim]' );
		if ( ! nodes.length ) return;

		if ( prefersReduced ) {
			nodes.forEach( ( n ) => n.classList.add( 'gpb-anim-done' ) );
			return;
		}

		const parallaxItems = [];

		const observer = new IntersectionObserver(
			( entries ) => {
				entries.forEach( ( entry ) => {
					if ( ! entry.isIntersecting ) return;
					const el = entry.target;
					const cfg = parseJsonAttr( el, 'data-gpb-anim', {} );
					const type = cfg.type || 'fade-up';
					const duration = Number( cfg.duration ) || 650;
					const delay = Number( cfg.delay ) || 0;
					const easing = cfg.easing || 'cubic-bezier(0.16, 1, 0.3, 1)';
					const stagger = Number( cfg.stagger ) || 0;
					const once = cfg.once !== false;

					const frames = ANIM_KEYFRAMES[ type ];
					if ( frames ) {
						const targets =
							stagger > 0 && el.children.length > 0 ? Array.from( el.children ) : [ el ];

						targets.forEach( ( target, idx ) => {
							target.style.opacity = '0';
							const anim = target.animate( frames, {
								duration,
								delay: delay + idx * stagger,
								easing,
								fill: 'forwards',
							} );
							anim.onfinish = () => {
								target.style.opacity = '';
								target.style.transform = '';
								target.style.filter = '';
							};
						} );
					}

					el.classList.add( 'gpb-anim-done' );
					if ( once ) observer.unobserve( el );
				} );
			},
			{ threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
		);

		nodes.forEach( ( el ) => {
			const cfg = parseJsonAttr( el, 'data-gpb-anim', {} );
			if ( cfg.parallax && Number( cfg.parallax ) !== 0 ) {
				parallaxItems.push( { el, speed: Number( cfg.parallax ) } );
			}
			if ( cfg.type && cfg.type !== 'none' ) {
				if ( ! cfg.stagger ) {
					el.style.opacity = '0';
				}
				observer.observe( el );
			} else {
				el.classList.add( 'gpb-anim-done' );
			}
		} );

		if ( parallaxItems.length ) {
			let ticking = false;
			const updateParallax = () => {
				const vh = window.innerHeight || 800;
				parallaxItems.forEach( ( item ) => {
					const rect = item.el.getBoundingClientRect();
					const offset = ( rect.top + rect.height / 2 - vh / 2 ) * item.speed;
					item.el.style.transform = `translate3d(0, ${ offset.toFixed( 1 ) }px, 0)`;
				} );
				ticking = false;
			};
			window.addEventListener(
				'scroll',
				() => {
					if ( ! ticking ) {
						window.requestAnimationFrame( updateParallax );
						ticking = true;
					}
				},
				{ passive: true }
			);
			updateParallax();
		}
	}

	function initCounter( el, cfg ) {
		const targetEl = el.querySelector( '.wp-block-heading, p, strong, span' ) || el;
		const endVal = Number( cfg.end ?? parseFloat( targetEl.textContent.replace( /[^\d.-]/g, '' ) ) ) || 0;
		const startVal = Number( cfg.start ) || 0;
		const duration = Number( cfg.duration ) || 1400;
		const prefix = cfg.prefix || '';
		const suffix = cfg.suffix || '';
		const decimals = Number( cfg.decimals ) || 0;

		const observer = new IntersectionObserver(
			( entries ) => {
				entries.forEach( ( entry ) => {
					if ( ! entry.isIntersecting ) return;
					observer.unobserve( el );
					const startTime = performance.now();
					const tick = ( now ) => {
						const progress = Math.min( ( now - startTime ) / duration, 1 );
						const eased = 1 - Math.pow( 1 - progress, 3 );
						const current = startVal + ( endVal - startVal ) * eased;
						targetEl.textContent = prefix + current.toFixed( decimals ) + suffix;
						if ( progress < 1 ) {
							requestAnimationFrame( tick );
						}
					};
					requestAnimationFrame( tick );
				} );
			},
			{ threshold: 0.2 }
		);
		observer.observe( el );
	}

	function initMarquee( el, cfg ) {
		const speed = Number( cfg.speed ) || 28;
		const pauseOnHover = cfg.pauseOnHover !== false;
		const track = document.createElement( 'div' );
		track.className = 'gpb-marquee-track';
		while ( el.firstChild ) {
			track.appendChild( el.firstChild );
		}
		const clone = track.cloneNode( true );
		clone.setAttribute( 'aria-hidden', 'true' );

		const wrapper = document.createElement( 'div' );
		wrapper.className = 'gpb-marquee-viewport';
		wrapper.style.setProperty( '--gpb-marquee-duration', `${ speed }s` );
		if ( cfg.direction === 'right' ) {
			wrapper.classList.add( 'gpb-marquee-reverse' );
		}
		if ( pauseOnHover ) {
			wrapper.classList.add( 'gpb-marquee-pause' );
		}
		wrapper.appendChild( track );
		wrapper.appendChild( clone );
		el.appendChild( wrapper );
	}

	function initSlider( el, cfg ) {
		const slides = Array.from( el.children );
		if ( slides.length < 2 ) return;

		el.classList.add( 'gpb-slider-ready' );
		const track = document.createElement( 'div' );
		track.className = 'gpb-slider-track';
		slides.forEach( ( slide ) => {
			slide.classList.add( 'gpb-slide' );
			track.appendChild( slide );
		} );
		el.appendChild( track );

		if ( cfg.arrows !== false ) {
			const nav = document.createElement( 'div' );
			nav.className = 'gpb-slider-nav';
			const prev = document.createElement( 'button' );
			prev.type = 'button';
			prev.className = 'gpb-slider-btn gpb-slider-prev';
			prev.setAttribute( 'aria-label', 'Previous slide' );
			prev.textContent = '←';
			const next = document.createElement( 'button' );
			next.type = 'button';
			next.className = 'gpb-slider-btn gpb-slider-next';
			next.setAttribute( 'aria-label', 'Next slide' );
			next.textContent = '→';

			prev.addEventListener( 'click', () => {
				track.scrollBy( { left: -track.clientWidth * 0.85, behavior: 'smooth' } );
			} );
			next.addEventListener( 'click', () => {
				track.scrollBy( { left: track.clientWidth * 0.85, behavior: 'smooth' } );
			} );
			nav.appendChild( prev );
			nav.appendChild( next );
			el.appendChild( nav );
		}

		if ( cfg.autoplay && Number( cfg.autoplay ) > 0 && ! prefersReduced ) {
			setInterval( () => {
				if ( track.scrollLeft + track.clientWidth >= track.scrollWidth - 8 ) {
					track.scrollTo( { left: 0, behavior: 'smooth' } );
				} else {
					track.scrollBy( { left: track.clientWidth * 0.85, behavior: 'smooth' } );
				}
			}, Number( cfg.autoplay ) );
		}
	}

	function initTabs( el ) {
		const btns = el.querySelectorAll( '[data-gpb-tab], .wp-block-button__link' );
		const panels = el.querySelectorAll( '[data-gpb-panel]' );
		if ( ! btns.length || ! panels.length ) return;

		function activate( idx ) {
			btns.forEach( ( b, i ) => {
				b.setAttribute( 'aria-selected', i === idx ? 'true' : 'false' );
				b.classList.toggle( 'is-active', i === idx );
			} );
			panels.forEach( ( p, i ) => {
				p.hidden = i !== idx;
			} );
		}

		btns.forEach( ( b, i ) => {
			b.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				activate( i );
			} );
		} );
		activate( 0 );
	}

	function initModal( el, cfg ) {
		const triggerSelector = cfg.trigger;
		if ( ! triggerSelector ) return;
		el.classList.add( 'gpb-modal-overlay' );
		el.setAttribute( 'role', 'dialog' );
		el.setAttribute( 'aria-modal', 'true' );
		el.hidden = true;

		const close = () => {
			el.hidden = true;
			document.body.style.overflow = '';
		};
		const open = () => {
			el.hidden = false;
			document.body.style.overflow = 'hidden';
		};

		document.querySelectorAll( triggerSelector ).forEach( ( btn ) => {
			btn.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				open();
			} );
		} );

		el.addEventListener( 'click', ( e ) => {
			if ( e.target === el || e.target.closest( '[data-gpb-close]' ) ) {
				close();
			}
		} );
		document.addEventListener( 'keydown', ( e ) => {
			if ( e.key === 'Escape' && ! el.hidden ) close();
		} );
	}

	function initInteractive() {
		document.querySelectorAll( '[data-gpb-interactive]' ).forEach( ( el ) => {
			const type = el.getAttribute( 'data-gpb-interactive' );
			const cfg = parseJsonAttr( el, 'data-gpb-config', {} );
			if ( type === 'counter' ) initCounter( el, cfg );
			else if ( type === 'marquee' ) initMarquee( el, cfg );
			else if ( type === 'slider' ) initSlider( el, cfg );
			else if ( type === 'tabs' ) initTabs( el );
			else if ( type === 'modal' ) initModal( el, cfg );
		} );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', () => {
			initAnimations();
			initInteractive();
		} );
	} else {
		initAnimations();
		initInteractive();
	}
} )();
