---
name: anti-slop-ui
description: UI art direction and frontend design quality skill for creating distinctive, intentional, production-quality interfaces. Use when designing, building, styling, reviewing, or editing websites, web apps, dashboards, SaaS products, AI applications, developer tools, landing pages, portfolios, and responsive interfaces.
---

# Anti-Slop UI v2

> A UI art-direction and quality system for preventing generic AI-generated interfaces and producing distinctive, purposeful, human-quality design.

---

# 0. Core Objective

The goal is NOT simply to make interfaces "pretty".

The goal is to create interfaces that are:

- visually distinctive
- appropriate for the product
- easy to understand
- useful
- coherent
- memorable
- accessible
- responsive
- technically maintainable
- intentionally designed

The interface should feel like a designer and product engineer made deliberate decisions rather than an LLM selecting the statistical average of modern web interfaces.

---

# 1. THE GOLDEN RULE

Before introducing a visual pattern, component, decoration, animation, color, or layout:

Ask:

> "What specific product, UX, communication, or brand purpose does this serve?"

If the only answer is:

- "It looks modern."
- "It looks clean."
- "It's popular."
- "It's what SaaS websites use."
- "AI websites usually do this."
- "It makes the page feel premium."

Then reconsider it.

Every visual decision should have a reason.

---

# 2. ANTI-SLOP IS A FILTER, NOT AN AESTHETIC

Do NOT replace generic AI design with one rigid "anti-slop" aesthetic.

Anti-slop does NOT mean:

- everything brutalist
- everything minimalist
- everything monochrome
- everything editorial
- everything dark
- everything asymmetrical
- removing all cards
- removing all gradients
- removing all shadows
- removing all animation

These are tools, not rules.

A gradient can be excellent.
A card can be excellent.
A dark interface can be excellent.
A bento layout can be excellent.

The problem is using them automatically without purpose.

Choose the visual language based on the product.

---

# 3. DESIGN BEFORE CODE

For non-trivial UI work, do not immediately start generating components.

First establish:

1. Product purpose
2. Primary user
3. Primary user task
4. Information hierarchy
5. Visual personality
6. Typography direction
7. Color direction
8. Layout/composition
9. Component language
10. Interaction and motion strategy

For substantial pages or applications, create a short design specification before implementation.

Recommended structure:

```text
Product
Audience
Primary task
Visual personality
Design direction
Typography
Color system
Layout system
Component language
Motion strategy
Responsive strategy
Anti-patterns to avoid
```

---

# 4. UNDERSTAND THE PRODUCT FIRST

Before designing, determine:

### What is this product?

Examples:

- developer tool
- finance application
- productivity tool
- creative application
- education product
- healthcare interface
- e-commerce product
- media application
- analytics dashboard
- AI tool
- internal business application
- portfolio
- marketing website

### Who uses it?

Determine whether the audience is:

- technical
- non-technical
- professional
- consumer
- enterprise
- creative
- beginner
- expert

### What is the primary action?

Identify the ONE most important thing the user should be able to accomplish.

Design the interface around that action.

Do not allow secondary features to visually compete with the primary workflow.

---

# 5. VISUAL DIRECTION

Choose a visual direction deliberately.

Possible directions include:

- **Minimal**: restrained palette, strong whitespace, precise typography, subtle surfaces, very little decoration
- **Editorial**: expressive typography, asymmetric compositions, strong visual hierarchy, unconventional grids, content-driven layouts
- **Technical**: structured information, dense but readable layouts, technical typography where appropriate, data visualization, precise spacing, strong functional hierarchy
- **Brutalist**: strong contrast, hard edges, unusual typography, raw structural composition, deliberately unconventional hierarchy
- **Luxury**: restrained colors, sophisticated typography, generous spacing, subtle interaction, carefully controlled visual details
- **Playful**: expressive typography, characterful shapes, unexpected interactions, controlled color, personality
- **Organic**: natural shapes, softer composition, warm or natural palette, human visual language
- **Futuristic**: experimental composition, controlled lighting, unusual surfaces, strong technology-oriented identity
- **Corporate / Professional**: clarity, information density, trust, predictable navigation, restrained visual language

These are examples, not mandatory templates.

Select or combine directions according to the actual product.

---

# 6. DESIGN DIALS

Establish three design dials when appropriate.

### ENERGY
- **Level 1 — Restrained**: minimal, quiet, highly functional, subtle accents
- **Level 2 — Balanced**: noticeable personality, selective contrast, controlled visual interest
- **Level 3 — Expressive**: strong personality, bold typography, dramatic composition, high visual energy

