# EVENTUALLY.VET — Privacy Policy

**Last Updated: August 21, 2026**

EVENTUALLY.VET ("the App," "we," "our") is a personal health record-keeping application designed for active duty military members and veterans to document medical appointments, deployments, duty stations, and service conditions for the purpose of filing VA disability claims.

This Privacy Policy explains what data we collect, how it is stored and protected, and your rights regarding your personal information.

---

## 1. Information We Collect

### 1.1 Information You Provide

When you use EVENTUALLY.VET, you may voluntarily enter the following types of information:

- **Profile Information**: Name, rank, branch of service, service dates, Military Occupational Specialty (MOS/AFSC/Rating)
- **Medical Records**: Appointment dates, providers, facilities, diagnoses, treatment plans, medications, chief complaints
- **Service Records**: Deployment locations, dates, hazard exposures, duty stations, units, PCS history
- **Service Conditions**: Condition names, descriptions, onset dates, VA claim status, disability ratings
- **Notes and Attachments**: Text notes, photographs, documents (medical records, DD-214, buddy statements)
- **Buddy Letter Data**: Names and email addresses of individuals you request statements from
- **Cloud Account**: Email address and password (if you opt into cloud backup)

### 1.2 Information Collected Automatically

- **Device Information**: Device model and operating system version (for compatibility and debugging only)
- **App Usage**: Feature usage patterns stored locally for improving the experience (never transmitted externally)
- **Audit Log**: All data access, modifications, exports, and authentication events are logged locally for your security review

### 1.3 Information We Do NOT Collect

- We do **not** collect your Social Security Number or full DoD ID
- We do **not** collect GPS location data
- We do **not** use advertising trackers, analytics SDKs, or third-party data brokers
- We do **not** sell, share, or monetize your data in any way
- We do **not** collect data from other apps on your device
- We do **not** access your calendar without explicit permission and user-initiated action

---

## 2. How Your Data Is Stored

### 2.1 Local Storage (Default)

By default, all data is stored exclusively on your device using an encrypted SQLite database. The data never leaves your device unless you explicitly choose to enable cloud backup or share/export data.

- Data is protected by your device's built-in encryption (iOS Data Protection / Android Full-Disk Encryption)
- Optional biometric lock (Face ID / Touch ID / Fingerprint) adds an additional authentication layer
- Optional PIN provides a fallback access method

### 2.2 Cloud Backup (Optional — Opt-In Only)

If you choose to enable cloud backup:

- All data is **end-to-end encrypted on your device** before transmission
- Your password serves as the encryption key — we cannot decrypt your data
- Encrypted data is stored on Supabase infrastructure (SOC 2 Type II compliant)
- Attachment files are individually encrypted before upload
- **Zero-knowledge architecture**: Even with full server access, your records cannot be read

### 2.3 Encryption Details

| Layer | Method |
|-------|--------|
| Local database | Device OS encryption (AES-256) |
| Cloud transit | TLS 1.3 (HTTPS) |
| Cloud at rest | AES-256 via password-derived key |
| Password storage | SHA-256 hash (password never stored plaintext) |
| PIN storage | SHA-256 hash (PIN never stored plaintext) |

---

## 3. How Your Data Is Used

Your data is used solely to provide the functionality of the App:

- Storing and displaying your medical appointments, deployments, and service records
- Generating VA claim summaries and buddy letter templates
- Matching your logged exposures against VA presumptive condition databases
- Displaying VA claim readiness scores
- Synchronizing data between your devices (if cloud backup enabled)
- Sending buddy letter requests via email (only when you explicitly initiate)

We do **not** use your data for:
- Advertising or marketing
- Profiling or behavioral analysis
- Sharing with government agencies (VA, DoD, or otherwise)
- Sale to third parties
- Training AI/ML models
- Any purpose other than what you explicitly initiate

---

## 4. Data Sharing

### 4.1 We Never Share Your Data Without Your Action

Your data is only shared when **you** explicitly initiate it:

- **Export**: When you export a claim summary or audit log
- **Email**: When you send a buddy letter request
- **Share**: When you use the system share sheet
- **Cloud Backup**: When you opt in to encrypted cloud storage

### 4.2 Third-Party Services

| Service | Purpose | Data Shared | Privacy |
|---------|---------|-------------|---------|
| Supabase | Cloud backup (optional) | Encrypted data blob (unreadable) | SOC 2 Type II, GDPR compliant |
| Device Email Client | Buddy letter sending (user-initiated) | Recipient email + PDF attachment | Handled by your email provider |
| Device Calendar | Import appointments (user-initiated) | Read-only access, data stays on device | Never transmitted |

### 4.3 Legal Disclosure

