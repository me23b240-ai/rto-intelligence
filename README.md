# Meesho Logistics System - Delivery Recovery OS

A prototype suite of three operational decision-support tools built for the Meesho DICE Challenge Season 3, addressing Return-to-Origin (RTO) at different points in the delivery lifecycle:

- **AWB Decision Terminal** - enter a failed-delivery AWB and get one clear operational instruction (reattempt, hold, redirect, or return), with the exact movement, deadline, and reasoning behind it. Covers post-RTO value recovery.

- **Rider Engine** - route-aware parcel-to-rider allocation and payout modeling, backed by 90-day recency-weighted rider performance scoring. Covers RTO prevention through smarter allocation.

- **Business Impact** - the full finance model behind both tools, with RTO prevention and post-RTO value recovery kept as separate, evidence-tagged KPI families, including payback period and scale projections.

All three are built as a transparent, rules-based system (Phase 1 - no ML), with every assumption explicitly tagged by evidence type (case data, calculated, model assumption, hypothesis, or simulated) so a reader can tell what's verified versus illustrative at a glance.

## Team

**Team BusiKrackers** - IIT Madras

Poras Wadhai · Priyanka Dosibhatla · Dheeraj Naidu

## Reference materials

- **Presentation deck:** [View on Canva]([https://canva.link/85jvwxwpkjnf9j1](https://canva.link/85jvwxwpkjnf9j1))

- **Financial model:** [Meesho_RTO_Model_Final — Busikrakers.xlsx]([https://docs.google.com/spreadsheets/d/1ayoy1XpLwyWTCOsZeL_ZnFg9fGMvasAW/edit?usp=sharing&ouid=108369363448375493202&rtpof=true&sd=true](https://docs.google.com/spreadsheets/d/1ayoy1XpLwyWTCOsZeL_ZnFg9fGMvasAW/edit?usp=sharing&ouid=108369363448375493202&rtpof=true&sd=true))

- **Primary research — Customers:** [Order cancelled at door? Tell us why 🤫 (Responses)]([https://docs.google.com/spreadsheets/d/1dWnHw5E2chgKHu-kyQt6HNumiuq4WG7jbnt68GZdLX8/edit?resourcekey=&gid=519030697#gid=519030697](https://docs.google.com/spreadsheets/d/1dWnHw5E2chgKHu-kyQt6HNumiuq4WG7jbnt68GZdLX8/edit?resourcekey=&gid=519030697#gid=519030697))

- **Primary research — Sellers:** [E-commerce Seller Delivery & RTO Survey (Responses)]([https://docs.google.com/spreadsheets/d/1ky3t1b2y2m9xEnByvckpDZjmbWnqm5xe4nqhYRYy-0g/edit?usp=sharing](https://docs.google.com/spreadsheets/d/1ky3t1b2y2m9xEnByvckpDZjmbWnqm5xe4nqhYRYy-0g/edit?usp=sharing))

- **Primary research — Riders:** [Delivery Rider Experience — Failed Deliveries & RTO Survey (Responses)]([https://docs.google.com/spreadsheets/d/1dH89IqB067JKC0Uf47DEjv4mp3ksZXiqoNaOvv9Jy84/edit?usp=sharing](https://docs.google.com/spreadsheets/d/1dH89IqB067JKC0Uf47DEjv4mp3ksZXiqoNaOvv9Jy84/edit?usp=sharing))

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS · Recharts · deployed on Vercel