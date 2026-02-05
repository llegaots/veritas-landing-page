# Veritas Landing Page & Sequence Builder

A comprehensive platform for Veritas Equity Partners featuring a landing page for investment opportunities and an admin panel for managing investor sequences, SMS/email automation, and analytics.

## Overview

This application includes:
- **Landing Page**: Beautiful, modern landing page for investment opportunities (Horizon Park Apartments)
- **Admin Panel**: Full-featured admin interface for managing investors, sequences, and analytics
- **Sequence Builder**: Visual workflow builder for creating automated SMS/email sequences
- **Automation**: Automated message sending via Twilio (SMS) and Gmail API/Resend (Email)
- **Analytics**: Visitor tracking, lead management, and sequence performance metrics

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
- **Database**: Supabase (PostgreSQL)
- **SMS**: Twilio
- **Email**: Gmail API (OAuth2) / Resend
- **State Management**: Zustand
- **Graph Visualization**: React Flow, ELK.js
- **AI**: OpenAI (for sequence generation)

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

### Environment Variables

Required environment variables (see `.env.local.example`):
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio phone number
- `GMAIL_REFRESH_TOKEN` - Gmail OAuth refresh token (for email)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `RESEND_API_KEY` - Resend API key (alternative email provider)
- `OPENAI_API_KEY` - OpenAI API key (for AI sequence generation)
- `ADMIN_PASSWORD` - Admin panel password

## Project Structure

```
veritas-landing-page/
├── app/
│   ├── admin/              # Admin panel pages
│   │   ├── investors/      # Investor management
│   │   ├── sequences/      # Sequence builder & management
│   │   └── page.tsx        # Admin dashboard
│   ├── api/                # API routes
│   │   ├── admin/          # Admin API endpoints
│   │   ├── cron/           # Scheduled jobs (message sending)
│   │   ├── events/         # Event webhooks
│   │   └── webhooks/        # External webhooks (Calendly, Twilio, etc.)
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing page
│   └── globals.css         # Global styles
├── components/
│   ├── admin/              # Admin UI components
│   ├── sequences/          # Sequence builder components
│   ├── landing/            # Landing page sections
│   └── ui/                 # Reusable UI components
├── lib/
│   ├── admin/              # Admin utilities (formatting, filters, etc.)
│   ├── agent/              # AI sequence generation
│   ├── email/              # Email provider abstraction
│   ├── sequences/          # Sequence compilation & execution
│   ├── sms/                # SMS provider abstraction
│   └── store/              # Zustand state management
├── scripts/                # Utility scripts
│   ├── test/               # Test & diagnostic scripts
│   ├── check-native-imports.js  # Build-time checks
│   ├── sync-to-airtable.js       # Airtable sync
│   └── import-airtable-to-supabase.js  # Data import
├── sql/                    # Database schema files
└── public/                 # Static assets
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

