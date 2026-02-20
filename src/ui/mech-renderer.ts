import type {
  AccessoryId,
  BodyId,
  Build,
  LegsId,
  LegsMoveType,
  MountType,
  PartId,
  PartSlot,
  WeaponId,
  WeaponSpecial,
} from '../core/types'
import {
  LEGS_PARTS,
  BODY_PARTS,
  WEAPON_PARTS,
} from '../data/parts-data'

// ─── Color System ──────────────────────────────────────

interface MechColors {
  readonly pri: string
  readonly acc: string
  readonly fl: string
  readonly fls: string
  readonly st: string
  readonly gw: string
  readonly dk: string
}

export function colors(side: 'player' | 'enemy'): MechColors {
  return side === 'player'
    ? {
        pri: '#4fc3f7',
        acc: '#b8eaff',
        fl: 'rgba(79,195,247,0.14)',
        fls: 'rgba(79,195,247,0.28)',
        st: 'rgba(184,234,255,0.7)',
        gw: 'rgba(79,195,247,0.4)',
        dk: 'rgba(13,17,23,0.55)',
      }
    : {
        pri: '#ef5350',
        acc: '#ffaaaa',
        fl: 'rgba(239,83,80,0.14)',
        fls: 'rgba(239,83,80,0.28)',
        st: 'rgba(255,170,170,0.7)',
        gw: 'rgba(239,83,80,0.4)',
        dk: 'rgba(13,17,23,0.55)',
      }
}

// ─── Opaque gradient palette (derived from MechColors for 3D) ──

interface GradColors {
  readonly hi: string   // highlight (brightest)
  readonly mid: string  // mid-tone
  readonly lo: string   // shadow (darkest)
  readonly core: string // energy core
  readonly glow: string // glow halo
}

function gradColors(side: 'player' | 'enemy'): GradColors {
  return side === 'player'
    ? { hi: '#d4f1ff', mid: '#2a7ea8', lo: '#0d1b2a', core: '#80d8ff', glow: '#4fc3f7' }
    : { hi: '#ffd4d4', mid: '#a83232', lo: '#2a0d0d', core: '#ff8a80', glow: '#ef5350' }
}

// ─── SVG Defs for 3D / Metallic Effects ────────────────

let _uid = 0
let _gp = 'm0'
let _gc: GradColors = { hi: '#d4f1ff', mid: '#2a7ea8', lo: '#0d1b2a', core: '#80d8ff', glow: '#4fc3f7' }

function svgDefs(_c: MechColors, side: 'player' | 'enemy' = 'player'): string {
  _gp = `m${_uid++}`
  _gc = gradColors(side)
  const g = _gc
  return `<defs>
<linearGradient id="${_gp}p" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="${g.hi}"/>
<stop offset="40%" stop-color="${g.mid}"/>
<stop offset="100%" stop-color="${g.lo}"/>
</linearGradient>
<linearGradient id="${_gp}d" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="${g.mid}" stop-opacity="0.5"/>
<stop offset="100%" stop-color="${g.lo}"/>
</linearGradient>
<linearGradient id="${_gp}a" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="${g.hi}"/>
<stop offset="50%" stop-color="${g.mid}" stop-opacity="0.8"/>
<stop offset="100%" stop-color="${g.lo}"/>
</linearGradient>
<linearGradient id="${_gp}b" x1="0" y1="0" x2="1" y2="0">
<stop offset="0%" stop-color="${g.lo}"/>
<stop offset="30%" stop-color="${g.mid}"/>
<stop offset="50%" stop-color="${g.hi}" stop-opacity="0.7"/>
<stop offset="70%" stop-color="${g.mid}"/>
<stop offset="100%" stop-color="${g.lo}"/>
</linearGradient>
<radialGradient id="${_gp}c">
<stop offset="0%" stop-color="${g.core}"/>
<stop offset="45%" stop-color="${g.glow}" stop-opacity="0.8"/>
<stop offset="100%" stop-color="${g.glow}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="${_gp}g">
<stop offset="0%" stop-color="${g.glow}"/>
<stop offset="50%" stop-color="${g.glow}" stop-opacity="0.4"/>
<stop offset="100%" stop-color="${g.glow}" stop-opacity="0"/>
</radialGradient>
<filter id="${_gp}s" x="-25%" y="-25%" width="150%" height="150%">
<feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>
<feOffset in="blur" dx="2" dy="3" result="shifted"/>
<feFlood flood-color="rgba(0,0,0,0.65)" result="color"/>
<feComposite in="color" in2="shifted" operator="in" result="shadow"/>
<feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
<filter id="${_gp}w" x="-60%" y="-60%" width="220%" height="220%">
<feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur"/>
<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
</defs>`
}

// ─── Legs SVG (100×100 local) ──────────────────────────

