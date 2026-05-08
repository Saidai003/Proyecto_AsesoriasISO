# Design System Specification: Architectural Authority

## 1. Overview & Creative North Star
**Creative North Star: "The Sovereign Archive"**

In the world of ISO 9001:2015 compliance, the visual language must transcend "generic SaaS." This design system is built on the concept of the **Sovereign Archive**: a digital environment that feels as authoritative as a physical vault but as fluid as a modern editorial. 

We break the "template" look by rejecting the traditional 1px border. Instead, we define space through **Tonal Sculpting**. By using subtle shifts in background values and intentional asymmetry in layout, we create a sense of organized density that doesn't feel cluttered. This is a "High-End Editorial" approach to data: typography is the primary structural element, and white space is used as a functional tool to guide the eye through complex ISO hierarchies.

---

## 2. Color & Surface Philosophy
The palette is rooted in a deep, intellectual blue (`primary: #00236f`), supported by a sophisticated array of neutrals.

### The "No-Line" Rule
**Designers are prohibited from using 1px solid borders for sectioning.** 
Boundaries must be defined through background color shifts. A `surface-container-low` section sitting on a `surface` background is the standard for separation. This creates a "soft-touch" interface that feels premium and custom-built.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use the surface-container tiers to create depth:
- **Base Layer:** `surface` (#f7f9fb) for the main application background.
- **Sectioning:** `surface-container-low` (#f2f4f6) for sidebar or secondary content areas.
- **Content Cards:** `surface-container-lowest` (#ffffff) for the primary data containers to make them "pop" against the background.

### The "Glass & Gradient" Rule
To elevate the experience beyond flat design:
- **Floating Elements:** Use Glassmorphism for overlays and dropdowns. Use `surface` at 80% opacity with a `20px` backdrop-blur.
- **Signature Textures:** Main CTAs and high-level metric summaries should use a subtle linear gradient from `primary` (#00236f) to `primary_container` (#1e3a8a) at a 135-degree angle. This adds "soul" and depth to the corporate blue.

---

## 3. Typography
We utilize **Inter** as our typographic backbone. Its tall x-height ensures readability in data-dense ISO tables.

*   **Display (lg/md/sm):** Used exclusively for high-level dashboard summaries (e.g., % of Compliance). Set with `-0.02em` letter spacing to feel "locked-in" and professional.
*   **Headline & Title:** These are the "Signposts." Use `title-lg` for card headers. Ensure `on_surface` color is used to maintain high contrast.
*   **Body (lg/md/sm):** The workhorse for documentation and audit logs. `body-md` is the default for readability.
*   **Label (md/sm):** Reserved for table headers and micro-data. Use `label-md` with `uppercase` styling and `0.05em` letter spacing to denote "metadata" status.

---

## 4. Elevation & Depth
Hierarchy is achieved through **Tonal Layering** rather than structural lines.

*   **The Layering Principle:** Depth is "stacked." Place a `surface-container-lowest` card (White) on a `surface-container-low` (Light Gray) background. The contrast is the separator.
*   **Ambient Shadows:** Floating modals or active state cards use an extra-diffused shadow: `0 20px 40px rgba(0, 35, 111, 0.06)`. Note the use of a blue-tinted shadow (`primary`) rather than neutral black to mimic natural light hitting a deep-blue environment.
*   **The "Ghost Border" Fallback:** If accessibility requires a border (e.g., in a high-density form), use a "Ghost Border": `outline-variant` at 20% opacity. 
*   **Glassmorphism:** Navigation sidebars should use a subtle blur effect over the `background` to create an integrated, high-end feel.

---

## 5. Components

### Metrics Cards
- **Structure:** No borders. Background: `surface-container-lowest`.
- **Styling:** Use a `display-sm` for the primary metric. Top-right corner features a subtle `tertiary_container` (Orange-tone) chip for "at-risk" items or `primary_fixed` for "compliant" items.
- **Visual Soul:** A 4px vertical accent bar on the left side using the `primary` color to denote importance.

### Data Tables
- **Standard:** Forbid the use of vertical and horizontal divider lines.
- **Separation:** Use alternating row colors (Zebra striping) with `surface` and `surface-container-low`.
- **Typography:** Table headers use `label-md` in `on_secondary_container` color.
- **Interactions:** Hover states should shift the background to `surface-container-high`.

### Navigation Sidebar
- **Style:** Minimalist. Background: `surface-container-low`.
- **Active State:** The active link should not have a box; it should have a `primary` color text and a bold weight, accompanied by a `2px` thick pill-shaped indicator to the far left.

### Buttons
- **Primary:** Gradient-filled (`primary` to `primary_container`), `xl` (0.75rem) roundedness.
- **Secondary:** Transparent with a `Ghost Border` (outline-variant at 20%).
- **Tertiary:** Text-only, using `on_primary_fixed_variant` for a sophisticated, low-priority look.

### Input Fields
- **Design:** Soft-filled. Background: `surface-container-high`. No border in the default state.
- **Active State:** A `2px` bottom-only border in `primary` color appears on focus.

---

## 6. Do's and Don'ts

### Do
- **Do** prioritize vertical white space. Use the spacing scale to let data "breathe."
- **Do** use `tertiary` (#4b1c00) sparingly for alerts. It is an earthy, sophisticated orange-brown that feels professional, not alarming.
- **Do** align text-heavy ISO data to a strict baseline grid to ensure "Editorial" cleanliness.

### Don't
- **Don't** use 100% black text. Always use `on_surface` (#191c1e) to reduce eye strain.
- **Don't** use "Drop Shadows" on standard cards. Use tonal shifts (`surface` tiers) instead.
- **Don't** use standard "Success Green." Use the `primary` blue for all positive actions to maintain brand authority; ISO compliance is a standard, not a celebration. 
- **Don't** use sharp corners. Every component must follow the `roundedness` scale, with `lg` (0.5rem) being the standard for cards to soften the corporate edge.