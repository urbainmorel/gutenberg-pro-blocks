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
			{ opacity: 0, transform: 'perspective(900px) rotateX(22deg) translate3d(0, 24px, 0)' },
			{ opacity: 1, transform: 'perspective(900px) rotateX(0deg) translate3d(0, 0, 0)' },
		],
		'flip-down': [
			{ opacity: 0, transform: 'perspective(900px) rotateX(-22deg) translate3d(0, -24px, 0)' },
			{ opacity: 1, transform: 'perspective(900px) rotateX(0deg) translate3d(0, 0, 0)' },
		],
		'flip-left': [
			{ opacity: 0, transform: 'perspective(900px) rotateY(22deg) translate3d(24px, 0, 0)' },
			{ opacity: 1, transform: 'perspective(900px) rotateY(0deg) translate3d(0, 0, 0)' },
		],
		'flip-right': [
			{ opacity: 0, transform: 'perspective(900px) rotateY(-22deg) translate3d(-24px, 0, 0)' },
			{ opacity: 1, transform: 'perspective(900px) rotateY(0deg) translate3d(0, 0, 0)' },
		],
		'rotate-3d': [
			{ opacity: 0, transform: 'perspective(900px) rotateX(18deg) rotateY(-14deg) scale(0.92)' },
			{ opacity: 1, transform: 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)' },
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

	function initTilt3d( el, cfg ) {
		if ( prefersReduced ) return;
		const maxTilt = Number( cfg.maxTilt ) || 12;
		const perspective = Number( cfg.perspective ) || 1000;
		const scale = Number( cfg.scale ) || 1.03;
		const useGlare = cfg.glare !== false;

		el.style.transformStyle = 'preserve-3d';
		el.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';

		let glareEl = null;
		if ( useGlare ) {
			if ( getComputedStyle( el ).position === 'static' ) {
				el.style.position = 'relative';
			}
			glareEl = document.createElement( 'div' );
			glareEl.className = 'gpb-tilt-glare';
			glareEl.setAttribute( 'aria-hidden', 'true' );
			el.appendChild( glareEl );
		}

		let raf = 0;
		el.addEventListener( 'pointermove', ( e ) => {
			if ( raf ) cancelAnimationFrame( raf );
			raf = requestAnimationFrame( () => {
				const rect = el.getBoundingClientRect();
				const px = ( e.clientX - rect.left ) / rect.width;
				const py = ( e.clientY - rect.top ) / rect.height;
				const rotY = ( px - 0.5 ) * 2 * maxTilt;
				const rotX = ( 0.5 - py ) * 2 * maxTilt;
				el.style.transform = `perspective(${ perspective }px) rotateX(${ rotX.toFixed( 2 ) }deg) rotateY(${ rotY.toFixed( 2 ) }deg) scale3d(${ scale }, ${ scale }, ${ scale })`;
				if ( glareEl ) {
					glareEl.style.opacity = '1';
					glareEl.style.background = `radial-gradient(circle at ${ ( px * 100 ).toFixed( 1 ) }% ${ ( py * 100 ).toFixed( 1 ) }%, rgba(255,255,255,0.28), transparent 60%)`;
				}
			} );
		} );

		el.addEventListener( 'pointerleave', () => {
			if ( raf ) cancelAnimationFrame( raf );
			el.style.transform = `perspective(${ perspective }px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
			if ( glareEl ) {
				glareEl.style.opacity = '0';
			}
		} );
	}

	function initMagnetic( el, cfg ) {
		if ( prefersReduced ) return;
		const strength = Number( cfg.strength ) || 0.32;
		el.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';

		let raf = 0;
		el.addEventListener( 'pointermove', ( e ) => {
			if ( raf ) cancelAnimationFrame( raf );
			raf = requestAnimationFrame( () => {
				const rect = el.getBoundingClientRect();
				const dx = ( e.clientX - ( rect.left + rect.width / 2 ) ) * strength;
				const dy = ( e.clientY - ( rect.top + rect.height / 2 ) ) * strength;
				el.style.transform = `translate3d(${ dx.toFixed( 1 ) }px, ${ dy.toFixed( 1 ) }px, 0)`;
			} );
		} );

		el.addEventListener( 'pointerleave', () => {
			if ( raf ) cancelAnimationFrame( raf );
			el.style.transform = 'translate3d(0, 0, 0)';
		} );
	}

	function initStickyHeader( el, cfg ) {
		const offset = Number( cfg.scrollOffset ) || 50;
		const hideDown = cfg.hideOnScrollDown === true;
		if ( cfg.scrolledBg ) el.style.setProperty( '--gpb-scrolled-bg', cfg.scrolledBg );
		if ( cfg.scrolledBlur ) el.style.setProperty( '--gpb-scrolled-blur', `blur(${ cfg.scrolledBlur })` );
		if ( cfg.scrolledPadding ) el.style.setProperty( '--gpb-scrolled-padding', cfg.scrolledPadding );

		let lastY = window.scrollY;
		let ticking = false;
		const update = () => {
			const y = window.scrollY;
			el.classList.toggle( 'gpb-is-scrolled', y > offset );
			if ( hideDown ) {
				el.classList.toggle( 'gpb-header-hidden', y > offset && y > lastY );
			}
			lastY = y;
			ticking = false;
		};
		window.addEventListener(
			'scroll',
			() => {
				if ( ! ticking ) {
					requestAnimationFrame( update );
					ticking = true;
				}
			},
			{ passive: true }
		);
		update();
	}

	function initOffcanvas( el, cfg ) {
		const pos = cfg.position || 'right';
		const trigger = cfg.trigger;
		el.classList.add( 'gpb-offcanvas', `gpb-offcanvas-${ pos }` );
		el.setAttribute( 'role', 'dialog' );
		el.setAttribute( 'aria-modal', 'true' );
		el.setAttribute( 'aria-hidden', 'true' );

		const backdrop = document.createElement( 'div' );
		backdrop.className = 'gpb-offcanvas-backdrop';
		el.parentNode.insertBefore( backdrop, el );

		const open = () => {
			el.classList.add( 'is-open' );
			backdrop.classList.add( 'is-open' );
			el.setAttribute( 'aria-hidden', 'false' );
			document.body.style.overflow = 'hidden';
		};
		const close = () => {
			el.classList.remove( 'is-open' );
			backdrop.classList.remove( 'is-open' );
			el.setAttribute( 'aria-hidden', 'true' );
			document.body.style.overflow = '';
		};

		if ( trigger ) {
			document.querySelectorAll( trigger ).forEach( ( btn ) => {
				btn.addEventListener( 'click', ( e ) => {
					e.preventDefault();
					open();
				} );
			} );
		}

		backdrop.addEventListener( 'click', close );
		el.addEventListener( 'click', ( e ) => {
			if ( e.target.closest( '[data-gpb-close]' ) ) close();
		} );
		document.addEventListener( 'keydown', ( e ) => {
			if ( e.key === 'Escape' && el.classList.contains( 'is-open' ) ) close();
		} );
	}

	function initCountdown( el, cfg ) {
		let targetMs = cfg.targetDate ? Date.parse( cfg.targetDate ) : 0;
		if ( ! targetMs && cfg.evergreenMinutes ) {
			const storageKey = 'gpb_cd_' + ( el.id || el.className.slice( 0, 24 ) );
			const saved = localStorage.getItem( storageKey );
			if ( saved && Number( saved ) > Date.now() ) {
				targetMs = Number( saved );
			} else {
				targetMs = Date.now() + Number( cfg.evergreenMinutes ) * 60000;
				localStorage.setItem( storageKey, String( targetMs ) );
			}
		}
		if ( ! targetMs ) return;

		let dEl = el.querySelector( '[data-gpb-unit="days"]' );
		let hEl = el.querySelector( '[data-gpb-unit="hours"]' );
		let mEl = el.querySelector( '[data-gpb-unit="minutes"]' );
		let sEl = el.querySelector( '[data-gpb-unit="seconds"]' );

		if ( ! dEl && ! hEl && ! mEl && ! sEl ) {
			el.innerHTML =
				'<div class="gpb-countdown-grid">' +
				'<div class="gpb-cd-box"><span data-gpb-unit="days">00</span><small>Jours</small></div>' +
				'<div class="gpb-cd-box"><span data-gpb-unit="hours">00</span><small>Heures</small></div>' +
				'<div class="gpb-cd-box"><span data-gpb-unit="minutes">00</span><small>Min</small></div>' +
				'<div class="gpb-cd-box"><span data-gpb-unit="seconds">00</span><small>Sec</small></div>' +
				'</div>';
			dEl = el.querySelector( '[data-gpb-unit="days"]' );
			hEl = el.querySelector( '[data-gpb-unit="hours"]' );
			mEl = el.querySelector( '[data-gpb-unit="minutes"]' );
			sEl = el.querySelector( '[data-gpb-unit="seconds"]' );
		}

		const pad = ( n ) => String( Math.max( 0, n ) ).padStart( 2, '0' );
		const tick = () => {
			const diff = Math.max( 0, Math.floor( ( targetMs - Date.now() ) / 1000 ) );
			if ( dEl ) dEl.textContent = pad( Math.floor( diff / 86400 ) );
			if ( hEl ) hEl.textContent = pad( Math.floor( ( diff % 86400 ) / 3600 ) );
			if ( mEl ) mEl.textContent = pad( Math.floor( ( diff % 3600 ) / 60 ) );
			if ( sEl ) sEl.textContent = pad( diff % 60 );
		};
		tick();
		setInterval( tick, 1000 );
	}

	function initFilterGrid( el ) {
		const btns = el.querySelectorAll( '[data-gpb-filter]' );
		const items = el.querySelectorAll( '[data-gpb-category]' );
		if ( ! btns.length || ! items.length ) return;

		btns.forEach( ( btn ) => {
			btn.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				const filter = btn.getAttribute( 'data-gpb-filter' );
				btns.forEach( ( b ) => b.classList.toggle( 'is-active', b === btn ) );
				items.forEach( ( item ) => {
					const cats = ( item.getAttribute( 'data-gpb-category' ) || '' ).split( /\s+/ );
					const match = filter === 'all' || filter === '*' || cats.includes( filter );
					item.hidden = ! match;
				} );
			} );
		} );
	}

	function initBeforeAfter( el, cfg ) {
		const imgs = el.querySelectorAll( 'img' );
		if ( imgs.length < 2 ) return;

		const initial = Number( cfg.initialPos ) || 50;
		el.classList.add( 'gpb-ba-container' );
		el.style.setProperty( '--gpb-ba-pos', `${ initial }%` );

		const beforeEl = imgs[ 0 ].closest( 'figure' ) || imgs[ 0 ];
		const afterEl = imgs[ 1 ].closest( 'figure' ) || imgs[ 1 ];
		beforeEl.classList.add( 'gpb-ba-before' );
		afterEl.classList.add( 'gpb-ba-after' );

		const divider = document.createElement( 'div' );
		divider.className = 'gpb-ba-divider';
		const range = document.createElement( 'input' );
		range.type = 'range';
		range.min = '0';
		range.max = '100';
		range.value = String( initial );
		range.className = 'gpb-ba-range';
		range.setAttribute( 'aria-label', 'Compare before and after images' );

		range.addEventListener( 'input', () => {
			el.style.setProperty( '--gpb-ba-pos', `${ range.value }%` );
		} );

		el.appendChild( divider );
		el.appendChild( range );
	}

	function initLightbox( el ) {
		const imgs = el.querySelectorAll( 'img' );
		if ( ! imgs.length ) return;

		imgs.forEach( ( img ) => {
			img.style.cursor = 'zoom-in';
			img.addEventListener( 'click', () => {
				const overlay = document.createElement( 'div' );
				overlay.className = 'gpb-lightbox-overlay';
				overlay.setAttribute( 'role', 'dialog' );
				const big = document.createElement( 'img' );
				big.src = img.currentSrc || img.src;
				big.alt = img.alt || '';
				overlay.appendChild( big );
				const close = () => {
					overlay.remove();
					document.removeEventListener( 'keydown', onKey );
				};
				const onKey = ( e ) => {
					if ( e.key === 'Escape' ) close();
				};
				overlay.addEventListener( 'click', close );
				document.addEventListener( 'keydown', onKey );
				document.body.appendChild( overlay );
			} );
		} );
	}

	function initScrollProgress( el ) {
		el.classList.add( 'gpb-scroll-progress-bar' );
		let ticking = false;
		const update = () => {
			const max = document.documentElement.scrollHeight - window.innerHeight;
			const ratio = max > 0 ? Math.min( 1, Math.max( 0, window.scrollY / max ) ) : 0;
			el.style.transform = `scaleX(${ ratio.toFixed( 4 ) })`;
			ticking = false;
		};
		window.addEventListener(
			'scroll',
			() => {
				if ( ! ticking ) {
					requestAnimationFrame( update );
					ticking = true;
				}
			},
			{ passive: true }
		);
		update();
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

	function initAccordion( el, cfg ) {
		const items = Array.from( el.children );
		const singleOpen = cfg.singleOpen !== false;
		items.forEach( ( item ) => {
			const trigger = item.querySelector( '.wp-block-heading, button, summary' ) || item.firstElementChild;
			const content = trigger && trigger.nextElementSibling;
			if ( ! trigger || ! content ) return;
			trigger.style.cursor = 'pointer';
			trigger.setAttribute( 'role', 'button' );
			trigger.setAttribute( 'tabindex', '0' );
			trigger.setAttribute( 'aria-expanded', 'false' );
			content.hidden = true;

			const toggle = () => {
				const isOpen = trigger.getAttribute( 'aria-expanded' ) === 'true';
				if ( singleOpen && ! isOpen ) {
					items.forEach( ( other ) => {
						const t = other.querySelector( '[role="button"]' );
						const c = t && t.nextElementSibling;
						if ( t && c ) {
							t.setAttribute( 'aria-expanded', 'false' );
							c.hidden = true;
						}
					} );
				}
				trigger.setAttribute( 'aria-expanded', String( ! isOpen ) );
				content.hidden = isOpen;
			};

			trigger.addEventListener( 'click', toggle );
			trigger.addEventListener( 'keydown', ( e ) => {
				if ( e.key === 'Enter' || e.key === ' ' ) {
					e.preventDefault();
					toggle();
				}
			} );
		} );
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
		const handlers = {
			tilt3d: initTilt3d,
			magnetic: initMagnetic,
			'sticky-header': initStickyHeader,
			offcanvas: initOffcanvas,
			countdown: initCountdown,
			'filter-grid': initFilterGrid,
			'before-after': initBeforeAfter,
			lightbox: initLightbox,
			'scroll-progress': initScrollProgress,
			counter: initCounter,
			marquee: initMarquee,
			slider: initSlider,
			tabs: initTabs,
			accordion: initAccordion,
			modal: initModal,
		};

		document.querySelectorAll( '[data-gpb-interactive]' ).forEach( ( el ) => {
			const type = el.getAttribute( 'data-gpb-interactive' );
			const cfg = parseJsonAttr( el, 'data-gpb-config', {} );
			if ( handlers[ type ] ) {
				handlers[ type ]( el, cfg );
			}
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