function svgLegs(id: LegsId, c: MechColors): string {
  switch (id) {
    case 'MP01': // Scout — reverse-joint bird legs
      return `<g>
<rect x="36" y="4" width="30" height="9" rx="3" fill="rgba(0,0,0,0.25)"/>
<rect x="35" y="2" width="30" height="9" rx="3" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="38" y1="3.5" x2="62" y2="3.5" stroke="${c.acc}" stroke-width="1" opacity="0.3"/>
<path d="M42 11 L34 42" fill="none" stroke="${c.dk}" stroke-width="4" stroke-linecap="round"/>
<path d="M42 11 L34 42" fill="none" stroke="${c.st}" stroke-width="2.5" stroke-linecap="round"/>
<path d="M34 42 L22 88" fill="none" stroke="${c.dk}" stroke-width="3.5" stroke-linecap="round"/>
<path d="M34 42 L22 88" fill="none" stroke="${c.st}" stroke-width="2" stroke-linecap="round"/>
<path d="M58 11 L66 42" fill="none" stroke="${c.dk}" stroke-width="4" stroke-linecap="round"/>
<path d="M58 11 L66 42" fill="none" stroke="${c.st}" stroke-width="2.5" stroke-linecap="round"/>
<path d="M66 42 L78 88" fill="none" stroke="${c.dk}" stroke-width="3.5" stroke-linecap="round"/>
<path d="M66 42 L78 88" fill="none" stroke="${c.st}" stroke-width="2" stroke-linecap="round"/>
<circle cx="34" cy="42" r="4" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="1"/>
<circle cx="33" cy="41" r="1.2" fill="${c.acc}" opacity="0.35"/>
<circle cx="66" cy="42" r="4" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="1"/>
<circle cx="65" cy="41" r="1.2" fill="${c.acc}" opacity="0.35"/>
<path d="M22 88 L14 94 M22 88 L28 95" stroke="${c.st}" stroke-width="1.8" stroke-linecap="round"/>
<path d="M78 88 L86 94 M78 88 L72 95" stroke="${c.st}" stroke-width="1.8" stroke-linecap="round"/>
<line x1="28" y1="70" x2="36" y2="50" stroke="${c.pri}" stroke-width="1" opacity="0.45"/>
<line x1="72" y1="70" x2="64" y2="50" stroke="${c.pri}" stroke-width="1" opacity="0.45"/>
</g>`

    case 'MP02': // Walker — humanoid bipedal
      return `<g>
<rect x="36" y="4" width="30" height="10" rx="3" fill="rgba(0,0,0,0.25)"/>
<rect x="35" y="2" width="30" height="10" rx="3" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="38" y1="3.5" x2="62" y2="3.5" stroke="${c.acc}" stroke-width="1" opacity="0.3"/>
<rect x="37" y="14" width="10" height="32" rx="2" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="39" y1="15.5" x2="45" y2="15.5" stroke="${c.acc}" stroke-width="0.8" opacity="0.25"/>
<rect x="53" y="14" width="10" height="32" rx="2" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="55" y1="15.5" x2="61" y2="15.5" stroke="${c.acc}" stroke-width="0.8" opacity="0.25"/>
<circle cx="42" cy="48" r="4.5" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="1"/>
<circle cx="41" cy="47" r="1.3" fill="${c.acc}" opacity="0.35"/>
<circle cx="58" cy="48" r="4.5" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="1"/>
<circle cx="57" cy="47" r="1.3" fill="${c.acc}" opacity="0.35"/>
<rect x="36" y="54" width="12" height="30" rx="2" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="38" y1="55.5" x2="46" y2="55.5" stroke="${c.acc}" stroke-width="0.8" opacity="0.25"/>
<rect x="52" y="54" width="12" height="30" rx="2" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="54" y1="55.5" x2="62" y2="55.5" stroke="${c.acc}" stroke-width="0.8" opacity="0.25"/>
<rect x="34" y="87" width="18" height="10" rx="3" fill="rgba(0,0,0,0.2)"/>
<rect x="33" y="85" width="18" height="10" rx="3" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="1.2"/>
<line x1="36" y1="86.5" x2="48" y2="86.5" stroke="${c.acc}" stroke-width="0.8" opacity="0.25"/>
<rect x="50" y="87" width="18" height="10" rx="3" fill="rgba(0,0,0,0.2)"/>
<rect x="49" y="85" width="18" height="10" rx="3" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="1.2"/>
<line x1="52" y1="86.5" x2="64" y2="86.5" stroke="${c.acc}" stroke-width="0.8" opacity="0.25"/>
</g>`

    case 'MP03': // Hover — flying thrusters
      return `<g>
<rect x="29" y="4" width="44" height="12" rx="4" fill="rgba(0,0,0,0.25)"/>
<rect x="28" y="2" width="44" height="12" rx="4" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="32" y1="3.5" x2="68" y2="3.5" stroke="${c.acc}" stroke-width="1" opacity="0.3"/>
<polygon points="30,18 42,18 46,58 26,58" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="32" y1="19.5" x2="41" y2="19.5" stroke="${c.acc}" stroke-width="0.8" opacity="0.25"/>
<polygon points="58,18 70,18 74,58 54,58" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="60" y1="19.5" x2="69" y2="19.5" stroke="${c.acc}" stroke-width="0.8" opacity="0.25"/>
<circle cx="36" cy="38" r="5" fill="url(#${_gp}d)" stroke="${c.acc}" stroke-width="0.8"/>
<circle cx="35" cy="37" r="1.5" fill="${c.acc}" opacity="0.25"/>
<circle cx="64" cy="38" r="5" fill="url(#${_gp}d)" stroke="${c.acc}" stroke-width="0.8"/>
<circle cx="63" cy="37" r="1.5" fill="${c.acc}" opacity="0.25"/>
<g filter="url(#${_gp}w)">
<ellipse cx="36" cy="64" rx="12" ry="5" fill="url(#${_gp}g)" opacity="0.7"/>
<ellipse cx="64" cy="64" rx="12" ry="5" fill="url(#${_gp}g)" opacity="0.7"/>
</g>
<ellipse cx="36" cy="76" rx="8" ry="14" fill="url(#${_gp}g)" opacity="0.25"/>
<ellipse cx="64" cy="76" rx="8" ry="14" fill="url(#${_gp}g)" opacity="0.25"/>
<line x1="36" y1="58" x2="36" y2="92" stroke="${c.pri}" stroke-width="1.5" opacity="0.3"/>
<line x1="64" y1="58" x2="64" y2="92" stroke="${c.pri}" stroke-width="1.5" opacity="0.3"/>
</g>`

    case 'MP04': // Tank — treads
      return `<g>
<rect x="13" y="6" width="76" height="14" rx="3" fill="rgba(0,0,0,0.25)"/>
<rect x="12" y="4" width="76" height="14" rx="3" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="16" y1="5.5" x2="84" y2="5.5" stroke="${c.acc}" stroke-width="1" opacity="0.3"/>
<rect x="7" y="24" width="36" height="68" rx="10" fill="rgba(0,0,0,0.25)"/>
<rect x="6" y="22" width="36" height="68" rx="10" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="2"/>
<line x1="12" y1="24" x2="36" y2="24" stroke="${c.acc}" stroke-width="0.8" opacity="0.25"/>
<rect x="59" y="24" width="36" height="68" rx="10" fill="rgba(0,0,0,0.25)"/>
<rect x="58" y="22" width="36" height="68" rx="10" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="2"/>
<line x1="64" y1="24" x2="88" y2="24" stroke="${c.acc}" stroke-width="0.8" opacity="0.25"/>
${[0, 1, 2, 3, 4, 5].map(i => `<line x1="12" y1="${30 + i * 11}" x2="36" y2="${30 + i * 11}" stroke="${c.st}" stroke-width="0.7" opacity="0.45"/>`).join('\n')}
${[0, 1, 2, 3, 4, 5].map(i => `<line x1="64" y1="${30 + i * 11}" x2="88" y2="${30 + i * 11}" stroke="${c.st}" stroke-width="0.7" opacity="0.45"/>`).join('\n')}
<circle cx="16" cy="56" r="6" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="0.8"/>
<circle cx="15" cy="55" r="1.8" fill="${c.acc}" opacity="0.25"/>
<circle cx="36" cy="56" r="6" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="0.8"/>
<circle cx="35" cy="55" r="1.8" fill="${c.acc}" opacity="0.25"/>
<circle cx="64" cy="56" r="6" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="0.8"/>
<circle cx="63" cy="55" r="1.8" fill="${c.acc}" opacity="0.25"/>
<circle cx="84" cy="56" r="6" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="0.8"/>
<circle cx="83" cy="55" r="1.8" fill="${c.acc}" opacity="0.25"/>
</g>`

    case 'MP05': // Spider — quadruped
      return `<g>
<circle cx="51" cy="15" r="13" fill="rgba(0,0,0,0.25)"/>
<circle cx="50" cy="14" r="13" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<circle cx="47" cy="11" r="3.5" fill="${c.acc}" opacity="0.12"/>
<circle cx="50" cy="14" r="5" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="1"/>
<circle cx="49" cy="13" r="1.5" fill="${c.acc}" opacity="0.35"/>
<path d="M40 22 L16 52 L6 78" fill="none" stroke="${c.dk}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M40 22 L16 52 L6 78" fill="none" stroke="${c.st}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M60 22 L84 52 L94 78" fill="none" stroke="${c.dk}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M60 22 L84 52 L94 78" fill="none" stroke="${c.st}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M42 24 L22 58 L12 92" fill="none" stroke="${c.dk}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M42 24 L22 58 L12 92" fill="none" stroke="${c.st}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M58 24 L78 58 L88 92" fill="none" stroke="${c.dk}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M58 24 L78 58 L88 92" fill="none" stroke="${c.st}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="16" cy="52" r="3" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="0.8"/>
<circle cx="84" cy="52" r="3" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="0.8"/>
<circle cx="22" cy="58" r="3" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="0.8"/>
<circle cx="78" cy="58" r="3" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="0.8"/>
<g filter="url(#${_gp}w)">
<circle cx="6" cy="78" r="2.5" fill="${c.acc}" opacity="0.5"/>
<circle cx="94" cy="78" r="2.5" fill="${c.acc}" opacity="0.5"/>
<circle cx="12" cy="92" r="2.5" fill="${c.acc}" opacity="0.5"/>
<circle cx="88" cy="92" r="2.5" fill="${c.acc}" opacity="0.5"/>
</g>
</g>`

    case 'MP06': // Strider — wheeled fast
      return `<g>
<rect x="30" y="4" width="40" height="10" rx="3" fill="rgba(0,0,0,0.25)"/>
<rect x="29" y="2" width="40" height="10" rx="3" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="33" y1="3.5" x2="65" y2="3.5" stroke="${c.acc}" stroke-width="1" opacity="0.3"/>
<rect x="32" y="14" width="36" height="30" rx="4" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="35" y1="15.5" x2="65" y2="15.5" stroke="${c.acc}" stroke-width="0.8" opacity="0.25"/>
<circle cx="28" cy="68" r="18" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="2"/>
<circle cx="28" cy="68" r="8" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="1.2"/>
<circle cx="27" cy="67" r="2.5" fill="${c.acc}" opacity="0.3"/>
<circle cx="72" cy="68" r="18" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="2"/>
<circle cx="72" cy="68" r="8" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="1.2"/>
<circle cx="71" cy="67" r="2.5" fill="${c.acc}" opacity="0.3"/>
<rect x="28" y="46" width="44" height="6" rx="2" fill="url(#${_gp}b)" stroke="${c.st}" stroke-width="1"/>
<g filter="url(#${_gp}w)">
<circle cx="28" cy="68" r="3" fill="${c.pri}" opacity="0.3"/>
<circle cx="72" cy="68" r="3" fill="${c.pri}" opacity="0.3"/>
</g>
</g>`

    case 'MP07': // Goliath — hexapod (6 legs)
      return `<g>
<rect x="26" y="2" width="48" height="16" rx="5" fill="rgba(0,0,0,0.25)"/>
<rect x="25" y="0" width="48" height="16" rx="5" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="30" y1="1.5" x2="68" y2="1.5" stroke="${c.acc}" stroke-width="1" opacity="0.3"/>
<path d="M32 16 L10 40 L4 72" fill="none" stroke="${c.dk}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M32 16 L10 40 L4 72" fill="none" stroke="${c.st}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M68 16 L90 40 L96 72" fill="none" stroke="${c.dk}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M68 16 L90 40 L96 72" fill="none" stroke="${c.st}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M36 18 L18 54 L8 88" fill="none" stroke="${c.dk}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M36 18 L18 54 L8 88" fill="none" stroke="${c.st}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M64 18 L82 54 L92 88" fill="none" stroke="${c.dk}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M64 18 L82 54 L92 88" fill="none" stroke="${c.st}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M40 20 L26 62 L18 96" fill="none" stroke="${c.dk}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M40 20 L26 62 L18 96" fill="none" stroke="${c.st}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M60 20 L74 62 L82 96" fill="none" stroke="${c.dk}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M60 20 L74 62 L82 96" fill="none" stroke="${c.st}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="10" cy="40" r="3.5" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="0.8"/>
<circle cx="90" cy="40" r="3.5" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="0.8"/>
<circle cx="18" cy="54" r="3" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="0.8"/>
<circle cx="82" cy="54" r="3" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="0.8"/>
<circle cx="26" cy="62" r="2.5" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="0.8"/>
<circle cx="74" cy="62" r="2.5" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="0.8"/>
</g>`

    case 'MP08': // Phantom — advanced flying
      return `<g>
<polygon points="50,0 78,14 72,56 50,62 28,56 22,14" fill="rgba(0,0,0,0.25)"/>
<polygon points="50,-2 76,12 70,54 50,60 30,54 24,12" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="30" y1="13" x2="70" y2="13" stroke="${c.acc}" stroke-width="1" opacity="0.3"/>
<polygon points="10,30 24,16 30,50 16,48" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="1"/>
<polygon points="90,30 76,16 70,50 84,48" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="1"/>
<g filter="url(#${_gp}w)">
<ellipse cx="36" cy="70" rx="14" ry="6" fill="url(#${_gp}g)" opacity="0.8"/>
<ellipse cx="64" cy="70" rx="14" ry="6" fill="url(#${_gp}g)" opacity="0.8"/>
<ellipse cx="50" cy="72" rx="10" ry="5" fill="url(#${_gp}g)" opacity="0.6"/>
</g>
<ellipse cx="36" cy="82" rx="8" ry="14" fill="url(#${_gp}g)" opacity="0.3"/>
<ellipse cx="64" cy="82" rx="8" ry="14" fill="url(#${_gp}g)" opacity="0.3"/>
<ellipse cx="50" cy="84" rx="6" ry="12" fill="url(#${_gp}g)" opacity="0.2"/>
<circle cx="50" cy="30" r="6" fill="url(#${_gp}c)" stroke="${c.acc}" stroke-width="1"/>
<circle cx="50" cy="30" r="2.5" fill="${c.pri}" opacity="0.6"/>
</g>`
  }
}