We may disclose information if required by law, but because your cloud data is end-to-end encrypted, we can only provide encrypted blobs that we cannot decrypt. We will notify you of any legal request to the extent permitted by law.

---

## 5. Your Rights

### 5.1 Access

You have full access to all your data at all times through the App. You can export a complete copy of your data from Settings > Data Management > Export.

### 5.2 Correction

You can edit or update any record in the App at any time.

### 5.3 Deletion

You can delete your data at multiple levels:
- **Individual records**: Delete any appointment, deployment, condition, or note
- **Local data**: Erase all data from your device (Settings > Data Management > Delete All Data)
- **Cloud data**: Remove your encrypted backup (Settings > Data Management > Delete Cloud Backup)
- **Account**: Permanently delete your cloud account and all associated data

Cloud data deletion requests are processed within 30 days.

### 5.4 Portability

You can export all your data in a structured format at any time. The export includes all records, notes, and metadata in a format you can retain independently.

### 5.5 Withdrawal of Consent

You can disable cloud backup at any time, revoke calendar access in device settings, or delete the App entirely. No data is retained on our servers after account deletion is processed.

---

## 6. Security Measures

We implement security controls aligned with HIPAA (Health Insurance Portability and Accountability Act) requirements, including:

| Control | Implementation |
|---------|---------------|
| Encryption at rest | Device encryption + AES-256 cloud encryption |
| Encryption in transit | TLS 1.3 for all network communications |
| Access controls | Biometric + PIN authentication |
| Audit logging | All PHI access, exports, and changes logged |
| Auto-lock | Configurable inactivity timeout |
| Minimum necessary | Only data you enter is stored; no extraneous collection |
| Integrity controls | Hash verification for backup integrity |
| Session management | Automatic session expiration |

### 6.1 Breach Notification

In the unlikely event of a security breach affecting your data, we will:
- Notify affected users within 72 hours of discovery
- Provide details on the nature of the breach and data potentially affected
- Describe steps taken to mitigate the impact
- Provide guidance on protective actions you can take

Note: Because cloud data is end-to-end encrypted, a server breach would expose only encrypted data that cannot be read without your password.

---

## 7. Children's Privacy

EVENTUALLY.VET is intended for use by active duty military members, reservists, National Guard members, and veterans. It is not designed for or directed at individuals under the age of 17. We do not knowingly collect information from minors.

---

## 8. HIPAA Disclaimer

EVENTUALLY.VET is a personal health record (PHR) application maintained by and for the individual user. It is **not** a covered entity or business associate under HIPAA. However, we voluntarily implement security controls consistent with HIPAA standards because we believe your medical information deserves the highest level of protection regardless of legal requirements.

This App does not replace official medical records maintained by the VA, DoD, or civilian healthcare providers. It is a personal documentation tool to help organize your records for VA claim filing.

---

## 9. Data Retention

- **Local data**: Persists on your device indefinitely until you delete it or uninstall the App. This is by design — VA claims can be filed or updated throughout your lifetime.
- **Cloud backups**: Retained as long as your account is active. Deleted within 30 days of account deletion request.
- **Audit logs**: Retained locally for up to 10,000 entries (approximately 1-2 years of typical usage). Can be exported or cleared by the user at any time.

---

## 10. Changes to This Policy

We may update this Privacy Policy periodically. Changes will be:
- Communicated via in-app notification
- Posted with a new "Last Updated" date
- Available for review at any time within the App

Continued use of the App after changes constitutes acceptance of the updated policy. Material changes (such as new data sharing or reduced security) will require explicit consent.

---

## 11. California Residents (CCPA/CPRA)

If you are a California resident, you have additional rights under the California Consumer Privacy Act:
- **Right to Know**: What personal information we collect and how it is used (covered in Sections 1-3)
- **Right to Delete**: Request deletion of your personal information (covered in Section 5.3)
- **Right to Opt-Out**: We do not sell personal information. There is nothing to opt out of.
- **Non-Discrimination**: We will not discriminate against you for exercising your privacy rights

---

## 12. Contact

For questions, concerns, or requests regarding this Privacy Policy or your data:

- **Email**: privacy@eventually.vet
- **Subject Line**: "Privacy Inquiry — EVENTUALLY.VET"

We will respond to all privacy inquiries within 30 days.

---

## 13. Governing Law

This Privacy Policy is governed by the laws of the United States. Any disputes will be resolved in accordance with applicable federal and state law.

---

**Summary**: Your data belongs to you. It's encrypted, it stays on your device by default, and we can never read it — even if you use cloud backup. We don't sell it, share it, or use it for anything other than helping you document your service for your VA claim. You can delete it all at any time.

---

*EVENTUALLY.VET is not affiliated with, endorsed by, or connected to the U.S. Department of Veterans Affairs, the Department of Defense, or any branch of the U.S. military.*
