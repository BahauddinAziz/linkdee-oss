# Contributing to LinkedReach

Thank you for considering contributing! This document outlines the contribution workflow.

## Development Setup

Follow the steps in the [README](./README.md) to get the project running locally.

## Commit Style

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add CSV export for sent leads
fix: prevent worker from double-claiming a lead
docs: update README setup steps
refactor: extract profile enrichment into separate service
```

## Branch Naming

```
feature/<short-description>
fix/<short-description>
docs/<short-description>
```

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include a clear description of what changed and why
- Reference any related issues with `Closes #123`

## Reporting Issues

Use GitHub Issues. Include:
- Node.js and PostgreSQL version
- Steps to reproduce
- Expected vs actual behaviour
- Relevant logs (redact any credentials)