// ─── Body SVG (100×100 local) ──────────────────────────

function svgBody(id: BodyId, c: MechColors): string {
  switch (id) {
    case 'BP01': // Light Frame — narrow, minimal
      return `<g>
<rect x="31" y="10" width="40" height="82" rx="5" fill="rgba(0,0,0,0.25)"/>
<rect x="30" y="8" width="40" height="82" rx="5" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="34" y1="9.5" x2="66" y2="9.5" stroke="${c.acc}" stroke-width="1.2" opacity="0.3"/>
<rect x="36" y="16" width="28" height="22" rx="2" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="0.8"/>
<g filter="url(#${_gp}w)">
<circle cx="50" cy="27" r="7" fill="url(#${_gp}c)" stroke="${c.acc}" stroke-width="1"/>
</g>
<circle cx="50" cy="27" r="3" fill="${c.pri}" opacity="0.5"/>
<line x1="34" y1="48" x2="66" y2="48" stroke="${c.st}" stroke-width="0.7" opacity="0.4"/>
<line x1="34" y1="65" x2="66" y2="65" stroke="${c.st}" stroke-width="0.7" opacity="0.4"/>
<rect x="22" y="32" width="8" height="5" rx="1.5" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="0.8"/>
<line x1="23.5" y1="33" x2="28.5" y2="33" stroke="${c.acc}" stroke-width="0.6" opacity="0.3"/>
<rect x="70" y="32" width="8" height="5" rx="1.5" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="0.8"/>
<line x1="71.5" y1="33" x2="76.5" y2="33" stroke="${c.acc}" stroke-width="0.6" opacity="0.3"/>
<rect x="36" y="74" width="28" height="10" rx="2" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="0.6"/>
</g>`

    case 'BP02': // Standard — medium, arm mounts visible
      return `<g>
<rect x="21" y="8" width="60" height="88" rx="6" fill="rgba(0,0,0,0.25)"/>
<rect x="20" y="6" width="60" height="88" rx="6" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="25" y1="7.5" x2="75" y2="7.5" stroke="${c.acc}" stroke-width="1.2" opacity="0.3"/>
<rect x="26" y="12" width="48" height="30" rx="3" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="0.8"/>
<g filter="url(#${_gp}w)">
<circle cx="50" cy="30" r="9" fill="url(#${_gp}c)" stroke="${c.acc}" stroke-width="1.2"/>
</g>
<circle cx="50" cy="30" r="4" fill="${c.pri}" opacity="0.45"/>
<line x1="26" y1="50" x2="74" y2="50" stroke="${c.st}" stroke-width="0.8" opacity="0.4"/>
<line x1="26" y1="66" x2="74" y2="66" stroke="${c.st}" stroke-width="0.8" opacity="0.4"/>
<rect x="28" y="54" width="44" height="8" rx="2" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="0.6"/>
<rect x="28" y="74" width="44" height="14" rx="2" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="0.6"/>
<rect x="12" y="28" width="8" height="14" rx="2" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="1"/>
<line x1="13.5" y1="29.5" x2="18.5" y2="29.5" stroke="${c.acc}" stroke-width="0.6" opacity="0.3"/>
<rect x="80" y="28" width="8" height="14" rx="2" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="1"/>
<line x1="81.5" y1="29.5" x2="86.5" y2="29.5" stroke="${c.acc}" stroke-width="0.6" opacity="0.3"/>
</g>`

    case 'BP03': // Fortress — wide, heavy armor
      return `<g>
<rect x="11" y="6" width="80" height="92" rx="7" fill="rgba(0,0,0,0.3)"/>
<rect x="10" y="4" width="80" height="92" rx="7" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="2"/>
<line x1="15" y1="5.5" x2="85" y2="5.5" stroke="${c.acc}" stroke-width="1.5" opacity="0.3"/>
<rect x="16" y="10" width="68" height="32" rx="3" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="1"/>
<g filter="url(#${_gp}w)">
<circle cx="50" cy="26" r="11" fill="url(#${_gp}c)" stroke="${c.acc}" stroke-width="1.5"/>
</g>
<circle cx="50" cy="26" r="4.5" fill="${c.pri}" opacity="0.4"/>
<rect x="16" y="48" width="68" height="18" rx="2" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="0.8"/>
<rect x="16" y="72" width="68" height="18" rx="2" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="0.8"/>
<polygon points="3,14 10,8 10,38 3,32" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="1"/>
<polygon points="97,14 90,8 90,38 97,32" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="1"/>
<line x1="16" y1="44" x2="84" y2="44" stroke="${c.acc}" stroke-width="1.2" opacity="0.45"/>
<circle cx="22" cy="57" r="2.2" fill="${c.acc}" opacity="0.35"/>
<circle cx="78" cy="57" r="2.2" fill="${c.acc}" opacity="0.35"/>
<circle cx="22" cy="80" r="2.2" fill="${c.acc}" opacity="0.35"/>
<circle cx="78" cy="80" r="2.2" fill="${c.acc}" opacity="0.35"/>
</g>`

    case 'BP04': // Sniper Bay — tall narrow, top platform
      return `<g>
<rect x="23" y="8" width="56" height="18" rx="3" fill="rgba(0,0,0,0.25)"/>
<rect x="22" y="6" width="56" height="18" rx="3" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="26" y1="7.5" x2="74" y2="7.5" stroke="${c.acc}" stroke-width="1" opacity="0.3"/>
<line x1="28" y1="15" x2="72" y2="15" stroke="${c.acc}" stroke-width="0.8" opacity="0.5"/>
<g filter="url(#${_gp}w)">
<circle cx="50" cy="10" r="4" fill="url(#${_gp}c)" stroke="${c.acc}" stroke-width="0.8"/>
</g>
<rect x="31" y="28" width="40" height="68" rx="4" fill="rgba(0,0,0,0.25)"/>
<rect x="30" y="26" width="40" height="68" rx="4" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="34" y1="27.5" x2="66" y2="27.5" stroke="${c.acc}" stroke-width="1" opacity="0.3"/>
<rect x="36" y="34" width="28" height="16" rx="2" fill="url(#${_gp}d)" stroke="${c.acc}" stroke-width="1"/>
<circle cx="50" cy="42" r="5" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="0.8"/>
<circle cx="49" cy="41" r="1.5" fill="${c.acc}" opacity="0.3"/>
<line x1="34" y1="58" x2="66" y2="58" stroke="${c.st}" stroke-width="0.6" opacity="0.4"/>
<line x1="34" y1="72" x2="66" y2="72" stroke="${c.st}" stroke-width="0.6" opacity="0.4"/>
<rect x="36" y="80" width="28" height="8" rx="2" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="0.5"/>
</g>`

    case 'BP05': // Juggernaut — massive, bulky
      return `<g>
<rect x="7" y="4" width="88" height="96" rx="9" fill="rgba(0,0,0,0.3)"/>
<rect x="6" y="2" width="88" height="96" rx="9" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="2.5"/>
<line x1="12" y1="3.5" x2="88" y2="3.5" stroke="${c.acc}" stroke-width="1.5" opacity="0.3"/>
<rect x="14" y="9" width="72" height="38" rx="4" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="1.2"/>
<g filter="url(#${_gp}w)">
<circle cx="50" cy="28" r="13" fill="url(#${_gp}c)" stroke="${c.acc}" stroke-width="1.8"/>
</g>
<circle cx="50" cy="28" r="5.5" fill="${c.pri}" opacity="0.45"/>
<rect x="14" y="52" width="72" height="16" rx="2" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="0.8"/>
<rect x="14" y="74" width="72" height="18" rx="2" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="0.8"/>
<line x1="14" y1="49" x2="86" y2="49" stroke="${c.acc}" stroke-width="1.5" opacity="0.45"/>
<rect x="1" y="14" width="10" height="26" rx="3" fill="rgba(0,0,0,0.2)"/>
<rect x="0" y="12" width="10" height="26" rx="3" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="1.2"/>
<line x1="2" y1="13.5" x2="8" y2="13.5" stroke="${c.acc}" stroke-width="0.6" opacity="0.3"/>
<rect x="91" y="14" width="10" height="26" rx="3" fill="rgba(0,0,0,0.2)"/>
<rect x="90" y="12" width="10" height="26" rx="3" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="1.2"/>
<line x1="92" y1="13.5" x2="98" y2="13.5" stroke="${c.acc}" stroke-width="0.6" opacity="0.3"/>
<circle cx="22" cy="60" r="2.5" fill="${c.acc}" opacity="0.3"/>
<circle cx="78" cy="60" r="2.5" fill="${c.acc}" opacity="0.3"/>
<circle cx="22" cy="82" r="2.5" fill="${c.acc}" opacity="0.3"/>
<circle cx="50" cy="82" r="2.5" fill="${c.acc}" opacity="0.3"/>
<circle cx="78" cy="82" r="2.5" fill="${c.acc}" opacity="0.3"/>
</g>`

    case 'BP06': // Recon Frame — ultra-light scout body
      return `<g>
<rect x="33" y="12" width="34" height="78" rx="4" fill="rgba(0,0,0,0.25)"/>
<rect x="32" y="10" width="34" height="78" rx="4" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.2"/>
<line x1="35" y1="11.5" x2="63" y2="11.5" stroke="${c.acc}" stroke-width="1" opacity="0.3"/>
<rect x="38" y="18" width="24" height="18" rx="2" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="0.8"/>
<g filter="url(#${_gp}w)">
<circle cx="50" cy="27" r="6" fill="url(#${_gp}c)" stroke="${c.acc}" stroke-width="0.8"/>
</g>
<circle cx="50" cy="27" r="2.5" fill="${c.pri}" opacity="0.5"/>
<ellipse cx="50" cy="14" rx="16" ry="3" fill="url(#${_gp}g)" opacity="0.35"/>
<line x1="36" y1="44" x2="64" y2="44" stroke="${c.st}" stroke-width="0.6" opacity="0.4"/>
<line x1="36" y1="60" x2="64" y2="60" stroke="${c.st}" stroke-width="0.6" opacity="0.4"/>
<rect x="24" y="30" width="7" height="4" rx="1" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="0.6"/>
<rect x="69" y="30" width="7" height="4" rx="1" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="0.6"/>
<rect x="38" y="72" width="24" height="8" rx="2" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="0.5"/>
</g>`

    case 'BP07': // Assault Chassis — heavy shoulder-mount body
      return `<g>
<rect x="13" y="6" width="76" height="92" rx="7" fill="rgba(0,0,0,0.3)"/>
<rect x="12" y="4" width="76" height="92" rx="7" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="2"/>
<line x1="17" y1="5.5" x2="83" y2="5.5" stroke="${c.acc}" stroke-width="1.2" opacity="0.3"/>
<rect x="18" y="10" width="64" height="30" rx="3" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="1"/>
<g filter="url(#${_gp}w)">
<circle cx="50" cy="25" r="10" fill="url(#${_gp}c)" stroke="${c.acc}" stroke-width="1.2"/>
</g>
<circle cx="50" cy="25" r="4" fill="${c.pri}" opacity="0.4"/>
<rect x="18" y="46" width="64" height="16" rx="2" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="0.8"/>
<rect x="18" y="68" width="64" height="22" rx="2" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="0.8"/>
<polygon points="5,12 12,6 12,36 5,30" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="1"/>
<polygon points="95,12 88,6 88,36 95,30" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="1"/>
<line x1="18" y1="42" x2="82" y2="42" stroke="${c.acc}" stroke-width="1" opacity="0.4"/>
<circle cx="24" cy="54" r="2" fill="${c.acc}" opacity="0.3"/>
<circle cx="76" cy="54" r="2" fill="${c.acc}" opacity="0.3"/>
<circle cx="24" cy="78" r="2" fill="${c.acc}" opacity="0.3"/>
<circle cx="76" cy="78" r="2" fill="${c.acc}" opacity="0.3"/>
</g>`
  }
}

