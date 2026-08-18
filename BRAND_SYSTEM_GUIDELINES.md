# Curriculum Server & Curriculum Flow: Dual-Brand Design System & Identity Architecture

> **The Core Principle:**
> - **CURRICULUM SERVER** = The infrastructure, SaaS, control-plane, and business platform.
> - **CURRICULUM FLOW** = The school-facing education product and classroom OS.
>
> The branding communicates a clear **parent-child relationship** without making them look like the same product.

---

## Brand Architecture & Hierarchy

```
                       EAST FORTE
                           │
                           │
                   EDUCATION TECHNOLOGY
                           │
                 ┌─────────┴─────────┐
                 │                   │
                 ▼                   ▼
          CURRICULUM SERVER    CURRICULUM FLOW
           SaaS CONTROL          SCHOOL PRODUCT
              PLANE
                 │                   │
           Provisioning         School Users
           Billing              Principals
           Tenants              Teachers
           Domains              Students
           DNS                  Administrators
           Infrastructure       Parents
           APIs
           Monitoring
                 │
                 └──────────────┐
                                ▼
                      MULTIPLE SCHOOL TENANTS
                   (e.g., Greenfield Academy)
```

---

## 1. CURRICULUM SERVER

### Brand Role
CURRICULUM SERVER is the **B2B SaaS / control-plane brand**.

**Primary Target Audiences:**
- Platform Administrators & Proprietors
- Resellers & Regional Education Partners
- School Onboarding & DevOps Teams
- Infrastructure Engineers & Developers
- Billing, Subscription & License Managers
- Domain & DNS Registrar Administrators

Schools may encounter Curriculum Server during tenant provisioning and billing renewals, but it does not dominate their daily academic operations.

### Color Palette (Technology & Infrastructure)
- **Primary Family:** Indigo, Purple, Blue, Cyan
- **HEX Values:**
  - Indigo: `#4F46E5`
  - Purple: `#7C3AED`
  - Blue: `#2563EB`
  - Cyan: `#06B6D4`
- **Atmosphere:** Technology, Infrastructure, Security, High Availability, Cloud Control.

### Visual Assets & Usage Guidelines

#### A. Full Logo + Wordmark
- **Components:** 3D Server Blade Stack with Graduation Cap and Cloud Halo + `CURRICULUM SERVER` Wordmark + Subtitle `SAAS PLATFORM` + Pill `PROVISION • MANAGE • SCALE`.
- **Usage:**
  - Main public website & landing pages (`curriculumserver.com.ng`)
  - SaaS platform top-left administration header
  - Commercial contracts, proposals, quotations, and official B2B invoices
  - Developer documentation, API portals, and technical whitepapers
  - Platform email headers (e.g. Tenant Provisioning Notifications)

#### B. Primary Icon
- **Symbol:** 3D multi-tier server stack with cap & cloud beacon.
- **Usage:**
  - Administrator mobile app & PWA icon
  - Browser favicon (32×32, 16×16)
  - GitHub organization & technical repository branding
  - Cloud infrastructure & Docker/Kubernetes container monitor badges
  - WhatsApp Business & social media profile avatar

#### C. Monochrome & Dark/Light Variants
- **Usage:** Legal filings, black-and-white printouts, official seals, stamped documents, and dark terminal interfaces.

#### D. "Powered by CURRICULUM SERVER" Treatment
- **Format:** `[Server Icon] Powered by CURRICULUM SERVER — The Engine Behind Curriculum Flow`
- **Usage:** Technology marketing, deployment confirmation screens, and infrastructure documentation.

---

## 2. CURRICULUM FLOW

### Brand Role
CURRICULUM FLOW is the **school-facing education product**. It is the consumer brand that school communities know, trust, and interact with every day.

**Primary Target Audiences:**
- School Proprietors & Board of Governors
- Principals & Vice Principals
- Academic Heads & Coordinators
- Classroom Teachers & Subject Masters
- Students & Examination Candidates
- Parents & Legal Guardians

### Color Palette (Education, Growth & Achievement)
- **Primary Family:** Forest Teal, Emerald Green, Royal Blue, Warm Amber
- **HEX Values:**
  - Teal: `#0F766E`
  - Green: `#10B981`
  - Blue: `#3B82F6`
  - Amber: `#F59E0B`
