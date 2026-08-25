# Security Policy

HiStreets handles business accounts, private verification evidence and job-application data. Security reports are taken seriously.

## Reporting a vulnerability

Please **do not open a public GitHub issue** for a suspected security vulnerability.

Email: **ahaque@atomicmail.io**

Include, where possible:

- the affected HiStreets page or component
- clear steps to reproduce the issue
- the security impact you believe it could have
- screenshots or a minimal proof of concept that does not expose another person's private data

Please avoid accessing, changing, downloading or publishing data that does not belong to you. Do not perform destructive testing or traffic flooding against the production service.

## Supported version

Security fixes target the current production release on the `main` branch. Older commits and development branches are not treated as supported production versions.

## Security approach

HiStreets uses Supabase Auth for account authentication and role-aware access, private storage for sensitive CV and business-verification files, database access controls, server-side role/ownership checks, and automated release checks for secrets, dependency risk, TypeScript/build failures and browser regressions.

No software can be guaranteed to be completely secure. If you find a weakness, responsible disclosure helps us investigate and improve the project safely.