### RHYTHM
- **Level 1**: Consistent grid and predictable flow.
- **Level 2**: Variation in section composition and hierarchy.
- **Level 3**: Asymmetry, dramatic scale changes, unexpected composition.

### MOTION
- **Level 1**: Functional transitions only.
- **Level 2**: Micro-interactions and subtle entrance transitions.
- **Level 3**: Choreographed transitions and expressive interaction.

Do not automatically choose Level 3.

---

# 7. TYPOGRAPHY

Typography is part of the product identity.

Do not automatically use:

- Inter
- Geist
- Roboto
- Arial

unless they genuinely fit the product.

Consider:

- personality
- readability
- hierarchy
- character
- language support
- density
- screen size

Establish a deliberate hierarchy:

- Display
- H1
- H2
- H3
- Body
- Secondary
- Caption
- Labels
- Technical / code

Avoid excessive uppercase micro-labels and artificial letter spacing.

Use monospace primarily for:

- code
- commands
- hashes
- technical identifiers
- timestamps
- numerical data where appropriate

Do not use monospace everywhere merely to make a product look technical.

---

# 8. COLOR SYSTEM

Build a deliberate color system.

Start with:

- background
- surface
- primary text
- secondary text
- border
- primary action
- semantic states

Then add an accent only when useful.

Prefer restrained palettes.

Do not spray colors across:

- icons
- cards
- badges
- buttons
- borders
- headings

Color should communicate hierarchy and meaning.

---

# 9. AI-SLOP COLOR PATTERNS

Avoid defaulting to:

- blue → purple gradients
- violet → cyan gradients
- rainbow neon gradients
- glowing purple borders
- gradient text everywhere
- dark slate + neon purple for every AI application

These are not forbidden.

They simply require a specific product reason.

---

# 10. SURFACES

Do not put every piece of content inside a card.

Use cards when they communicate:

- grouping
- containment
- hierarchy
- interaction
- elevation
- independent content

Otherwise prefer:

- whitespace
- dividers
- typography
- alignment
- sections
- grids
- direct composition

A page made entirely of cards usually looks like a generated dashboard.

---

# 11. BORDER RADIUS

Do not use the same radius everywhere.

Establish a radius language.

For example:

- Structural surfaces → smaller radius
- Interactive controls → moderate radius
- Tags / compact states → pill when appropriate
- Avatars → circular

Avoid:

- Everything → rounded-2xl
- Everything → rounded-full

Radius should contribute to the product's visual personality.

---

# 12. SHADOWS

Use shadows to communicate elevation.

Good uses:

- modal
- dropdown
- popover
- draggable object
- floating control

Do not give every card:

- shadow-xl
- shadow-2xl

Ground primary surfaces with:

- contrast
- borders
- spacing
- tonal differences

rather than making everything float.

---

# 13. GLASSMORPHISM

Glass can be used.

Do not use glass everywhere.

Avoid:

- glass navbar + glass sidebar + glass cards + glass modal + glass buttons

If glass is used, it should be a deliberate focal treatment.

---

# 14. GLOW

Glow is an attention amplifier.

Therefore:

If everything glows, nothing is important.

Reserve glow for:

- critical focal elements
- active states
- system indicators
- intentional brand moments

Prefer matte surfaces for the majority of the interface.

---

# 15. LAYOUT

Do not automatically use:

Hero ↓ Subtitle ↓ Two buttons ↓ Screenshot ↓ Three cards ↓ Bento ↓ Testimonials ↓ Pricing ↓ FAQ ↓ Footer

Instead ask:

> "What is the actual story this product needs to tell?"

Possible alternatives:

- interactive product demo first
- task-oriented interface
- editorial narrative
- large product visualization
- documentation-first layout
- data-first layout
- workflow visualization
- split-screen composition
- immersive single-purpose screen

The layout should emerge from the content.

---

# 16. ASYMMETRY

Asymmetry can create personality.

Use it when it improves:

- hierarchy
- visual interest
- storytelling
- content emphasis

Do not introduce asymmetry randomly.

---

# 17. BENTO GRIDS

Bento layouts are allowed.

Do not use them simply because they are trendy.

Use bento-like composition when content genuinely has different visual weights.

If six unrelated features are forced into six decorative rectangles, redesign the section.

---

# 18. FEATURE PRESENTATION

Do not create:

> Feature → Icon → Heading → Two sentences
> Feature → Icon → Heading → Two sentences
> Feature → Icon → Heading → Two sentences

