# Vulnerable MERN Security Benchmark

```bash
npm install
npm start
```

---

## Educational Benchmark Overview
A lightweight, deliberately vulnerable MERN-stack web application designed for benchmarking Dynamic Application Security Testing (DAST) scanners and evaluating automated AI remediation tools (such as SAVE Agentic AI).

### Deliberately Included Vulnerabilities

1. **Missing HTTP Security Directives (Target for SAVE Agentic AI PR Recipes)**
   - Omitted `X-Content-Type-Options` (permits MIME sniffing)
   - Omitted `X-Frame-Options` (allows clickjacking in iframes)
   - Omitted `Referrer-Policy` (leaks referrers across domains)
   - Omitted `Content-Security-Policy` (CSP)
   - Baseline `vercel.json` without security headers ready for automated pull requests.

2. **Cross-Site Scripting (XSS)**
   - **Reflected XSS:** `/api/search?q=...` echoes query into JSON/HTML responses; rendered via `dangerouslySetInnerHTML` in React.
   - **Stored XSS:** `/api/feedback` stores unsanitized guestbook reviews in the database and renders them unescaped in React.

3. **Authentication & Access Control Flaws**
   - **NoSQL Injection:** `/api/login` directly accepts object operators like `{"username": "admin", "password": {"$ne": null}}`.
   - **Insecure Direct Object Reference (IDOR):** `/api/users/:id` leaks complete profile objects without authorization checks.
   - **Insecure Cookies:** Session cookies lack `HttpOnly`, `Secure`, and `SameSite` flags.

4. **Information Disclosure & CORS Misconfiguration**
   - Overly permissive CORS: `Access-Control-Allow-Origin: *` paired with `Access-Control-Allow-Credentials: true`.
   - Debug route: `/api/debug/system-info` exposes `process.env`, system memory, OS platform, and database connection details.

---

### Verification Payloads

- **NoSQL Login Bypass:**
  ```bash
  curl -X POST http://localhost:5000/api/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":{"$ne":null}}'
  ```

- **IDOR Profile Retrieval:**
  ```bash
  curl http://localhost:5000/api/users/1
  ```

- **Reflected XSS:**
  ```bash
  curl "http://localhost:5000/api/search?q=%3Cscript%3Ealert(1)%3C/script%3E"
  ```

- **Debug / Environment Disclosure:**
  ```bash
  curl http://localhost:5000/api/debug/system-info
  ```
