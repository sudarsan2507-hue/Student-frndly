import React, { useEffect, useRef, useState } from 'react';
import portraitSrc from '../assets/login-portrait.webp';
import './StudyScene.css';

/**
 * StudyScene — the login/signup hero illustration.
 *
 * The user's own reference image (Reference/kawaii-cat-girl-*.png), used
 * directly rather than redrawn — background knocked out to transparency and
 * downscaled for the web (see the note in that folder / git history for how).
 * It's a downloaded wallpaper of unknown licence, so it stays local to this
 * project rather than going into anything published.
 *
 * Motion is CSS: continuous breathing plus a cursor-eased tilt on devices
 * that report a real pointer (gated off on touch, off under
 * prefers-reduced-motion). This is the *illustration* side only — the login
 * form itself has no motion beyond its one-time entrance fade, deliberately,
 * so it stays steady while you're typing into it.
 */

const StudyScene = ({ animate = true, className = '' }) => {
    const hostRef = useRef(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });

    // ── Pointer parallax: mouse-only (skip on touch), CSS-eased, no RAF loop. ──
    useEffect(() => {
        const host = hostRef.current;
        if (!host) return undefined;
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const hasFinePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;
        if (!animate || reduced || !hasFinePointer) return undefined;

        const onMove = (e) => {
            const r = host.getBoundingClientRect();
            setTilt({
                x: ((e.clientX - r.left) / r.width - 0.5) * 2,
                y: ((e.clientY - r.top) / r.height - 0.5) * 2,
            });
        };
        window.addEventListener('pointermove', onMove, { passive: true });
        return () => window.removeEventListener('pointermove', onMove);
    }, [animate]);

    return (
        <div ref={hostRef} className={`study-scene ${className}`}>
            <div className="ss-glow" aria-hidden="true" />
            {/* Two layers: this one takes the cursor-driven tilt (inline style,
                so it can't fight a CSS animation); the img inside carries the
                continuous CSS breathing loop. Keeping them on separate
                elements means both kinds of motion actually play instead of
                one clobbering the other via the transform property. */}
            <div className="ss-portrait-wrap" style={{ '--tiltX': tilt.x, '--tiltY': tilt.y }}>
                <img
                    className="ss-portrait"
                    src={portraitSrc}
                    alt="An illustrated portrait, dark-haired with large detailed eyes"
                    draggable={false}
                />
            </div>
        </div>
    );
};

export default StudyScene;