for every product.

Instead establish hierarchy.

The most important feature might deserve:

- large visual area
- interactive demonstration
- real screenshot
- animation
- detailed explanation

Secondary features can be:

- compact lists
- inline controls
- smaller sections
- grouped capabilities

---

# 19. DASHBOARDS

Never begin with:

Sidebar + Top search + 4 stat cards + Chart + Table

First identify:

**What is the user's primary job on this screen?**

Then allocate most of the visual space to that job.

For example:

If the primary task is reviewing logs:

- Logs = dominant
- Filters = secondary
- Statistics = supporting

Not:

- Statistics = dominant
- Logs = tiny table

---

# 20. DATA VISUALIZATION

Every chart should answer a question.

- **Bad:** "Revenue" with a decorative chart.
- **Better:** "Revenue by month" or "Which channels generated the most revenue this quarter?"

Charts should have meaningful:

- titles
- axes where appropriate
- legends where necessary
- units
- states
- empty states

Never invent impressive-looking business metrics unless the data is explicitly mock data.

---

# 21. EMPTY STATES

Empty states should help users move forward.

- **Bad:** "Nothing here."
- **Better:** "No projects yet. Create your first project to start organizing your work. [Create project]"

Empty states should explain:

- what is missing
- why it matters
- what the user can do next

---

# 22. INTERACTION DESIGN

Every interactive element should have a reason.

- **Buttons** should clearly communicate: action, importance, current state.
- **Inputs** should communicate: expected format, validation, errors, success.
- **Navigation** should communicate: current location, available destinations, hierarchy.

Avoid adding interactions merely because they look impressive.

---

# 23. MOTION

Motion should communicate something.

Good motion:

- hover feedback
- focus feedback
- state transition
- navigation transition
- modal entrance
- loading state
- drag feedback
- progressive disclosure

Avoid:

- perpetual floating
- endless bouncing
- continuously rotating borders
- pulsing CTAs
- random parallax
- decorative infinite animations

Prefer short, controlled transitions. Typical micro-interaction duration: **150ms – 300ms**. Longer animation should have a specific reason.

---

# 24. RESPONSIVE DESIGN

Do not design desktop first and simply shrink it.

Determine how hierarchy changes across:

- desktop
- tablet
- mobile

Consider:

- navigation collapse
- content priority
- typography scaling
- interaction target size
- grid changes
- image cropping
- horizontal scrolling where appropriate

Mobile should remain intentionally designed.

---

# 25. ACCESSIBILITY

Accessibility is part of design quality.

Ensure:

- sufficient text contrast
- visible focus states
- keyboard navigation
- semantic HTML
- accessible labels
- sensible heading hierarchy
- usable touch targets
- reduced-motion support where appropriate

Do not sacrifice usability for aesthetics.

---

# 26. ICONS

Icons should communicate meaning.

Use icons for:

- navigation
- actions
- status
- tools
- recognizable concepts

Do not place an icon beside every heading simply to make a section look designed.

Avoid:

- ✨ AI Feature
- 🚀 Fast
- 🔥 Powerful
- 💡 Smart

as decorative UI. Avoid "icon soup".

---

# 27. EMOJI

Do not use decorative emoji in production interfaces.

Avoid:

`🚀` `✨` `🔥` `💡` `🤖` `⚡`

unless the product specifically treats emoji as part of its actual content or user-generated experience.

---

# 28. AI-SPECIFIC UI

AI products need not all look the same.

Do not automatically create:

Dark background + purple glow + chat bubble + sparkles + "AI-powered" + gradient button

For AI applications, determine what the actual interaction model is. Possibilities include:

- command interface
- workflow builder
- document workspace
- conversational interface
- generation studio
- agent control center
- analysis workspace
- automation builder
- integrated assistant

Design around the actual AI workflow.

---

# 29. REAL PRODUCT OVER DECORATION

Whenever possible, show the actual product.

Prefer:

- real interface previews
- real workflows
- real data structures
- meaningful examples
- interactive prototypes
- actual screenshots

over fake decoration.

Do not manufacture:

- fake customer logos
- fake testimonials
- fake statistics
- fake activity feeds
- fake awards
- fake trust badges

If sample data is required for a prototype, clearly treat it as sample data.

---

# 30. VISUAL HIERARCHY

Every screen should have an obvious hierarchy.

Ask:

- What should I notice first?
- What should I understand second?
- What should I interact with?
- What information can remain quiet?

Use:

- scale
- position
- contrast
- whitespace
- typography
- density

