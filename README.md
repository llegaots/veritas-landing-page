# Horizon Park Apartments - Landing Page

A beautiful, modern landing page for the Horizon Park Apartments investment opportunity, built in Harmozi style. This single-page application showcases the 36-unit apartment complex investment in Edmonds, WA, offered by Veritas Equity Partners.

## Overview

This landing page is designed to convert qualified accredited investors by providing clear information about the investment opportunity, transparent risk/benefit analysis, social proof, and an easy-to-use contact form.

## Features

- **Hero Section**: Eye-catching property introduction with key investment metrics ($50K min, 2.22x equity multiple, 18.1% IRR)
- **Value Proposition**: Clear investment structure and projected returns
- **Problem/Solution**: Harmozi-style investor pain points and Veritas solutions
- **Case Studies**: Social proof with testimonials and team credentials
- **Benefits vs Risks**: Transparent breakdown of investment pros and cons
- **Process Section**: 4-step investment flow explanation
- **Team Section**: Veritas team overview with credentials
- **FAQ Section**: Comprehensive answers to common investor questions
- **Contact Form**: Embedded form for scheduling investor calls

## Tech Stack

- **Framework**: Next.js 16+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Custom components with Radix UI primitives
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
veritas-horizon-park/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Main landing page
│   └── globals.css         # Global styles and theme
├── components/
│   ├── landing/            # Landing page sections
│   │   ├── HeroSection.tsx
│   │   ├── ValuePropositionSection.tsx
│   │   ├── ProblemSection.tsx
│   │   ├── SolutionSection.tsx
│   │   ├── CaseStudiesSection.tsx
│   │   ├── BenefitsRisksSection.tsx
│   │   ├── ProcessSection.tsx
│   │   ├── TeamSection.tsx
│   │   ├── FAQSection.tsx
│   │   └── CTASection.tsx
│   └── ui/                 # Reusable UI components
│       ├── button.tsx
│       └── accordion.tsx
├── lib/
│   └── utils.ts            # Utility functions
└── public/
    └── images/             # Static assets
```

## Key Investment Details

- **Property**: Horizon Park Apartments
- **Location**: Edmonds, Washington
- **Units**: 36-unit workforce housing complex
- **Minimum Investment**: $50,000
- **Equity Multiple**: 2.22x
- **Target Annual IRR**: 18.1%
- **Offering Type**: 506(c) - Accredited investors only

## Design Principles

- **Harmozi Style**: Bold headlines, clear value propositions, transparent risk framing
- **Professional**: Trust-building color scheme (blues, whites)
- **Responsive**: Mobile-first design with generous whitespace
- **Accessible**: Clear typography and semantic HTML
- **Performant**: Optimized animations and static generation

## Contact Information

- **Phone**: 425-231-9008
- **Email**: 
  - alex@veritasequitypartners.com
  - lauren@veritasequitypartners.com
- **Address**: 1018 Market St, Kirkland, WA 98033

## License

Private project for Veritas Equity Partners.
