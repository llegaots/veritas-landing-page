# Event Tracking Setup Guide

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Meta Pixel ID for Facebook Ads tracking
# Get this from your Facebook Business Manager
NEXT_PUBLIC_META_PIXEL_ID=your_pixel_id_here

# Admin dashboard password
# Change this to a secure password
ADMIN_PASSWORD=your_secret_password_here
```

## Accessing the Admin Dashboard

1. Navigate to `/admin` in your browser
2. Enter the password you set in `ADMIN_PASSWORD`
3. Or access directly via: `/admin?key=your_password`

## Tracked Events

The system tracks the following events:

- **page_view** - When a user visits the page
- **cta_click** - When a user clicks "SHOW ME THE DEAL" button
- **scroll_25** - When user scrolls 25% of the page
- **scroll_50** - When user scrolls 50% of the page
- **scroll_75** - When user scrolls 75% of the page
- **time_on_page** - Time spent on page before leaving
- **quick_exit** - User left without meaningful engagement
- **demo_booked** - User completed Calendly booking

## Database

Events are stored in SQLite database at `data/events.db`. This file is automatically created on first use and is excluded from git.

## Meta Pixel Integration

The system automatically sends events to Meta Pixel when configured:
- `cta_click` → `trackCustom("CTA_Click")`
- `scroll_75` → `trackCustom("Scroll_75")`
- `demo_booked` → `track("Lead")`