// ─── Weapon SVG (100×100 local) ─────────────────────────

function svgWeapon(id: WeaponId, c: MechColors): string {
  switch (id) {
    case 'AP01': // Vulcan — multi-barrel gatling
      return `<g>
<rect x="9" y="32" width="42" height="40" rx="5" fill="rgba(0,0,0,0.25)"/>
<rect x="8" y="30" width="42" height="40" rx="5" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="12" y1="31.5" x2="46" y2="31.5" stroke="${c.acc}" stroke-width="1" opacity="0.3"/>
<circle cx="56" cy="51" r="19" fill="rgba(0,0,0,0.25)"/>
<circle cx="55" cy="50" r="19" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="1.5"/>
<circle cx="55" cy="50" r="8" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="1"/>
<circle cx="53" cy="48" r="2.5" fill="${c.acc}" opacity="0.2"/>
<rect x="68" y="34" width="28" height="6" rx="2" fill="url(#${_gp}b)" stroke="${c.st}" stroke-width="1"/>
<rect x="68" y="42" width="30" height="6" rx="2" fill="url(#${_gp}b)" stroke="${c.st}" stroke-width="1"/>
<rect x="68" y="50" width="30" height="6" rx="2" fill="url(#${_gp}b)" stroke="${c.st}" stroke-width="1"/>
<rect x="68" y="58" width="28" height="6" rx="2" fill="url(#${_gp}b)" stroke="${c.st}" stroke-width="1"/>
<rect x="4" y="38" width="8" height="24" rx="2" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="0.8"/>
<line x1="5.5" y1="39.5" x2="10.5" y2="39.5" stroke="${c.acc}" stroke-width="0.6" opacity="0.3"/>
<g filter="url(#${_gp}w)">
<circle cx="55" cy="50" r="3" fill="${c.pri}" opacity="0.5"/>
</g>
</g>`

    case 'AP02': // Cannon — single large barrel
      return `<g>
<rect x="7" y="26" width="40" height="52" rx="6" fill="rgba(0,0,0,0.25)"/>
<rect x="6" y="24" width="40" height="52" rx="6" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="10" y1="25.5" x2="42" y2="25.5" stroke="${c.acc}" stroke-width="1" opacity="0.3"/>
<rect x="14" y="32" width="26" height="36" rx="3" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="1"/>
<rect x="47" y="38" width="46" height="28" rx="4" fill="rgba(0,0,0,0.25)"/>
<rect x="46" y="36" width="46" height="28" rx="4" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="2"/>
<line x1="50" y1="37.5" x2="88" y2="37.5" stroke="${c.acc}" stroke-width="1.2" opacity="0.3"/>
<rect x="86" y="32" width="10" height="36" rx="2" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<rect x="52" y="28" width="18" height="7" rx="2" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="0.8"/>
<line x1="54" y1="29" x2="68" y2="29" stroke="${c.acc}" stroke-width="0.6" opacity="0.3"/>
<line x1="60" y1="46" x2="82" y2="46" stroke="${c.acc}" stroke-width="0.8" opacity="0.4"/>
<line x1="60" y1="54" x2="82" y2="54" stroke="${c.acc}" stroke-width="0.8" opacity="0.4"/>
<path d="M18 76 L28 66" stroke="${c.st}" stroke-width="1.5" stroke-linecap="round"/>
</g>`

    case 'AP03': // Sniper — long thin rifle
      return `<g>
<rect x="3" y="40" width="26" height="24" rx="3" fill="rgba(0,0,0,0.25)"/>
<rect x="2" y="38" width="26" height="24" rx="3" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="5" y1="39.5" x2="25" y2="39.5" stroke="${c.acc}" stroke-width="0.8" opacity="0.3"/>
<rect x="28" y="42" width="70" height="16" rx="2.5" fill="url(#${_gp}b)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="30" y1="43.5" x2="95" y2="43.5" stroke="${c.acc}" stroke-width="0.8" opacity="0.2"/>
<rect x="38" y="30" width="22" height="10" rx="3" fill="url(#${_gp}p)" stroke="${c.acc}" stroke-width="1.2"/>
<circle cx="49" cy="35" r="4" fill="url(#${_gp}d)" stroke="${c.acc}" stroke-width="0.8"/>
<g filter="url(#${_gp}w)">
<circle cx="49" cy="35" r="1.5" fill="${c.pri}" opacity="0.6"/>
</g>
<line x1="96" y1="44" x2="96" y2="56" stroke="${c.acc}" stroke-width="2.5"/>
<path d="M2 50 L-3 60 L4 62" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1"/>
<path d="M22 60 L14 76 M32 60 L38 76" stroke="${c.st}" stroke-width="1" stroke-linecap="round"/>
<line x1="60" y1="46" x2="60" y2="54" stroke="${c.acc}" stroke-width="0.6" opacity="0.4"/>
<line x1="75" y1="46" x2="75" y2="54" stroke="${c.acc}" stroke-width="0.6" opacity="0.4"/>
</g>`

    case 'AP04': // Missile — multi-tube launcher
      return `<g>
<rect x="9" y="14" width="48" height="76" rx="6" fill="rgba(0,0,0,0.25)"/>
<rect x="8" y="12" width="48" height="76" rx="6" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="12" y1="13.5" x2="52" y2="13.5" stroke="${c.acc}" stroke-width="1" opacity="0.3"/>
<circle cx="24" cy="28" r="9" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="1.2"/>
<circle cx="44" cy="28" r="9" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="1.2"/>
<circle cx="24" cy="50" r="9" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="1.2"/>
<circle cx="44" cy="50" r="9" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="1.2"/>
<circle cx="24" cy="72" r="9" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="1.2"/>
<circle cx="44" cy="72" r="9" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="1.2"/>
<g filter="url(#${_gp}w)">
<circle cx="24" cy="28" r="3.5" fill="${c.pri}" opacity="0.45"/>
<circle cx="44" cy="28" r="3.5" fill="${c.pri}" opacity="0.45"/>
<circle cx="24" cy="50" r="3.5" fill="${c.pri}" opacity="0.45"/>
<circle cx="44" cy="50" r="3.5" fill="${c.pri}" opacity="0.45"/>
<circle cx="24" cy="72" r="3.5" fill="${c.pri}" opacity="0.45"/>
<circle cx="44" cy="72" r="3.5" fill="${c.pri}" opacity="0.45"/>
</g>
<rect x="58" y="28" width="14" height="44" rx="3" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="1"/>
<line x1="60" y1="29.5" x2="70" y2="29.5" stroke="${c.acc}" stroke-width="0.6" opacity="0.3"/>
</g>`

    case 'AP05': // Hammer — melee fist
      return `<g>
<rect x="2" y="36" width="38" height="16" rx="3" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="5" y1="37.5" x2="37" y2="37.5" stroke="${c.acc}" stroke-width="0.8" opacity="0.25"/>
<circle cx="40" cy="44" r="7" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="1.2"/>
<circle cx="39" cy="43" r="2" fill="${c.acc}" opacity="0.3"/>
<rect x="40" y="36" width="22" height="16" rx="2" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<rect x="59" y="20" width="38" height="52" rx="6" fill="rgba(0,0,0,0.3)"/>
<rect x="58" y="18" width="38" height="52" rx="6" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="2"/>
<line x1="62" y1="19.5" x2="92" y2="19.5" stroke="${c.acc}" stroke-width="1.2" opacity="0.3"/>
<rect x="64" y="24" width="26" height="40" rx="3" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="1"/>
<rect x="90" y="20" width="8" height="48" rx="2.5" fill="url(#${_gp}p)" stroke="${c.acc}" stroke-width="1.5"/>
<line x1="91.5" y1="21.5" x2="96.5" y2="21.5" stroke="${c.acc}" stroke-width="0.6" opacity="0.3"/>
<line x1="68" y1="44" x2="52" y2="44" stroke="${c.acc}" stroke-width="2" stroke-linecap="round"/>
<g filter="url(#${_gp}w)">
<circle cx="77" cy="35" r="3" fill="${c.pri}" opacity="0.35"/>
<circle cx="77" cy="53" r="3" fill="${c.pri}" opacity="0.35"/>
</g>
</g>`

    case 'AP06': // Laser — continuous beam emitter
      return `<g>
<rect x="6" y="30" width="36" height="40" rx="5" fill="rgba(0,0,0,0.25)"/>
<rect x="5" y="28" width="36" height="40" rx="5" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="9" y1="29.5" x2="37" y2="29.5" stroke="${c.acc}" stroke-width="1" opacity="0.3"/>
<rect x="42" y="40" width="54" height="12" rx="3" fill="url(#${_gp}b)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="44" y1="41.5" x2="94" y2="41.5" stroke="${c.acc}" stroke-width="0.8" opacity="0.2"/>
<rect x="42" y="36" width="12" height="20" rx="2" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="1"/>
<g filter="url(#${_gp}w)">
<circle cx="96" cy="46" r="4" fill="${c.pri}" opacity="0.7"/>
<line x1="96" y1="46" x2="100" y2="46" stroke="${c.pri}" stroke-width="2" opacity="0.5"/>
</g>
<circle cx="22" cy="48" r="6" fill="url(#${_gp}c)" stroke="${c.acc}" stroke-width="1"/>
<circle cx="22" cy="48" r="2.5" fill="${c.pri}" opacity="0.5"/>
<rect x="2" y="34" width="6" height="22" rx="1.5" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="0.8"/>
</g>`

    case 'AP07': // Shotgun — wide-bore spread
      return `<g>
<rect x="8" y="30" width="34" height="44" rx="5" fill="rgba(0,0,0,0.25)"/>
<rect x="7" y="28" width="34" height="44" rx="5" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="11" y1="29.5" x2="37" y2="29.5" stroke="${c.acc}" stroke-width="1" opacity="0.3"/>
<rect x="42" y="32" width="36" height="36" rx="5" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="2"/>
<line x1="46" y1="33.5" x2="74" y2="33.5" stroke="${c.acc}" stroke-width="1" opacity="0.3"/>
<rect x="76" y="30" width="18" height="14" rx="3" fill="url(#${_gp}b)" stroke="${c.st}" stroke-width="1"/>
<rect x="76" y="48" width="18" height="14" rx="3" fill="url(#${_gp}b)" stroke="${c.st}" stroke-width="1"/>
<circle cx="92" cy="37" r="3" fill="url(#${_gp}d)" stroke="${c.acc}" stroke-width="0.8"/>
<circle cx="92" cy="55" r="3" fill="url(#${_gp}d)" stroke="${c.acc}" stroke-width="0.8"/>
<g filter="url(#${_gp}w)">
<circle cx="50" cy="50" r="4" fill="${c.pri}" opacity="0.35"/>
</g>
<circle cx="24" cy="50" r="5" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="0.8"/>
<circle cx="23" cy="49" r="1.5" fill="${c.acc}" opacity="0.25"/>
</g>`

    case 'AP08': // Railgun — long charge weapon
      return `<g>
<rect x="2" y="36" width="30" height="28" rx="4" fill="rgba(0,0,0,0.25)"/>
<rect x="1" y="34" width="30" height="28" rx="4" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="4" y1="35.5" x2="28" y2="35.5" stroke="${c.acc}" stroke-width="0.8" opacity="0.3"/>
<rect x="32" y="38" width="66" height="20" rx="3" fill="url(#${_gp}b)" stroke="${c.st}" stroke-width="2"/>
<line x1="34" y1="39.5" x2="96" y2="39.5" stroke="${c.acc}" stroke-width="1" opacity="0.2"/>
<rect x="32" y="30" width="20" height="8" rx="2" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="1"/>
<rect x="32" y="58" width="20" height="8" rx="2" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="1"/>
<g filter="url(#${_gp}w)">
<rect x="96" y="40" width="4" height="16" rx="1" fill="${c.pri}" opacity="0.6"/>
<circle cx="98" cy="48" r="5" fill="url(#${_gp}g)" opacity="0.4"/>
</g>
<circle cx="16" cy="48" r="7" fill="url(#${_gp}c)" stroke="${c.acc}" stroke-width="1"/>
<circle cx="16" cy="48" r="3" fill="${c.pri}" opacity="0.45"/>
<line x1="60" y1="42" x2="60" y2="54" stroke="${c.acc}" stroke-width="0.6" opacity="0.4"/>
<line x1="75" y1="42" x2="75" y2="54" stroke="${c.acc}" stroke-width="0.6" opacity="0.4"/>
<line x1="90" y1="42" x2="90" y2="54" stroke="${c.acc}" stroke-width="0.6" opacity="0.4"/>
</g>`
  }
}

