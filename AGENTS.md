# ClearLedger App Repo Guide

## Purpose

This is the scratch application repository for ClearLedger. The AI-company/team-process repo lives at `/Users/goooogle/workspace/ai-company`.

ClearLedger is an Australian small-business finance and compliance cockpit. The MVP focuses on company setup, income/invoices, expenses/GST validation, Payroll Lite, BAS calculation, dashboard exceptions, and Excel CA Pack export.

## Current State

This repo is intentionally empty until the Technical Lead confirms the initial stack and architecture.

## Product Sources

- Jira project: `KAN` in `https://charchit26.atlassian.net`
- AI-company operating repo: `/Users/goooogle/workspace/ai-company`
- MVP scope doc: `/Users/goooogle/workspace/ai-company/docs/product/mvp-scope.md`

## MVP Boundaries

Included:

- Company/workspace setup
- Income and invoice tracking
- Expense tracking with GST validation
- Payroll Lite
- BAS quarter reporting
- Dashboard and exception workflow
- Excel CA Pack export

Excluded:

- Direct STP lodgement
- Direct super clearing/payment
- Bank feeds
- OCR receipt extraction
- AI categorisation
- Accountant portal

## Engineering Rules

- Do not scaffold production code until the stack decision is recorded.
- Prefer explicit domain logic and tests for financial/compliance calculations.
- Store money as integer cents, not floating point numbers.
- Every BAS/reporting number should trace back to source records.
- Keep the MVP production-capable but simple.

