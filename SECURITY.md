# Security Policy

## Supported Versions

| Version  | Supported          |
| -------- | ------------------ |
| 0.10.x   | Yes                |
| < 0.10.0 | No                 |

Only the latest minor release receives security updates. Users on older versions should upgrade to the latest supported release.

## Reporting a Vulnerability

If you discover a security vulnerability in Phasegate, please report it responsibly through **GitHub Security Advisories**:

1. Go to [https://github.com/junpei-9898/phasegate/security/advisories/new](https://github.com/junpei-9898/phasegate/security/advisories/new)
2. Provide a clear description of the vulnerability, including steps to reproduce
3. Include the affected version(s) and any relevant configuration details
4. If possible, suggest a fix or mitigation

**Do not** open a public issue for security vulnerabilities.

### Response Timeline

- **Acknowledgment**: Within 48 hours of receipt
- **Initial assessment**: Within 7 days
- **Fix for critical vulnerabilities**: Within 30 days
- **Fix for non-critical vulnerabilities**: Addressed in the next scheduled release

You will be kept informed of progress throughout the process. If accepted, the vulnerability will be disclosed publicly after a fix is available.

## Security Scope

### In Scope

The following areas are considered part of Phasegate's security surface:

- **Dependency vulnerabilities** -- known CVEs in direct or transitive dependencies
- **Configuration injection** -- malicious input via `phasegate.config.json` or other configuration files that could lead to unintended code execution
- **CLI argument injection** -- crafted command-line arguments that could escape intended behavior
- **Path traversal** -- file operations that could read or write outside the expected project directory

### Out of Scope

The following are **not** considered Phasegate security issues:

- Vulnerabilities in the user's own project code being analyzed by Phasegate
- Issues arising from running Phasegate with elevated privileges (root/admin) contrary to best practice
- Social engineering attacks against maintainers or contributors
- Denial of service via extremely large input files (Phasegate is a local CLI tool)

## General Security Practices

Phasegate follows these practices to maintain security:

- Dependencies are monitored via GitHub Dependabot
- The project uses a minimal dependency footprint to reduce attack surface
- Configuration parsing does not evaluate arbitrary code

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