// ─── Accessory SVG (100×100 local) ──────────────────────

function svgAccessory(id: AccessoryId, c: MechColors): string {
  switch (id) {
    case 'ACP01': // Power Chip — glowing energy diamond
      return `<g>
<rect x="28" y="28" width="44" height="44" rx="5" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5" transform="rotate(45 50 50)"/>
<rect x="38" y="38" width="24" height="24" rx="3" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="1" transform="rotate(45 50 50)"/>
<g filter="url(#${_gp}w)">
<circle cx="50" cy="50" r="8" fill="url(#${_gp}g)"/>
<circle cx="50" cy="50" r="4" fill="${c.pri}" opacity="0.65"/>
</g>
<line x1="50" y1="22" x2="50" y2="34" stroke="${c.acc}" stroke-width="0.8" opacity="0.5"/>
<line x1="50" y1="66" x2="50" y2="78" stroke="${c.acc}" stroke-width="0.8" opacity="0.5"/>
<line x1="22" y1="50" x2="34" y2="50" stroke="${c.acc}" stroke-width="0.8" opacity="0.5"/>
<line x1="66" y1="50" x2="78" y2="50" stroke="${c.acc}" stroke-width="0.8" opacity="0.5"/>
</g>`

    case 'ACP02': // Shield Gen — hexagonal emitter
      return `<g>
<polygon points="50,14 82,31 82,69 50,86 18,69 18,31" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.8"/>
<line x1="22" y1="32" x2="78" y2="32" stroke="${c.acc}" stroke-width="0.8" opacity="0.25"/>
<polygon points="50,24 72,36 72,64 50,76 28,64 28,36" fill="url(#${_gp}d)" stroke="${c.acc}" stroke-width="1"/>
<g filter="url(#${_gp}w)">
<circle cx="50" cy="50" r="10" fill="url(#${_gp}c)" stroke="${c.acc}" stroke-width="1.2"/>
<circle cx="50" cy="50" r="4" fill="${c.pri}" opacity="0.55"/>
</g>
<line x1="50" y1="24" x2="50" y2="10" stroke="${c.pri}" stroke-width="0.8" opacity="0.35" stroke-dasharray="2 2"/>
<line x1="72" y1="36" x2="84" y2="27" stroke="${c.pri}" stroke-width="0.8" opacity="0.35" stroke-dasharray="2 2"/>
<line x1="72" y1="64" x2="84" y2="73" stroke="${c.pri}" stroke-width="0.8" opacity="0.35" stroke-dasharray="2 2"/>
<line x1="50" y1="76" x2="50" y2="90" stroke="${c.pri}" stroke-width="0.8" opacity="0.35" stroke-dasharray="2 2"/>
<line x1="28" y1="64" x2="16" y2="73" stroke="${c.pri}" stroke-width="0.8" opacity="0.35" stroke-dasharray="2 2"/>
<line x1="28" y1="36" x2="16" y2="27" stroke="${c.pri}" stroke-width="0.8" opacity="0.35" stroke-dasharray="2 2"/>
</g>`

    case 'ACP03': // Miser Core — efficiency ring
      return `<g>
<circle cx="51" cy="51" r="32" fill="rgba(0,0,0,0.25)"/>
<circle cx="50" cy="50" r="32" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<circle cx="50" cy="50" r="22" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="1"/>
<circle cx="50" cy="50" r="11" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="1.2"/>
<circle cx="48" cy="48" r="3" fill="${c.acc}" opacity="0.15"/>
<g filter="url(#${_gp}w)">
<circle cx="50" cy="50" r="4.5" fill="${c.pri}" opacity="0.5"/>
</g>
<path d="M50 22 L55 30 L45 30Z" fill="${c.acc}" opacity="0.5"/>
<path d="M74 62 L68 54 L76 56Z" fill="${c.acc}" opacity="0.5"/>
<path d="M26 62 L32 54 L24 56Z" fill="${c.acc}" opacity="0.5"/>
<path d="M50 20 A30 30 0 0 1 76 64" fill="none" stroke="${c.acc}" stroke-width="1" opacity="0.4"/>
<path d="M76 64 A30 30 0 0 1 24 64" fill="none" stroke="${c.acc}" stroke-width="1" opacity="0.4"/>
<path d="M24 64 A30 30 0 0 1 50 20" fill="none" stroke="${c.acc}" stroke-width="1" opacity="0.4"/>
</g>`

    case 'ACP04': // HP Module — medical cross
      return `<g>
<rect x="21" y="22" width="60" height="60" rx="7" fill="rgba(0,0,0,0.25)"/>
<rect x="20" y="20" width="60" height="60" rx="7" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="24" y1="21.5" x2="76" y2="21.5" stroke="${c.acc}" stroke-width="1" opacity="0.3"/>
<rect x="26" y="26" width="48" height="48" rx="3" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="0.8"/>
<rect x="43" y="30" width="14" height="40" rx="2.5" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="1"/>
<rect x="30" y="43" width="40" height="14" rx="2.5" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="1"/>
<g filter="url(#${_gp}w)">
<circle cx="50" cy="50" r="5" fill="url(#${_gp}g)"/>
</g>
<circle cx="26" cy="26" r="2" fill="${c.acc}" opacity="0.3"/>
<circle cx="74" cy="26" r="2" fill="${c.acc}" opacity="0.3"/>
<circle cx="26" cy="74" r="2" fill="${c.acc}" opacity="0.3"/>
<circle cx="74" cy="74" r="2" fill="${c.acc}" opacity="0.3"/>
</g>`

    case 'ACP05': // Overdrive — exhaust vents
      return `<g>
<rect x="19" y="20" width="64" height="64" rx="5" fill="rgba(0,0,0,0.25)"/>
<rect x="18" y="18" width="64" height="64" rx="5" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="22" y1="19.5" x2="78" y2="19.5" stroke="${c.acc}" stroke-width="1" opacity="0.3"/>
<rect x="26" y="26" width="48" height="11" rx="2.5" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="1" transform="rotate(-6 50 31)"/>
<rect x="26" y="44" width="48" height="11" rx="2.5" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="1"/>
<rect x="26" y="62" width="48" height="11" rx="2.5" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="1" transform="rotate(6 50 67)"/>
<g filter="url(#${_gp}w)">
<ellipse cx="50" cy="31" rx="20" ry="3.5" fill="url(#${_gp}g)" opacity="0.45"/>
<ellipse cx="50" cy="49" rx="20" ry="3.5" fill="url(#${_gp}g)" opacity="0.55"/>
<ellipse cx="50" cy="67" rx="20" ry="3.5" fill="url(#${_gp}g)" opacity="0.45"/>
</g>
<line x1="16" y1="34" x2="16" y2="66" stroke="${c.acc}" stroke-width="1" opacity="0.4"/>
<line x1="84" y1="34" x2="84" y2="66" stroke="${c.acc}" stroke-width="1" opacity="0.4"/>
</g>`

    case 'ACP06': // Speed Booster — thruster wings
      return `<g>
<rect x="24" y="24" width="52" height="52" rx="6" fill="rgba(0,0,0,0.25)"/>
<rect x="23" y="22" width="52" height="52" rx="6" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.5"/>
<line x1="27" y1="23.5" x2="71" y2="23.5" stroke="${c.acc}" stroke-width="1" opacity="0.3"/>
<polygon points="50,28 72,42 72,58 50,72 28,58 28,42" fill="url(#${_gp}d)" stroke="${c.acc}" stroke-width="1"/>
<polygon points="14,38 24,30 28,50 18,48" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="0.8"/>
<polygon points="86,38 76,30 72,50 82,48" fill="url(#${_gp}a)" stroke="${c.st}" stroke-width="0.8"/>
<g filter="url(#${_gp}w)">
<ellipse cx="14" cy="56" rx="6" ry="10" fill="url(#${_gp}g)" opacity="0.6"/>
<ellipse cx="86" cy="56" rx="6" ry="10" fill="url(#${_gp}g)" opacity="0.6"/>
<circle cx="50" cy="48" r="6" fill="url(#${_gp}c)" stroke="${c.acc}" stroke-width="1"/>
</g>
<circle cx="50" cy="48" r="2.5" fill="${c.pri}" opacity="0.5"/>
</g>`

    case 'ACP07': // Stealth Module — cloaking device
      return `<g>
<circle cx="51" cy="51" r="30" fill="rgba(0,0,0,0.15)"/>
<circle cx="50" cy="50" r="30" fill="url(#${_gp}p)" stroke="${c.st}" stroke-width="1.2" opacity="0.7"/>
<circle cx="50" cy="50" r="20" fill="url(#${_gp}d)" stroke="${c.st}" stroke-width="0.8" stroke-dasharray="4 3" opacity="0.6"/>
<circle cx="50" cy="50" r="10" fill="url(#${_gp}a)" stroke="${c.acc}" stroke-width="1" stroke-dasharray="2 2" opacity="0.8"/>
<g filter="url(#${_gp}w)">
<circle cx="50" cy="50" r="5" fill="${c.pri}" opacity="0.3"/>
</g>
<line x1="50" y1="22" x2="50" y2="32" stroke="${c.acc}" stroke-width="0.6" opacity="0.3" stroke-dasharray="2 2"/>
<line x1="50" y1="68" x2="50" y2="78" stroke="${c.acc}" stroke-width="0.6" opacity="0.3" stroke-dasharray="2 2"/>
<line x1="22" y1="50" x2="32" y2="50" stroke="${c.acc}" stroke-width="0.6" opacity="0.3" stroke-dasharray="2 2"/>
<line x1="68" y1="50" x2="78" y2="50" stroke="${c.acc}" stroke-width="0.6" opacity="0.3" stroke-dasharray="2 2"/>
<path d="M30 30 A28 28 0 0 1 70 30" fill="none" stroke="${c.acc}" stroke-width="0.8" opacity="0.25" stroke-dasharray="3 3"/>
<path d="M70 70 A28 28 0 0 1 30 70" fill="none" stroke="${c.acc}" stroke-width="0.8" opacity="0.25" stroke-dasharray="3 3"/>
</g>`
  }
}