- **Atmosphere:** Learning, Organic Growth, Pedagogy, Achievement, Human Development.

### Visual Assets & Usage Guidelines

#### A. Full Logo + Wordmark
- **Components:** Open Book blooming into vibrant leaf rays with Student Silhouette & Graduation Cap + `CURRICULUM FLOW™` Wordmark + Motto `FROM CURRICULUM TO CLASSROOM TO RESULTS`.
- **Alternative Tagline:** `Your School. Your Curriculum. CURRICULUM FLOW — Learn • Teach • Assess • Achieve`.
- **Usage:**
  - School tenant dashboards and portals
  - Student report cards, broadsheets, and academic transcripts
  - Teacher lesson plan templates and continuous assessment rubrics
  - School parent portal and mobile companion apps

#### B. Primary Icon
- **Symbol:** Vibrant blooming book with student figure and mortarboard.
- **Usage:**
  - Student, Teacher, and Parent PWA & mobile app icons
  - School browser tab favicons
  - Learning OS launcher icon and push notification badge

#### C. School White-Label Identity Integration
- **Hierarchy:** School Identity first, Platform second.
  ```
  ┌──────────────────────────────────────────────────────────┐
  │  🛡️ GREENFIELD ACADEMY                                   │
  │     Excellence • Character • Impact                      │
  │                                                          │
  │     Dashboard    Classes    Students    Results          │
  │                                                          │
  │  ──────────────────────────────────────────────────────  │
  │  Powered by CURRICULUM FLOW                              │
  └──────────────────────────────────────────────────────────┘
  ```

---

## 3. Two Brands Side-by-Side: Contextual Comparison

| Dimension | CURRICULUM SERVER | CURRICULUM FLOW |
| :--- | :--- | :--- |
| **Brand Role** | B2B SaaS & Infrastructure Platform | School-Facing Education Product |
| **Audience** | Platform Admins, Resellers, Developers | Principals, Teachers, Students, Parents |
| **Primary Icon** | 3D Server Blades + Cloud + Cap | Blooming Book + Student + Cap |
| **Color Spectrum** | Indigo (`#4F46E5`), Purple (`#7C3AED`), Cyan (`#06B6D4`) | Teal (`#0F766E`), Green (`#10B981`), Amber (`#F59E0B`) |
| **Tagline / Motto** | *Provision • Manage • Scale* | *From Curriculum to Classroom to Results* |
| **Browser Tab** | `[Server Icon] Curriculum Server` | `[Flow Icon] Greenfield Academy` |
| **Favicon** | Purple/Indigo 3D Server Blade | Emerald/Teal Spreading Leaf Book |
| **Mobile App** | Platform Admin Console | School Campus / Learning OS App |

---

## 4. Production Vector Asset Inventory

### Curriculum Server Production Assets:
1. `curriculum-server-logo.svg` (Full horizontal master logo)
2. `curriculum-server-icon.svg` (High-resolution 512×512 app icon)
3. `curriculum-server-favicon.svg` (Vector favicon)
4. `curriculum-server-favicon-32.png` (32px rasterized preview)
5. `curriculum-server-favicon-16.png` (16px pixel-grid tuned preview)
6. `curriculum-server-monochrome.svg` (Black & White legal version)
7. `curriculum-server-white.svg` (Inverted dark mode version)
8. `powered-by-curriculum-server.svg` (Technology endorsement badge)

### Curriculum Flow Production Assets:
1. `curriculum-flow-logo.svg` (Full horizontal master logo)
2. `curriculum-flow-icon.svg` (High-resolution 512×512 app icon)
3. `curriculum-flow-favicon.svg` (Vector favicon)
4. `curriculum-flow-favicon-32.png` (32px rasterized preview)
5. `curriculum-flow-favicon-16.png` (16px pixel-grid tuned preview)
6. `curriculum-flow-monochrome.svg` (Black & White legal version)
7. `curriculum-flow-white.svg` (Inverted dark mode version)
8. `powered-by-curriculum-flow.svg` (Discreet tenant endorsement pill)