to establish hierarchy. Do not make everything equally prominent.

---

# 31. DESIGN VARIATION

When multiple pages exist, do not blindly reuse one layout.

Maintain a consistent design system while allowing page composition to change according to content.

Consistency means:

- typography system
- spacing system
- colors
- components
- interaction patterns

It does NOT mean every page uses the exact same composition.

---

# 32. EXISTING DESIGN SYSTEMS

If the project already contains:

- design tokens
- CSS variables
- component libraries
- brand guidelines
- typography
- color system
- existing UI patterns

respect them.

Do not replace an existing coherent design system merely to make the page "more creative."

Improve it only when the user asks or when the existing system is clearly incomplete.

---

# 33. COMPONENT REUSE

Reuse components where it improves consistency.

Do not abstract everything prematurely.

Avoid creating:

`UniversalCard`, `SuperCard`, `PremiumCard`, `GlassCard`, `FeatureCard`, `SpecialCard`

when one well-designed component would be sufficient.

Component architecture should support the design, not dictate it.

---

# 34. VISUAL REFERENCE

When the user provides reference websites, screenshots, images, or design examples:

Study:

- composition
- typography
- spacing
- visual hierarchy
- interaction
- density
- color relationships
- motion

Do not blindly copy the reference.

Extract the underlying design principles and create an original implementation appropriate to the user's product.

---

# 35. BROWSER-BASED VISUAL REVIEW

For meaningful UI work, do not consider implementation complete merely because:

- the code compiles
- TypeScript passes
- components render
- there are no console errors

Visually inspect the result.

Review:

- desktop
- mobile
- spacing
- typography
- hierarchy
- alignment
- overflow
- interaction
- empty states
- loading states
- error states

If browser inspection or screenshots are available, use them.

---

# 36. THE "AI SLOP TEST"

After implementation, ask:

- **Identity**: Does this interface have a recognizable visual identity?
- **Composition**: Would this layout still make sense if all cards were removed?
- **Typography**: Does typography contribute personality and hierarchy?
- **Color**: Are colors intentional rather than default?
- **Components**: Are components used because they are useful rather than because they are easy to generate?
- **Decoration**: Would removing the decorative elements make the interface worse? If not, remove them.
- **Originality**: Could this screenshot be mistaken for hundreds of other AI-generated websites? If yes, redesign the strongest generic areas.

---

# 37. THE 10-SECOND TEST

Look at the interface for approximately 10 seconds.

Determine:

- What is this product?
- Who is it for?
- What is the primary action?
- What is visually important?
- Does it have a distinctive personality?

If these answers are unclear, improve hierarchy and composition.

---

# 38. THE PURPOSE TEST

For every major visual decision:

```text
Decision → Purpose → User benefit → Visual consequence
```

If there is no clear purpose: **REMOVE** or **REWORK**.

---

# 39. PRE-FLIGHT QUALITY GATE

Before completing UI work, verify:

- [ ] Product purpose is reflected in the design.
- [ ] Primary user task is visually dominant.
- [ ] Visual direction is intentional.
- [ ] Typography was chosen deliberately.
- [ ] Color system is deliberate.
- [ ] No unnecessary blue/purple AI gradient.
- [ ] No excessive glassmorphism.
- [ ] No excessive rounded cards.
- [ ] No excessive shadows.
- [ ] No excessive glow.
- [ ] No decorative emoji.
- [ ] No icon spam.
- [ ] No unnecessary monospace.
- [ ] No fake terminal UI.
- [ ] No forced bento grid.
- [ ] No boilerplate 3-step section.
- [ ] No fabricated testimonials or trust signals.
- [ ] No fabricated metrics presented as real.
- [ ] No generic dashboard shell unless appropriate.
- [ ] Empty states are useful.
- [ ] Loading states are considered.
- [ ] Error states are considered.
- [ ] Buttons and interactions actually work.
- [ ] Responsive behavior is intentional.
- [ ] Accessibility has been considered.
- [ ] Motion is purposeful.
- [ ] Visual hierarchy is obvious.
- [ ] The interface has personality.
- [ ] The result does not look like an untouched AI-generated template.

---

# 40. FINAL PRINCIPLE

Do not ask:

> "What is the most modern UI I can generate?"

Ask:

> "What is the most appropriate interface I can design for this product?"

Do not optimize for trends.

Optimize for:

**clarity + usefulness + personality + hierarchy + intentionality.**

The best UI is not the one containing the most visual effects.

It is the one where every important visual decision feels deliberate.
