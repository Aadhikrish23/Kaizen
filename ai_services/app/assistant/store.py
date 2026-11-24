"""Per-user conversation state, held in this process's memory only: the last few exchanges (so "it" and "undo" work), a pending yes/no
question, and the last change that can be undone. Nothing here is persisted; a restart clears it, and one instance serves it."""
import asyncio
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Deque, Dict, List, Optional, Tuple

from .models import Intent, UndoOp

PENDING_TTL_SECONDS = 10 * 60
UNDO_TTL_SECONDS = 30 * 60
EXCHANGES_KEPT = 6
MAX_SESSIONS = 2000
IDLE_SECONDS = 60 * 60


@dataclass
class Pending:
    intents: List[Intent]
    question: str
    message: str
    days_ago: int
    created: float = field(default_factory=time.monotonic)

    def expired(self) -> bool:
        return time.monotonic() - self.created > PENDING_TTL_SECONDS


@dataclass
class UndoSnapshot:
    ops: List[UndoOp]
    summary: str
    changed: List[str]
    created: float = field(default_factory=time.monotonic)

    def expired(self) -> bool:
        return time.monotonic() - self.created > UNDO_TTL_SECONDS


@dataclass
class Session:
    exchanges: Deque[Tuple[str, str]] = field(default_factory=lambda: deque(maxlen=EXCHANGES_KEPT))
    pending: Optional[Pending] = None
    undo: Optional[UndoSnapshot] = None
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    touched: float = field(default_factory=time.monotonic)

    def history(self) -> List[Dict[str, str]]:
        out: List[Dict[str, str]] = []
        for user, assistant in self.exchanges:
            out.append({"role": "user", "content": user})
            out.append({"role": "assistant", "content": assistant})
        return out

    def take_pending(self) -> Optional[Pending]:
        pending, self.pending = self.pending, None
        return pending if pending and not pending.expired() else None


class SessionStore:
    def __init__(self) -> None:
        self._sessions: Dict[str, Session] = {}

    def get(self, user_id: str) -> Session:
        self._prune()
        session = self._sessions.get(user_id)
        if session is None:
            session = self._sessions[user_id] = Session()
        session.touched = time.monotonic()
        return session

    def reset(self, user_id: str) -> None:
        self._sessions.pop(user_id, None)

    def _prune(self) -> None:
        if len(self._sessions) < MAX_SESSIONS:
            return
        cutoff = time.monotonic() - IDLE_SECONDS
        for key in [k for k, s in self._sessions.items() if s.touched < cutoff and not s.lock.locked()]:
            del self._sessions[key]


sessions = SessionStore()
