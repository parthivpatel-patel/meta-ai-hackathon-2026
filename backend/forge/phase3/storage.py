"""Bounded SQLite JSON state, optimistic versions, and expiring operation leases."""

import os
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path

from .safety import settings


class StoreConflict(Exception):
    pass


class StoreCapacity(Exception):
    pass


class StoreMissing(Exception):
    pass


class SQLiteStore:
    def __init__(self, path: str, max_sessions=256, retention_hours=24):
        self.path = Path(path)
        self.max_sessions = max_sessions
        self.retention = retention_hours * 3600
        self.path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        # Restrict creation including WAL/SHM, without changing the process umask.
        fd = os.open(self.path, os.O_CREAT | os.O_RDWR, 0o600)
        os.close(fd)
        with self.connect() as con:
            con.execute("PRAGMA journal_mode=WAL")
            con.execute(
                "CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, version INTEGER NOT NULL, updated REAL NOT NULL, lease REAL NOT NULL DEFAULT 0, state TEXT NOT NULL)"
            )
        os.chmod(self.path, 0o600)

    @contextmanager
    def connect(self):
        con = sqlite3.connect(self.path, timeout=2)
        try:
            con.execute("PRAGMA busy_timeout=2000")
            yield con
            con.commit()
        except Exception:
            con.rollback()
            raise
        finally:
            con.close()

    def ready(self):
        with self.connect() as con:
            return con.execute("SELECT 1").fetchone() == (1,)

    def create(self, identifier, state):
        if len(state.encode()) > 900000:
            raise StoreCapacity("Persisted state exceeds the 900 KB limit")
        now = time.time()
        with self.connect() as con:
            con.execute("BEGIN IMMEDIATE")
            con.execute(
                "DELETE FROM sessions WHERE updated<? AND lease<?",
                (now - self.retention, now),
            )
            if (
                con.execute("SELECT count(*) FROM sessions").fetchone()[0]
                >= self.max_sessions
            ):
                raise StoreCapacity("Session capacity reached")
            con.execute(
                "INSERT INTO sessions(id,version,updated,state) VALUES (?,0,?,?)",
                (identifier, now, state),
            )

    def read(self, identifier):
        with self.connect() as con:
            row = con.execute(
                "SELECT version,state FROM sessions WHERE id=? AND updated>=?",
                (identifier, time.time() - self.retention),
            ).fetchone()
        if row is None:
            raise StoreMissing("Session missing or expired")
        return row

    def claim(self, identifier, expected_version):
        now = time.time()
        with self.connect() as con:
            con.execute("BEGIN IMMEDIATE")
            row = con.execute(
                "SELECT version,state,lease FROM sessions WHERE id=? AND updated>=?",
                (identifier, now - self.retention),
            ).fetchone()
            if row is None:
                raise StoreMissing("Session missing or expired")
            if row[0] != expected_version or row[2] > now:
                raise StoreConflict("Stale version or operation in progress")
            con.execute(
                "UPDATE sessions SET lease=? WHERE id=?", (now + 120, identifier)
            )
            return row[1]

    def save(self, identifier, version, state):
        if len(state.encode()) > 900000:
            raise ValueError("Persisted state exceeds the 900 KB limit")
        with self.connect() as con:
            cur = con.execute(
                "UPDATE sessions SET state=?,version=version+1,updated=?,lease=0 WHERE id=? AND version=? AND lease>?",
                (state, time.time(), identifier, version, time.time()),
            )
            if cur.rowcount != 1:
                raise StoreConflict("Operation lease expired or state changed")

    def release(self, identifier, version):
        with self.connect() as con:
            con.execute(
                "UPDATE sessions SET lease=0 WHERE id=? AND version=?",
                (identifier, version),
            )


_store = None
_store_path = None


def get_store():
    global _store, _store_path
    s = settings()
    key = (s.db_path, s.max_sessions, s.retention_hours)
    if _store is None or _store_path != key:
        _store = SQLiteStore(*key)
        _store_path = key
    return _store
