# Mobile QA Checklist - Phase 6

Operational UX moet ook op mobiel goed werken.

## ✅ Touch Targets

**Minimum Requirements:**
- [ ] All buttons minimum 44x44px (iOS HIG)
- [ ] Quick action buttons tappable with thumb
- [ ] No tiny icons without padding
- [ ] Spacing between tap targets ≥8px

**Components to Check:**
- [ ] InsightCard quick actions
- [ ] BulkActionBar buttons
- [ ] Command palette items
- [ ] SlideOver close button
- [ ] Activity feed items

## ✅ Command Palette (Mobile)

**Keyboard:**
- [ ] / opens palette (if physical keyboard)
- [ ] Virtual keyboard doesn't break layout

**Touch:**
- [ ] Input field large enough to tap
- [ ] Search icon tappable (≥44px)
- [ ] Command items tappable
- [ ] Scrolling works smoothly
- [ ] Close button easy to reach

**Layout:**
- [ ] Fullscreen on mobile (not centered dialog)
- [ ] No horizontal scroll
- [ ] Results readable without zoom
- [ ] Bottom commands visible above keyboard

## ✅ SlideOver (Mobile)

**Behavior:**
- [ ] Slides in from right on mobile
- [ ] Full-width on mobile (not partial)
- [ ] Close button in top-left (thumb-friendly)
- [ ] Swipe-to-close works (optional, nice-to-have)

**Content:**
- [ ] No horizontal scroll
- [ ] All content fits in viewport
- [ ] Footer buttons always visible
- [ ] Body scroll locks (no double-scroll)

**Performance:**
- [ ] No jank on open/close
- [ ] Smooth 60fps animation
- [ ] Backdrop doesn't lag

## ✅ BulkActionBar (Mobile)

**Layout:**
- [ ] Fixed to bottom (no float)
- [ ] Full width on mobile
- [ ] Buttons stack or scroll horizontally
- [ ] Cancel button visible
- [ ] Selection count readable

**Actions:**
- [ ] Primary action prominent
- [ ] Max 2-3 actions visible (hide rest)
- [ ] Icons clear without labels
- [ ] Labels show on tap/hold (optional)

**Behavior:**
- [ ] Doesn't hide content (adds padding)
- [ ] Stays above iOS bottom bar
- [ ] Doesn't interfere with scroll

## ✅ Quick Actions (InsightCard)

**Size:**
- [ ] Buttons ≥44px height
- [ ] Icon + label readable
- [ ] Spacing between buttons ≥8px

**Mobile-specific:**
- [ ] Stack vertically if needed
- [ ] Max 2 actions shown (hide overflow)
- [ ] No tiny secondary buttons

## ✅ Activity Feed (Mobile)

**Items:**
- [ ] Rows tappable (full width)
- [ ] Text readable without zoom
- [ ] Icons appropriately sized
- [ ] Timestamps don't wrap awkwardly

**Interactions:**
- [ ] Tap opens detail (not hover)
- [ ] No accidental taps
- [ ] Smooth scroll
- [ ] Filter buttons thumb-friendly

## ✅ Dashboard Metrics (Mobile)

**KPI Cards:**
- [ ] Readable without zoom
- [ ] Grid stacks on mobile (2x2 or 1 column)
- [ ] No horizontal scroll
- [ ] Numbers legible

**Charts:**
- [ ] BusinessMetricsDashboard responsive
- [ ] No tiny text
- [ ] Touch-friendly tooltips (not hover)

## ✅ Keyboard Shortcuts (Mobile)

**Physical Keyboard (iPad, etc.):**
- [ ] / opens command palette
- [ ] CMD+K works (Mac keyboards)
- [ ] g+d, g+a, g+i, g+p work
- [ ] ESC closes modals

**Virtual Keyboard:**
- [ ] Doesn't break layout
- [ ] Input fields scroll into view
- [ ] Autocomplete doesn't interfere
- [ ] Submit on Enter works

## ✅ Performance (Mobile)

**Load Time:**
- [ ] Dashboard loads <3s on 4G
- [ ] No blocking spinners
- [ ] Skeleton loaders show immediately

**Interactions:**
- [ ] Button taps feel instant (<100ms)
- [ ] No lag on scroll
- [ ] No jank on animations
- [ ] Command search <50ms

**Bundle Size:**
- [ ] No unnecessary mobile polyfills
- [ ] Images optimized (if any)
- [ ] Lazy-loaded components work

## ✅ Responsive Breakpoints

**Mobile (< 768px):**
- [ ] Single column layout
- [ ] Full-width cards
- [ ] Stacked buttons
- [ ] Hidden desktop-only elements

**Tablet (768px - 1024px):**
- [ ] 2-column grid for KPIs
- [ ] SlideOver partial width (60-80%)
- [ ] Command palette centered

**Desktop (> 1024px):**
- [ ] Multi-column grid
- [ ] SlideOver side panel (40-50%)
- [ ] All features visible

## ✅ iOS-Specific

**Safari:**
- [ ] No white flash on navigation
- [ ] Safe area insets respected
- [ ] Bottom bar doesn't hide content
- [ ] Scroll bounce disabled on modals

**PWA (if applicable):**
- [ ] Full-screen mode works
- [ ] Status bar styled
- [ ] Splash screen (optional)

## ✅ Android-Specific

**Chrome:**
- [ ] Address bar doesn't break layout
- [ ] Material design touch ripples (optional)
- [ ] Back button closes modals

## ✅ Accessibility (Mobile)

**Touch:**
- [ ] Large enough targets
- [ ] Visible focus states
- [ ] No double-tap zoom needed

**Screen Readers:**
- [ ] VoiceOver works (iOS)
- [ ] TalkBack works (Android)
- [ ] Labels descriptive
- [ ] Navigation logical

## ✅ Edge Cases

**Small Phones (< 375px):**
- [ ] Still usable
- [ ] No horizontal scroll
- [ ] Text doesn't overflow

**Landscape:**
- [ ] Layout adapts
- [ ] Keyboard doesn't hide content
- [ ] Modals still fit

**Slow Networks:**
- [ ] Skeleton loaders show
- [ ] No blank screens
- [ ] Retry options visible

## Testing Checklist

### Manual Testing:
- [ ] Test on iPhone SE (small screen)
- [ ] Test on iPhone 14 Pro (notch)
- [ ] Test on iPad (physical keyboard)
- [ ] Test on Android phone
- [ ] Test on Android tablet

### Browser DevTools:
- [ ] Chrome responsive mode (all breakpoints)
- [ ] Safari responsive mode
- [ ] Touch simulation
- [ ] Network throttling (Slow 4G)

### Real Device Testing:
- [ ] Actual iPhone (latest iOS)
- [ ] Actual Android (latest OS)
- [ ] Physical keyboard on tablet
- [ ] Slow wifi connection

## Acceptance Criteria

**Phase 6 Mobile QA Pass:**
- [ ] All touch targets ≥44px
- [ ] No horizontal scroll on mobile
- [ ] Command palette usable with thumb
- [ ] SlideOver fullscreen on mobile
- [ ] BulkActionBar doesn't hide content
- [ ] Quick actions tappable
- [ ] Keyboard shortcuts work (physical keyboards)
- [ ] Performance feels instant
- [ ] No layout jank or flash

---

**Mobile is a first-class citizen, not an afterthought.**