// ─── Part Resolver ──────────────────────────────────────

function svgForPart(slot: PartSlot, partId: PartId, c: MechColors): string {
  switch (slot) {
    case 'legs':
      return svgLegs(partId as LegsId, c)
    case 'body':
      return svgBody(partId as BodyId, c)
    case 'weapon':
      return svgWeapon(partId as WeaponId, c)
    case 'accessory':
      return svgAccessory(partId as AccessoryId, c)
  }
}

// ─── Composition ────────────────────────────────────────

function getMountType(bodyId: BodyId): MountType {
  const body = BODY_PARTS.find(b => b.id === bodyId)
  return body?.mountType ?? 'arm'
}

function weaponTransform(mount: MountType): string {
  switch (mount) {
    case 'arm':
      return 'translate(128,88) scale(0.68)'
    case 'shoulder':
      return 'translate(118,48) scale(0.72)'
    case 'top':
      return 'translate(48,-8) scale(0.62)'
  }
}

export function composeSvgContent(build: Build, c: MechColors, side: 'player' | 'enemy' = 'player'): string {
  const defs = svgDefs(c, side)
  const mount = getMountType(build.bodyId)
  const acc = build.accessoryId
    ? `<g transform="translate(55,5) scale(0.52)">${svgAccessory(build.accessoryId, c)}</g>`
    : ''

  // For top-mounted weapons, move accessory to the side
  const accTransform = mount === 'top'
    ? 'translate(8,8) scale(0.42)'
    : 'translate(55,5) scale(0.52)'
  const accessorySvg = build.accessoryId
    ? `<g transform="${accTransform}">${svgAccessory(build.accessoryId, c)}</g>`
    : acc

  return `
${defs}
${accessorySvg}
<g transform="translate(25,58) scale(1.35)">${svgBody(build.bodyId, c)}</g>
<g transform="${weaponTransform(mount)}">${svgWeapon(build.weaponId, c)}</g>
<g transform="translate(50,195) scale(1)">${svgLegs(build.legsId, c)}</g>`
}

