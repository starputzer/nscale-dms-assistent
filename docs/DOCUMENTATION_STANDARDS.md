# Documentation Standards for nScale Assist

## Overview
This document establishes the documentation standards for the nScale Assist project. All documentation must follow these guidelines to ensure consistency, clarity, and maintainability.

## Writing Guidelines

### 1. Language and Tone
- Use clear, concise, and professional language
- Write in active voice whenever possible
- Avoid jargon unless necessary (define technical terms on first use)
- Use present tense for current functionality
- Be objective and factual

### 2. Structure and Formatting
- Use proper Markdown syntax
- Limit line length to 120 characters for better readability
- Use consistent heading hierarchy (# > ## > ### > ####)
- Include a table of contents for documents longer than 3 sections
- Use code blocks with appropriate language identifiers
- Prefer numbered lists for sequential steps, bullet points for non-sequential items

### 3. Code Examples
- All code examples must be tested and functional
- Include necessary imports and context
- Add comments explaining complex logic
- Show both correct usage and common pitfalls when relevant

## Metadata Requirements

Every documentation file MUST include a metadata header:

```markdown
---
title: [Document Title]
category: [component|architecture|bugfix|feature|guide|api]
version: [Document version, e.g., 1.0.0]
date: [YYYY-MM-DD]
author: [Author name or team]
status: [draft|review|approved|deprecated]
tags: [comma, separated, tags]
---
```

## Naming Conventions

### File Names
- Use UPPERCASE for top-level documentation (e.g., README.md, CONTRIBUTING.md)
- Use kebab-case for regular documentation files (e.g., api-authentication.md)
- Use descriptive names that clearly indicate content
- Include version numbers in filenames only for versioned documentation

### Directory Names
- Use lowercase with hyphens for multi-word directories
- Group related documentation in subdirectories
- Common directory names:
  - `guides/` - How-to guides and tutorials
  - `api/` - API documentation
  - `architecture/` - System design and architecture docs
  - `components/` - Component-specific documentation
  - `templates/` - Documentation templates

## Directory Structure Rules

```
docs/
├── README.md                    # Documentation index
├── DOCUMENTATION_STANDARDS.md   # This file
├── templates/                   # Documentation templates
│   ├── COMPONENT_TEMPLATE.md
│   ├── ARCHITECTURE_TEMPLATE.md
│   ├── BUGFIX_TEMPLATE.md
│   └── FEATURE_TEMPLATE.md
├── guides/                      # User and developer guides
│   ├── getting-started.md
│   └── deployment-guide.md
├── api/                         # API documentation
│   ├── rest-api.md
│   └── websocket-api.md
├── architecture/                # System architecture docs
│   ├── system-overview.md
│   └── data-flow.md
└── components/                  # Component documentation
    ├── chat-interface.md
    └── admin-panel.md
```

## Review Process

### 1. Documentation Lifecycle
1. **Draft**: Initial documentation creation
2. **Review**: Peer review by at least one team member
3. **Approved**: Documentation meets all standards and is accurate
4. **Deprecated**: Documentation is outdated but kept for reference

### 2. Review Criteria
- Technical accuracy
- Completeness
- Adherence to standards
- Grammar and spelling
- Code example functionality
- Proper metadata

### 3. Review Checklist
Before submitting documentation for review, ensure:
- [ ] Metadata header is complete and accurate
- [ ] All links are valid and point to correct resources
- [ ] Code examples are tested and working
- [ ] Spelling and grammar are checked
- [ ] Formatting follows standards
- [ ] File naming convention is followed
- [ ] Placed in correct directory

## Quality Checklist

### Content Quality
- [ ] Purpose is clearly stated in the introduction
- [ ] Target audience is identified
- [ ] Prerequisites are listed when applicable
- [ ] Step-by-step instructions are clear and complete
- [ ] Expected outcomes are described
- [ ] Troubleshooting section included for guides

### Technical Quality
- [ ] All code examples compile/run without errors
- [ ] API endpoints include request/response examples
- [ ] Error handling is documented
- [ ] Performance considerations noted when relevant
- [ ] Security implications addressed

### Maintenance
- [ ] Document includes update history
- [ ] Related documents are cross-referenced
- [ ] Deprecated features are clearly marked
- [ ] Future improvements section when applicable

## Version Control

### Commit Messages for Documentation
- Use prefix `docs:` for documentation-only commits
- Be specific about what was changed
- Example: `docs: update API authentication guide with JWT examples`

### Documentation Versioning
- Update version in metadata for significant changes
- Use semantic versioning (MAJOR.MINOR.PATCH)
- MAJOR: Complete rewrite or significant structural changes
- MINOR: New sections or substantial content additions
- PATCH: Minor corrections, typo fixes, clarifications

## Special Documentation Types

### API Documentation
- Include endpoint URL, method, and description
- Document all parameters with types and constraints
- Provide request/response examples
- List possible error codes and meanings

### Architecture Documentation
- Include diagrams using Mermaid or similar tools
- Explain design decisions and trade-offs
- Document external dependencies
- Describe data flow and system boundaries

### Component Documentation
- Describe component purpose and responsibilities
- List props/inputs with types and defaults
- Document events/outputs
- Include usage examples
- Note browser/environment compatibility

## Tools and Resources

### Recommended Tools
- **Markdown Preview**: VS Code Markdown Preview Enhanced
- **Spell Checker**: CSpell or similar
- **Link Checker**: markdown-link-check
- **Diagram Tool**: Mermaid, draw.io, or PlantUML

### Style References
- [Google Developer Documentation Style Guide](https://developers.google.com/style)
- [Microsoft Writing Style Guide](https://docs.microsoft.com/en-us/style-guide/welcome/)

## Enforcement

- Documentation standards are enforced through code review
- Non-compliant documentation will be rejected in PR reviews
- Regular documentation audits will ensure ongoing compliance
- Team members are responsible for keeping their documentation updated

---
Last Updated: 2025-05-29
Version: 1.0.0