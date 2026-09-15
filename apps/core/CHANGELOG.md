# @luzzle/core

## 0.0.242

## 0.0.241

### Patch Changes

- fc467ac: Add an admin dashboard (`/admin`, replacing the old redirect to the create form) showing piece/asset stats, recently-edited pieces, and setup status, plus an `/admin/health` page with live checks (storage, worker, auth issuer, archive/cdn sync, AI key) that can each be re-run on demand. Archive/cdn checks run through a new `TestConnectivity` worker workflow since the web app has no rclone binary or credentials of its own.

## 0.0.240

## 0.0.239

## 0.0.238

## 0.0.237

## 0.0.236