// ─── Public API ─────────────────────────────────────────

/**
 * Returns inline SVG HTML string of a composed robot.
 */
export function renderMechSvg(
  build: Build,
  size: number,
  side: 'player' | 'enemy' = 'player',
): string {
  const c = colors(side)
  const content = composeSvgContent(build, c, side)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" width="${size}" height="${size * 1.5}" style="overflow:visible">${content}</svg>`
}

/**
 * Returns SVG HTML string for a single part (thumbnail).
 */
export function renderPartSvg(
  slot: PartSlot,
  partId: PartId,
  size: number,
  side: 'player' | 'enemy' = 'player',
): string {
  const c = colors(side)
  const defs = svgDefs(c, side)
  const content = svgForPart(slot, partId, c)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" style="overflow:visible">${defs}${content}</svg>`
}

// ─── Canvas Rendering (SVG → Image cache) ───────────────

const imgCache = new Map<string, HTMLImageElement>()

function buildKey(build: Build, side: 'player' | 'enemy'): string {
  return `${build.legsId}.${build.bodyId}.${build.weaponId}.${build.accessoryId ?? 'X'}.${side}`
}

function ensureImage(build: Build, side: 'player' | 'enemy'): HTMLImageElement | null {
  const key = buildKey(build, side)
  const cached = imgCache.get(key)
  if (cached) return cached.complete ? cached : null

  const c = colors(side)
  const content = composeSvgContent(build, c, side)
  const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" width="200" height="300">${content}</svg>`
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.onload = () => URL.revokeObjectURL(url)
  img.onerror = () => URL.revokeObjectURL(url)
  img.src = url
  imgCache.set(key, img)
  return null
}

