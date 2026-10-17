# JobTrack Private Object Storage Architecture

JobTrack implements a dual-mode private object-storage architecture for sensitive candidate documents (e.g. resumes).

---

## 1. Cloud Mode: Private Cloudinary Integration

When cloud environment credentials are provided:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### Security Guarantees in Cloud Mode:
- **Private / Authenticated Assets**: Files are uploaded with `resource_type: 'raw'` and `type: 'authenticated'`. Files cannot be accessed directly via public URLs.
- **Signed URL Access**: Requests to `GET /api/users/me/resume` or `GET /api/users/:userId/resume` generate cryptographic, time-limited signed URLs (1-hour TTL) for verified candidates and authorized recruiters/admins.
- **Server-Side Cleanup**: Replacing or deleting a resume automatically calls Cloudinary's destroy API, preventing orphaned files.

---

## 2. Safe Local Development Mode

If Cloudinary environment variables are missing (default for local development and testing), JobTrack automatically falls back to **Safe Local Private Storage Mode**.

### Implementation:
- **Location**: `server/storage/private/resumes/`
- **Isolation from Public Assets**: The storage directory is located outside `client/` and is **never** mounted via `express.static()`.
- **Path Traversal Protection**:
  - Original filenames are sanitized to remove directory traversal sequences (`../`, `..\`), null bytes, control characters, and unsafe symbols.
  - The local filesystem uses cryptographically random hex keys (`<userId>-<timestamp>-<randomHex>.<ext>`) rather than user-supplied filenames.
  - The storage service verifies `resolvedPath.startsWith(LOCAL_STORAGE_DIR)` before read or write operations.
- **Authorized Streaming**: Documents are served via authenticated streaming through Express (`res.pipe`), injecting `X-Content-Type-Options: nosniff` and appropriate `Content-Disposition`.
- **Permission Restraints**: Storage directories are initialized with restricted permissions (`0o700`) and files with `0o600`.

---

## 3. Limitations of Safe Local Development Mode

While the safe local development mode provides airtight confidentiality and security locally, production deployments should use cloud object storage due to the following structural limitations of local disk storage:

| Limitation | Local Storage Mode | Cloud Mode (Cloudinary / S3) |
| :--- | :--- | :--- |
| **Multi-Instance Scaling** | Files saved on Node instance A are not visible to Node instance B without NFS. | Centralized bucket accessible across all scaled containers and serverless functions. |
| **Container Ephemerality** | Container rebuilds/restarts in platforms like Heroku, Render, AWS ECS or K8s wipe local disk storage. | Persistent cloud storage independent of container lifecycle. |
| **Edge CDN Delivery** | File downloads consume application server network bandwidth and CPU. | Distributed CDN edge networks serve signed requests with optimal global latency. |
| **Disaster Recovery** | Requires explicit server volume backups and redundancy strategies. | High durability (e.g., 99.999999999%) and multi-region replication. |