/**
 * Renders a mech onto a canvas at the given position.
 * Player mechs face right, enemy mechs face left (mirrored).
 */
export function renderMechToCanvas(
  ctx: CanvasRenderingContext2D,
  build: Build,
  x: number,
  y: number,
  size: number,
  side: 'player' | 'enemy',
): void {
  const img = ensureImage(build, side)
  if (!img) return // not loaded yet, will appear next frame

  const h = size * 1.5
  const w = size

  ctx.save()
  if (side === 'enemy') {
    // Mirror horizontally: translate to center, flip, draw offset
    ctx.translate(x, y)
    ctx.scale(-1, 1)
    ctx.drawImage(img, -w / 2, -h / 2, w, h)
  } else {
    ctx.drawImage(img, x - w / 2, y - h / 2, w, h)
  }
  ctx.restore()
}

// ─── Utility: derive Build from BattleUnit traits ───────

export function legsFromMoveType(mt: LegsMoveType): LegsId {
  switch (mt) {
    case 'reverse-joint': return 'MP01'
    case 'humanoid': return 'MP02'
    case 'flying': return 'MP03'
    case 'tank': return 'MP04'
    case 'quadruped': return 'MP05'
    case 'wheeled': return 'MP06'
    case 'hexapod': return 'MP07'
  }
}

export function weaponFromSpecial(ws: WeaponSpecial): WeaponId {
  switch (ws.kind) {
    case 'vulcan-armor-pierce': return 'AP01'
    case 'none': return 'AP02'
    case 'sniper-farthest': return 'AP03'
    case 'missile-splash': return 'AP04'
    case 'hammer-true-damage': return 'AP05'
    case 'laser-pierce': return 'AP06'
    case 'shotgun-close': return 'AP07'
    case 'railgun-charge': return 'AP08'
  }
}

export function bodyFromMount(mt: MountType): BodyId {
  switch (mt) {
    case 'arm': return 'BP02'
    case 'shoulder': return 'BP03'
    case 'top': return 'BP04'
  }
}

/**
 * Derives a visual-approximate Build from BattleUnit properties.
 * Body is approximate (uses mountType heuristic), accessory is omitted.
 */
export function buildFromUnitTraits(
  moveType: LegsMoveType,
  mountType: MountType,
  weaponSpecial: WeaponSpecial,
): Build {
  return {
    legsId: legsFromMoveType(moveType),
    bodyId: bodyFromMount(mountType),
    weaponId: weaponFromSpecial(weaponSpecial),
    accessoryId: null,
  }
}

// ─── Slot helpers for assembly ──────────────────────────

export function slotForPartId(partId: PartId): PartSlot {
  if (partId.startsWith('MP')) return 'legs'
  if (partId.startsWith('BP')) return 'body'
  if (partId.startsWith('AP')) return 'weapon'
  return 'accessory'
}

/**
 * Returns the weapon's mount type from its ID
 */
export function weaponMountType(id: WeaponId): MountType {
  const w = WEAPON_PARTS.find(p => p.id === id)
  return w?.mountType ?? 'arm'
}

/**
 * Returns the legs move type from ID
 */
export function legsMoveType(id: LegsId): LegsMoveType {
  const l = LEGS_PARTS.find(p => p.id === id)
  return l?.moveType ?? 'humanoid'
}
